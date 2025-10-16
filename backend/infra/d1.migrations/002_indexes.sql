-- 002_indexes.sql
-- Helpful indexes for common queries

CREATE INDEX IF NOT EXISTS idx_users_email            ON users(email);
CREATE INDEX IF NOT EXISTS idx_designs_user           ON designs(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user            ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status          ON orders(status);
CREATE INDEX IF NOT EXISTS idx_revisions_order_ver    ON revisions(order_id, version);
CREATE INDEX IF NOT EXISTS idx_comments_revision      ON comments(revision_id);
CREATE INDEX IF NOT EXISTS idx_requests_user_status   ON artwork_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_accounting_order       ON accounting_entries(order_id);