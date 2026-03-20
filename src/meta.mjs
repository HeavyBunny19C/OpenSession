import { DatabaseSync } from "node:sqlite";
import { getConfig } from "./config.mjs";

function getMetaDbPath() { return getConfig().metaPath; }

let metaDb;

export function getMetaDb() {
  if (!metaDb) {
    metaDb = new DatabaseSync(getMetaDbPath());
    // Migration: add provider column if not present
    const tableInfo = metaDb.prepare("PRAGMA table_info(session_meta)").all();
    const hasProvider = tableInfo.some((col) => col.name === "provider");

    if (!hasProvider && tableInfo.length > 0) {
      metaDb.exec("BEGIN TRANSACTION");
      try {
        metaDb.exec(`
          CREATE TABLE session_meta_v2 (
            provider TEXT NOT NULL DEFAULT 'opencode',
            session_id TEXT NOT NULL,
            custom_title TEXT,
            starred INTEGER DEFAULT 0,
            deleted INTEGER DEFAULT 0,
            permanent INTEGER DEFAULT 0,
            time_starred INTEGER,
            time_deleted INTEGER,
            time_renamed INTEGER,
            PRIMARY KEY (provider, session_id)
          )
        `);
        metaDb.exec(`
          INSERT INTO session_meta_v2 (provider, session_id, custom_title, starred, deleted, permanent, time_starred, time_deleted, time_renamed)
          SELECT 'opencode', session_id, custom_title, starred, deleted, permanent, time_starred, time_deleted, time_renamed
          FROM session_meta
        `);
        metaDb.exec("DROP TABLE session_meta");
        metaDb.exec("ALTER TABLE session_meta_v2 RENAME TO session_meta");
        metaDb.exec("COMMIT");
      } catch (err) {
        metaDb.exec("ROLLBACK");
        throw err;
      }
    } else if (tableInfo.length === 0) {
      // Fresh install
      metaDb.exec(`
        CREATE TABLE IF NOT EXISTS session_meta (
          provider TEXT NOT NULL DEFAULT 'opencode',
          session_id TEXT NOT NULL,
          custom_title TEXT,
          starred INTEGER DEFAULT 0,
          deleted INTEGER DEFAULT 0,
          permanent INTEGER DEFAULT 0,
          time_starred INTEGER,
          time_deleted INTEGER,
          time_renamed INTEGER,
          PRIMARY KEY (provider, session_id)
        )
      `);
    }
  }
  return metaDb;
}

/**
 * Backward-compat: if called with 1 arg, treat it as sessionId with provider="opencode".
 * If called with 2 args, first is provider, second is sessionId.
 */
function resolveArgs(providerOrId, sessionId) {
  if (sessionId === undefined) {
    return ["opencode", providerOrId];
  }
  return [providerOrId, sessionId];
}

/** 确保 session_id 在 session_meta 中有记录（upsert 辅助） */
function ensureMeta(providerOrId, sessionId) {
  const [provider, sid] = resolveArgs(providerOrId, sessionId);
  const db = getMetaDb();
  const existing = db.prepare("SELECT 1 FROM session_meta WHERE provider = ? AND session_id = ?").get(provider, sid);
  if (!existing) {
    db.prepare("INSERT INTO session_meta (provider, session_id) VALUES (?, ?)").run(provider, sid);
  }
}

export function getMeta(providerOrId, sessionId) {
  const [provider, sid] = resolveArgs(providerOrId, sessionId);
  const db = getMetaDb();
  return db.prepare("SELECT * FROM session_meta WHERE provider = ? AND session_id = ?").get(provider, sid) || null;
}

export function getAllMeta(provider) {
  const db = getMetaDb();
  const rows = provider
    ? db.prepare("SELECT * FROM session_meta WHERE provider = ?").all(provider)
    : db.prepare("SELECT * FROM session_meta").all();
  const map = new Map();
  for (const row of rows) map.set(row.session_id, row);
  return map;
}

