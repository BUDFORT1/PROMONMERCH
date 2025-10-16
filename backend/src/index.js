import { route } from "./router.js";

const cors = {
  "Access-Control-Allow-Origin": "*", // TODO: set your domain
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
const json = (data, status=200) => new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json",...cors}});

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null,{headers:cors});
    const key = route(request);

    if (key === "GET /api/health") return json({ ok:true, env: env.ENVIRONMENT||"dev", now: new Date().toISOString() });
    if (key === "GET /api/ping") return json({ pong:true });

    // ---- STUBS YOU CAN FILL IN LATER ----
    if (key === "POST /api/uploads/presign") return json({ ok:false, msg:"presign stub" });
    if (key === "POST /api/orders") return json({ ok:false, msg:"create order stub" });
    if (key === "POST /api/checkout/create") return json({ ok:false, msg:"checkout stub" });
    if (key === "POST /api/webhooks/stripe") return new Response("ok", { status: 200 }); // acknowledge for now
    if (key === "GET /api/designs") return json({ items: [] });
    if (key === "POST /api/designs") return json({ ok:false, msg:"save design stub" });
    if (key === "POST /api/requests") return json({ ok:false, msg:"request artwork stub" });
    if (key === "GET /api/premades") return json({ items: [], page:1, total:0 });

    return json({ error:"Not Found", route:key }, 404);
  }
};
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