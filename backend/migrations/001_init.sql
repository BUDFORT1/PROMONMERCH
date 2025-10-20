PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,            -- firebase uid or uuid()
  email TEXT UNIQUE,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- small seed row to test quickly
INSERT INTO users (id, email, name)
VALUES ('demo_uid', 'demo@example.com', 'Demo User')
ON CONFLICT(id) DO NOTHING;
