import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import path from "node:path";

/**
 * Parse a Codex CLI JSONL session file.
 * @param {string} filePath
 * @returns {object[]}
 */
export function parseSession(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const records = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      records.push(JSON.parse(trimmed));
    } catch { /* skip */ }
  }
  return records;
}

/**
 * Extract session metadata from records.
 * @param {object[]} records
 * @param {string} fallbackId - Filename-derived session ID
 * @returns {import('../interface.mjs').RawSession}
 */
export function extractMeta(records, fallbackId) {
  let sessionId = fallbackId;
  let timeCreated = 0;
  let timeUpdated = 0;
  let messageCount = 0;
  let totalTokens = 0;

  for (const r of records) {
    const ts = r.timestamp ? new Date(r.timestamp).getTime() : 0;
    if (ts && (!timeCreated || ts < timeCreated)) timeCreated = ts;
    if (ts > timeUpdated) timeUpdated = ts;

    if (r.type === "session_meta" && r.payload?.session_id) {
      sessionId = r.payload.session_id;
    }

    if (r.type === "event_msg" && r.payload?.type === "user_message") {
      messageCount++;
    }
    if (r.type === "response_item" && r.payload?.role === "assistant") {
      messageCount++;
    }

    if (r.type === "event_msg" && r.payload?.type === "token_count") {
      const usage = r.payload.info?.total_token_usage;
      if (usage?.total_tokens) totalTokens = usage.total_tokens; // Use latest cumulative total
    }
  }

  return {
    id: sessionId,
    provider: "codex",
    parentId: null,
    title: null,
    directory: null,
    timeCreated,
    timeUpdated,
    messageCount,
    tokenCount: totalTokens || null
  };
}

/**
 * Convert records to unified Message[] format.
 * @param {object[]} records
 * @param {string} sessionId
 * @returns {import('../interface.mjs').Message[]}
 */
export function recordsToMessages(records, sessionId) {
  const messages = [];
  let idx = 0;

  for (const r of records) {
    const ts = r.timestamp ? new Date(r.timestamp).getTime() : 0;

    // User message
    if (r.type === "event_msg" && r.payload?.type === "user_message") {
      messages.push({
        id: `msg-${idx++}`,
        sessionId,
        role: "user",
        content: r.payload.message || "",
        thinking: null,
        toolName: null,
        toolInput: null,
        toolOutput: null,
        timestamp: ts,
        tokens: null,
        metadata: { images: r.payload.images }
      });
    }

    // Assistant text response
    if (r.type === "response_item" && r.payload?.type === "message" && r.payload?.role === "assistant") {
      const text = (r.payload.content || [])
        .flatMap((c) => c.content || [c])
        .filter((c) => c.type === "text" || c.type === "output_text")
        .map((c) => c.text || "")
        .join("");
      if (text) {
        messages.push({
          id: `msg-${idx++}`,
          sessionId,
          role: "assistant",
          content: text,
          thinking: null,
          toolName: null,
          toolInput: null,
          toolOutput: null,
          timestamp: ts,
          tokens: null,
          metadata: null
        });
      }
    }

    // Tool call (function_call)
    if (r.type === "response_item" && r.payload?.type === "function_call") {
      let args = r.payload.arguments;
      if (typeof args === "string") {
        try { args = JSON.parse(args); } catch { /* keep string */ }
      }
      messages.push({
        id: r.payload.call_id || `tool-${idx++}`,
        sessionId,
        role: "tool",
        content: "",
        thinking: null,
        toolName: r.payload.name || "unknown",
        toolInput: args,
        toolOutput: null,
        timestamp: ts,
        tokens: null,
        metadata: null
      });
    }
  }

  return messages;
}
