import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import {
  type CatalogItem,
  getCatalog,
  getPackages,
  saveCatalog,
  savePackages,
} from "../../db/catalog.js";
import {
  type AdminSession,
  clearAdminSession,
  setAdminSession,
} from "../../db/adminSessions.js";
import { listRecentUsers } from "../../db/users.js";
import { escapeTelegramHtml } from "../../security/validation.js";
import { adminPanelKeyboard } from "../keyboards.js";

/**
 * The bot's own admin panel for the exact pricing data the AI agent and the
 * website's catalog both read (xbot_knowledge_items, category "pricing") --
 * see db/catalog.ts. Editing here needs no redeploy and no re-seed, unlike a
 * price fixed in code.
 *
 * Navigation is edited in place (the tapped message is rewritten); a value
 * typed as free text always lands as a fresh reply, since by then there is no
 * button-bearing message left to edit.
 */

const USERS_PAGE_SIZE = 10;

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

async function render(ctx: Context, edit: boolean, text: string, kb: InlineKeyboard): Promise<void> {
  if (edit) {
    try {
      await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: kb });
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("message is not modified")) return;
      // Edit genuinely failed (e.g. the original message aged out) -- fall
      // through and send a fresh message instead of losing the screen.
    }
  }
  await ctx.reply(text, { parse_mode: "HTML", reply_markup: kb });
}

// ---------------------------------------------------------------------------
// Catalog (pricing.catalog: group -> items[])
// ---------------------------------------------------------------------------

async function showCatalogRoot(ctx: Context, edit: boolean): Promise<void> {
  const groups = await getCatalog();
  const kb = new InlineKeyboard();
  groups.forEach((g, gi) => {
    kb.text(`📁 ${truncate(g.group, 30)} (${g.items.length})`, `adm:cat:g:${gi}`).row();
  });
  kb.text("➕ Yangi guruh", "adm:cat:ag").row();
  kb.text("⬅️ Admin panel", "adm:root");
  const text = groups.length
    ? "💰 <b>Xizmatlar narxnomasi</b>\n\nGuruhni tanlang:"
    : "💰 <b>Xizmatlar narxnomasi</b>\n\nHali guruh yo'q. Boshlash uchun yangi guruh qo'shing.";
  await render(ctx, edit, text, kb);
}

async function showGroupDetail(ctx: Context, gi: number, edit: boolean): Promise<void> {
  const groups = await getCatalog();
  const group = groups[gi];
  if (!group) {
    await ctx.reply("Guruh topilmadi — ro'yxat yangilandimi, qayta oching.");
    await showCatalogRoot(ctx, false);
    return;
  }
  const lines = [`📁 <b>${escapeTelegramHtml(group.group)}</b>`, ""];
  if (group.items.length === 0) lines.push("Hali xizmat yo'q.");
  const kb = new InlineKeyboard();
  group.items.forEach((item, ii) => {
    lines.push(
      `${ii + 1}. <b>${escapeTelegramHtml(item.name)}</b>\n   ⏱ ${escapeTelegramHtml(item.duration)} · 💵 ${escapeTelegramHtml(item.price)} (${escapeTelegramHtml(item.usd)})`,
    );
    kb.text(`${ii + 1}. ${truncate(item.name, 28)}`, `adm:cat:i:${gi}:${ii}`).row();
  });
  kb.text("➕ Yangi xizmat", `adm:cat:ai:${gi}`).row();
  kb.text("✏️ Guruh nomi", `adm:cat:rg:${gi}`).text("🗑 Guruhni o'chirish", `adm:cat:dg:${gi}`).row();
  kb.text("⬅️ Orqaga", "adm:cat");
  await render(ctx, edit, lines.join("\n"), kb);
}

