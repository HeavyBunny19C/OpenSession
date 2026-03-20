// src/index-db.mjs
import { DatabaseSync } from "node:sqlite";
import { getConfig } from "./config.mjs";

let indexDb;

export function getIndexDb() {
  if (!indexDb) {
    indexDb = new DatabaseSync(getConfig().metaPath);
    indexDb.exec(`
      CREATE TABLE IF NOT EXISTS session_index (
        id TEXT NOT NULL,
        provider TEXT NOT NULL,
        parent_id TEXT,
        title TEXT,
        directory TEXT,
        time_created INTEGER,
        time_updated INTEGER,
        message_count INTEGER DEFAULT 0,
        token_count INTEGER,
        last_indexed INTEGER NOT NULL,
        PRIMARY KEY (provider, id)
      )
    `);
    indexDb.exec("CREATE INDEX IF NOT EXISTS idx_session_provider ON session_index(provider)");
    indexDb.exec("CREATE INDEX IF NOT EXISTS idx_session_updated ON session_index(time_updated DESC)");
  }
  return indexDb;
}

/**
 * Upsert a batch of RawSession objects into session_index.
 * @param {string} provider
 * @param {import('./providers/interface.mjs').RawSession[]} sessions
 */
export function upsertIndex(provider, sessions) {
  const db = getIndexDb();
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO session_index
      (id, provider, parent_id, title, directory, time_created, time_updated, message_count, token_count, last_indexed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const s of sessions) {
    stmt.run(s.id, provider, s.parentId, s.title, s.directory, s.timeCreated, s.timeUpdated, s.messageCount, s.tokenCount, now);
  }
}

/**
 * Get indexed sessions for a provider.
 * @param {string} provider
 * @param {number} limit
 * @param {number} offset
 * @param {string} timeRange - "today"|"week"|"month"|""
 * @returns {{ sessions: object[], total: number }}
 */
export function getIndexedSessions(provider, limit = 50, offset = 0, timeRange = "") {
  const db = getIndexDb();
  let timeFilter = "";
  const now = Date.now();
  if (timeRange === "today") {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    timeFilter = ` AND time_updated >= ${startOfDay.getTime()}`;
  } else if (timeRange === "week") {
    timeFilter = ` AND time_updated >= ${now - 7 * 86400000}`;
  } else if (timeRange === "month") {
    timeFilter = ` AND time_updated >= ${now - 30 * 86400000}`;
  }

  const total = db.prepare(`SELECT COUNT(*) as c FROM session_index WHERE provider = ?${timeFilter}`).get(provider).c;
  const sessions = db.prepare(`
    SELECT * FROM session_index WHERE provider = ?${timeFilter}
    ORDER BY time_updated DESC LIMIT ? OFFSET ?
  `).all(provider, limit, offset);

  return { sessions, total };
}

/**
 * Run a full index for a provider using its scan() method.
 * @param {import('./providers/interface.mjs').ProviderAdapter} adapter
 */
export async function indexProvider(adapter) {
  const batch = [];
  for await (const session of adapter.scan()) {
    batch.push(session);
  }
  if (batch.length > 0) {
    upsertIndex(adapter.id, batch);
  }
  return batch.length;
}

/**
 * Get the latest time_updated for a provider in the index.
 * @param {string} provider
 * @returns {number}
 */
export function getLastIndexedTime(provider) {
  const db = getIndexDb();
  const row = db.prepare("SELECT MAX(last_indexed) as t FROM session_index WHERE provider = ?").get(provider);
  return row?.t || 0;
}

/**
 * Clear indexed sessions for a provider (or all providers).
 * @param {string} [provider]
 */
export function clearIndex(provider) {
  const db = getIndexDb();
  if (provider) {
    db.prepare("DELETE FROM session_index WHERE provider = ?").run(provider);
  } else {
    db.exec("DELETE FROM session_index");
  }
}
