// Cookie-free, self-hosted pageview tracking for the portfolio.
//
// Why not a third-party script: the site already has a Supabase project and a
// service-role key the edge runtime injects, so shipping traffic to another
// vendor would add a consent banner, a third-party request on every page load,
// and someone else's copy of the data -- for numbers this project can just
// store itself.
//
// Privacy shape: no cookie, no localStorage, no IP stored. Repeat views are
// collapsed with a daily-rotating sha256(ip + ua + date + pepper), which is
// enough to count people but is not a stable identifier and cannot be reversed
// to one. See the migration comment on xbot_site_pageviews.
//
// verify_jwt is disabled because a public web page cannot present a Supabase
// JWT. Writes are bounded by the origin allowlist and hard length caps; reads
// require the admin key.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const ALLOWED_ORIGINS = new Set([
  "https://xojasoipov-sketch.github.io",
  "http://localhost:3000",
  "http://localhost:3179",
  "http://localhost:5173",
]);

const MAX_PATH = 200;
const MAX_REFERRER = 300;

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    ...(allowed ? { "Access-Control-Allow-Origin": allowed } : {}),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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

/** Obvious crawlers should not inflate the numbers. */
const BOT_UA = /bot|crawler|spider|crawling|facebookexternalhit|slurp|bingpreview|headlesschrome|lighthouse|preview|monitor|curl|wget|python-requests/i;

function deviceFrom(ua: string): "mobile" | "tablet" | "desktop" | "unknown" {
  if (!ua) return "unknown";
  if (/ipad|tablet|playbook|silk/i.test(ua)) return "tablet";
  if (/mobi|android|iphone|ipod/i.test(ua)) return "mobile";
  return "desktop";
}

/** Same table every other function in this project reads its admin-facing
 *  settings from, rather than a platform secret -- there is no tool in this
 *  project's workflow for setting a Supabase project secret directly, but
 *  writing a row here is one SQL statement away. */
async function config(key: string): Promise<string | null> {
  const { data } = await db
    .from("xbot_bot_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return (data?.value as string | null) ?? null;
}

async function visitorHash(ip: string, ua: string): Promise<string> {
  // The pepper keeps the hash from being brute-forceable from an IP guess;
  // the date component makes it rotate every day so it cannot follow anyone.
  const pepper = Deno.env.get("ANALYTICS_PEPPER") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const day = new Date().toISOString().slice(0, 10);
  const bytes = new TextEncoder().encode(`${ip}|${ua}|${day}|${pepper}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  // Every response below carries `cors`: unlike the POST path, this one is
  // meant to be called from the deployed /admin dashboard's own fetch(), and
  // a browser discards a cross-origin response body with no
  // Access-Control-Allow-Origin header on it, 401s and 500s included.
  // ---- Admin read: GET /?key=<ANALYTICS_DASHBOARD_KEY>&days=30 ----------
  //
  // A dedicated key, not TELEGRAM_WEBHOOK_SECRET: this one is meant to be
  // typed into the /admin dashboard by hand, so it needs to be a value that
  // can actually be handed to the site owner. Reusing the webhook secret
  // would have meant either exposing that (rotating it would then also
  // break Telegram's webhook signature check) or never being able to tell
  // the owner the admin key at all.
  if (req.method === "GET") {
    const url = new URL(req.url);
    const key = url.searchParams.get("key");
    const adminKey = await config("ANALYTICS_DASHBOARD_KEY");
    if (!adminKey || key !== adminKey) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401, headers: cors });
    }
    const days = Math.min(Math.max(Number(url.searchParams.get("days") ?? 30), 1), 365);
    const since = new Date(Date.now() - days * 86_400_000).toISOString();

    const { data, error } = await db
      .from("xbot_site_pageviews")
      .select("path,visitor_hash,device,is_telegram,referrer,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50_000);

    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 500, headers: cors });
    }

    const rows = data ?? [];
    const tally = <T extends string>(pick: (r: (typeof rows)[number]) => T | null) => {
      const out: Record<string, number> = {};
      for (const r of rows) {
        const k = pick(r);
        if (k) out[k] = (out[k] ?? 0) + 1;
      }
      return Object.fromEntries(
        Object.entries(out).sort((a, b) => b[1] - a[1]).slice(0, 12),
      );
    };
    const hostOf = (referrer: string | null) => {
      if (!referrer) return null;
      try {
        return new URL(referrer).hostname;
      } catch {
        return null;
      }
    };

    // One count per calendar day (UTC), oldest first, for a trend line. Built
    // from the same rows already in memory rather than a second query.
    const byDay: Record<string, number> = {};
    for (const r of rows) {
      const day = r.created_at.slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + 1;
    }

    // The closest honest answer to "who visited": rows already come back
    // newest-first, capped well short of the 50k the query above allows so
    // the dashboard payload stays small. Only the first 6 hex characters of
    // visitor_hash ship, and only so two rows from the same anonymous
    // visitor read as one visit in the feed -- it is one SHA-256 among an
    // unknown IP+UA+pepper input and cannot be reversed to a person, but
    // there is no reason to send more of it than that grouping needs.
    const recent = rows.slice(0, 100).map((r) => ({
      time: r.created_at,
      path: r.path,
      device: r.device,
      telegram: r.is_telegram,
      referrer: hostOf(r.referrer),
      visitor: r.visitor_hash.slice(0, 6),
    }));

    return Response.json(
      {
        ok: true,
        days,
        pageviews: rows.length,
        visitors: new Set(rows.map((r) => r.visitor_hash)).size,
        telegram: rows.filter((r) => r.is_telegram).length,
        paths: tally((r) => r.path),
        devices: tally((r) => r.device),
        referrers: tally((r) => hostOf(r.referrer)),
        byDay,
        recent,
      },
      { headers: cors },
    );
  }

  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: cors });
  }
  // A browser POST from a non-allowlisted origin gets no CORS header back, so
  // reject it outright rather than silently recording it.
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return new Response("forbidden", { status: 403 });
  }

  const ua = req.headers.get("User-Agent") ?? "";
  // Return 204 for bots so they see a normal response and do not retry.
  if (BOT_UA.test(ua)) {
    return new Response(null, { status: 204, headers: cors });
  }

  let body: { path?: unknown; referrer?: unknown; telegram?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response("bad request", { status: 400, headers: cors });
  }

  const path = String(body.path ?? "").slice(0, MAX_PATH);
  if (!path.startsWith("/")) {
    return new Response("bad request", { status: 400, headers: cors });
  }
  const referrer = body.referrer ? String(body.referrer).slice(0, MAX_REFERRER) : null;

  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "";

  try {
    await db.from("xbot_site_pageviews").insert({
      path,
      referrer,
      visitor_hash: await visitorHash(ip, ua),
      country: req.headers.get("cf-ipcountry"),
      device: deviceFrom(ua),
      is_telegram: Boolean(body.telegram),
    });
  } catch (err) {
    // Analytics must never be able to break a page load; swallow and move on.
    console.error("pageview insert failed", String(err));
  }

  return new Response(null, { status: 204, headers: cors });
});
