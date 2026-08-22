// Deno/Supabase Edge Functions entrypoint: webhook mode, not long polling.
// Telegram POSTs each update here, so there is no process to keep alive and
// nothing to "wake up". Everything below index.ts is generated from bot/src by
// scripts/port-to-deno.mjs; business logic lives in one place.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { webhookCallback } from "npm:grammy@1.31.0";
import { createBot } from "./bot/bot.ts";
import { env } from "./config.ts";
import { loadBotConfig } from "./db/botConfig.ts";
import { logger } from "./utils/logger.ts";

/**
 * Built once per isolate, reused across warm invocations. Lazy and async
 * because the Telegram token and AI keys come from xbot_bot_config, which is a
 * database read.
 */
let handlerPromise: ReturnType<typeof buildHandler> | null = null;

async function buildHandler() {
  await loadBotConfig();
  const bot = createBot();
  await bot.init(); // resolves getMe once, so webhookCallback doesn't per request
  // grammy compares X-Telegram-Bot-Api-Secret-Token itself, before parsing the
  // body. Omitting the secret makes it reject every real update, since
  // setWebhook was configured with one.
  //
  // setWebhook also carries an allowed_updates list, and Telegram silently
  // drops anything outside it -- a handler registered here still never runs.
  // It must stay in sync with what createBot() listens for:
  //   ["message", "callback_query", "my_chat_member"]
  // my_chat_member is what binds the channel when the bot is made an admin,
  // and it was missing from the list once: promotion looked like it worked and
  // nothing happened, with no error anywhere to explain it.
  return webhookCallback(bot, "std/http", {
    secretToken: env.TELEGRAM_WEBHOOK_SECRET,
    // A full AI turn measured ~26s, well past grammy's 10s default, and a
    // timeout throws into bot.catch -- alerting the admin about a reply the
    // user actually received. Fit Telegram's ~60s budget and log instead.
    timeoutMilliseconds: 55_000,
    onTimeout: () => logger.warn({}, "webhook turn exceeded 55s; reply may arrive late"),
  });
}

function getHandler() {
  if (!handlerPromise) {
    handlerPromise = buildHandler().catch((err) => {
      // Don't cache a failed boot: a fixed config row should recover on the
      // next request, not be pinned to the error forever.
      handlerPromise = null;
      throw err;
    });
  }
  return handlerPromise;
}

Deno.serve(async (req: Request) => {
  // A plain GET is the health check: it reports whether the bot can boot, so a
  // misconfiguration is visible without sending a real Telegram update.
  if (req.method === "GET") {
    try {
      await getHandler();
      return Response.json({ ok: true, service: "xojasoipov-bot", ai: Boolean(env.GEMINI_API_KEY) });
    } catch (err) {
      logger.error({ err: String(err) }, "health check: bot failed to boot");
      return Response.json({ ok: false, error: String(err) }, { status: 503 });
    }
  }

  // Authentication is grammy's job (see buildHandler). verify_jwt is disabled
  // because Telegram sends no Supabase JWT, so that comparison is the entire
  // auth boundary -- duplicating it here would let the two checks drift.
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
    // Telegram retries on non-2xx, replaying the same update into the same
    // failure. Acknowledge, and let bot.catch's admin alert be the signal.
    return new Response("ok", { status: 200 });
  }
});
