import type { Context } from "grammy";
import { env } from "../../config.js";
import { getSiteReport, getWeeklyReport } from "../../db/analytics.js";
import { db } from "../../db/client.js";
import { countLeadsByStatus, listLeads } from "../../db/leads.js";
import { isAdmin } from "../../db/users.js";
import { escapeTelegramHtml } from "../../security/validation.js";
import { adminPanelKeyboard } from "../keyboards.js";
import { logger } from "../../utils/logger.js";
import { PROJECTS } from "../../ai/knowledgeData.js";

async function requireAdmin(ctx: Context): Promise<boolean> {
  const telegramUserId = ctx.from?.id;
  if (!telegramUserId || !(await isAdmin(telegramUserId, env.TELEGRAM_ADMIN_IDS))) {
    await ctx.reply("Bu buyruq faqat admin uchun.");
    return false;
  }
  return true;
}

export async function handleAdminPanel(ctx: Context) {
  if (!(await requireAdmin(ctx))) return;
  await ctx.reply("⚙️ Admin panel", { reply_markup: adminPanelKeyboard() });
}

export async function handleLeadsCommand(ctx: Context) {
  if (!(await requireAdmin(ctx))) return;
  const counts = await countLeadsByStatus();
  await ctx.reply(
    [
      "💼 <b>Leads</b>",
      `🆕 New: ${counts.NEW ?? 0}`,
      `🔄 Reviewing: ${counts.REVIEWING ?? 0}`,
      `💬 Contacted: ${counts.CONTACTED ?? 0}`,
      `✅ Qualified: ${counts.QUALIFIED ?? 0}`,
      `❌ Rejected: ${counts.REJECTED ?? 0}`,
    ].join("\n"),
    { parse_mode: "HTML" },
  );
}

export async function handleStatsCommand(ctx: Context) {
  if (!(await requireAdmin(ctx))) return;
  const [report, site] = await Promise.all([getWeeklyReport(), getSiteReport()]);
  await ctx.reply(formatWeeklyReport(report, site), { parse_mode: "HTML" });
}

/**
 * One weekly card covering both the bot and the public site, so there is a
 * single place to look instead of a separate analytics dashboard.
 */
export function formatWeeklyReport(
  report: Awaited<ReturnType<typeof getWeeklyReport>>,
  site: Awaited<ReturnType<typeof getSiteReport>>,
): string {
  const lines = [
    "📊 <b>HAFTALIK HISOBOT</b>",
    "",
    "🤖 <b>Bot</b>",
    `👥 Foydalanuvchilar: ${report.users}`,
    `💬 AI suhbatlar: ${report.aiConversations}`,
    `💼 Loyiha so'rovlari: ${report.projectInquiries}`,
    `🚨 Lead: ${report.leads} · 🔥 Issiq: ${report.hotLeads} · ✅ Qabul: ${report.qualified}`,
    `📈 Konversiya: ${report.conversionRate}%`,
    "",
    "🌐 <b>Sayt</b>",
    `👁 Ko'rishlar: ${site.pageviews}`,
    `🧍 Tashrifchilar: ${site.visitors}`,
    `📱 Telegram orqali: ${site.fromTelegram}`,
  ];

  if (site.topPaths.length > 0) {
    lines.push("", "🔝 <b>Eng ko'p ochilgan sahifalar</b>");
    for (const p of site.topPaths) {
      lines.push(`• <code>${escapeTelegramHtml(p.path)}</code> — ${p.views}`);
    }
  }

  return lines.join("\n");
}

const BROADCAST_LIMIT_PER_MINUTE = 20; // Telegram's own bulk-send ceiling, roughly

/** /broadcast <message text> — item 32. Confirms recipient count before sending. */
export async function handleBroadcastCommand(ctx: Context) {
  if (!(await requireAdmin(ctx))) return;
  const text = ctx.match?.toString().trim();
  if (!text) {
    await ctx.reply("Foydalanish: /broadcast Xabar matni");
    return;
  }

  const { data: users, error } = await db.from("xbot_users").select("telegram_user_id").eq("is_blocked", false);
  if (error || !users) {
    await ctx.reply("Foydalanuvchilar ro'yxatini olib bo'lmadi.");
    return;
  }

  await ctx.reply(`📢 ${users.length} foydalanuvchiga yuborilmoqda...`);

  let sent = 0;
  let failed = 0;
  for (const u of users) {
    try {
      await ctx.api.sendMessage(u.telegram_user_id, escapeTelegramHtml(text), { parse_mode: "HTML" });
      sent += 1;
    } catch (err) {
      failed += 1;
      logger.warn({ err, telegramUserId: u.telegram_user_id }, "broadcast send failed");
    }
    // Stay comfortably under Telegram's rate limits for bulk sends.
    await new Promise((resolve) => setTimeout(resolve, 60_000 / BROADCAST_LIMIT_PER_MINUTE));
  }

  await db.from("xbot_notifications").insert({ type: "broadcast", payload: { text, sent, failed } });
  await ctx.reply(`✅ Yuborildi: ${sent} · ❌ Xato: ${failed}`);
}

