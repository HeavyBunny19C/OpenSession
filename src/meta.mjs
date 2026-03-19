import { DatabaseSync } from "node:sqlite";
import { getConfig } from "./config.mjs";

function getMetaDbPath() { return getConfig().metaPath; }

let metaDb;

export function getMetaDb() {
  if (!metaDb) {
    metaDb = new DatabaseSync(getMetaDbPath());
    metaDb.exec(`
      CREATE TABLE IF NOT EXISTS session_meta (
        session_id TEXT PRIMARY KEY,
        custom_title TEXT,
        starred INTEGER DEFAULT 0,
        deleted INTEGER DEFAULT 0,
        permanent INTEGER DEFAULT 0,
        time_starred INTEGER,
        time_deleted INTEGER,
        time_renamed INTEGER
      )
    `);
  }
  return metaDb;
}

/** 确保 session_id 在 session_meta 中有记录（upsert 辅助） */
function ensureMeta(sessionId) {
  const db = getMetaDb();
  const existing = db.prepare("SELECT 1 FROM session_meta WHERE session_id = ?").get(sessionId);
  if (!existing) {
    db.prepare("INSERT INTO session_meta (session_id) VALUES (?)").run(sessionId);
  }
}

export function getMeta(sessionId) {
  const db = getMetaDb();
  return db.prepare("SELECT * FROM session_meta WHERE session_id = ?").get(sessionId) || null;
}

export function getAllMeta() {
  const db = getMetaDb();
  const rows = db.prepare("SELECT * FROM session_meta").all();
  const map = new Map();
  for (const row of rows) map.set(row.session_id, row);
  return map;
}

/** 返回所有 deleted=1 且 permanent=0 的 session_id 列表 */
export function getDeletedIds() {
  const db = getMetaDb();
  return db.prepare("SELECT session_id FROM session_meta WHERE deleted = 1 AND permanent = 0").all()
    .map(r => r.session_id);
}

/** 返回所有 deleted=1 或 permanent=1 的 session_id 集合（用于列表排除） */
export function getExcludedIds() {
  const db = getMetaDb();
  return new Set(
    db.prepare("SELECT session_id FROM session_meta WHERE deleted = 1 OR permanent = 1").all()
      .map(r => r.session_id)
  );
}

export function toggleStar(sessionId) {
  const db = getMetaDb();
  ensureMeta(sessionId);
  const row = db.prepare("SELECT starred FROM session_meta WHERE session_id = ?").get(sessionId);
  const newStarred = row.starred ? 0 : 1;
  db.prepare("UPDATE session_meta SET starred = ?, time_starred = ? WHERE session_id = ?")
    .run(newStarred, newStarred ? Date.now() : null, sessionId);
  return newStarred === 1;
}

export function renameSession(sessionId, newTitle) {
  const db = getMetaDb();
  ensureMeta(sessionId);
  db.prepare("UPDATE session_meta SET custom_title = ?, time_renamed = ? WHERE session_id = ?")
    .run(newTitle || null, Date.now(), sessionId);
}

export function softDelete(sessionId) {
  const db = getMetaDb();
  ensureMeta(sessionId);
  db.prepare("UPDATE session_meta SET deleted = 1, time_deleted = ? WHERE session_id = ?")
    .run(Date.now(), sessionId);
}

export function restoreSession(sessionId) {
  const db = getMetaDb();
  db.prepare("UPDATE session_meta SET deleted = 0, time_deleted = NULL WHERE session_id = ?")
    .run(sessionId);
}

export function permanentDelete(sessionId) {
  const db = getMetaDb();
  ensureMeta(sessionId);
  db.prepare("UPDATE session_meta SET deleted = 1, permanent = 1 WHERE session_id = ?")
    .run(sessionId);
}

export function batchAction(ids, action) {
  for (const id of ids) {
    if (action === "delete") softDelete(id);
    else if (action === "restore") restoreSession(id);
    else if (action === "permanent-delete") permanentDelete(id);
    else if (action === "star") {
      const m = getMeta(id);
      if (!m || !m.starred) toggleStar(id);
    }
    else if (action === "unstar") {
      const m = getMeta(id);
      if (m && m.starred) toggleStar(id);
    }
  }
  return ids.length;
}
