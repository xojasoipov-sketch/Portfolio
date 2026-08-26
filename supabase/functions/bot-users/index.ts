// Read-only admin view onto xbot_users -- the people who have actually
// pressed /start on the Telegram bot, with the name Telegram itself gave.
//
// This is deliberately a different kind of data from site-analytics: the
// public site's pageview tracker stores no IP, no cookie and no stable
// identifier on purpose (see the migration comment on xbot_site_pageviews),
// so it can never answer "who". A Telegram bot user is not anonymous the
// same way -- pressing /start is the visitor handing the bot their own
// Telegram identity, the same way filling in the contact form hands over a
// name -- so showing it back to the bot's owner is not a privacy hole, it is
// the bot doing what a bot does.
//
// Gated on the same ANALYTICS_DASHBOARD_KEY as site-analytics rather than a
// key of its own: this is one private dashboard with two sections, not two
// dashboards, and the site owner should not need a second password for it.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const ALLOWED_ORIGINS = new Set([
  "https://xojasoipov-sketch.github.io",
  "http://localhost:3000",
  "http://localhost:3179",
  "http://localhost:5173",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    ...(allowed ? { "Access-Control-Allow-Origin": allowed } : {}),
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

async function config(key: string): Promise<string | null> {
  const { data } = await db
    .from("xbot_bot_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return (data?.value as string | null) ?? null;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== "GET") {
    return new Response("method not allowed", { status: 405, headers: cors });
  }

  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const adminKey = await config("ANALYTICS_DASHBOARD_KEY");
  if (!adminKey || key !== adminKey) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401, headers: cors });
  }

  const { data, error } = await db
    .from("xbot_users")
    .select(
      "telegram_user_id,telegram_username,first_name,language,source,is_admin,is_blocked,last_seen_at,created_at",
    )
    .order("last_seen_at", { ascending: false })
    .limit(500);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500, headers: cors });
  }

  const rows = data ?? [];
  const bySource: Record<string, number> = {};
  for (const r of rows) {
    bySource[r.source] = (bySource[r.source] ?? 0) + 1;
  }

  return Response.json(
    {
      ok: true,
      total: rows.length,
      bySource,
      users: rows,
    },
    { headers: cors },
  );
});
