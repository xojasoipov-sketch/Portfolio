// Xojasoipov Portfolio Bot — Deno/Supabase Edge Functions entrypoint.
//
// Deployed target: webhook mode, not long-polling. Telegram POSTs each
// update straight to this function's URL; there is no persistent process to
// keep alive, so Render/Railway-style "sleeping" simply doesn't apply here —
// every invocation is a fresh, fast (sub-second) cold or warm start.
//
// The rest of the bot (src/bot, src/ai, src/db, ...) is the exact same
// source as bot/src/ in the Node/Railway target, copied over by
// scripts/portToDeno (relative imports rewritten .js -> .ts, bare package
// imports rewritten to npm: specifiers). Business logic lives in one place.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { webhookCallback } from "npm:grammy@1.31.0";
import { createBot } from "./bot/bot.ts";
import { env } from "./config.ts";
import { logger } from "./utils/logger.ts";

// Constructed once per isolate and reused across warm invocations — grammy's
// Bot instance and its middleware chain don't need to be rebuilt per request.
const bot = createBot();
const handleUpdate = webhookCallback(bot, "std/http");

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // Supabase routes /functions/v1/<name>/health etc. to the same function;
  // a plain GET lets Railway/Supabase-style uptime checks (and a human in a
  // browser) confirm the service is alive without needing a real Telegram
  // update.
  if (req.method === "GET") {
    return new Response(JSON.stringify({ ok: true, service: "xojasoipov-bot" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Telegram's own webhook authentication (item 38: webhook security) — the
  // secret_token configured via setWebhook is echoed back on every request.
  // This function has verify_jwt disabled (Telegram doesn't send a Supabase
  // JWT), so this check is the entire authentication boundary; reject
  // anything that doesn't carry it.
  if (env.TELEGRAM_WEBHOOK_SECRET) {
    const provided = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (provided !== env.TELEGRAM_WEBHOOK_SECRET) {
      logger.warn({ path: url.pathname }, "rejected webhook call: bad or missing secret token");
      return new Response("Unauthorized", { status: 401 });
    }
  }

  try {
    return await handleUpdate(req);
  } catch (err) {
    logger.error({ err }, "unhandled error in webhook handler");
    // Telegram retries on non-2xx, which would just replay the same update
    // into the same failure — acknowledge receipt and let bot.catch's own
    // admin notification (already fired inside handleUpdate) be the signal.
    return new Response("ok", { status: 200 });
  }
});
