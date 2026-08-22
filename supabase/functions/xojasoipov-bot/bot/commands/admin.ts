import type { Context } from "npm:grammy@1.31.0";
import { env } from "../../config.ts";
import { getSiteReport, getWeeklyReport } from "../../db/analytics.ts";
import { db } from "../../db/client.ts";
import { listLeads } from "../../db/leads.ts";
import { isAdmin } from "../../db/users.ts";
import { escapeTelegramHtml } from "../../security/validation.ts";
import { adminPanelKeyboard } from "../keyboards.ts";
import { logger } from "../../utils/logger.ts";

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