async function showItemDetail(ctx: Context, gi: number, ii: number, edit: boolean): Promise<void> {
  const groups = await getCatalog();
  const item = groups[gi]?.items[ii];
  if (!item) {
    await ctx.reply("Xizmat topilmadi — ro'yxat yangilandimi, qayta oching.");
    await showCatalogRoot(ctx, false);
    return;
  }
  const text = [
    `🔧 <b>${escapeTelegramHtml(item.name)}</b>`,
    "",
    `⏱ Muddat: ${escapeTelegramHtml(item.duration)}`,
    `💵 Narx (so'm): ${escapeTelegramHtml(item.price)}`,
    `💵 Narx ($): ${escapeTelegramHtml(item.usd)}`,
  ].join("\n");
  const kb = new InlineKeyboard()
    .text("✏️ Nomi", `adm:cat:ef:${gi}:${ii}:n`)
    .text("✏️ Muddat", `adm:cat:ef:${gi}:${ii}:d`)
    .row()
    .text("✏️ Narx (so'm)", `adm:cat:ef:${gi}:${ii}:p`)
    .text("✏️ Narx ($)", `adm:cat:ef:${gi}:${ii}:u`)
    .row()
    .text("🗑 O'chirish", `adm:cat:di:${gi}:${ii}`)
    .row()
    .text("⬅️ Orqaga", `adm:cat:g:${gi}`);
  await render(ctx, edit, text, kb);
}

const CATALOG_FIELD_LABEL: Record<string, string> = {
  n: "Nomi",
  d: "Muddat",
  p: "Narx (so'm)",
  u: "Narx ($)",
};
const CATALOG_FIELD_KEY: Record<string, keyof CatalogItem> = {
  n: "name",
  d: "duration",
  p: "price",
  u: "usd",
};

async function promptCatalogEditField(ctx: Context, gi: number, ii: number, f: string): Promise<void> {
  const groups = await getCatalog();
  const item = groups[gi]?.items[ii];
  const label = CATALOG_FIELD_LABEL[f];
  const key = CATALOG_FIELD_KEY[f];
  if (!item || !label || !key) {
    await ctx.answerCallbackQuery({ text: "Topilmadi", show_alert: true });
    return;
  }
  const uid = ctx.from?.id;
  if (!uid) return;
  await setAdminSession(uid, "cat_edit_field", { gi, ii, f });
  await ctx.answerCallbackQuery();
  const current = item[key];
  await ctx.editMessageText(
    `✏️ <b>${label}</b>\n\nJoriy qiymat: ${escapeTelegramHtml(String(current))}\n\nYangi qiymatni yozib yuboring:`,
    { parse_mode: "HTML", reply_markup: new InlineKeyboard().text("❌ Bekor qilish", "adm:cancel") },
  );
}

async function promptCatalogAddItem(ctx: Context, gi: number): Promise<void> {
  const uid = ctx.from?.id;
  if (!uid) return;
  await setAdminSession(uid, "cat_add_item", { gi });
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    [
      "➕ <b>Yangi xizmat</b>",
      "",
      "Quyidagi formatda bitta xabar qilib yozing:",
      "<code>Nomi | Muddat | Narx (so'm) | Narx ($)</code>",
      "",
      "Masalan:",
      "<code>Landing sayt | 2-3 hafta | 6 000 000 – 12 000 000 so'm | $500 – $1 000</code>",
    ].join("\n"),
    { parse_mode: "HTML", reply_markup: new InlineKeyboard().text("❌ Bekor qilish", "adm:cancel") },
  );
}

async function promptCatalogAddGroup(ctx: Context): Promise<void> {
  const uid = ctx.from?.id;
  if (!uid) return;
  await setAdminSession(uid, "cat_add_group", {});
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("➕ <b>Yangi guruh</b>\n\nGuruh nomini yozing (masalan: <code>Dizayn xizmatlari</code>):", {
    parse_mode: "HTML",
    reply_markup: new InlineKeyboard().text("❌ Bekor qilish", "adm:cancel"),
  });
}

async function promptCatalogRenameGroup(ctx: Context, gi: number): Promise<void> {
  const groups = await getCatalog();
  const group = groups[gi];
  if (!group) {
    await ctx.answerCallbackQuery({ text: "Guruh topilmadi", show_alert: true });
    return;
  }
  const uid = ctx.from?.id;
  if (!uid) return;
  await setAdminSession(uid, "cat_rename_group", { gi });
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `✏️ <b>Guruh nomi</b>\n\nJoriy: ${escapeTelegramHtml(group.group)}\n\nYangi nomni yozing:`,
    { parse_mode: "HTML", reply_markup: new InlineKeyboard().text("❌ Bekor qilish", "adm:cancel") },
  );
}

