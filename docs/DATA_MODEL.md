# Data Model (v1)

> Source of truth for D1 schema used by Cloudflare Workers API.  
> See migrations in `/infra/d1.migrations/001_init.sql` and `/infra/d1.migrations/002_indexes.sql`.

## Conventions
- **IDs**: `TEXT` (UUIDs or prefixed ids: `ord_`, `rev_`, `req_`, `acc_`, etc.)
- **Timestamps**: `TEXT` ISO strings (default `datetime('now')`)
- **JSON fields**: stored as `TEXT` (stringified JSON)
- **FKs**: `PRAGMA foreign_keys = ON;` (enforced)
- **Currencies**: integer cents (e.g., `amount_cents`)

---

## Tables

### `users`
Stores authenticated users (from Firebase).

| column       | type | notes |
|--------------|------|-------|
| id           | TEXT PRIMARY KEY | Firebase UID |
| email        | TEXT UNIQUE      | nullable |
| name         | TEXT             | optional display name |
| created_at   | TEXT             | default `datetime('now')` |

---

### `designs`
Saved designs from the Create engine (recipes + preview).

| column        | type | notes |
|---------------|------|-------|
| id            | TEXT PRIMARY KEY | `uuid()` |
| user_id       | TEXT FK → users(id) | `ON DELETE SET NULL` |
| product_slug  | TEXT NOT NULL      | e.g. `classic-tee`, `poster` |
| recipe_json   | TEXT NOT NULL      | serialized design “recipe” |
| preview_url   | TEXT               | R2 URL to small preview |
| updated_at    | TEXT               | default now |
| created_at    | TEXT               | default now |

**Index**: `idx_designs_user` on `(user_id)`

---

### `orders`
Customer orders linked to a design and Stripe.

| column        | type | notes |
|---------------|------|-------|
| id            | TEXT PRIMARY KEY     | e.g. `ord_xxx` |
| user_id       | TEXT FK → users(id)  | `ON DELETE SET NULL` |
| product_slug  | TEXT NOT NULL        | |
| options_json  | TEXT NOT NULL        | size/color/preset selections |
| design_id     | TEXT FK → designs(id)| `ON DELETE SET NULL` |
| status        | TEXT NOT NULL        | enum below, default `draft` |
| amount_cents  | INTEGER NOT NULL     | total in cents |
| currency      | TEXT NOT NULL        | default `usd` |
| fulfillment   | TEXT NOT NULL        | `pickup` \| `ship` |
| shipping_json | TEXT                 | address/label if shipping |
| stripe_ref    | TEXT                 | Checkout Session/PI id |
| created_at    | TEXT                 | default now |
| updated_at    | TEXT                 | default now |

**Statuses**: `draft` → `pending` → `paid` → `in_production` → `ready` → `completed` \| `canceled`  
**Indexes**: `idx_orders_user` `(user_id)`, `idx_orders_status` `(status)`

---

### `revisions`
Proof versions for an order.

| column     | type | notes |
|------------|------|-------|
| id         | TEXT PRIMARY KEY      | `rev_xxx` |
| order_id   | TEXT NOT NULL FK → orders(id) | `ON DELETE CASCADE` |
| version    | INTEGER NOT NULL      | 1,2,3… |
| proof_url  | TEXT NOT NULL         | R2 URL to proof (PNG/PDF) |
| notes      | TEXT                  | optional |
| created_by | TEXT                  | admin/user id or email |
| created_at | TEXT                  | default now |

**Index**: `idx_revisions_order_ver` `(order_id, version)`

---

### `comments`
Threaded comments on a revision.

| column      | type | notes |
|-------------|------|-------|
| id          | TEXT PRIMARY KEY |
| revision_id | TEXT NOT NULL FK → revisions(id) | `ON DELETE CASCADE` |
| author_id   | TEXT | user/admin id |
| author_name | TEXT | display name |
| body        | TEXT NOT NULL |
| created_at  | TEXT |

**Index**: `idx_comments_revision` `(revision_id)`

---

### `artwork_requests`
Intake for “Request Artwork” briefs.

| column            | type | notes |
|-------------------|------|-------|
| id                | TEXT PRIMARY KEY  | `req_xxx` |
| user_id           | TEXT FK → users(id) | `ON DELETE SET NULL` |
| product_type      | TEXT NOT NULL     | `t-shirt` \| `poster` \| `mylar` \| `other` |
| short_description | TEXT NOT NULL     | |
| style             | TEXT              | chips: Minimal/Vintage/etc. |
| color_vibe        | TEXT              | Bright/Pastel/Dark/Neutral |
| text_wanted       | TEXT              | |
| use_case          | TEXT              | |
| deadline          | TEXT              | ISO date or text |
| notes             | TEXT              | |
| reference_json    | TEXT              | array of R2 URLs |
| status            | TEXT NOT NULL     | `awaiting_quote` \| `quoted` \| `in_progress` \| `delivered` \| `canceled` |
| created_at        | TEXT              | default now |
| updated_at        | TEXT              | default now |

**Index**: `idx_requests_user_status` `(user_id, status)`

---

### `accounting_entries`
Lightweight ledger for P&L.

| column       | type | notes |
|--------------|------|-------|
| id           | TEXT PRIMARY KEY | `acc_xxx` |
| order_id     | TEXT FK → orders(id) | `ON DELETE SET NULL` |
| type         | TEXT NOT NULL | `revenue` \| `expense` |
| category     | TEXT | `materials` \| `labor` \| `shipping` \| `sale` |
| amount_cents | INTEGER NOT NULL |
| note         | TEXT |
| created_at   | TEXT |

**Index**: `idx_accounting_order` `(order_id)`

---

## Relationships
- `users 1—* designs`
- `users 1—* orders`
- `orders 1—* revisions`
- `revisions 1—* comments`
- `users 1—* artwork_requests`
- `orders 1—* accounting_entries`
- `designs 1—0..1 orders` (optional FK from order to design)

---

## R2 Storage Layout (convention)
- **User temp uploads:** `users/{uid}/tmp/{uuid}.{ext}`
- **Design previews:** `users/{uid}/designs/{designId}/preview.webp`
- **Order assets:** `orders/{orderId}/print/{file}`
- **Proofs:** `orders/{orderId}/proofs/v{n}.png`
- **Premades:** `premades/{product_slug}/{premadeId}/…`
- **Brand assets:** `brand/{logos|hero}/…`

---

## Derived Views (in app code)
- **Order summary**: join `orders` + latest `revisions.version` + `designs.preview_url`
- **User dashboard**: counts of `orders` by `status`, list of recent `designs`

---

## Notes & Constraints
- Keep **JSON fields** small; large data belongs in R2 with URLs referenced here.
- Use **idempotency** for webhook writes; store `stripe_ref` per order.
- Enforce allowed **state transitions** in API (not only in UI).
- Add new changes via **forward-only migrations** (`004_*.sql`, etc.). Don’t edit old files.

---