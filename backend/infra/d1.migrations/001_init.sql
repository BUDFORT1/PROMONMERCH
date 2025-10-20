-- 001_init.sql
-- Core tables for users, designs, orders, revisions, comments, artwork requests, accounting.

PRAGMA foreign_keys = ON;

-- Users (from Firebase)
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,              -- firebase uid
  email         TEXT UNIQUE,
  name          TEXT,
  created_at    TEXT DEFAULT (datetime('now'))
);

-- Designs saved by users (recipes from Create engine)
CREATE TABLE IF NOT EXISTS designs (
  id            TEXT PRIMARY KEY,              -- e.g., uuid()
  user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  product_slug  TEXT NOT NULL,                 -- 'classic-tee', 'poster', etc.
  recipe_json   TEXT NOT NULL,                 -- JSON “recipe”
  preview_url   TEXT,                          -- R2 URL for small preview
  updated_at    TEXT DEFAULT (datetime('now')),
  created_at    TEXT DEFAULT (datetime('now'))
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id             TEXT PRIMARY KEY,             -- e.g., ord_xxx (uuid)
  user_id        TEXT REFERENCES users(id) ON DELETE SET NULL,
  product_slug   TEXT NOT NULL,
  options_json   TEXT NOT NULL,                -- color/size/preset, etc.
  design_id      TEXT REFERENCES designs(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'draft',-- draft|pending|paid|in_production|ready|completed|canceled
  amount_cents   INTEGER NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'usd',
  fulfillment    TEXT NOT NULL DEFAULT 'pickup',  -- pickup|ship
  shipping_json  TEXT,                          -- address/label data if ship
  stripe_ref     TEXT,                          -- checkout session/payment intent id
  created_at     TEXT DEFAULT (datetime('now')),
  updated_at     TEXT DEFAULT (datetime('now'))
);

-- Revisions (proof versions) linked to orders
CREATE TABLE IF NOT EXISTS revisions (
  id            TEXT PRIMARY KEY,               -- rev_xxx
  order_id      TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  version       INTEGER NOT NULL,               -- 1,2,3…
  proof_url     TEXT NOT NULL,                  -- R2 URL to proof image/PDF
  notes         TEXT,
  created_by    TEXT,                           -- admin/user id or email
  created_at    TEXT DEFAULT (datetime('now'))
);

-- Comments on revisions (review thread)
CREATE TABLE IF NOT EXISTS comments (
  id            TEXT PRIMARY KEY,
  revision_id   TEXT NOT NULL REFERENCES revisions(id) ON DELETE CASCADE,
  author_id     TEXT,                           -- user/admin id
  author_name   TEXT,
  body          TEXT NOT NULL,
  created_at    TEXT DEFAULT (datetime('now'))
);

-- Artwork Requests (design brief intake)
CREATE TABLE IF NOT EXISTS artwork_requests (
  id                TEXT PRIMARY KEY,           -- req_xxx
  user_id           TEXT REFERENCES users(id) ON DELETE SET NULL,
  product_type      TEXT NOT NULL,              -- t-shirt|poster|mylar|other
  short_description TEXT NOT NULL,
  style             TEXT,
  color_vibe        TEXT,
  text_wanted       TEXT,
  use_case          TEXT,
  deadline          TEXT,
  notes             TEXT,
  reference_json    TEXT,                       -- array of R2 URLs
  status            TEXT NOT NULL DEFAULT 'awaiting_quote', -- awaiting_quote|quoted|in_progress|delivered|canceled
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

-- Basic accounting (you can expand later)
CREATE TABLE IF NOT EXISTS accounting_entries (
  id            TEXT PRIMARY KEY,               -- acc_xxx
  order_id      TEXT REFERENCES orders(id) ON DELETE SET NULL,
  type          TEXT NOT NULL,                  -- revenue|expense
  category      TEXT,                           -- materials|labor|shipping|sale
  amount_cents  INTEGER NOT NULL,
  note          TEXT,
  created_at    TEXT DEFAULT (datetime('now'))
);