async function confirmDeleteGroup(ctx: Context, gi: number): Promise<void> {
  const groups = await getCatalog();
  const group = groups[gi];
  if (!group) {
    await ctx.answerCallbackQuery({ text: "Guruh topilmadi", show_alert: true });
    return;
  }
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `🗑 <b>${escapeTelegramHtml(group.group)}</b> guruhini ${group.items.length} ta xizmati bilan birga o'chirasizmi?`,
    {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .text("✅ Ha, o'chirish", `adm:cat:dgy:${gi}`)
        .text("❌ Yo'q", `adm:cat:g:${gi}`),
    },
  );
}

async function deleteGroup(ctx: Context, gi: number): Promise<void> {
  const groups = await getCatalog();
  if (!groups[gi]) {
    await ctx.answerCallbackQuery({ text: "Guruh topilmadi", show_alert: true });
    return;
  }
  const [removed] = groups.splice(gi, 1);
  await saveCatalog(groups);
  await ctx.answerCallbackQuery({ text: "O'chirildi" });
  await ctx.editMessageText(`🗑 O'chirildi: ${escapeTelegramHtml(removed!.group)}`, { parse_mode: "HTML" });
  await showCatalogRoot(ctx, false);
}

async function confirmDeleteItem(ctx: Context, gi: number, ii: number): Promise<void> {
  const groups = await getCatalog();
  const item = groups[gi]?.items[ii];
  if (!item) {
    await ctx.answerCallbackQuery({ text: "Topilmadi", show_alert: true });
    return;
  }
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(`🗑 <b>${escapeTelegramHtml(item.name)}</b> xizmatini o'chirasizmi?`, {
    parse_mode: "HTML",
    reply_markup: new InlineKeyboard()
      .text("✅ Ha, o'chirish", `adm:cat:diy:${gi}:${ii}`)
      .text("❌ Yo'q", `adm:cat:i:${gi}:${ii}`),
  });
}

async function deleteItem(ctx: Context, gi: number, ii: number): Promise<void> {
  const groups = await getCatalog();
  const item = groups[gi]?.items[ii];
  if (!item) {
    await ctx.answerCallbackQuery({ text: "Topilmadi", show_alert: true });
    return;
  }
  groups[gi]!.items.splice(ii, 1);
  await saveCatalog(groups);
  await ctx.answerCallbackQuery({ text: "O'chirildi" });
  await ctx.editMessageText(`🗑 O'chirildi: ${escapeTelegramHtml(item.name)}`, { parse_mode: "HTML" });
  await showGroupDetail(ctx, gi, false);
}

async function handleCatalogCallback(ctx: Context, rest: string[]): Promise<void> {
  const [route, a, b, c] = rest;
  if (!route) {
    await ctx.answerCallbackQuery();
    return showCatalogRoot(ctx, true);
  }
  if (route === "g") return showGroupDetail(ctx, Number(a), true);
  if (route === "i") return showItemDetail(ctx, Number(a), Number(b), true);
  if (route === "ef") return promptCatalogEditField(ctx, Number(a), Number(b), c!);
  if (route === "ai") return promptCatalogAddItem(ctx, Number(a));
  if (route === "ag") return promptCatalogAddGroup(ctx);
  if (route === "rg") return promptCatalogRenameGroup(ctx, Number(a));
  if (route === "dg") return confirmDeleteGroup(ctx, Number(a));
  if (route === "dgy") return deleteGroup(ctx, Number(a));
  if (route === "di") return confirmDeleteItem(ctx, Number(a), Number(b));
  if (route === "diy") return deleteItem(ctx, Number(a), Number(b));
  await ctx.answerCallbackQuery();
}

// ---------------------------------------------------------------------------
// Packages (pricing.packages)
// ---------------------------------------------------------------------------

async function showPackagesList(ctx: Context, edit: boolean): Promise<void> {
  const packages = await getPackages();
  const kb = new InlineKeyboard();
  packages.forEach((p, pi) => {
    kb.text(`${p.popular ? "⭐ " : ""}${truncate(p.name, 26)} — ${truncate(p.price, 20)}`, `adm:pk:i:${pi}`).row();
  });
  kb.text("➕ Yangi paket", "adm:pk:add").row();
  kb.text("⬅️ Admin panel", "adm:root");
  const text = packages.length
    ? "📦 <b>Paketlar</b>\n\nPaketni tanlang:"
    : "📦 <b>Paketlar</b>\n\nHali paket yo'q. Boshlash uchun yangi paket qo'shing.";
  await render(ctx, edit, text, kb);
}

