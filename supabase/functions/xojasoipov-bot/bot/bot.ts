import { Bot, GrammyError, HttpError } from "npm:grammy@1.31.0";
import type { BotContext } from "./context.ts";
import { requireBotToken } from "../config.ts";
import { upsertUser } from "../db/users.ts";
import { registerAdminNotifier, notifyAiError } from "../notifications/admin.ts";
import { logger } from "../utils/logger.ts";
import { handleAdminPanel, handleBroadcastCommand, handleAdminLeadsList, handlePostCommand, handleStatsCommand } from "./commands/admin.ts";
import { handleStart, resolveSource } from "./commands/start.ts";
import { handleCallbackQuery } from "./handlers/callback.ts";
import { handleTextMessage } from "./handlers/message.ts";
import { handleGroupPhoto, handleProductsCommand, handleSetGroupCommand } from "./handlers/group.ts";

export function createBot(): Bot<BotContext> {
  const bot = new Bot<BotContext>(requireBotToken());
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
  bot.command("post", (ctx) => handlePostCommand(ctx));
  bot.command("setgroup", (ctx) => handleSetGroupCommand(ctx));
  bot.command("mahsulotlar", (ctx) => handleProductsCommand(ctx));

  // Photos are only ever meaningful in the bound product group; handleGroupPhoto
  // itself checks that and ignores everything else.
  bot.on("message:photo", (ctx) => handleGroupPhoto(ctx, getUser(ctx)));
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
