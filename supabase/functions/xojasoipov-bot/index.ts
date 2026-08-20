// Xojasoipov Portfolio Bot — Deno/Supabase Edge Functions entrypoint.
//
// Deployed target: webhook mode, not long-polling. Telegram POSTs each
// update straight to this function's URL; there is no persistent process to
// keep alive, so Render/Railway-style "sleeping" simply doesn't apply here —
// every invocation is a fresh, fast (sub-second) cold or warm start.
//
// The rest of the bot (bot/, ai/, db/, ...) is the exact same source as
// bot/src/ in the Node target, copied over by scripts/portToDeno (relative
// imports rewritten .js -> .ts, bare package imports rewritten to npm:
// specifiers). Business logic lives in one place.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { webhookCallback } from "npm:grammy@1.31.0";
import { createBot } from "./bot/bot.ts";
import { env } from "./config.ts";
import { loadBotConfig } from "./db/botConfig.ts";
import { logger } from "./utils/logger.ts";

/**
 * Built once per isolate and reused across warm invocations. It has to be
 * lazy and async because the Telegram token and AI keys come from
 * xbot.bot_config, which is a database read — the edge runtime injects
 * SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY for us, and everything else is
 * loaded through them.
 */
let handlerPromise: ReturnType<typeof buildHandler> | null = null;

async function buildHandler() {
  await loadBotConfig();
  const bot = createBot();
  await bot.init(); // resolves getMe once, so webhookCallback doesn't per request
  // grammy performs the X-Telegram-Bot-Api-Secret-Token comparison itself,
  // before it parses the body. Handing it the secret is what makes that check
  // pass; omitting it makes grammy reject every request that carries the
  // header -- which is every real Telegram update, since setWebhook was
  // configured with a secret_token.
  return webhookCallback(bot, "std/http", {
    secretToken: env.TELEGRAM_WEBHOOK_SECRET,
    // A full AI turn (cold start + knowledge base + Gemini) measured ~26s,
    // well past grammy's 10s default. On timeout grammy's default is to
    // throw, which reaches bot.catch and fires an "AI ERROR" alert at the
    // admin even though the user got a perfectly good reply. Give the turn
    // room to finish inside Telegram's own ~60s webhook budget, and log
    // rather than throw if it still overruns.
    timeoutMilliseconds: 55_000,
    onTimeout: () => logger.warn({}, "webhook turn exceeded 55s; reply may arrive late"),
  });
}

function getHandler() {
  if (!handlerPromise) {
    handlerPromise = buildHandler().catch((err) => {
      // Don't cache a failed boot: a fixed config row should recover the
      // next request instead of pinning this isolate to the error forever.
      handlerPromise = null;
      throw err;
    });
  }
  return handlerPromise;
}

Deno.serve(async (req: Request) => {
  // A plain GET is the health check: it reports whether the bot can actually
  // boot, so a misconfiguration is visible in a browser without having to
  // send a real Telegram update.
  if (req.method === "GET") {
    try {
      await getHandler();
      return Response.json({ ok: true, service: "xojasoipov-bot", ai: Boolean(env.GEMINI_API_KEY) });
    } catch (err) {
      logger.error({ err: String(err) }, "health check: bot failed to boot");
      return Response.json({ ok: false, error: String(err) }, { status: 503 });
    }
  }

  // Authentication is grammy's job (see buildHandler): it compares the
  // X-Telegram-Bot-Api-Secret-Token header against the configured secret and
  // answers 401 itself. This function runs with verify_jwt disabled --
  // Telegram doesn't send a Supabase JWT -- so that comparison is the entire
  // authentication boundary, and it must not be duplicated here or the two
  // checks could drift apart.
  let handleUpdate: Awaited<ReturnType<typeof buildHandler>>;
  try {
    handleUpdate = await getHandler();
  } catch (err) {
    logger.error({ err: String(err) }, "bot failed to boot; dropping update");
    // 200 so Telegram doesn't spin retrying an update we can't process yet.
    return new Response("ok", { status: 200 });
  }

  try {
    return await handleUpdate(req);
  } catch (err) {
    logger.error({ err: String(err) }, "unhandled error in webhook handler");
    // Telegram retries on non-2xx, which would just replay the same update
    // into the same failure — acknowledge receipt and let bot.catch's own
    // admin notification (already fired inside handleUpdate) be the signal.
    return new Response("ok", { status: 200 });
  }
});