async function showPackageDetail(ctx: Context, pi: number, edit: boolean): Promise<void> {
  const packages = await getPackages();
  const pkg = packages[pi];
  if (!pkg) {
    await ctx.reply("Paket topilmadi — ro'yxat yangilandimi, qayta oching.");
    await showPackagesList(ctx, false);
    return;
  }
  const text = [
    `📦 <b>${escapeTelegramHtml(pkg.name)}</b>${pkg.popular ? " ⭐" : ""}`,
    "",
    `💰 Narx: ${escapeTelegramHtml(pkg.price)}`,
    `⏱ Muddat: ${escapeTelegramHtml(pkg.duration)}`,
    "",
    "Xususiyatlar:",
    ...pkg.features.map((f) => `• ${escapeTelegramHtml(f)}`),
  ].join("\n");
  const kb = new InlineKeyboard()
    .text("✏️ Nomi", `adm:pk:ef:${pi}:n`)
    .text("✏️ Narx", `adm:pk:ef:${pi}:p`)
    .row()
    .text("✏️ Muddat", `adm:pk:ef:${pi}:d`)
    .text("📋 Xususiyatlar", `adm:pk:feat:${pi}`)
    .row()
    .text(pkg.popular ? "☆ Mashhurlikni olib tashlash" : "⭐ Mashhur qilish", `adm:pk:pop:${pi}`)
    .row()
    .text("🗑 O'chirish", `adm:pk:d:${pi}`)
    .row()
    .text("⬅️ Orqaga", "adm:pk");
  await render(ctx, edit, text, kb);
}

const PACKAGE_FIELD_LABEL: Record<string, string> = { n: "Nomi", p: "Narx", d: "Muddat" };
const PACKAGE_FIELD_KEY: Record<string, "name" | "price" | "duration"> = { n: "name", p: "price", d: "duration" };

async function promptPackageEditField(ctx: Context, pi: number, f: string): Promise<void> {
  const packages = await getPackages();
  const pkg = packages[pi];
  const label = PACKAGE_FIELD_LABEL[f];
  const key = PACKAGE_FIELD_KEY[f];
  if (!pkg || !label || !key) {
    await ctx.answerCallbackQuery({ text: "Topilmadi", show_alert: true });
    return;
  }
  const uid = ctx.from?.id;
  if (!uid) return;
  await setAdminSession(uid, "pkg_edit_field", { pi, f });
  await ctx.answerCallbackQuery();
  const current = pkg[key];
  await ctx.editMessageText(
    `✏️ <b>${label}</b>\n\nJoriy qiymat: ${escapeTelegramHtml(String(current))}\n\nYangi qiymatni yozib yuboring:`,
    { parse_mode: "HTML", reply_markup: new InlineKeyboard().text("❌ Bekor qilish", "adm:cancel") },
  );
}

async function promptPackageEditFeatures(ctx: Context, pi: number): Promise<void> {
  const packages = await getPackages();
  const pkg = packages[pi];
  if (!pkg) {
    await ctx.answerCallbackQuery({ text: "Topilmadi", show_alert: true });
    return;
  }
  const uid = ctx.from?.id;
  if (!uid) return;
  await setAdminSession(uid, "pkg_edit_features", { pi });
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    [
      "📋 <b>Xususiyatlar</b>",
      "",
      "Joriy ro'yxat:",
      ...pkg.features.map((f) => `• ${escapeTelegramHtml(f)}`),
      "",
      "Har bir xususiyatni alohida qatorda yozib yuboring — bu eskisini to'liq almashtiradi.",
    ].join("\n"),
    { parse_mode: "HTML", reply_markup: new InlineKeyboard().text("❌ Bekor qilish", "adm:cancel") },
  );
}

