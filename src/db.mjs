import { DatabaseSync } from "node:sqlite";
import { getConfig } from "./config.mjs";
import { parseJson, createSnippet, mapDataRow } from "./providers/opencode/parser.mjs";

let dbInstance;
let dbPath;

function resolveDbPath() { return getConfig().dbPath; }

export function getDb() {
  const nextPath = resolveDbPath();

  if (dbInstance && dbPath === nextPath) {
    return dbInstance;
  }

  if (dbInstance && typeof dbInstance.close === "function") {
    dbInstance.close();
  }

  dbInstance = new DatabaseSync(nextPath, { readOnly: true });
  dbPath = nextPath;
  dbInstance.exec("PRAGMA journal_mode = WAL;");
  dbInstance.exec("PRAGMA busy_timeout = 5000;");
  return dbInstance;
}

export function listSessions(limit = 50, offset = 0, search = "", timeRange = "") {
  const db = getDb();
  const searchTerm = search ? `%${search}%` : null;

  // Time range filter
  let timeFilter = "";
  const now = Date.now();
  if (timeRange === "today") {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    timeFilter = ` AND session.time_updated >= ${startOfDay.getTime()}`;
  } else if (timeRange === "week") {
    timeFilter = ` AND session.time_updated >= ${now - 7 * 86400000}`;
  } else if (timeRange === "month") {
    timeFilter = ` AND session.time_updated >= ${now - 30 * 86400000}`;
  }

  const whereClause = searchTerm
    ? `WHERE time_archived IS NULL AND parent_id IS NULL AND (COALESCE(title, '') LIKE ? OR COALESCE(slug, '') LIKE ? OR COALESCE(directory, '') LIKE ?)${timeFilter}`
    : `WHERE time_archived IS NULL AND parent_id IS NULL${timeFilter}`;
  const searchParams = searchTerm ? [searchTerm, searchTerm, searchTerm] : [];

  const sessions = db.prepare(`
    SELECT id, project_id, slug, title, directory, time_created, time_updated,
           summary_additions, summary_deletions, summary_files, time_archived
    FROM session
    ${whereClause}
    ORDER BY time_updated DESC, time_created DESC
    LIMIT ? OFFSET ?
  `).all(...searchParams, limit, offset);

  const totalRow = db.prepare(`
    SELECT COUNT(*) AS total
    FROM session
    ${whereClause}
  `).get(...searchParams);

  return { sessions, total: totalRow?.total ?? 0 };
}

export function getSession(id) {
  const db = getDb();
  return db.prepare(`
    SELECT id, project_id, slug, title, directory, time_created, time_updated,
           summary_additions, summary_deletions, summary_files, time_archived
    FROM session
    WHERE id = ?
  `).get(id) ?? null;
}

export function getMessages(sessionId) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, session_id, data
    FROM message
    WHERE session_id = ?
    ORDER BY COALESCE(CAST(json_extract(data, '$.time.created') AS INTEGER), 0), id
  `).all(sessionId);

  return rows.map(mapDataRow);
}

export function getParts(messageId) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, message_id, session_id, data
    FROM part
    WHERE message_id = ?
    ORDER BY rowid ASC, id ASC
  `).all(messageId);

  return rows.map(mapDataRow);
}

export function getTodos(sessionId) {
  const db = getDb();
  return db.prepare(`
    SELECT session_id, content, status, priority, position, time_created
    FROM todo
    WHERE session_id = ?
    ORDER BY position ASC, time_created ASC
  `).all(sessionId);
}

