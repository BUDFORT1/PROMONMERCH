PRAGMA foreign_keys = ON;

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- DESIGNS
CREATE TABLE IF NOT EXISTS designs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  product_slug TEXT,
  design_json TEXT,
  preview_url TEXT,
  status TEXT DEFAULT 'draft',
  created_at TEXT DEFAULT (datetime('now'))
);

-- ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  design_id TEXT REFERENCES designs(id),
  total REAL,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

-- ARTWORK REQUESTS
CREATE TABLE IF NOT EXISTS artwork_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  product_type TEXT,
  short_description TEXT,
  style TEXT,
  color_vibe TEXT,
  text_wanted TEXT,
  use_case TEXT,
  deadline TEXT,
  notes TEXT,
  reference_images TEXT,
  status TEXT DEFAULT 'awaiting_quote',
  created_at TEXT DEFAULT (datetime('now'))
);

-- ACCOUNTING (simple revenue log)
CREATE TABLE IF NOT EXISTS accounting (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id),
  revenue REAL,
  materials_cost REAL,
  labor_cost REAL,
  created_at TEXT DEFAULT (datetime('now'))
);
