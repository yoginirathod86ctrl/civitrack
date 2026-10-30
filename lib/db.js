const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = process.env.CIVICPULSE_DB || path.join(DATA_DIR, 'civicpulse.db');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'admin')),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    mobile TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    area TEXT,
    is_demo INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    lead TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS complaints (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    area TEXT NOT NULL,
    landmark TEXT,
    photo_path TEXT,
    status TEXT NOT NULL DEFAULT 'Submitted',
    priority TEXT NOT NULL,
    priority_score INTEGER NOT NULL,
    department_id TEXT REFERENCES departments(id),
    resolution_hours INTEGER NOT NULL,
    deadline TEXT NOT NULL,
    resolved_at TEXT,
    closed_at TEXT,
    assigned_at TEXT,
    started_at TEXT,
    escalated INTEGER NOT NULL DEFAULT 0,
    last_escalated_at TEXT,
    ai_analysis TEXT,
    is_demo INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS complaint_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    actor_id TEXT REFERENCES profiles(id),
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    old_status TEXT,
    new_status TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    complaint_id TEXT REFERENCES complaints(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS escalation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    previous_deadline TEXT NOT NULL,
    priority TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_complaints_user ON complaints(user_id);
  CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
  CREATE INDEX IF NOT EXISTS idx_complaints_area ON complaints(area);
  CREATE INDEX IF NOT EXISTS idx_complaints_created ON complaints(created_at);
  CREATE INDEX IF NOT EXISTS idx_updates_complaint ON complaint_updates(complaint_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
  CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
  CREATE INDEX IF NOT EXISTS idx_escalations_complaint ON escalation_logs(complaint_id);
`);

function getMeta(key) {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setMeta(key, value) {
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value));
}

module.exports = { db, DB_PATH, DATA_DIR, getMeta, setMeta };