export function searchMessages(query, limit = 20) {
  const db = getDb();
  const term = query?.trim();

  if (!term) {
    return [];
  }

  const searchTerm = `%${term}%`;
  const rows = db.prepare(`
    SELECT part.id AS part_id,
           part.message_id,
           part.session_id,
           part.data AS part_data,
           message.data AS message_data,
           session.title AS session_title,
           session.slug AS session_slug,
           session.time_updated
    FROM part
    JOIN message ON message.id = part.message_id
    JOIN session ON session.id = part.session_id
    WHERE session.time_archived IS NULL
      AND COALESCE(json_extract(part.data, '$.text'), '') LIKE ?
    ORDER BY session.time_updated DESC,
             COALESCE(CAST(json_extract(message.data, '$.time.created') AS INTEGER), 0) DESC,
             part.id DESC
    LIMIT ?
  `).all(searchTerm, limit);

  return rows.map((row) => {
    const partData = parseJson(row.part_data) || {};
    const messageData = parseJson(row.message_data) || {};
    const text = partData.text || "";

    return {
      partId: row.part_id,
      messageId: row.message_id,
      sessionId: row.session_id,
      sessionTitle: row.session_title,
      sessionSlug: row.session_slug,
      timeUpdated: row.time_updated,
      role: messageData.role,
      text,
      snippet: createSnippet(text, term)
    };
  });
}

export function getStats() {
  const db = getDb();
  const totalSessions = db.prepare(`
    SELECT COUNT(*) AS count
    FROM session
    WHERE time_archived IS NULL
  `).get()?.count ?? 0;

  const totalMessages = db.prepare(`
    SELECT COUNT(*) AS count
    FROM message
    JOIN session ON session.id = message.session_id
    WHERE session.time_archived IS NULL
  `).get()?.count ?? 0;

  const modelDistribution = db.prepare(`
    SELECT
      CASE
        WHEN json_extract(message.data, '$.providerID') IS NOT NULL
          AND json_extract(message.data, '$.modelID') IS NOT NULL
          THEN json_extract(message.data, '$.providerID') || '/' || json_extract(message.data, '$.modelID')
        WHEN json_extract(message.data, '$.modelID') IS NOT NULL
          THEN json_extract(message.data, '$.modelID')
        ELSE 'unknown'
      END AS model,
      COUNT(*) AS count
    FROM message
    JOIN session ON session.id = message.session_id
    WHERE session.time_archived IS NULL
    GROUP BY model
    ORDER BY count DESC, model ASC
  `).all().map((row) => ({
    model: row.model,
    count: row.count
  }));

  return {
    totalSessions,
    totalMessages,
    modelDistribution
  };
}

export function getTokenStats(days = 30) {
  const d = getDb();
  const cutoff = Date.now() - days * 86400000;
  return d.prepare(`
    SELECT date(json_extract(data, '$.time.created') / 1000, 'unixepoch') as day,
           SUM(json_extract(data, '$.tokens.total')) as total_tokens,
           SUM(json_extract(data, '$.tokens.input')) as input_tokens,
           SUM(json_extract(data, '$.tokens.output')) as output_tokens,
           COUNT(*) as message_count
    FROM message
    WHERE json_extract(data, '$.role') = 'assistant'
      AND json_extract(data, '$.time.created') > ?
      AND json_extract(data, '$.tokens.total') > 0
    GROUP BY day ORDER BY day ASC
  `).all(cutoff);
}

export function getModelDistribution() {
  const d = getDb();
  return d.prepare(`
    SELECT json_extract(data, '$.modelID') as model,
           json_extract(data, '$.providerID') as provider,
           COUNT(*) as count,
           SUM(json_extract(data, '$.tokens.total')) as total_tokens
    FROM message
    WHERE json_extract(data, '$.role') = 'assistant'
      AND json_extract(data, '$.modelID') IS NOT NULL
    GROUP BY model, provider
    ORDER BY count DESC
  `).all();
}

export function getDailySessionCounts(days = 30) {
  const d = getDb();
  const cutoff = Date.now() - days * 86400000;
  return d.prepare(`
    SELECT date(time_created / 1000, 'unixepoch') as day,
           COUNT(*) as count
    FROM session
     WHERE time_created > ?
     GROUP BY day ORDER BY day ASC
  `).all(cutoff);
}

export function getSessionsByIds(ids) {
  if (!ids.length) return [];
  const db = getDb();
  const placeholders = ids.map(() => "?").join(",");
  return db.prepare(`
    SELECT id, project_id, slug, title, directory, time_created, time_updated,
           summary_additions, summary_deletions, summary_files
    FROM session
    WHERE id IN (${placeholders})
    ORDER BY time_updated DESC
  `).all(...ids);
}
