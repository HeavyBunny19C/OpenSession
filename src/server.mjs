import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getConfig } from "./config.mjs";
import {
  getDb,
  getMessages,
  getParts,
  getSession,
  getStats,
  getTodos,
  listSessions,
  searchMessages,
  getTokenStats,
  getModelDistribution,
  getDailySessionCounts,
  getSessionsByIds
} from "./db.mjs";
import opencodeAdapter from "./providers/opencode/adapter.mjs";
import { getAvailableProviders, getAllProviders, getProvider } from "./providers/index.mjs";
import { getIndexDb, upsertIndex, getIndexedSessions, clearIndex } from "./index-db.mjs";
import { setLocale, getLocale } from "./i18n.mjs";
import {
  toggleStar,
  renameSession,
  softDelete,
  restoreSession,
  permanentDelete,
  batchAction,
  getMeta,
  getDeletedIds,
  getAllMeta,
  getExcludedIds
} from "./meta.mjs";
import { renderSessionPage } from "./views/session.mjs";
import { renderSessionsPage } from "./views/sessions.mjs";
import { renderStatsPage } from "./views/stats.mjs";
import { renderTrashPage } from "./views/trash.mjs";

const staticDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "static");

let availableProviders = [];
let providerMap = new Map();
let providerInfo = [];

function injectLocaleScript(body, contentType) {
  if (typeof body !== "string" || !contentType.startsWith("text/html")) {
    return body;
  }

  const localeScript = `<script>window.__LOCALE__=${JSON.stringify(getLocale())}</script>`;
  return body.includes("</head>")
    ? body.replace("</head>", `  ${localeScript}\n</head>`)
    : body;
}

function send(res, status, body, contentType = "text/html; charset=utf-8") {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(injectLocaleScript(body, contentType));
}

function readBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let data = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        req.destroy();
        resolve({});
        return;
      }
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

function safeDecodeId(encoded) {
  try {
    const decoded = decodeURIComponent(encoded);
    if (decoded.length > 500) return null;
    return decoded;
  } catch {
    return null;
  }
}

