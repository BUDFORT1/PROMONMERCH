// --- PromonMerch Worker (clean starter) ---

// CORS + security headers
const cors = {
  // TODO: change this to your Cloudflare Pages URL once live
  "Access-Control-Allow-Origin": "https://promonmerch.pages.dev",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-token"
};
const sec = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin"
};

// Helpers
function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors, ...sec, ...extra }
  });
}
async function readJSON(req) { try { return await req.json(); } catch { return null; } }
function buildKey(pathHint, ext = "") {
  const safe = (pathHint || "").replace(/[^a-zA-Z0-9/_-]/g, "").replace(/^\/*/, "");
  const id = crypto.randomUUID();
  const dot = ext ? (ext.startsWith(".") ? ext : "." + ext) : "";
  return (safe ? safe.replace(/\/+$/, "") + "/" : "") + id + dot;
}
function isAdmin(req, env) {
  const t = req.headers.get("x-admin-token");
  return !!(t && env.ADMIN_TOKEN && t === env.ADMIN_TOKEN);
}
async function q(env, sql, params = []) {
  if (!env.DB) return { results: [] };
  return env.DB.prepare(sql).bind(...params).all();
}

export default {
  async fetch(request, env) {
    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: { ...cors, ...sec } });
    }

    const url = new URL(request.url);
    const { pathname } = url;

    // --- Health/Ping ---
    if (pathname === "/api/health" && request.method === "GET") {
      return json({ ok: true, env: env.ENVIRONMENT || "unknown", now: new Date().toISOString() });
    }
    if (pathname === "/api/ping" && request.method === "GET") {
      return json({ pong: true });
    }

    // --- DB smoke test ---
    if (pathname === "/api/test-db" && request.method === "GET") {
      const rows = await q(env, "SELECT COUNT(*) AS c FROM users");
      return json({ ok: true, users: rows.results?.[0]?.c ?? 0 });
    }

    // --- R2 uploads (Admin only) ---
    // Step 1: prepare upload (get key + PUT URL)
    if (pathname === "/api/uploads/prepare" && request.method === "POST") {
      if (!isAdmin(request, env)) return json({ ok: false, error: "unauthorized" }, 401);
      if (!env.R2) return json({ ok: false, error: "R2 not bound" }, 500);

      const body = await readJSON(request) || {};
      const { pathHint = "", contentType = "", ext = "" } = body;
      if (!contentType) return json({ ok: false, error: "contentType required" }, 400);

      const key = buildKey(pathHint, ext);
      const uploadUrl = `/api/uploads/put?key=${encodeURIComponent(key)}`;
      return json({ ok: true, key, uploadUrl, method: "PUT", headers: { "Content-Type": contentType } });
    }

    // Step 2: upload bytes to R2 via Worker
    if (pathname.startsWith("/api/uploads/put") && request.method === "PUT") {
      if (!isAdmin(request, env)) return json({ ok: false, error: "unauthorized" }, 401);
      if (!env.R2) return json({ ok: false, error: "R2 not bound" }, 500);

      const key = url.searchParams.get("key");
      if (!key || /(\.\.|^\/|\/\/)/.test(key)) return json({ ok: false, error: "bad key" }, 400);

      const ct = request.headers.get("Content-Type") || "application/octet-stream";
      const len = request.headers.get("Content-Length");
      if (len && Number(len) > 20 * 1024 * 1024) return json({ ok: false, error: "file too large" }, 413);

      await env.R2.put(key, request.body, { httpMetadata: { contentType: ct } });

      // Public-bucket URL (enable Public access in R2 settings)
      const publicUrl = `https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com/promonmerch-assets/${encodeURIComponent(key)}`;
      return json({ ok: true, key, publicUrl });
    }

    // 404
    return json({ error: "Not Found", path: pathname }, 404);
  }
};