/** 返回所有 deleted=1 且 permanent=0 的 session_id 列表 */
export function getDeletedIds(provider = "opencode") {
  const db = getMetaDb();
  return db.prepare("SELECT session_id FROM session_meta WHERE provider = ? AND deleted = 1 AND permanent = 0").all(provider)
    .map(r => r.session_id);
}

/** 返回所有 deleted=1 或 permanent=1 的 session_id 集合（用于列表排除） */
export function getExcludedIds(provider = "opencode") {
  const db = getMetaDb();
  return new Set(
    db.prepare("SELECT session_id FROM session_meta WHERE provider = ? AND (deleted = 1 OR permanent = 1)").all(provider)
      .map(r => r.session_id)
  );
}

export function toggleStar(providerOrId, sessionId) {
  const [provider, sid] = resolveArgs(providerOrId, sessionId);
  const db = getMetaDb();
  ensureMeta(provider, sid);
  const row = db.prepare("SELECT starred FROM session_meta WHERE provider = ? AND session_id = ?").get(provider, sid);
  const newStarred = row.starred ? 0 : 1;
  db.prepare("UPDATE session_meta SET starred = ?, time_starred = ? WHERE provider = ? AND session_id = ?")
    .run(newStarred, newStarred ? Date.now() : null, provider, sid);
  return newStarred === 1;
}

export function renameSession(providerOrId, sessionIdOrTitle, newTitle) {
  let provider, sid, title;
  if (newTitle === undefined) {
    // Legacy: renameSession(sessionId, title)
    provider = "opencode";
    sid = providerOrId;
    title = sessionIdOrTitle;
  } else {
    // New: renameSession(provider, sessionId, title)
    provider = providerOrId;
    sid = sessionIdOrTitle;
    title = newTitle;
  }
  const db = getMetaDb();
  ensureMeta(provider, sid);
  db.prepare("UPDATE session_meta SET custom_title = ?, time_renamed = ? WHERE provider = ? AND session_id = ?")
    .run(title || null, Date.now(), provider, sid);
}

export function softDelete(providerOrId, sessionId) {
  const [provider, sid] = resolveArgs(providerOrId, sessionId);
  const db = getMetaDb();
  ensureMeta(provider, sid);
  db.prepare("UPDATE session_meta SET deleted = 1, time_deleted = ? WHERE provider = ? AND session_id = ?")
    .run(Date.now(), provider, sid);
}

export function restoreSession(providerOrId, sessionId) {
  const [provider, sid] = resolveArgs(providerOrId, sessionId);
  const db = getMetaDb();
  db.prepare("UPDATE session_meta SET deleted = 0, time_deleted = NULL WHERE provider = ? AND session_id = ?")
    .run(provider, sid);
}

export function permanentDelete(providerOrId, sessionId) {
  const [provider, sid] = resolveArgs(providerOrId, sessionId);
  const db = getMetaDb();
  ensureMeta(provider, sid);
  db.prepare("UPDATE session_meta SET deleted = 1, permanent = 1 WHERE provider = ? AND session_id = ?")
    .run(provider, sid);
}

export function batchAction(providerOrIds, idsOrAction, actionArg) {
  let provider, ids, action;
  if (actionArg === undefined) {
    // Legacy: batchAction(ids, action)
    provider = "opencode";
    ids = providerOrIds;
    action = idsOrAction;
  } else {
    // New: batchAction(provider, ids, action)
    provider = providerOrIds;
    ids = idsOrAction;
    action = actionArg;
  }
  for (const id of ids) {
    if (action === "delete") softDelete(provider, id);
    else if (action === "restore") restoreSession(provider, id);
    else if (action === "permanent-delete") permanentDelete(provider, id);
    else if (action === "star") {
      const m = getMeta(provider, id);
      if (!m || !m.starred) toggleStar(provider, id);
    }
    else if (action === "unstar") {
      const m = getMeta(provider, id);
      if (m && m.starred) toggleStar(provider, id);
    }
  }
  return ids.length;
}