function json(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function safeJsonParse(value) {
  if (typeof value !== "string") {
    return value || {};
  }

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function enrichSession(session, metaMap) {
  if (!session) {
    return session;
  }

  const meta = metaMap.get(session.id);
  return {
    ...session,
    starred: Boolean(meta?.starred),
    title: meta?.custom_title || session.title
  };
}

function enrichSessionList(sessions, metaMap, excludedIds) {
  return sessions
    .filter((session) => !excludedIds.has(session.id))
    .map((session) => enrichSession(session, metaMap));
}

function getSearchResults(query, limit, offset) {
  const term = (query || "").trim();
  if (!term) {
    return { sessions: [], total: 0, note: "Enter a search query to find sessions." };
  }

  const titleMatches = listSessions(1000, 0, term).sessions;
  const contentMatches = searchMessages(term, 500);
  const orderedIds = [];
  const sessionMap = new Map();

  for (const session of titleMatches) {
    if (!sessionMap.has(session.id)) {
      orderedIds.push(session.id);
      sessionMap.set(session.id, session);
    }
  }

  for (const match of contentMatches) {
    if (!sessionMap.has(match.sessionId)) {
      const session = getSession(match.sessionId);
      if (session) {
        orderedIds.push(session.id);
        sessionMap.set(session.id, session);
      }
    }
  }

  return {
    sessions: orderedIds.slice(offset, offset + limit).map((id) => sessionMap.get(id)).filter(Boolean),
    total: orderedIds.length,
    note: `Showing title and message-content matches for “${term}”.`
  };
}

function loadPartsByMessage(messages) {
  const map = new Map();
  for (const message of messages) {
    map.set(
      message.id,
      getParts(message.id).map((part) => ({
        ...part,
        data: safeJsonParse(part.data)
      }))
    );
  }
  return map;
}

function normalizeSessionRecord(session) {
  if (!session) {
    return null;
  }

  return {
    ...session,
    id: session.id,
    title: session.title || session.slug || session.id,
    directory: session.directory || "",
    time_created: Number(session.time_created ?? session.timeCreated) || 0,
    time_updated: Number(session.time_updated ?? session.timeUpdated) || 0,
    summary_files: Number(session.summary_files) || 0,
    summary_additions: Number(session.summary_additions) || 0,
    summary_deletions: Number(session.summary_deletions) || 0,
    starred: Boolean(session.starred)
  };
}

function buildPartsFromProviderMessages(providerMessages = []) {
  const messages = [];
  const partsByMessage = new Map();

  for (let i = 0; i < providerMessages.length; i += 1) {
    const source = providerMessages[i] || {};
    const messageId = source.id || `${source.sessionId || "session"}:msg:${i}`;
    messages.push({
      id: messageId,
      data: {
        role: source.role || "assistant",
        time: { created: Number(source.timestamp) || 0 },
        tokens: source.tokens || null,
        model: source.metadata || null
      }
    });

    const isTool = source.role === "tool" || source.toolName;
    const partData = isTool
      ? {
        type: "tool",
        tool: source.toolName || "tool",
        state: {
          input: source.toolInput || null,
          output: source.toolOutput ?? source.content ?? "",
          status: "completed"
        }
      }
      : {
        type: "text",
        text: source.content || ""
      };

    partsByMessage.set(messageId, [{ id: `${messageId}:part`, data: partData }]);
  }

  return { messages, partsByMessage };
}

function getProviderSearchResults(adapter, query, limit, offset) {
  const term = (query || "").trim();
  if (!term) {
    return { sessions: [], total: 0, note: "Enter a search query to find sessions." };
  }

  const matches = adapter.searchMessages(term, 500);
  const orderedIds = [];
  const sessionMap = new Map();

  for (const match of matches) {
    if (sessionMap.has(match.sessionId)) {
      continue;
    }
    const session = adapter.getSession(match.sessionId);
    if (!session) {
      continue;
    }
    orderedIds.push(match.sessionId);
    sessionMap.set(match.sessionId, normalizeSessionRecord(session));
  }

  return {
    sessions: orderedIds.slice(offset, offset + limit).map((id) => sessionMap.get(id)).filter(Boolean),
    total: orderedIds.length,
    note: `Showing message-content matches for “${term}”.`
  };
}

function toApiSessionShape(session) {
  return {
    id: session.id,
    title: session.title || session.slug || session.id,
    directory: session.directory || "",
    time_updated: Number(session.time_updated) || 0,
    summary_files: Number(session.summary_files) || 0,
    summary_additions: Number(session.summary_additions) || 0,
    summary_deletions: Number(session.summary_deletions) || 0,
    starred: Boolean(session.starred)
  };
}

function serveStatic(reqPath, res) {
  const relativePath = reqPath.replace(/^\/static\//, "");
  const filePath = path.join(staticDir, relativePath);
  const contentType = filePath.endsWith(".css")
    ? "text/css; charset=utf-8"
    : filePath.endsWith(".js")
      ? "application/javascript; charset=utf-8"
      : "application/octet-stream";

  try {
    const body = readFileSync(filePath);
    send(res, 200, body, contentType);
  } catch {
    send(res, 404, "Not found", "text/plain; charset=utf-8");
  }
}

function renderMarkdownExport(session, messages, partsByMessage) {
  const title = session.title || session.slug || session.id;
  const lines = [
    `# ${title}`,
    "",
    `Created: ${new Date(Number(session.time_created) || Date.now()).toLocaleString()}`,
    `Updated: ${new Date(Number(session.time_updated) || Date.now()).toLocaleString()}`,
    "",
    "---",
    ""
  ];

  for (const msg of messages) {
    const role = msg.data?.role || "unknown";
    const parts = partsByMessage.get(msg.id) || [];
    for (const part of parts) {
      const partData = part.data;
      if (partData?.type === "text" && partData.text) {
        lines.push(`## ${role}`, "", partData.text, "");
      } else if (partData?.type === "tool") {
        lines.push(`### Tool Call: ${partData.tool || "unknown"}`, "");
        if (partData.state?.input) {
          lines.push(
            "Input:",
            "```",
            typeof partData.state.input === "string" ? partData.state.input : JSON.stringify(partData.state.input, null, 2),
            "```",
            ""
          );
        }
        if (partData.state?.output) {
          lines.push(
            "Output:",
            "```",
            typeof partData.state.output === "string" ? partData.state.output : JSON.stringify(partData.state.output, null, 2),
            "```",
            ""
          );
        }
      }
    }
  }

  return lines.join("\n");
}

export async function startServer(config = getConfig()) {
  const appConfig = config ?? getConfig();
  setLocale(appConfig.lang);
  const PORT = appConfig.port;

  const requestHandler = async (req, res) => {
    const url = new URL(req.url || "/", `http://localhost:${PORT}`);
    const pathname = url.pathname;
    const limit = 30;
    const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

    // Extract provider from URL: /:provider/...
    const providerMatch = pathname.match(/^\/([a-z][a-z0-9-]*)(?:\/(.*))?$/);
    const providerSegment = providerMatch?.[1];
    const subPath = providerMatch?.[2] ? `/${providerMatch[2]}` : "/";

    // Root redirect
    if (pathname === "/") {
      const defaultProvider = availableProviders[0];
      if (defaultProvider) {
        res.writeHead(302, { Location: `/${defaultProvider.id}` });
        res.end();
        return;
      }
      send(res, 500, "<h1>No providers detected</h1>");
      return;
    }

    if (pathname === "/favicon.ico") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (pathname.startsWith("/static/")) {
      serveStatic(pathname, res);
      return;
    }

    if (req.method === "GET" && pathname === "/api/providers") {
      return json(res, providerInfo);
    }

    const prefixedMutationMatch = pathname.match(/^\/api\/([a-z][a-z0-9-]*)\/session\/([^/]+)\/(star|rename|delete|restore|permanent-delete)$/);
    const legacyMutationMatch = pathname.match(/^\/api\/session\/([^/]+)\/(star|rename|delete|restore|permanent-delete)$/);
    if (req.method === "POST" && (prefixedMutationMatch || legacyMutationMatch)) {
      const providerId = prefixedMutationMatch?.[1] || "opencode";
      if (providerId !== "opencode") {
        return json(res, { ok: false, error: "Not supported for this provider" }, 501);
      }

      const rawId = prefixedMutationMatch?.[2] || legacyMutationMatch[1];
      const id = safeDecodeId(rawId);
      if (!id) return json(res, { ok: false, error: "Invalid session ID" }, 400);
      const action = prefixedMutationMatch?.[3] || legacyMutationMatch[2];
      const adapter = providerMap.get("opencode");
      if (adapter && !adapter.getSession(id)) {
        return json(res, { ok: false, error: "Session not found" }, 404);
      }
      try {
        if (action === "star") {
          const starred = toggleStar(id);
          return json(res, { ok: true, starred });
        }
        if (action === "rename") {
          const body = await readBody(req);
          renameSession(id, body.title || "");
          return json(res, { ok: true });
        }
        if (action === "delete") {
          softDelete(id);
          return json(res, { ok: true });
        }
        if (action === "restore") {
          restoreSession(id);
          return json(res, { ok: true });
        }
        if (action === "permanent-delete") {
          permanentDelete(id);
          return json(res, { ok: true });
        }
      } catch (error) {
        console.error("Mutation error:", error?.message || error);
        return json(res, { ok: false, error: "Internal server error" }, 500);
      }
    }

    const prefixedBatchMatch = pathname.match(/^\/api\/([a-z][a-z0-9-]*)\/batch$/);
    if (req.method === "POST" && (pathname === "/api/batch" || prefixedBatchMatch)) {
      const providerId = prefixedBatchMatch?.[1] || "opencode";
      if (providerId !== "opencode") {
        return json(res, { ok: false, error: "Not supported for this provider" }, 501);
      }

      try {
        const body = await readBody(req);
        const ids = Array.isArray(body.ids) ? body.ids : [];
        const validActions = ["delete", "star", "unstar", "restore", "permanent-delete"];
        if (!validActions.includes(body.action)) {
          return json(res, { ok: false, error: "Invalid action" }, 400);
        }
        const affected = batchAction(ids, body.action);
        return json(res, { ok: true, affected });
      } catch (error) {
        console.error("Mutation error:", error?.message || error);
        return json(res, { ok: false, error: "Internal server error" }, 500);
      }
    }

    if (req.method === "POST" && pathname === "/api/reindex") {
      try {
        getIndexDb();
        const results = [];
        for (const provider of availableProviders) {
          const startTime = Date.now();
          const sessions = [];
          for await (const session of provider.scan()) {
            sessions.push(session);
          }
          clearIndex(provider.id);
        clearIndex(provider.id);
        upsertIndex(provider.id, sessions);
          results.push({ provider: provider.id, indexed: sessions.length, tookMs: Date.now() - startTime });
        }
        return json(res, { ok: true, results });
      } catch (error) {
        console.error("Mutation error:", error?.message || error);
        return json(res, { ok: false, error: "Internal server error" }, 500);
      }
    }

    if (req.method !== "GET") {
      send(res, 405, "Method not allowed", "text/plain; charset=utf-8");
      return;
    }

    const apiSessionsMatch = pathname.match(/^\/api\/([a-z][a-z0-9-]*)\/sessions$/);
    if (apiSessionsMatch) {
      const providerId = apiSessionsMatch[1];
      const adapter = providerMap.get(providerId);
      if (!adapter) {
        return json(res, { ok: false, error: "Provider not found" }, 404);
      }

      try {
        const apiLimit = Math.min(Math.max(1, Number(url.searchParams.get("limit")) || 30), 100);
        const apiOffset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
        const range = url.searchParams.get("range") || "";
        const query = url.searchParams.get("q") || "";

        if (providerId === "opencode") {
          const metaMap = getAllMeta();
          const excludedIds = getExcludedIds();

          let sessions;
          let total;
          if (query) {
            const results = getSearchResults(query, apiLimit, apiOffset);
            sessions = enrichSessionList(results.sessions, metaMap, excludedIds);
            total = results.total;
          } else {
            const results = listSessions(apiLimit, apiOffset, "", range);
            sessions = enrichSessionList(results.sessions, metaMap, excludedIds);
            total = results.total;
          }

          return json(res, {
            sessions: sessions.map((session) => toApiSessionShape(normalizeSessionRecord(session))),
            total,
            offset: apiOffset,
            hasMore: apiOffset + sessions.length < total
          });
        }

        let sessions;
        let total;
        if (query) {
          const results = getProviderSearchResults(adapter, query, apiLimit, apiOffset);
          sessions = results.sessions;
          total = results.total;
        } else {
          const indexed = getIndexedSessions(providerId, apiLimit, apiOffset, range);
          sessions = indexed.sessions.map((session) => normalizeSessionRecord(session));
          total = indexed.total;
        }

        return json(res, {
          sessions: sessions.map((session) => toApiSessionShape(session)),
          total,
          offset: apiOffset,
          hasMore: apiOffset + sessions.length < total
        });
      } catch (err) {
        console.error(`Route error: ${err.message}`);
        return json(res, { error: "Internal server error" }, 500);
      }
    }

    const apiSessionExportMatch = pathname.match(/^\/api\/([a-z][a-z0-9-]*)\/session\/([^/]+)\/export$/);
    if (apiSessionExportMatch) {
      const providerId = apiSessionExportMatch[1];
      const id = decodeURIComponent(apiSessionExportMatch[2]);
      const adapter = providerMap.get(providerId);
      if (!adapter) {
        return json(res, { ok: false, error: "Provider not found" }, 404);
      }

      try {
        const format = url.searchParams.get("format") || "md";
        let session;
        let messages;
        let partsByMessage;

        if (providerId === "opencode") {
          const metaMap = getAllMeta();
          const rawSession = getSession(id);
          if (!rawSession) {
            return json(res, { ok: false, error: "Not found" }, 404);
          }
          session = normalizeSessionRecord(enrichSession(rawSession, metaMap));
          messages = getMessages(id).map((message) => ({ ...message, data: safeJsonParse(message.data) }));
          partsByMessage = loadPartsByMessage(messages);
        } else {
          const rawSession = adapter.getSession(id);
          if (!rawSession) {
            return json(res, { ok: false, error: "Not found" }, 404);
          }
          session = normalizeSessionRecord(rawSession);
          const mapped = buildPartsFromProviderMessages(adapter.getMessages(id));
          messages = mapped.messages;
          partsByMessage = mapped.partsByMessage;
        }

        if (format === "json") {
          const filename = `session-${id.slice(0, 8)}.json`;
          res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`
          });
          return res.end(JSON.stringify({
            session,
            messages: messages.map((message) => ({
              ...message,
              parts: (partsByMessage.get(message.id) || []).map((part) => part.data)
            }))
          }, null, 2));
        }

        const md = renderMarkdownExport(session, messages, partsByMessage);
        const filename = `session-${id.slice(0, 8)}.md`;
        res.writeHead(200, {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`
        });
        return res.end(md);
      } catch (err) {
        console.error(`Route error: ${err.message}`);
        return json(res, { error: "Internal server error" }, 500);
      }
    }

    const apiSessionDetailMatch = pathname.match(/^\/api\/([a-z][a-z0-9-]*)\/session\/([^/]+)$/);
    if (apiSessionDetailMatch) {
      const providerId = apiSessionDetailMatch[1];
      const sessionId = decodeURIComponent(apiSessionDetailMatch[2]);
      const adapter = providerMap.get(providerId);
      if (!adapter) {
        return json(res, { ok: false, error: "Provider not found" }, 404);
      }

      try {
        if (providerId === "opencode") {
          const metaMap = getAllMeta();
          const session = getSession(sessionId);
          if (!session) {
            return json(res, { ok: false, error: "Not found" }, 404);
          }
          const enrichedSession = normalizeSessionRecord(enrichSession(session, metaMap));
          const messages = getMessages(sessionId).map((message) => ({ ...message, data: safeJsonParse(message.data) }));
          const partsByMessage = loadPartsByMessage(messages);
          return json(res, {
            session: enrichedSession,
            messages: messages.map((message) => ({
              ...message,
              parts: (partsByMessage.get(message.id) || []).map((part) => part.data)
            }))
          });
        }

        const session = adapter.getSession(sessionId);
        if (!session) {
          return json(res, { ok: false, error: "Not found" }, 404);
        }

        return json(res, {
          session: normalizeSessionRecord(session),
          messages: adapter.getMessages(sessionId)
        });
      } catch (err) {
        console.error(`Route error: ${err.message}`);
        return json(res, { error: "Internal server error" }, 500);
      }
    }

    const apiSessionTraceMatch = pathname.match(/^\/api\/([a-z][a-z0-9-]*)\/session\/([^/]+)\/trace$/);
    if (apiSessionTraceMatch) {
      const providerId = apiSessionTraceMatch[1];
      const sessionId = decodeURIComponent(apiSessionTraceMatch[2]);
      const adapter = providerMap.get(providerId);
      if (!adapter) {
        return json(res, { ok: false, error: "Provider not found" }, 404);
      }

      try {
        if (providerId === "opencode") {
          return json(res, opencodeAdapter.getTrace(sessionId));
        }

        return json(res, {
          steps: [],
          summary: { totalSteps: 0, totalSpans: 0, totalDuration: 0, totalCost: 0, totalTokens: 0 }
        });
      } catch (err) {
        console.error(`Route error: ${err.message}`);
        return json(res, { error: "Internal server error" }, 500);
      }
    }

    const apiStatsMatch = pathname.match(/^\/api\/([a-z][a-z0-9-]*)\/stats$/);
    if (apiStatsMatch) {
      const providerId = apiStatsMatch[1];
      const adapter = providerMap.get(providerId);
      if (!adapter) {
        return json(res, { ok: false, error: "Provider not found" }, 404);
      }

      try {
        if (providerId === "opencode") {
          return json(res, getStats());
        }

        const indexed = getIndexedSessions(providerId, 100000, 0, "").sessions;
        const totalMessages = indexed.reduce((sum, session) => sum + (Number(session.message_count) || 0), 0);
        return json(res, {
          totalSessions: indexed.length,
          totalMessages,
          modelDistribution: []
        });
      } catch (err) {
        console.error(`Route error: ${err.message}`);
        return json(res, { error: "Internal server error" }, 500);
      }
    }

    if (!providerSegment) {
      send(res, 404, "<h1>Not found</h1>");
      return;
    }

    const currentProvider = getProvider(providerSegment);
    const adapter = providerMap.get(providerSegment);
    if (!currentProvider || !adapter) {
      send(res, 404, "<h1>Provider not found</h1>");
      return;
    }

    const renderContext = {
      provider: providerSegment,
      providers: providerInfo
    };

    if (subPath === "/") {
      try {
        const range = url.searchParams.get("range") || "";
        if (providerSegment === "opencode") {
          const { sessions, total } = listSessions(limit, offset, "", range);
          const metaMap = getAllMeta();
          const excludedIds = getExcludedIds();
          const enrichedSessions = enrichSessionList(sessions, metaMap, excludedIds).map((session) => normalizeSessionRecord(session));
          const overviewStats = getStats();
          const deletedCount = getDeletedIds().length;
          send(res, 200, renderSessionsPage({
            sessions: enrichedSessions,
            total,
            limit,
            offset,
            range,
            totalMessages: overviewStats.totalMessages,
            deletedCount,
            ...renderContext
          }));
          return;
        }

        const indexed = getIndexedSessions(providerSegment, limit, offset, range);
        const allIndexed = getIndexedSessions(providerSegment, 100000, 0, "").sessions;
        const totalMessages = allIndexed.reduce((sum, session) => sum + (Number(session.message_count) || 0), 0);
        send(res, 200, renderSessionsPage({
          sessions: indexed.sessions.map((session) => normalizeSessionRecord(session)),
          total: indexed.total,
          limit,
          offset,
          range,
          totalMessages,
          deletedCount: 0,
          ...renderContext
        }));
        return;
      } catch (err) {
        console.error(`Route error: ${err.message}`);
        return json(res, { error: "Internal server error" }, 500);
      }
    }

    if (subPath === "/search") {
      try {
        const query = url.searchParams.get("q") || "";
        if (providerSegment === "opencode") {
          const results = getSearchResults(query, limit, offset);
          const metaMap = getAllMeta();
          const excludedIds = getExcludedIds();
          const enrichedSessions = enrichSessionList(results.sessions, metaMap, excludedIds).map((session) => normalizeSessionRecord(session));
          send(res, 200, renderSessionsPage({ ...results, sessions: enrichedSessions, limit, offset, query, ...renderContext }));
          return;
        }

        const results = getProviderSearchResults(adapter, query, limit, offset);
        send(res, 200, renderSessionsPage({ ...results, limit, offset, query, ...renderContext }));
        return;
      } catch (err) {
        console.error(`Route error: ${err.message}`);
        return json(res, { error: "Internal server error" }, 500);
      }
    }

    if (subPath === "/stats") {
      try {
        if (providerSegment === "opencode") {
          const tokenStats = getTokenStats(30);
          const modelDistribution = getModelDistribution();
          const dailySessions = getDailySessionCounts(30);
          const overview = getStats();
          send(res, 200, renderStatsPage({ tokenStats, modelDistribution, dailySessions, overview, ...renderContext }));
          return;
        }

        const indexed = getIndexedSessions(providerSegment, 100000, 0, "").sessions;
        const tokenStats = adapter.getTokenStats(30).map((row) => ({
          day: row.day,
          input_tokens: Number(row.inputTokens) || 0,
          output_tokens: Number(row.outputTokens) || 0,
          total_tokens: Number(row.totalTokens) || 0,
          message_count: Number(row.messageCount) || 0
        }));
        const dailyMap = new Map();
        for (const session of indexed) {
          const day = new Date(Number(session.time_created) || 0).toISOString().slice(0, 10);
          dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
        }
        const dailySessions = [...dailyMap.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([day, count]) => ({ day, count }));
        const overview = {
          totalSessions: indexed.length,
          totalMessages: indexed.reduce((sum, session) => sum + (Number(session.message_count) || 0), 0)
        };
        send(res, 200, renderStatsPage({ tokenStats, modelDistribution: [], dailySessions, overview, ...renderContext }));
        return;
      } catch (err) {
        console.error(`Route error: ${err.message}`);
        return json(res, { error: "Internal server error" }, 500);
      }
    }

    if (subPath === "/trash") {
      if (providerSegment !== "opencode") {
        send(res, 404, "<h1>Not found</h1>");
        return;
      }
      try {
        const deletedIds = getDeletedIds();
        const sessions = getSessionsByIds(deletedIds);
        const metaMap = getAllMeta();
        const enriched = sessions.map((session) => normalizeSessionRecord(enrichSession(session, metaMap)));
        send(res, 200, renderTrashPage({ sessions: enriched, ...renderContext }));
        return;
      } catch (err) {
        console.error(`Route error: ${err.message}`);
        return json(res, { error: "Internal server error" }, 500);
      }
    }

    if (subPath.startsWith("/session/")) {
      try {
        const sessionId = decodeURIComponent(subPath.slice("/session/".length));

        if (providerSegment === "opencode") {
          const session = getSession(sessionId);
          if (!session) {
            send(res, 404, "<h1>Session not found</h1>");
            return;
          }

          const meta = getMeta(sessionId);
          const metaMap = getAllMeta();
          const excludedIds = getExcludedIds();
          const enrichedSession = normalizeSessionRecord(enrichSession(session, metaMap));
          const messages = getMessages(sessionId).map((message) => ({
            ...message,
            data: safeJsonParse(message.data)
          }));
          const partsByMessage = loadPartsByMessage(messages);
          const todos = getTodos(sessionId);
          const { sessions: recentSessions } = listSessions(30, 0);
          const enrichedRecentSessions = enrichSessionList(recentSessions, metaMap, excludedIds).map((item) => normalizeSessionRecord(item));
          send(res, 200, renderSessionPage({
            session: enrichedSession,
            messages,
            partsByMessage,
            todos,
            recentSessions: enrichedRecentSessions,
            meta,
            ...renderContext
          }));
          return;
        }

        const session = adapter.getSession(sessionId);
        if (!session) {
          send(res, 404, "<h1>Session not found</h1>");
          return;
        }

        const providerMessages = adapter.getMessages(sessionId);
        const { messages, partsByMessage } = buildPartsFromProviderMessages(providerMessages);
        const recentSessions = getIndexedSessions(providerSegment, 30, 0, "").sessions.map((item) => normalizeSessionRecord(item));
        send(res, 200, renderSessionPage({
          session: normalizeSessionRecord(session),
          messages,
          partsByMessage,
          todos: [],
          recentSessions,
          meta: null,
          ...renderContext
        }));
        return;
      } catch (err) {
        console.error(`Route error: ${err.message}`);
        return json(res, { error: "Internal server error" }, 500);
      }
    }

    send(res, 404, "<h1>Not found</h1>");
  };

  try {
    getDb();

    // Index all providers
    const providers = getAvailableProviders();
    getIndexDb();
    for (const provider of providers) {
      try {
        const startTime = Date.now();
        const sessions = [];
        for await (const session of provider.scan()) {
          sessions.push(session);
        }
        upsertIndex(provider.id, sessions);
        console.log(`Indexed ${sessions.length} sessions for ${provider.id} in ${Date.now() - startTime}ms`);
      } catch (err) {
        console.error(`Failed to index ${provider.id}: ${err.message}`);
      }
    }

    // Cache provider data after indexing (providers don't change at runtime)
    availableProviders = getAvailableProviders();
    providerMap = new Map(availableProviders.map((provider) => [provider.id, provider]));
    const availableIds = new Set(availableProviders.map((p) => p.id));
    providerInfo = getAllProviders().map((p) => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      available: availableIds.has(p.id)
    }));

    const stats = getStats();
    const server = createServer(requestHandler);
    server.listen(PORT, "127.0.0.1", () => {
      console.log(`OpenSession running at http://localhost:${PORT}`);
      console.log(`Language: ${getLocale()}`);
      console.log(`DB: ${appConfig.dbPath}`);
      console.log(`${stats.totalSessions} sessions, ${stats.totalMessages} messages.`);
    });

    if (appConfig.open) {
      const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
      import("node:child_process").then((cp) => cp.exec(`${cmd} http://localhost:${PORT}`));
    }
  } catch (error) {
    console.error("Failed to start:", error.message);
    process.exit(1);
  }
}