async function togglePackagePopular(ctx: Context, pi: number): Promise<void> {
  const packages = await getPackages();
  const pkg = packages[pi];
  if (!pkg) {
    await ctx.answerCallbackQuery({ text: "Topilmadi", show_alert: true });
    return;
  }
  pkg.popular = !pkg.popular;
  await savePackages(packages);
  await ctx.answerCallbackQuery({ text: pkg.popular ? "Mashhur qilindi" : "Olib tashlandi" });
  await showPackageDetail(ctx, pi, true);
}

async function promptPackageAdd(ctx: Context): Promise<void> {
  const uid = ctx.from?.id;
  if (!uid) return;
  await setAdminSession(uid, "pkg_add", {});
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    [
      "➕ <b>Yangi paket</b>",
      "",
      "Quyidagi formatda bitta xabar qilib yozing (xususiyatlarni <code>;</code> bilan ajrating):",
      "<code>Nomi | Narx | Muddat | Xususiyat1; Xususiyat2; Xususiyat3</code>",
      "",
      "Masalan:",
      "<code>Boshlang'ich | 12 000 000 so'm (~$1 000) | 2 hafta | To'liq audit; 2 kritik muammoni tuzatish</code>",
    ].join("\n"),
    { parse_mode: "HTML", reply_markup: new InlineKeyboard().text("❌ Bekor qilish", "adm:cancel") },
  );
}

async function confirmDeletePackage(ctx: Context, pi: number): Promise<void> {
  const packages = await getPackages();
  const pkg = packages[pi];
  if (!pkg) {
    await ctx.answerCallbackQuery({ text: "Topilmadi", show_alert: true });
    return;
  }
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(`🗑 <b>${escapeTelegramHtml(pkg.name)}</b> paketini o'chirasizmi?`, {
    parse_mode: "HTML",
    reply_markup: new InlineKeyboard().text("✅ Ha, o'chirish", `adm:pk:dy:${pi}`).text("❌ Yo'q", `adm:pk:i:${pi}`),
  });
}

async function deletePackage(ctx: Context, pi: number): Promise<void> {
  const packages = await getPackages();
  const pkg = packages[pi];
  if (!pkg) {
    await ctx.answerCallbackQuery({ text: "Topilmadi", show_alert: true });
    return;
  }
  packages.splice(pi, 1);
  await savePackages(packages);
  await ctx.answerCallbackQuery({ text: "O'chirildi" });
  await ctx.editMessageText(`🗑 O'chirildi: ${escapeTelegramHtml(pkg.name)}`, { parse_mode: "HTML" });
  await showPackagesList(ctx, false);
}

async function handlePackageCallback(ctx: Context, rest: string[]): Promise<void> {
  const [route, a, b] = rest;
  if (!route) {
    await ctx.answerCallbackQuery();
    return showPackagesList(ctx, true);
  }
  if (route === "i") return showPackageDetail(ctx, Number(a), true);
  if (route === "ef") return promptPackageEditField(ctx, Number(a), b!);
  if (route === "feat") return promptPackageEditFeatures(ctx, Number(a));
  if (route === "pop") return togglePackagePopular(ctx, Number(a));
  if (route === "add") return promptPackageAdd(ctx);
  if (route === "d") return confirmDeletePackage(ctx, Number(a));
  if (route === "dy") return deletePackage(ctx, Number(a));
  await ctx.answerCallbackQuery();
}

// ---------------------------------------------------------------------------
// Users (read-only: who has pressed /start)
// ---------------------------------------------------------------------------

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "hozir";
  if (minutes < 60) return `${minutes} daq oldin`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;
  const days = Math.floor(hours / 24);
  return `${days} kun oldin`;
}

