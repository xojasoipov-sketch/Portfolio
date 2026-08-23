// Contact form endpoint for the statically hosted portfolio.
//
// The site itself is prerendered and served by GitHub Pages, which has no
// server runtime, so the TanStack server function it used to call
// (src/lib/api/contact.functions.ts) cannot run there. This function takes its
// place: the browser POSTs the form here, and the Telegram bot token stays
// server-side exactly as before -- it is read from xbot_bot_config with the
// service-role key the edge runtime injects, and never reaches the client.
//
// Deployed with verify_jwt disabled because a public contact form cannot carry
// a Supabase JWT. Abuse is bounded by three things instead: an origin check
// that actually rejects (emitting no CORS header only stops a browser -- curl
// does not care, so the header alone was never a control), a per-visitor daily
// cap claimed before anything is sent, and hard length caps. The honeypot only
// catches naive form-scrapers; a direct poster simply omits the field.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/** Only these origins may call this endpoint from a browser. */
const ALLOWED_ORIGINS = new Set([
  "https://xojasoipov-sketch.github.io",
  "http://localhost:3000",
  "http://localhost:5173",
]);

const MAX = { name: 80, contact: 120, message: 2000 } as const;

function corsHeaders(origin: string | null): Record<string, string> {
  // Echo the origin only when it is allowlisted; otherwise send no CORS header
  // at all, which makes the browser reject the response.
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    ...(allowed ? { "Access-Control-Allow-Origin": allowed } : {}),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/**
 * How many messages one visitor may send in a day. Generous for a real
 * person -- nobody legitimately fills this form six times -- and low enough
 * that a script cannot turn the owner's Telegram into a firehose.
 */
const DAILY_LIMIT = 5;

/**
 * Same daily-rotating hash the pageview table uses: it counts one person for
 * one day without storing an IP and without following anyone across days.
 *
 * The user-agent is deliberately NOT mixed in. It is attacker-controlled, so
 * including it would let one caller mint a fresh quota bucket per string --
 * it buys no privacy and costs the whole control.
 */
async function visitorHash(ip: string): Promise<string> {
  const pepper =
    Deno.env.get("ANALYTICS_PEPPER") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const day = new Date().toISOString().slice(0, 10);
  const bytes = new TextEncoder().encode(`contact|${ip}|${day}|${pepper}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return (
    "contact|" +
    Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 32)
  );
}

/**
 * Claims one slot for today, returning false when the caller is over the cap.
 *
 * Reuses xbot_demo_ai_take, which is a generic atomic "increment this counter
 * unless it is already at the limit" keyed on (hash, day) -- the hash is
 * namespaced above so contact traffic and the /demo quota never share a
 * bucket. Atomic in one statement, so two simultaneous requests cannot both
 * see room for the last slot.
 */
async function claimSlot(hash: string): Promise<boolean> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return true; // never let a config gap block a real message
  try {
    const res = await fetch(`${url}/rest/v1/rpc/xbot_demo_ai_take`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_hash: hash, p_limit: DAILY_LIMIT }),
    });
    if (!res.ok) return true; // counter unavailable: fail open, do not lose mail
    const count = await res.json();
    return count !== null;
  } catch {
    return true;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Bot token and admin chat ids live in the DB, same as for the bot itself. */
async function loadConfig(): Promise<Record<string, string>> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase env yo'q");

  const res = await fetch(`${url}/rest/v1/xbot_bot_config?select=key,value`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`bot_config o'qilmadi: ${res.status}`);

  const rows = (await res.json()) as { key: string; value: string | null }[];
  const out: Record<string, string> = {};
  for (const row of rows) if (row.value) out[row.key] = row.value;
  return out;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405, headers: cors });
  }
  // Without this the allowlist decided only whether to *emit* a CORS header,
  // and nothing ever rejected: a shell loop could send unbounded Telegram DMs
  // to every admin id. Same check demo-ai already had.
  if (!cors["Access-Control-Allow-Origin"]) {
    return Response.json({ ok: false, error: "origin" }, { status: 403, headers: cors });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Noto'g'ri so'rov" }, { status: 400, headers: cors });
  }

  const str = (v: unknown, cap: number) => (typeof v === "string" ? v.trim().slice(0, cap) : "");
  const name = str(body.name, MAX.name);
  const contact = str(body.contact, MAX.contact);
  const message = str(body.message, MAX.message);

  // Honeypot: real users never fill this, so accept silently and send nothing.
  // Returning ok gives a bot no signal that it was detected.
  if (str(body.company, 100)) return Response.json({ ok: true }, { headers: cors });

  if (name.length < 2 || contact.length < 3 || message.length < 10) {
    return Response.json(
      { ok: false, error: "Iltimos, ism, aloqa ma'lumoti va xabarni to'liq yozing." },
      { status: 400, headers: cors },
    );
  }

  // Claimed before anything is sent: a request that fails afterwards still
  // spends its slot, which is the safer way to be wrong for an abuse ceiling.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ??
    "0.0.0.0";
  if (!(await claimSlot(await visitorHash(ip)))) {
    return Response.json(
      {
        ok: false,
        error:
          "Bugun juda ko'p xabar yuborildi. Ertaga urinib ko'ring yoki Telegram orqali yozing: @xojasoipov",
      },
      { status: 429, headers: cors },
    );
  }

  try {
    const config = await loadConfig();
    const token = config.TELEGRAM_BOT_TOKEN;
    const admins = (config.TELEGRAM_ADMIN_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!token || admins.length === 0) {
      console.error("contact: TELEGRAM_BOT_TOKEN yoki TELEGRAM_ADMIN_IDS yo'q");
      return Response.json(
        { ok: false, error: "Hozir yuborib bo'lmadi. Iltimos, @xojasoipov ga yozing." },
        { status: 503, headers: cors },
      );
    }

    const text = [
      "✉️ <b>SAYTDAN XABAR</b>",
      "",
      `👤 <b>Ism:</b> ${escapeHtml(name)}`,
      `📱 <b>Aloqa:</b> ${escapeHtml(contact)}`,
      "",
      escapeHtml(message),
    ].join("\n");

    // One failed admin must not lose the message for the others.
    const sends = await Promise.allSettled(
      admins.map((chatId) =>
        fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
        }).then((r) => (r.ok ? r : Promise.reject(new Error(`Telegram ${r.status}`)))),
      ),
    );

    if (!sends.some((s) => s.status === "fulfilled")) {
      console.error("contact: barcha adminlarga yuborib bo'lmadi");
      return Response.json(
        { ok: false, error: "Xabarni yuborib bo'lmadi. Iltimos, @xojasoipov ga yozing." },
        { status: 502, headers: cors },
      );
    }

    return Response.json({ ok: true }, { headers: cors });
  } catch (err) {
    console.error("contact: kutilmagan xato", String(err));
    return Response.json(
      { ok: false, error: "Xabarni yuborib bo'lmadi. Iltimos, @xojasoipov ga yozing." },
      { status: 500, headers: cors },
    );
  }
});
