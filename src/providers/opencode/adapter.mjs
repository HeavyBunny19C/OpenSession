// src/providers/opencode/adapter.mjs
import os from "node:os";
import path from "node:path";
import { existsSync } from "node:fs";
import { getConfig } from "../../config.mjs";
import { icons } from "../../icons.mjs";
import {
  getDb,
  listSessions,
  getSession as dbGetSession,
  getMessages as dbGetMessages,
  getParts,
  getTodos,
  searchMessages as dbSearchMessages,
  getTokenStats as dbGetTokenStats,
  getModelDistribution,
  getDailySessionCounts,
  getSessionsByIds,
  getStats
} from "../../db.mjs";
import { parseJson } from "./parser.mjs";

function defaultDataPath() {
  if (process.platform === "win32") {
    return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "opencode", "opencode.db");
  }
  const dataHome = process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
  return path.join(dataHome, "opencode", "opencode.db");
}

/** @type {import('../interface.mjs').ProviderAdapter} */
const opencode = {
  id: "opencode",
  name: "OpenCode",
  icon: icons.opencode,

  detect() {
    const dbPath = getConfig().dbPath || defaultDataPath();
    return existsSync(dbPath);
  },

  getDataPath() {
    return getConfig().dbPath || defaultDataPath();
  },

  async *scan() {
    const { sessions } = listSessions(100000, 0);
    for (const s of sessions) {
      yield {
        id: s.id,
        provider: "opencode",
        parentId: null,
        title: s.title || s.slug || null,
        directory: s.directory || null,
        timeCreated: Number(s.time_created) || 0,
        timeUpdated: Number(s.time_updated) || 0,
        messageCount: 0,
        tokenCount: null
      };
    }
  },

  getSession(sessionId) {
    return dbGetSession(sessionId);
  },

  getMessages(sessionId) {
    const messages = dbGetMessages(sessionId);
    const results = [];
    for (const msg of messages) {
      const data = typeof msg.data === "string" ? parseJson(msg.data) : msg.data;
      const parts = getParts(msg.id).map((p) => ({
        ...p,
        data: typeof p.data === "string" ? parseJson(p.data) : p.data
      }));

      for (const part of parts) {
        const pd = part.data;
        if (!pd) continue;

        if (pd.type === "text" && pd.text) {
          results.push({
            id: `${msg.id}:${part.id}`,
            sessionId,
            role: data?.role || "unknown",
            content: pd.text,
            thinking: null,
            toolName: null,
            toolInput: null,
            toolOutput: null,
            timestamp: Number(data?.time?.created) || 0,
            tokens: data?.tokens ? { input: data.tokens.input || 0, output: data.tokens.output || 0 } : null,
            metadata: { model: data?.modelID, provider: data?.providerID }
          });
        } else if (pd.type === "tool") {
          results.push({
            id: `${msg.id}:${part.id}`,
            sessionId,
            role: "tool",
            content: pd.state?.output ? (typeof pd.state.output === "string" ? pd.state.output : JSON.stringify(pd.state.output)) : "",
            thinking: null,
            toolName: pd.tool || "unknown",
            toolInput: pd.state?.input || null,
            toolOutput: pd.state?.output || null,
            timestamp: Number(pd.time?.start) || Number(data?.time?.created) || 0,
            tokens: null,
            metadata: { duration: pd.time ? (Number(pd.time.end) - Number(pd.time.start)) : null }
          });
        }
      }
    }
    return results;
  },

  getTokenStats(days = 30) {
    return dbGetTokenStats(days).map((row) => ({
      day: row.day,
      inputTokens: Number(row.input_tokens) || 0,
      outputTokens: Number(row.output_tokens) || 0,
      totalTokens: Number(row.total_tokens) || 0,
      messageCount: Number(row.message_count) || 0
    }));
  },

  searchMessages(query, limit = 20) {
    return dbSearchMessages(query, limit).map((r) => ({
      sessionId: r.sessionId,
      messageId: r.messageId || r.partId,
      role: r.role || "unknown",
      snippet: r.snippet,
      timestamp: Number(r.timeUpdated) || 0
    }));
  },

  getTrace(sessionId) {
    const MAX_STEPS = 200;
    const messages = dbGetMessages(sessionId);
    let steps = [];

    const knownBuiltins = new Set([
      "ast_grep_search",
      "ast_grep_replace",
      "web_search"
    ]);

    const truncate = (value) => {
      if (value == null) return null;
      const text = typeof value === "string" ? value : JSON.stringify(value);
      return text.length > 500 ? `${text.slice(0, 500)}…` : text;
    };

    const toNumber = (value) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    };

    const classifyTool = (tool) => {
      if (tool === "skill") return { category: "skill", mcpServer: null };
      if (tool === "task") return { category: "agent", mcpServer: null };
      if (tool === "invalid") return { category: "invalid", mcpServer: null };
      if (tool.startsWith("lsp_")) return { category: "lsp", mcpServer: null };
      if (tool.includes("_") && !knownBuiltins.has(tool)) {
        return { category: "mcp", mcpServer: tool.split("_", 1)[0] || null };
      }
      if (["read", "write", "edit", "bash", "glob", "grep", "ast_grep_search", "ast_grep_replace"].includes(tool)) {
        return { category: "tool", mcpServer: null };
      }
      return { category: "tool", mcpServer: null };
    };

    const startStep = (msg, msgData, startPartData, startPart) => ({
      messageId: msg.id,
      agent: msgData?.agent || null,
      model: msgData?.modelID || null,
      cost: 0,
      tokens: 0,
      reason: null,
      timeStart: toNumber(startPartData?.time?.start) || toNumber(startPart?.time?.start),
      timeEnd: 0,
      duration: 0,
      spans: []
    });

    let currentStep = null;

    for (const msg of messages) {
      const msgData = typeof msg.data === "string" ? parseJson(msg.data) : msg.data;
      const parts = getParts(msg.id).map((p) => ({
        ...p,
        data: typeof p.data === "string" ? parseJson(p.data) : p.data
      }));

      for (const part of parts) {
        const pd = part.data || {};
        const partType = pd.type || "unknown";

        if (partType === "step-start") {
          if (currentStep) {
            currentStep.duration = Math.max(0, toNumber(currentStep.timeEnd) - toNumber(currentStep.timeStart));
            steps.push(currentStep);
          }
          currentStep = startStep(msg, msgData, pd, part);
          continue;
        }

        if (partType === "step-finish") {
          if (!currentStep) {
            currentStep = startStep(msg, msgData, {}, {});
          }
          currentStep.cost = toNumber(pd.cost);
          currentStep.tokens = toNumber(pd.tokens);
          currentStep.reason = pd.reason || null;
          currentStep.timeEnd = toNumber(pd.time?.end) || toNumber(part.time?.end) || currentStep.timeEnd;
          currentStep.duration = Math.max(0, toNumber(currentStep.timeEnd) - toNumber(currentStep.timeStart));
          if (!currentStep.duration) {
            currentStep.duration = currentStep.spans.reduce((sum, span) => sum + toNumber(span.duration), 0);
          }
          steps.push(currentStep);
          currentStep = null;
          continue;
        }

        if (!currentStep) {
          currentStep = startStep(msg, msgData, {}, {});
        }

        let name = partType;
        let category = "tool";
        let mcpServer = null;

        if (partType === "reasoning") {
          name = "reasoning";
          category = "reasoning";
        } else if (partType === "text") {
          name = "text";
          category = "text";
        } else {
          const toolName = typeof pd.tool === "string" ? pd.tool : "";
          if (toolName) {
            name = toolName;
            const classification = classifyTool(toolName);
            category = classification.category;
            mcpServer = classification.mcpServer;
          }
        }

        const stateTime = pd.state?.time || {};
        const partTime = pd.time || {};
        const timeStart = toNumber(stateTime.start) || toNumber(partTime.start);
        const timeEnd = toNumber(stateTime.end) || toNumber(partTime.end);
        const duration = Math.max(0, timeEnd - timeStart);

        currentStep.spans.push({
          id: part.id,
          name,
          category,
          ...(mcpServer ? { mcpServer } : {}),
          timeStart,
          timeEnd,
          duration,
          status: pd.state?.status || null,
          input: truncate(pd.state?.input),
          output: truncate(pd.state?.output),
          title: pd.state?.title || null
        });
      }
    }

     if (currentStep) {
       currentStep.duration = currentStep.spans.reduce((sum, span) => sum + toNumber(span.duration), 0);
       steps.push(currentStep);
     }

     const truncated = steps.length > MAX_STEPS;
     steps = steps.slice(0, MAX_STEPS);

     const summary = steps.reduce(
       (acc, step) => {
         acc.totalSteps += 1;
         acc.totalSpans += step.spans.length;
         acc.totalDuration += toNumber(step.duration);
         acc.totalCost += toNumber(step.cost);
         acc.totalTokens += toNumber(step.tokens);
         return acc;
       },
       { totalSteps: 0, totalSpans: 0, totalDuration: 0, totalCost: 0, totalTokens: 0 }
     );

     return { sessionId, steps, summary, truncated };
  },

  exportSession(_sessionId) {
    return null;
  }
};

export default opencode;
