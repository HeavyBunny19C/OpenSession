import { existsSync, readdirSync, lstatSync } from "node:fs";
import path from "node:path";
import { getConfig } from "../../config.mjs";
import { parseTranscript, extractSessionMeta, recordsToMessages } from "./parser.mjs";
import { icons } from "../../icons.mjs";

function getClaudeDir() {
  return getConfig().claudeDir;
}

/**
 * Discover session files from both legacy and project-scoped layouts.
 * @returns {{ sessionId: string, filePath: string }[]}
 */
function discoverSessionFiles() {
  const claudeDir = getClaudeDir();
  const files = [];

  // Legacy layout: ~/.claude/transcripts/{session-id}.jsonl
  const transcriptsDir = path.join(claudeDir, "transcripts");
  if (existsSync(transcriptsDir)) {
    try {
      for (const entry of readdirSync(transcriptsDir)) {
        if (entry.endsWith(".jsonl")) {
          const sessionId = entry.replace(".jsonl", "");
          files.push({ sessionId, filePath: path.join(transcriptsDir, entry) });
        }
      }
    } catch { /* ignore read errors */ }
  }

  // Project-scoped layout: ~/.claude/projects/{encoded-path}/{uuid}.jsonl
  const projectsDir = path.join(claudeDir, "projects");
  if (existsSync(projectsDir)) {
    try {
       for (const projectDir of readdirSync(projectsDir)) {
         const projectPath = path.join(projectsDir, projectDir);
         const stat = lstatSync(projectPath);
         if (stat.isSymbolicLink()) continue;
         if (!stat.isDirectory()) continue;
        for (const entry of readdirSync(projectPath)) {
          if (entry.endsWith(".jsonl")) {
            const sessionId = entry.replace(".jsonl", "");
            // Avoid duplicates (same session ID in transcripts/ and projects/)
            if (!files.some((f) => f.sessionId === sessionId)) {
              files.push({ sessionId, filePath: path.join(projectPath, entry) });
            }
          }
        }
      }
    } catch { /* ignore read errors */ }
  }

  return files;
}

/** @type {import('../interface.mjs').ProviderAdapter} */
const claudeCode = {
  id: "claude-code",
  name: "Claude Code",
  icon: icons.claude,

  detect() {
    const claudeDir = getClaudeDir();
    const transcripts = path.join(claudeDir, "transcripts");
    const projects = path.join(claudeDir, "projects");
    return existsSync(transcripts) || existsSync(projects);
  },

  getDataPath() {
    return getClaudeDir();
  },

  async *scan() {
    const files = discoverSessionFiles();
    for (const { sessionId, filePath } of files) {
      try {
        const records = parseTranscript(filePath);
        if (records.length === 0) continue;
        const meta = extractSessionMeta(records, sessionId);
        yield meta;
      } catch {
      }
    }
  },

  getSession(sessionId) {
    const files = discoverSessionFiles();
    const entry = files.find((f) => f.sessionId === sessionId);
    if (!entry) return null;
    try {
      const records = parseTranscript(entry.filePath);
      return extractSessionMeta(records, sessionId);
    } catch {
      return null;
    }
  },

  getMessages(sessionId) {
    const files = discoverSessionFiles();
    const entry = files.find((f) => f.sessionId === sessionId);
    if (!entry) return [];
    try {
      const records = parseTranscript(entry.filePath);
      return recordsToMessages(records, sessionId);
    } catch {
      return [];
    }
  },

  getTokenStats(days = 30) {
    const cutoff = Date.now() - days * 86400000;
    const files = discoverSessionFiles();
    const dailyMap = new Map();

    for (const { sessionId, filePath } of files) {
      try {
        const records = parseTranscript(filePath);
        for (const r of records) {
          if (r.type !== "assistant" || !r.message?.usage) continue;
          const ts = r.timestamp ? new Date(r.timestamp).getTime() : 0;
          if (ts < cutoff) continue;
          const day = new Date(ts).toISOString().slice(0, 10);
          const existing = dailyMap.get(day) || { day, inputTokens: 0, outputTokens: 0, totalTokens: 0, messageCount: 0 };
          existing.inputTokens += r.message.usage.input_tokens || 0;
          existing.outputTokens += r.message.usage.output_tokens || 0;
          existing.totalTokens += (r.message.usage.input_tokens || 0) + (r.message.usage.output_tokens || 0);
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
    const files = discoverSessionFiles();
    const results = [];

    for (const { sessionId, filePath } of files) {
      if (results.length >= limit) break;
      try {
        const records = parseTranscript(filePath);
        for (const r of records) {
          if (results.length >= limit) break;
          let text = "";
          if (r.type === "user") text = extractTextFromRecord(r);
          if (r.type === "assistant") text = extractTextFromRecord(r);
          if (text.toLowerCase().includes(term)) {
            const idx = text.toLowerCase().indexOf(term);
            const start = Math.max(0, idx - 40);
            const end = Math.min(text.length, idx + term.length + 80);
            results.push({
              sessionId,
              messageId: r.uuid || "",
              role: r.type === "user" ? "user" : "assistant",
              snippet: text.slice(start, end),
              timestamp: r.timestamp ? new Date(r.timestamp).getTime() : 0
            });
          }
        }
      } catch { /* skip */ }
    }

    return results;
  },

  exportSession(_sessionId) {
    return null;
  }
};

function extractTextFromRecord(r) {
  if (r.type === "user") {
    const content = r.message?.content ?? r.content;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) return content.filter((b) => b.type === "text").map((b) => b.text).join("");
  }
  if (r.type === "assistant") {
    const content = r.message?.content ?? r.content ?? [];
    return content.filter((b) => b.type === "text").map((b) => b.text).join("");
  }
  return "";
}

export default claudeCode;
