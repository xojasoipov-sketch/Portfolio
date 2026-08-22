import type { Context } from "npm:grammy@1.31.0";
import { InlineKeyboard } from "npm:grammy@1.31.0";
import { env } from "../../config.ts";
import { CHANNEL_KEY, getConfigValue, setConfigValue } from "../../db/botConfig.ts";
import {
  getNextPending,
  getPost,
  queueCounts,
  restorePending,
  settlePost,
  type ChannelPostRow,
} from "../../db/channelPosts.ts";
import { isAdmin } from "../../db/users.ts";
import { escapeTelegramHtml } from "../../security/validation.ts";
import { logger } from "../../utils/logger.ts";

const SITE_ORIGIN = "https://xojasoipov-sketch.github.io/Portfolio";

/**
 * Appended at publish time rather than stored in each row, so the links stay
 * uniform and a change to them is one edit instead of sixteen.
 */
const FOOTER = `\n\n🔗 ${SITE_ORIGIN}/\n📋 Narxlar: ${SITE_ORIGIN}/xizmatlar\n💬 @Xojasoipovbot`;

// The channel title carries the name, so the description spends its budget on
// what the title cannot say: the work, the method, and where to go next.
// Telegram caps it at 255 characters; this is 252.
const CHANNEL_ABOUT = [
  "Veb-saytlar, Telegram bot va mini-app, AI integratsiya, CRM va ichki tizimlar.",
  "",
  "Har bir loyiha auditdan boshlanadi — avval muammo aniqlanadi, keyin yechim quriladi.",
  "",
  `Narxlar: ${SITE_ORIGIN}/xizmatlar`,
  "Aloqa: @Xojasoipovbot",
].join("\n");

function render(post: ChannelPostRow): string {
  return post.body + FOOTER;
}

function approvalKeyboard(post: ChannelPostRow): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ Kanalga joylash", `ch_pub:${post.id}`)
    .row()
    .text("❌ Bu postni tashlab ket", `ch_skip:${post.id}`);
}

/** Both binding paths end the same way, so the wording lives in one place. */
async function announceBound(ctx: Context, to: number, title: string, warning?: string): Promise<void> {
  const { pending } = await queueCounts();
  const lines = [
    `\u2705 <b>${escapeTelegramHtml(title)}</b> ulandi.`,
    "",
    `\ud83d\udcdd Navbatda ${pending} ta post tayyor.`,
    "",
    "<code>/kanal</code> \u2014 keyingi postni ko'rish va tasdiqlash.",
  ];
  if (warning) lines.push("", warning);
  await ctx.api.sendMessage(to, lines.join("\n"), { parse_mode: "HTML" });
}

/**
 * Binds the channel the bot was just promoted in.
 *
 * This exists because the alternative is asking the owner to find a @username
 * that a private channel does not even have. Being made an administrator is
 * itself an unambiguous signal of which channel is meant, and Telegram already
 * delivers it -- so the setup step is "add the bot as admin", nothing more.
 */
export async function handleMyChatMember(ctx: Context): Promise<void> {
  const update = ctx.myChatMember;
  const fromId = ctx.from?.id;
  if (!update || !fromId) return;
  if (update.chat.type !== "channel") return;

  const status = update.new_chat_member.status;
  if (status !== "administrator" && status !== "creator") return;
  if (!(await isAdmin(fromId, env.TELEGRAM_ADMIN_IDS))) return;

  const chatId = String(update.chat.id);
  if (!(await setConfigValue(CHANNEL_KEY, chatId))) return;

  const title = "title" in update.chat ? update.chat.title : "kanal";
  logger.info({ chatId }, "channel bound from promotion");

  // Setting the description here is the "pro channel" part that a bot can
  // actually do: a channel with no about text reads as abandoned. Failure is
  // not fatal -- it just means the bot lacks the rights for it.
  let aboutSet = true;
  try {
    await ctx.api.setChatDescription(update.chat.id, CHANNEL_ABOUT);
  } catch (err) {
    aboutSet = false;
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "could not set the channel description",
    );
  }

  await announceBound(
    ctx,
    fromId,
    title,
    aboutSet ? undefined : "⚠️ Kanal tavsifini yozolmadim — botga “Kanalni tahrirlash” huquqini bering.",
  );
}

/**
 * Fallback binding: the owner forwards any post from the channel to the bot.
 * Returns true when it handled the message, so the caller skips the AI flow.
 */
export async function handleForwardedChannelPost(ctx: Context): Promise<boolean> {
  const message = ctx.message;
  const fromId = ctx.from?.id;
  if (!message || !fromId || ctx.chat?.type !== "private") return false;

  // forward_origin is Bot API 7.0+; forward_from_chat is the older shape.
  const origin = (message as { forward_origin?: { type?: string; chat?: { id: number; title?: string } } })
    .forward_origin;
  const legacy = (message as { forward_from_chat?: { id: number; type: string; title?: string } })
    .forward_from_chat;
  const chat =
    origin?.type === "channel" ? origin.chat : legacy?.type === "channel" ? legacy : undefined;
  if (!chat) return false;

  if (!(await isAdmin(fromId, env.TELEGRAM_ADMIN_IDS))) return false;
  if (!(await setConfigValue(CHANNEL_KEY, String(chat.id)))) {
    await ctx.reply("Kanalni saqlab bo'lmadi. Birozdan so'ng qayta urinib ko'ring.");
    return true;
  }

  await announceBound(ctx, fromId, chat.title ?? "Kanal");
  return true;
}

