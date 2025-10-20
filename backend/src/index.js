// --- Cloudflare Worker starter (clean) ---
// CORS + basic security headers
const cors = {
  "Access-Control-Allow-Origin": "https://b3135ffd.promonmerch.pages.dev"
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-token"
};
const sec = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin"
};

// JSON helper
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors, ...sec }
  });
}

// safe JSON body reader helper
async function readJSON(req) {
  try { return await req.json(); } catch { return null; }
}
//helper build a storage key
function buildKey(pathHint, ext = "") {
  const safeHint = (pathHint || "").replace(/[^a-zA-Z0-9/_-]/g, "").replace(/^\/*/,"");
  const id = crypto.randomUUID();
  const suffix = ext ? (ext.startsWith(".") ? ext : "."+ext) : "";
  return (safeHint ? safeHint.replace(/\/+$/,"") + "/" : "") + id + suffix;
}

// D1 helper (safe if DB not yet bound)
async function q(env, sql, params = []) {
  if (!env.DB) return { results: [] };
  return env.DB.prepare(sql).bind(...params).all();
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: { ...cors, ...sec } });
    }

    const { pathname } = new URL(request.url);
    // STEP 1: ask for a key + upload URL (Worker proxy upload)
    // Body: { pathHint: "brand/logos/", contentType: "image/webp", ext: "webp" }
    if (pathname === "/api/uploads/prepare" && request.method === "POST") {
      const body = await readJSON(request) || {};
      const { pathHint = "", contentType = "", ext = "" } = body;

      if (!env.R2) return json({ ok:false, error:"R2 not bound" }, 500);
      if (!contentType) return json({ ok:false, error:"contentType required" }, 400);

      const key = buildKey(pathHint, ext);
      const uploadUrl = `/api/uploads/put?key=${encodeURIComponent(key)}`;

      return json({ ok:true, key, uploadUrl, method:"PUT", headers:{ "Content-Type": contentType } });
    }

    // STEP 2: upload file bytes to that key
    // PUT /api/uploads/put?key=...
    if (pathname.startsWith("/api/uploads/put") && request.method === "PUT") {
      if (!env.R2) return json({ ok:false, error:"R2 not bound" }, 500);

      const url = new URL(request.url);
      const key = url.searchParams.get("key");
      if (!key || /(\.\.|^\/|\/\/)/.test(key)) return json({ ok:false, error:"bad key" }, 400);

      // Small guardrails (tweak as you like)
      const ct = request.headers.get("Content-Type") || "application/octet-stream";
      const len = request.headers.get("Content-Length");
      if (len && Number(len) > 20 * 1024 * 1024) { // 20 MB
        return json({ ok:false, error:"file too large" }, 413);
      }

      // Stream into R2
      await env.R2.put(key, request.body, { httpMetadata: { contentType: ct } });

      // Public URL (if you enable public access in R2 later)
      // Replace <ACCOUNT_ID> once you know it (R2 settings page shows it)
      const publicUrl = `https://<ACCOUNT_ID>.r2.cloudflarestorage.com/promonmerch-assets/${encodeURIComponent(key)}`;

      return json({ ok:true, key, publicUrl });
    }


    // Health check
    if (pathname === "/api/health" && request.method === "GET") {
      return json({ ok: true, env: env.ENVIRONMENT || "unknown", now: new Date().toISOString() });
    }

    // Ping
    if (pathname === "/api/ping" && request.method === "GET") {
      return json({ pong: true });
    }

    // DB test
    if (pathname === "/api/test-db" && request.method === "GET") {
      const rows = await q(env, "SELECT COUNT(*) AS c FROM users");
      return json({ ok: true, users: rows.results?.[0]?.c ?? 0 });
    }

    // 🆕 DB tables list route
    if (pathname === "/api/db-tables" && request.method === "GET") {
      const rows = await q(env, "SELECT name FROM sqlite_master WHERE type='table'");
      return json({ ok: true, tables: rows.results.map(r => r.name) });
    }

    // Default 404
    return json({ error: "Not Found", path: pathname }, 404);
  }
};
