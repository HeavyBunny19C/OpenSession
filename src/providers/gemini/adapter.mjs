import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { getConfig } from "../../config.mjs";
import { parseSession, extractMeta, dataToMessages } from "./parser.mjs";
import { icons } from "../../icons.mjs";

function getGeminiDir() {
  return getConfig().geminiDir;
}

function discoverSessionFiles() {
  const tmpDir = path.join(getGeminiDir(), "tmp");
  if (!existsSync(tmpDir)) return [];
  const files = [];

  try {
    for (const projectDir of readdirSync(tmpDir)) {
      const chatsDir = path.join(tmpDir, projectDir, "chats");
      if (!existsSync(chatsDir)) continue;
      try {
        for (const entry of readdirSync(chatsDir)) {
          if (entry.endsWith(".json")) {
            files.push({ filePath: path.join(chatsDir, entry) });
          }
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }

  return files;
}

/** @type {import('../interface.mjs').ProviderAdapter} */
const gemini = {
  id: "gemini",
  name: "Gemini CLI",
  icon: icons.gemini,

  detect() {
    return existsSync(path.join(getGeminiDir(), "tmp"));
  },

  getDataPath() {
    return path.join(getGeminiDir(), "tmp");
  },

  async *scan() {
    for (const { filePath } of discoverSessionFiles()) {
      try {
        const data = parseSession(filePath);
        if (!data.sessionId) continue;
        yield extractMeta(data);
      } catch { /* skip */ }
    }
  },

  getSession(sessionId) {
    for (const { filePath } of discoverSessionFiles()) {
      try {
        const data = parseSession(filePath);
        if (data.sessionId === sessionId) return extractMeta(data);
      } catch { /* skip */ }
    }
    return null;
  },

  getMessages(sessionId) {
    for (const { filePath } of discoverSessionFiles()) {
      try {
        const data = parseSession(filePath);
        if (data.sessionId === sessionId) return dataToMessages(data, sessionId);
      } catch { /* skip */ }
    }
    return [];
  },

  getTokenStats(days = 30) {
    const cutoff = Date.now() - days * 86400000;
    const dailyMap = new Map();
    for (const { filePath } of discoverSessionFiles()) {
      try {
        const data = parseSession(filePath);
        for (const m of data.messages || []) {
          if (m.type !== "gemini" || !m.tokenUsage) continue;
          const ts = m.timestamp ? new Date(m.timestamp).getTime() : 0;
          if (ts < cutoff) continue;
          const day = new Date(ts).toISOString().slice(0, 10);
          const existing = dailyMap.get(day) || { day, inputTokens: 0, outputTokens: 0, totalTokens: 0, messageCount: 0 };
          existing.inputTokens += m.tokenUsage.input || 0;
          existing.outputTokens += m.tokenUsage.output || 0;
          existing.totalTokens += m.tokenUsage.total || 0;
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
    for (const { filePath } of discoverSessionFiles()) {
      if (results.length >= limit) break;
      try {
        const data = parseSession(filePath);
        for (const m of data.messages || []) {
          if (results.length >= limit) break;
          const text = m.text || "";
          if (text.toLowerCase().includes(term)) {
            const idx = text.toLowerCase().indexOf(term);
            results.push({
              sessionId: data.sessionId,
              messageId: m.id || "",
              role: m.type === "user" ? "user" : "assistant",
              snippet: text.slice(Math.max(0, idx - 40), idx + term.length + 80),
              timestamp: m.timestamp ? new Date(m.timestamp).getTime() : 0
            });
          }
        }
      } catch { /* skip */ }
    }
    return results;
  },

  exportSession(_sessionId) { return null; }
};

export default gemini;
