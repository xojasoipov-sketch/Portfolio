import { Bot, GrammyError, HttpError } from "grammy";
import type { BotContext } from "./context.js";
import { env } from "../config.js";
import { upsertUser } from "../db/users.js";
import { registerAdminNotifier, notifyAiError } from "../notifications/admin.js";
import { logger } from "../utils/logger.js";
import { handleAdminPanel, handleBroadcastCommand, handleAdminLeadsList, handleStatsCommand } from "./commands/admin.js";
import { handleStart, resolveSource } from "./commands/start.js";
import { handleCallbackQuery } from "./handlers/callback.js";
import { handleTextMessage } from "./handlers/message.js";

export function createBot(): Bot<BotContext> {
  const bot = new Bot<BotContext>(env.TELEGRAM_BOT_TOKEN);
  registerAdminNotifier(bot.api);

  // Every update — command, text, or button — passes through here first, so
  // downstream handlers can assume `ctx.user` already exists instead
  // of each one re-deriving it.
  bot.use(async (ctx, next) => {
    const from = ctx.from;
    if (!from || from.is_bot) return; // ignore other bots / channel posts with no actor
    const source = ctx.message?.text?.startsWith("/start")
      ? resolveSource(ctx.message.text.split(" ").slice(1).join(" "))
      : undefined;
    const languageHint = from.language_code?.startsWith("en") ? "en" : "uz";
    const user = await upsertUser({
      telegramUserId: from.id,
      telegramUsername: from.username ? `@${from.username}` : null,
      firstName: from.first_name ?? null,
      languageHint,
      source,
    });
    ctx.user = user;
    await next();
  });

  bot.command("start", (ctx) => handleStart(ctx, getUser(ctx)));
  bot.command("admin", (ctx) => handleAdminPanel(ctx));
  bot.command("leads", (ctx) => handleAdminLeadsList(ctx));
  bot.command("stats", (ctx) => handleStatsCommand(ctx));
  bot.command("broadcast", (ctx) => handleBroadcastCommand(ctx));

  bot.on("message:text", (ctx) => handleTextMessage(ctx, getUser(ctx)));
  bot.on("callback_query:data", (ctx) => handleCallbackQuery(ctx, getUser(ctx)));

  bot.catch((err) => {
    const { ctx, error } = err;
    if (error instanceof GrammyError) {
      logger.error({ err: error.description }, "telegram API error");
    } else if (error instanceof HttpError) {
      logger.error({ err: error.message }, "telegram network error");
    } else {
      logger.error({ err: error }, "unhandled bot error");
    }
    void notifyAiError(`update_id=${ctx.update.update_id}`, error).catch(() => {});
  });

  return bot;
}

function getUser(ctx: BotContext) {
  return ctx.user;
}
