import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { getConfig } from "../../config.mjs";
import { parseSession, extractMeta, recordsToMessages } from "./parser.mjs";

function getCodexDir() {
  return getConfig().codexDir;
}

function discoverSessionFiles() {
  const sessionsDir = path.join(getCodexDir(), "sessions");
  if (!existsSync(sessionsDir)) return [];
  const files = [];

  function walk(dir) {
    try {
      for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        try {
          const stat = statSync(full);
          if (stat.isDirectory()) walk(full);
          else if (entry.endsWith(".jsonl")) {
            const sessionId = entry.replace(/\.jsonl$/, "").replace(/^rollout-/, "");
            files.push({ sessionId, filePath: full });
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }

  walk(sessionsDir);
  return files;
}

/** @type {import('../interface.mjs').ProviderAdapter} */
const codex = {
  id: "codex",
  name: "Codex CLI",
  icon: "🟢",

  detect() {
    return existsSync(path.join(getCodexDir(), "sessions"));
  },

  getDataPath() {
    return path.join(getCodexDir(), "sessions");
  },

  async *scan() {
    for (const { sessionId, filePath } of discoverSessionFiles()) {
      try {
        const records = parseSession(filePath);
        if (records.length === 0) continue;
        yield extractMeta(records, sessionId);
      } catch { /* skip */ }
    }
  },

  getSession(sessionId) {
    const entry = discoverSessionFiles().find((f) => f.sessionId === sessionId);
    if (!entry) return null;
    try {
      return extractMeta(parseSession(entry.filePath), sessionId);
    } catch { return null; }
  },

  getMessages(sessionId) {
    const entry = discoverSessionFiles().find((f) => f.sessionId === sessionId);
    if (!entry) return [];
    try {
      return recordsToMessages(parseSession(entry.filePath), sessionId);
    } catch { return []; }
  },

  getTokenStats(days = 30) {
    const cutoff = Date.now() - days * 86400000;
    const dailyMap = new Map();
    for (const { filePath } of discoverSessionFiles()) {
      try {
        for (const r of parseSession(filePath)) {
          if (r.type !== "event_msg" || r.payload?.type !== "token_count") continue;
          const ts = r.timestamp ? new Date(r.timestamp).getTime() : 0;
          if (ts < cutoff) continue;
          const day = new Date(ts).toISOString().slice(0, 10);
          const usage = r.payload.info?.last_token_usage || {};
          const existing = dailyMap.get(day) || { day, inputTokens: 0, outputTokens: 0, totalTokens: 0, messageCount: 0 };
          existing.inputTokens += usage.input_tokens || 0;
          existing.outputTokens += usage.output_tokens || 0;
          existing.totalTokens += usage.total_tokens || 0;
          existing.messageCount += 1;
          dailyMap.set(day, existing);
        }
      } catch { /* skip */ }
    }
    return [...dailyMap.values()].sort((a, b) => a.day.localeCompare(b.day));
  },

  searchMessages(query, limit = 20) {
    const term = (query || "").toLowerCase();
    if (!term) return [];
    const results = [];
    for (const { sessionId, filePath } of discoverSessionFiles()) {
      if (results.length >= limit) break;
      try {
        for (const r of parseSession(filePath)) {
          if (results.length >= limit) break;
          let text = "";
          if (r.type === "event_msg" && r.payload?.type === "user_message") text = r.payload.message || "";
          if (r.type === "response_item" && r.payload?.role === "assistant") {
            text = (r.payload.content || []).flatMap((c) => c.content || [c]).filter((c) => c.type === "text").map((c) => c.text).join("");
          }
          if (text.toLowerCase().includes(term)) {
            const idx = text.toLowerCase().indexOf(term);
            results.push({
              sessionId,
              messageId: "",
              role: r.type === "event_msg" ? "user" : "assistant",
              snippet: text.slice(Math.max(0, idx - 40), idx + term.length + 80),
              timestamp: r.timestamp ? new Date(r.timestamp).getTime() : 0
            });
          }
        }
      } catch { /* skip */ }
    }
    return results;
  },

  exportSession() { return null; }
};

export default codex;
