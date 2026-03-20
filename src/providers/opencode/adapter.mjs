// src/providers/opencode/adapter.mjs
import os from "node:os";
import path from "node:path";
import { existsSync } from "node:fs";
import { getConfig } from "../../config.mjs";
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
  icon: "🔮",

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

  exportSession(_sessionId) {
    return null;
  }
};

export default opencode;
