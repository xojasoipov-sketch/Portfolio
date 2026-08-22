import type { Context } from "grammy";
import { env, requireBotToken } from "../../config.js";
import { PRODUCT_GROUP_KEY, getConfigValue, setConfigValue } from "../../db/botConfig.js";
import {
  countProducts,
  createProduct,
  findDuplicate,
  listProducts,
  normalizeTitle,
  type DuplicateMatch,
} from "../../db/products.js";
import { isAdmin } from "../../db/users.js";
import { trackEvent } from "../../db/analytics.js";
import type { UserRow } from "../../db/types.js";
import { escapeTelegramHtml } from "../../security/validation.js";
import { computeImageHash } from "../../utils/imageHash.js";
import { logger } from "../../utils/logger.js";

/**
 * Product submissions arrive as photos posted to one bound group.
 *
 * The group is bound explicitly with /setgroup rather than "any group the bot
 * is in", because this handler deletes the sender's message -- doing that in a
 * group nobody opted into would destroy messages the admin meant to keep.
 */

/** Telegram serves photo files from a different host than the Bot API. */
const FILE_API = "https://api.telegram.org/file/bot";

/**
 * Width to fetch for hashing. dHash is scale-invariant, so the smallest
 * variant carrying the picture's structure is the right one to download: it
 * keeps the admin's wait short and memory flat, and Telegram's thumbnails are
 * re-encodes of the same source, so the hash still matches the full-size copy.
 */
const HASH_TARGET_WIDTH = 320;

/** Refuse to buffer a pathological file; a Telegram photo is never this big. */
const MAX_HASH_BYTES = 5 * 1024 * 1024;

interface PhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

/** The variant closest to HASH_TARGET_WIDTH, so hashes stay comparable. */
function pickHashVariant(photos: PhotoSize[]): PhotoSize {
  return photos.reduce((best, current) =>
    Math.abs(current.width - HASH_TARGET_WIDTH) < Math.abs(best.width - HASH_TARGET_WIDTH)
      ? current
      : best,
  );
}

async function downloadPhoto(ctx: Context, fileId: string): Promise<Uint8Array | null> {
  try {
    const file = await ctx.api.getFile(fileId);
    if (!file.file_path) return null;
    if (file.file_size && file.file_size > MAX_HASH_BYTES) return null;
    const response = await fetch(`${FILE_API}${requireBotToken()}/${file.file_path}`);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_HASH_BYTES) return null;
    return new Uint8Array(buffer);
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, "photo download failed");
    return null;
  }
}

/** First line of a caption is the title; the rest is the description. */
function splitCaption(caption: string | undefined): { title: string | null; description: string | null } {
  if (!caption) return { title: null, description: null };
  const [first, ...rest] = caption.split("\n");
  return { title: first?.trim() || null, description: rest.join("\n").trim() || null };
}

function describeMatch(match: DuplicateMatch): string {
  const name = match.product.title ? escapeTelegramHtml(match.product.title) : "nomsiz";
  const added = new Date(match.product.created_at).toISOString().slice(0, 10);
  switch (match.reason) {
    case "same_file":
      return `aynan shu fayl allaqachon yuborilgan — <b>${name}</b> (${added})`;
    case "same_image":
      return `rasm bazadagi mahsulot bilan bir xil (farq: ${match.distance}/64) — <b>${name}</b> (${added})`;
    case "same_title":
      return `shu nomdagi mahsulot bazada bor — <b>${name}</b> (${added})`;
  }
}

/**
 * /setgroup — run inside the group that will receive submissions. Binds that
 * chat so this handler acts there, and nowhere else.
 */
export async function handleSetGroupCommand(ctx: Context) {
  const chat = ctx.chat;
  const fromId = ctx.from?.id;
  if (!chat || !fromId) return;

  if (chat.type !== "group" && chat.type !== "supergroup") {
    await ctx.reply("Bu buyruqni mahsulotlar yuboriladigan <b>guruh ichida</b> yuboring.", {
      parse_mode: "HTML",
    });
    return;
  }
  if (!(await isAdmin(fromId, env.TELEGRAM_ADMIN_IDS))) {
    await ctx.reply("Bu buyruq faqat admin uchun.");
    return;
  }
  if (!(await setConfigValue(PRODUCT_GROUP_KEY, String(chat.id)))) {
    await ctx.reply("Guruhni saqlab bo'lmadi. Birozdan so'ng qayta urinib ko'ring.");
    return;
  }

  // Say plainly what still has to be true, rather than letting the first real
  // submission fail on a missing permission.
  await ctx.reply(
    [
      "✅ Bu guruh mahsulotlar bazasiga ulandi.",
      "",
      "Endi shu yerga mahsulot rasmini tashlang — bot uni baza bilan solishtiradi.",
      "Rasm yangi bo'lsa bazaga qo'shadi va sizning xabaringizni o'chiradi.",
      "",
      "⚠️ Buning uchun bot guruhda <b>admin</b> bo'lishi va “xabarlarni o'chirish” huquqiga ega bo'lishi kerak.",
    ].join("\n"),
    { parse_mode: "HTML" },
  );
}