async function showUsersList(ctx: Context, offset: number, edit: boolean): Promise<void> {
  const { users, total } = await listRecentUsers(USERS_PAGE_SIZE, offset);
  const lines = [`👥 <b>Foydalanuvchilar</b> — jami ${total}`, ""];
  if (users.length === 0) lines.push("Bu sahifada hech kim yo'q.");
  users.forEach((u, i) => {
    const badges = [u.is_admin ? "👑" : "", u.is_blocked ? "🚫" : ""].filter(Boolean).join(" ");
    const name = escapeTelegramHtml(u.first_name ?? "—");
    const username = u.telegram_username ? ` (${escapeTelegramHtml(u.telegram_username)})` : "";
    lines.push(
      `${offset + i + 1}. <b>${name}</b>${username} ${badges}\n   🕐 ${relativeTime(u.last_seen_at)} · ${escapeTelegramHtml(u.source)}`,
    );
  });
  const kb = new InlineKeyboard();
  const hasPrev = offset > 0;
  const hasNext = offset + USERS_PAGE_SIZE < total;
  if (hasPrev || hasNext) {
    if (hasPrev) kb.text("⬅️ Oldingi", `adm:u:${Math.max(0, offset - USERS_PAGE_SIZE)}`);
    if (hasNext) kb.text("Keyingi ➡️", `adm:u:${offset + USERS_PAGE_SIZE}`);
    kb.row();
  }
  kb.text("⬅️ Admin panel", "adm:root");
  await render(ctx, edit, lines.join("\n"), kb);
}

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

/** Routes every "adm:*" callback. Caller (bot/handlers/callback.ts) has
 * already re-checked isAdmin() before this is reached. */
export async function handleAdminPanelCallback(ctx: Context, data: string): Promise<void> {
  const parts = data.split(":");
  const route = parts[1];

  if (route === "root") {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText("⚙️ Admin panel", { reply_markup: adminPanelKeyboard() });
    return;
  }
  if (route === "cancel") {
    const uid = ctx.from?.id;
    if (uid) await clearAdminSession(uid);
    await ctx.answerCallbackQuery({ text: "Bekor qilindi" });
    await ctx.editMessageText("⚙️ Admin panel", { reply_markup: adminPanelKeyboard() });
    return;
  }
  if (route === "cat") return handleCatalogCallback(ctx, parts.slice(2));
  if (route === "pk") return handlePackageCallback(ctx, parts.slice(2));
  if (route === "u") return showUsersList(ctx, Number(parts[2] ?? 0) || 0, true);

  await ctx.answerCallbackQuery();
}

/**
 * Splits a "Nomi | Muddat | Narx (so'm) | Narx ($)" style message into exactly
 * `count` non-empty trimmed fields, or null if the admin's formatting doesn't
 * match -- callers re-prompt on null rather than guessing.
 */
function parsePipeFields(text: string, count: number): string[] | null {
  const parts = text.split("|").map((p) => p.trim());
  if (parts.length !== count || parts.some((p) => p.length === 0)) return null;
  return parts;
}

const CANCEL_WORDS = new Set(["/cancel", "bekor", "bekor qilish", "cancel"]);

/**
 * Called from bot/handlers/message.ts before any menu/AI routing whenever the
 * admin has a pending session row. Returns once the text has been consumed
 * one way or another (applied, rejected with a re-prompt, or cancelled) -- the
 * caller never falls through to the AI for this message.
 */