export async function handleAdminLeadsList(ctx: Context) {
  if (!(await requireAdmin(ctx))) return;
  const leads = await listLeads({ limit: 10 });
  if (leads.length === 0) return ctx.reply("Lead yo'q.");
  const text = leads
    .map((l) => `• <b>${escapeTelegramHtml(l.project_type ?? "—")}</b> — ${escapeTelegramHtml(l.first_name ?? "—")} (${l.priority}, ${l.status})`)
    .join("\n");
  await ctx.reply(text, { parse_mode: "HTML" });
}

const SITE_ORIGIN = "https://xojasoipov-sketch.github.io/Portfolio";

/**
 * Publishes a project card to the public showcase channel.
 *
 * The channel is meant to be a browsable portfolio base, so each post is a
 * self-contained card: screenshot, what the project is, the stack, and a way
 * to actually try it. The channel handle lives in xbot_bot_config
 * (TELEGRAM_CHANNEL) rather than in code, so it can be pointed at a different
 * channel without a redeploy.
 *
 *   /post            -> lists what can be published
 *   /post zet        -> publishes that project
 */
export async function handlePostCommand(ctx: Context) {
  if (!(await requireAdmin(ctx))) return;

  const channel = env.TELEGRAM_CHANNEL;
  if (!channel) {
    await ctx.reply(
      [
        "Kanal hali ulanmagan.",
        "",
        "Ulash uchun: kanal yarating, botni unga <b>admin</b> qiling, so'ng",
        "<code>xbot_bot_config</code> jadvaliga qo'shing:",
        "<code>key = TELEGRAM_CHANNEL</code>, <code>value = @kanal_nomi</code>",
      ].join("\n"),
      { parse_mode: "HTML" },
    );
    return;
  }

  const key = ctx.match?.toString().trim().toLowerCase();
  const keys = PROJECTS.map((p) => p.key);

  if (!key) {
    await ctx.reply(
      [
        `📢 Kanal: <b>${escapeTelegramHtml(channel)}</b>`,
        "",
        "Nashr qilish uchun: <code>/post &lt;loyiha&gt;</code>",
        ...keys.map((k) => `• <code>/post ${k}</code>`),
      ].join("\n"),
      { parse_mode: "HTML" },
    );
    return;
  }

  const project = PROJECTS.find((p) => p.key === key);
  if (!project) {
    await ctx.reply(`Bunday loyiha yo'q. Mavjud: ${keys.join(", ")}`);
    return;
  }

  const caption = [
    `<b>${escapeTelegramHtml(project.title)}</b>`,
    `<i>${escapeTelegramHtml(project.category)}</i>`,
    "",
    escapeTelegramHtml(project.summary),
    "",
    `🛠 ${escapeTelegramHtml(project.tech.join(" · "))}`,
    "",
    `🔗 Portfolio: ${SITE_ORIGIN}/`,
    `📋 Narxlar: ${SITE_ORIGIN}/xizmatlar`,
  ].join("\n");

  try {
    await ctx.api.sendPhoto(channel, `${SITE_ORIGIN}/projects/${project.key}.jpg`, {
      caption,
      parse_mode: "HTML",
    });
    await ctx.reply(`✅ <b>${escapeTelegramHtml(project.title)}</b> kanalga joylandi.`, {
      parse_mode: "HTML",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err: message, channel, key }, "channel post failed");
    // The overwhelmingly common cause is the bot not being an admin of the
    // channel, so say that rather than echoing a raw API error.
    await ctx.reply(
      [
        "❌ Joylashtirib bo'lmadi.",
        "",
        "Tekshiring: bot kanalda <b>admin</b>mi va kanal nomi to'g'rimi?",
        `<code>${escapeTelegramHtml(message)}</code>`,
      ].join("\n"),
      { parse_mode: "HTML" },
    );
  }
}