/** /mahsulotlar — how many items the base holds, and the most recent ones. */
export async function handleProductsCommand(ctx: Context) {
  const fromId = ctx.from?.id;
  if (!fromId || !(await isAdmin(fromId, env.TELEGRAM_ADMIN_IDS))) {
    await ctx.reply("Bu buyruq faqat admin uchun.");
    return;
  }

  const [total, recent] = await Promise.all([countProducts(), listProducts(10)]);
  if (total === 0) {
    await ctx.reply("Baza hozircha bo'sh. Guruhga rasm tashlab mahsulot qo'shing.");
    return;
  }

  const lines = [`📦 <b>Bazada ${total} ta mahsulot</b>`, "", "So'nggi qo'shilganlar:"];
  for (const p of recent) {
    const name = p.title ? escapeTelegramHtml(p.title) : "(nomsiz)";
    lines.push(`• ${name} — ${new Date(p.created_at).toISOString().slice(0, 10)}`);
  }
  await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
}

/**
 * A photo landed in the bound group: compare it against the base, add it if it
 * is new, and clear the submission out of the group afterwards.
 */
export async function handleGroupPhoto(ctx: Context, user: UserRow) {
  const chat = ctx.chat;
  const message = ctx.message;
  if (!chat || !message?.photo?.length) return;
  if (chat.type !== "group" && chat.type !== "supergroup") return;

  const boundGroup = await getConfigValue(PRODUCT_GROUP_KEY);
  if (!boundGroup || boundGroup !== String(chat.id)) return;

  // Re-checked here rather than trusted from the group's own admin list: this
  // deletes messages, so it must be the bot's own notion of admin.
  if (!(await isAdmin(user.telegram_user_id, env.TELEGRAM_ADMIN_IDS))) return;

  const photos = message.photo as PhotoSize[];
  const largest = photos[photos.length - 1]!;
  const bytes = await downloadPhoto(ctx, pickHashVariant(photos).file_id);
  const imageHash = bytes ? computeImageHash(bytes) : null;
  if (!imageHash) {
    // Not fatal: file-id and caption comparisons still work, so the submission
    // proceeds with a weaker duplicate check rather than failing outright.
    logger.warn({ chatId: chat.id }, "could not hash submitted photo; comparing by file id and title only");
  }

  const { title, description } = splitCaption(message.caption);
  const normalizedTitle = normalizeTitle(title);
  const { match, truncated } = await findDuplicate({
    photoUniqueId: largest.file_unique_id,
    imageHash,
    normalizedTitle,
  });

  if (truncated) {
    logger.warn({}, "visual duplicate scan hit its row limit; the oldest products were not compared");
  }

  if (match) {
    // The message stays. Deleting it would take away the admin's only copy of
    // a submission the bot just refused, with nothing to re-send if it is wrong.
    await trackEvent(user.id, "product_duplicate", { reason: match.reason });
    await ctx.reply(
      [
        "♻️ <b>Bu mahsulot bazada bor.</b>",
        "",
        describeMatch(match),
        "",
        "Xabaringiz o'chirilmadi — boshqa rasm bilan qayta yuborishingiz mumkin.",
      ].join("\n"),
      { parse_mode: "HTML", reply_parameters: { message_id: message.message_id } },
    );
    return;
  }

  let productTitle = title;
  try {
    const product = await createProduct({
      title: productTitle,
      description,
      normalizedTitle,
      photoFileId: largest.file_id,
      photoUniqueId: largest.file_unique_id,
      imageHash,
      addedBy: user.telegram_user_id,
      sourceChatId: chat.id,
      sourceMessageId: message.message_id,
    });
    productTitle = product.title;
    await trackEvent(user.id, "product_added", { hashed: Boolean(imageHash) });
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err), chatId: chat.id },
      "product insert failed",
    );
    await ctx.reply("❌ Bazaga qo'shib bo'lmadi. Xabaringiz o'chirilmadi — qayta urinib ko'ring.", {
      reply_parameters: { message_id: message.message_id },
    });
    return;
  }

  // Only now is the submission safe to remove: it is already in the base.
  let deleted = true;
  try {
    await ctx.api.deleteMessage(chat.id, message.message_id);
  } catch (err) {
    deleted = false;
    logger.warn(
      { err: err instanceof Error ? err.message : String(err), chatId: chat.id },
      "could not delete the submitted message",
    );
  }

  const name = productTitle ? escapeTelegramHtml(productTitle) : "Nomsiz mahsulot";
  const lines = [`✅ <b>${name}</b> bazaga qo'shildi.`, `📦 Bazada jami: ${await countProducts()} ta`];
  if (!imageHash) {
    lines.push("", "⚠️ Rasm barmoq izi olinmadi — bu mahsulot faqat fayl va nom bo'yicha solishtiriladi.");
  }
  if (!deleted) {
    lines.push(
      "",
      "⚠️ Xabaringizni o'chira olmadim. Bot guruhda admin ekanini va “xabarlarni o'chirish” huquqi borligini tekshiring.",
    );
  }
  await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
}