/**
 * /kanal — shows the next queued post to the admin exactly as it will appear,
 * with the buttons that publish or drop it. Nothing reaches the channel until
 * one of those is tapped.
 */
export async function handleChannelCommand(ctx: Context): Promise<void> {
  const fromId = ctx.from?.id;
  if (!fromId || !(await isAdmin(fromId, env.TELEGRAM_ADMIN_IDS))) {
    await ctx.reply("Bu buyruq faqat admin uchun.");
    return;
  }

  const channel = await getConfigValue(CHANNEL_KEY);
  if (!channel) {
    await ctx.reply(
      [
        "Kanal hali ulanmagan. Ikki yo'ldan biri:",
        "",
        "1. Botni kanalga <b>admin</b> qiling — o'zi ulanadi.",
        "2. Yoki kanaldagi istalgan postni menga <b>forward</b> qiling.",
      ].join("\n"),
      { parse_mode: "HTML" },
    );
    return;
  }

  const post = await getNextPending();
  const counts = await queueCounts();
  if (!post) {
    await ctx.reply(
      [
        "🎉 Navbatdagi postlar tugadi.",
        "",
        `Joylangan: ${counts.posted} · Tashlab ketilgan: ${counts.skipped}`,
        "",
        "Yangi loyiha yoki yangilik bo'lsa ayting — yangi postlar tayyorlayman.",
      ].join("\n"),
    );
    return;
  }

  await ctx.reply(
    `👀 <b>Ko'rib chiqing</b> — #${post.slot}/${counts.pending + counts.posted + counts.skipped}\nBu hali kanalga chiqmadi.`,
    { parse_mode: "HTML" },
  );
  await sendPreview(ctx, post);
}

async function sendPreview(ctx: Context, post: ChannelPostRow): Promise<void> {
  const text = render(post);
  const markup = approvalKeyboard(post);
  if (post.photo_path) {
    await ctx.replyWithPhoto(`${SITE_ORIGIN}/${post.photo_path}`, {
      caption: text,
      parse_mode: "HTML",
      reply_markup: markup,
    });
    return;
  }
  await ctx.reply(text, { parse_mode: "HTML", reply_markup: markup });
}

/** Handles the ✅ / ❌ taps on an approval card. */
export async function handleChannelCallback(ctx: Context, data: string): Promise<void> {
  const [action, postId] = data.split(":");
  const adminId = ctx.from?.id;
  if (!postId || !adminId) return;

  const post = await getPost(postId);
  if (!post) {
    await ctx.answerCallbackQuery({ text: "Post topilmadi." });
    return;
  }
  if (post.status !== "pending") {
    await ctx.answerCallbackQuery({ text: "Bu post allaqachon ko'rib chiqilgan.", show_alert: true });
    return;
  }

  if (action === "ch_skip") {
    await settlePost(post.id, "skipped", adminId);
    await ctx.answerCallbackQuery({ text: "Tashlab ketildi." });
    await ctx.reply(`❌ #${post.slot} — <b>${escapeTelegramHtml(post.title)}</b> tashlab ketildi.`, {
      parse_mode: "HTML",
    });
    return;
  }

  const channel = await getConfigValue(CHANNEL_KEY);
  if (!channel) {
    await ctx.answerCallbackQuery({ text: "Kanal ulanmagan.", show_alert: true });
    return;
  }

  // Claim the post before sending, so two fast taps cannot both publish it.
  if (!(await settlePost(post.id, "posted", adminId))) {
    await ctx.answerCallbackQuery({ text: "Bu post allaqachon joylandi.", show_alert: true });
    return;
  }

  try {
    const text = render(post);
    if (post.photo_path) {
      await ctx.api.sendPhoto(channel, `${SITE_ORIGIN}/${post.photo_path}`, {
        caption: text,
        parse_mode: "HTML",
      });
    } else {
      await ctx.api.sendMessage(channel, text, { parse_mode: "HTML" });
    }
  } catch (err) {
    // Put it back in the queue: a post that failed to send must not be marked
    // as published, or it would silently disappear from the rotation.
    await restorePending(post.id);
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err: message, channel }, "channel publish failed");
    await ctx.answerCallbackQuery({ text: "Joylashtirib bo'lmadi.", show_alert: true });
    await ctx.reply(
      [
        "❌ Kanalga joylashtirib bo'lmadi — post navbatda qoldi.",
        "",
        "Tekshiring: bot kanalda admin va “Xabarlar joylash” huquqi bormi?",
        `<code>${escapeTelegramHtml(message)}</code>`,
      ].join("\n"),
      { parse_mode: "HTML" },
    );
    return;
  }

  const { pending } = await queueCounts();
  await ctx.answerCallbackQuery({ text: "Kanalga joylandi ✅" });
  await ctx.reply(
    [
      `✅ #${post.slot} — <b>${escapeTelegramHtml(post.title)}</b> kanalga joylandi.`,
      `📝 Navbatda yana ${pending} ta post bor.`,
      pending > 0 ? "\n<code>/kanal</code> — keyingisi." : "",
    ]
      .filter(Boolean)
      .join("\n"),
    { parse_mode: "HTML" },
  );
}