export async function processAdminSessionText(
  ctx: Context,
  telegramUserId: number,
  session: AdminSession,
  rawText: string,
): Promise<void> {
  const text = rawText.trim();
  if (CANCEL_WORDS.has(text.toLowerCase())) {
    await clearAdminSession(telegramUserId);
    await ctx.reply("❌ Bekor qilindi.", { reply_markup: adminPanelKeyboard() });
    return;
  }

  const ctxData = session.context as Record<string, unknown>;

  switch (session.action) {
    case "cat_edit_field": {
      const gi = ctxData.gi as number;
      const ii = ctxData.ii as number;
      const f = ctxData.f as string;
      const groups = await getCatalog();
      const item = groups[gi]?.items[ii];
      const key = CATALOG_FIELD_KEY[f];
      if (!item || !key) {
        await clearAdminSession(telegramUserId);
        await ctx.reply("Topilmadi — ro'yxat o'zgargan bo'lishi mumkin.");
        return;
      }
      item[key] = text;
      await saveCatalog(groups);
      await clearAdminSession(telegramUserId);
      await ctx.reply("✅ Yangilandi.");
      await showItemDetail(ctx, gi, ii, false);
      return;
    }
    case "cat_add_item": {
      const gi = ctxData.gi as number;
      const fields = parsePipeFields(text, 4);
      if (!fields) {
        await ctx.reply(
          "Format noto'g'ri. Namuna:\n<code>Nomi | Muddat | Narx (so'm) | Narx ($)</code>",
          { parse_mode: "HTML" },
        );
        return;
      }
      const [name, duration, price, usd] = fields;
      const groups = await getCatalog();
      if (!groups[gi]) {
        await clearAdminSession(telegramUserId);
        await ctx.reply("Guruh topilmadi — ro'yxat o'zgargan bo'lishi mumkin.");
        return;
      }
      groups[gi]!.items.push({ name: name!, duration: duration!, price: price!, usd: usd! });
      await saveCatalog(groups);
      await clearAdminSession(telegramUserId);
      await ctx.reply(`✅ Xizmat qo'shildi: ${escapeTelegramHtml(name!)}`, { parse_mode: "HTML" });
      await showGroupDetail(ctx, gi, false);
      return;
    }
    case "cat_add_group": {
      if (text.length < 2) {
        await ctx.reply("Guruh nomi juda qisqa. Qayta yozing:");
        return;
      }
      const groups = await getCatalog();
      groups.push({ group: text, items: [] });
      await saveCatalog(groups);
      await clearAdminSession(telegramUserId);
      await ctx.reply(`✅ Guruh qo'shildi: ${escapeTelegramHtml(text)}`, { parse_mode: "HTML" });
      await showCatalogRoot(ctx, false);
      return;
    }
    case "cat_rename_group": {
      const gi = ctxData.gi as number;
      const groups = await getCatalog();
      if (!groups[gi]) {
        await clearAdminSession(telegramUserId);
        await ctx.reply("Guruh topilmadi — ro'yxat o'zgargan bo'lishi mumkin.");
        return;
      }
      groups[gi]!.group = text;
      await saveCatalog(groups);
      await clearAdminSession(telegramUserId);
      await ctx.reply("✅ Guruh nomi yangilandi.");
      await showGroupDetail(ctx, gi, false);
      return;
    }
    case "pkg_edit_field": {
      const pi = ctxData.pi as number;
      const f = ctxData.f as string;
      const packages = await getPackages();
      const pkg = packages[pi];
      const key = PACKAGE_FIELD_KEY[f];
      if (!pkg || !key) {
        await clearAdminSession(telegramUserId);
        await ctx.reply("Topilmadi — ro'yxat o'zgargan bo'lishi mumkin.");
        return;
      }
      pkg[key] = text;
      await savePackages(packages);
      await clearAdminSession(telegramUserId);
      await ctx.reply("✅ Yangilandi.");
      await showPackageDetail(ctx, pi, false);
      return;
    }
    case "pkg_edit_features": {
      const pi = ctxData.pi as number;
      const features = text
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean);
      if (features.length === 0) {
        await ctx.reply("Kamida bitta xususiyat kiriting.");
        return;
      }
      const packages = await getPackages();
      if (!packages[pi]) {
        await clearAdminSession(telegramUserId);
        await ctx.reply("Paket topilmadi — ro'yxat o'zgargan bo'lishi mumkin.");
        return;
      }
      packages[pi]!.features = features;
      await savePackages(packages);
      await clearAdminSession(telegramUserId);
      await ctx.reply("✅ Xususiyatlar yangilandi.");
      await showPackageDetail(ctx, pi, false);
      return;
    }
    case "pkg_add": {
      const parts = text.split("|").map((p) => p.trim());
      if (parts.length < 3 || parts.slice(0, 3).some((p) => p.length === 0)) {
        await ctx.reply(
          "Format noto'g'ri. Namuna:\n<code>Nomi | Narx | Muddat | Xususiyat1; Xususiyat2</code>",
          { parse_mode: "HTML" },
        );
        return;
      }
      const [name, price, duration] = parts;
      const features = (parts[3] ?? "")
        .split(";")
        .map((f) => f.trim())
        .filter(Boolean);
      const packages = await getPackages();
      packages.push({ name: name!, price: price!, duration: duration!, features });
      await savePackages(packages);
      await clearAdminSession(telegramUserId);
      await ctx.reply(`✅ Paket qo'shildi: ${escapeTelegramHtml(name!)}`, { parse_mode: "HTML" });
      await showPackagesList(ctx, false);
      return;
    }
    default: {
      // Unrecognised/stale session -- clear it so the user isn't stuck.
      await clearAdminSession(telegramUserId);
      return;
    }
  }
}
