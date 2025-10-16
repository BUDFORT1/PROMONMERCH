// Minimal Cloudflare Worker API with CORS + JSON helper

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",        // change to your domain in prod
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
}

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const { pathname } = url;

    // Health check
    if (pathname === "/api/health" && request.method === "GET") {
      return json({
        ok: true,
        env: env.ENVIRONMENT || "unknown",
        now: new Date().toISOString()
      });
    }

    // Example ping
    if (pathname === "/api/ping" && request.method === "GET") {
      return json({ pong: true });
    }

    // 404 fallback
    return json({ error: "Not Found", path: pathname }, 404);
  }
};