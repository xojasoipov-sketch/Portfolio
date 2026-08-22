import type { Context } from "grammy";
import { getSiteReport, getWeeklyReport } from "../../db/analytics.js";
import { countLeadsByStatus, getLead, listLeads, updateLeadPriority, updateLeadStatus } from "../../db/leads.js";
import { isAdmin } from "../../db/users.js";
import { env } from "../../config.js";
import { escapeTelegramHtml } from "../../security/validation.js";
import type { UserRow } from "../../db/types.js";
import { handleHandoffCancel, handleHandoffSend, handleLeadCancel, handleLeadConfirm, handleLeadEdit } from "./message.js";
import { adminLeadKeyboard } from "../keyboards.js";
import { formatWeeklyReport } from "../commands/admin.js";
import { buildLeadNotificationText } from "../../notifications/admin.js";
import { logger } from "../../utils/logger.js";
import { t } from "../i18n.js";

/**
 * Routes every inline-button callback. Client-facing lead callbacks go
 * straight through; anything admin-shaped re-checks admin status itself
 * (never trusts that only an admin could have seen the button — a forwarded
 * message could carry the same callback data).
 */
export async function handleCallbackQuery(ctx: Context, user: UserRow) {
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  if (data.startsWith("lead_confirm:")) return handleLeadConfirm(ctx, user, data.split(":")[1]!);
  if (data.startsWith("lead_edit:")) return handleLeadEdit(ctx, user, data.split(":")[1]!);
  if (data.startsWith("lead_cancel:")) return handleLeadCancel(ctx, user, data.split(":")[1]!);
  if (data === "handoff_send") return handleHandoffSend(ctx, user);
  if (data === "handoff_cancel") return handleHandoffCancel(ctx);

  if (
    data.startsWith("lead_status:") ||
    data.startsWith("lead_priority:") ||
    data.startsWith("lead_detail:") ||
    data === "admin_stats" ||
    data.startsWith("admin_leads:")
  ) {
    const admin = await isAdmin(user.telegram_user_id, env.TELEGRAM_ADMIN_IDS);
    if (!admin) {
      await ctx.answerCallbackQuery({ text: t(user.language, "notAdmin"), show_alert: true });
      return;
    }
    return handleAdminCallback(ctx, data);
  }

  await ctx.answerCallbackQuery();
}

async function handleAdminCallback(ctx: Context, data: string) {
  const [action, ...rest] = data.split(":");

  if (action === "lead_status") {
    const [leadId, status] = rest;
    await updateLeadStatus(leadId!, status as never, String(ctx.from?.id ?? "admin"));
    await ctx.answerCallbackQuery({ text: `Status: ${status}` });
    await refreshLeadCard(ctx, leadId!);
    return;
  }

  if (action === "lead_priority") {
    const [leadId, priority] = rest;
    await updateLeadPriority(leadId!, priority as never, String(ctx.from?.id ?? "admin"));
    await ctx.answerCallbackQuery({ text: `Priority: ${priority}` });
    await refreshLeadCard(ctx, leadId!);
    return;
  }

  if (action === "lead_detail") {
    const leadId = rest[0]!;
    const lead = await getLead(leadId);
    await ctx.answerCallbackQuery();
    if (!lead) return ctx.reply("Lead topilmadi.");
    await ctx.reply(formatLeadDetail(lead), { parse_mode: "HTML" });
    return;
  }

  if (action === "admin_stats") {
    const [report, site] = await Promise.all([getWeeklyReport(), getSiteReport()]);
    await ctx.answerCallbackQuery();
    await ctx.reply(formatWeeklyReport(report, site), { parse_mode: "HTML" });
    return;
  }

  if (action === "admin_leads") {
    const filter = rest[0]!;
    await ctx.answerCallbackQuery();
    if (filter === "NEW") {
      const leads = await listLeads({ status: "NEW", limit: 10 });
      return ctx.reply(formatLeadList(leads), { parse_mode: "HTML" });
    }
    if (filter === "HOT") {
      const leads = await listLeads({ priority: "URGENT", limit: 10 });
      const high = await listLeads({ priority: "HIGH", limit: 10 });
      return ctx.reply(formatLeadList([...leads, ...high]), { parse_mode: "HTML" });
    }
    const counts = await countLeadsByStatus();
    return ctx.reply(
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
}

/**
 * Re-renders the admin lead card in place after a status/priority tap.
 *
 * Without this, `answerCallbackQuery`'s toast was the *only* feedback —
 * it disappears in a couple of seconds, the card's text and buttons never
 * changed, and tapping "Qabul qilish" again looked exactly like the first
 * time. An admin has no way to tell, days later, whether a card was ever
 * actioned. Editing the message is what makes the tap actually stick.
 */
async function refreshLeadCard(ctx: Context, leadId: string): Promise<void> {
  const lead = await getLead(leadId);
  if (!lead) return;
  try {
    await ctx.editMessageText(buildLeadNotificationText(lead), {
      parse_mode: "HTML",
      reply_markup: adminLeadKeyboard(lead.id, lead.telegram_username),
    });
  } catch (err) {
    // Telegram rejects an edit whose content is byte-identical to what's
    // already there (e.g. tapping the same status twice in a row) — that's
    // not a real failure, so only the genuinely unexpected case is logged.
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("message is not modified")) {
      logger.warn({ err: message, leadId }, "failed to refresh lead card after a status/priority change");
    }
  }
}

function formatLeadDetail(lead: Awaited<ReturnType<typeof getLead>>): string {
  if (!lead) return "—";
  return [
    `📋 <b>Lead #${lead.id.slice(0, 8)}</b>`,
    `👤 ${escapeTelegramHtml(lead.first_name ?? "—")} ${lead.telegram_username ? `(${escapeTelegramHtml(lead.telegram_username)})` : ""}`,
    `💼 ${escapeTelegramHtml(lead.project_type ?? "—")}`,
    `📝 ${escapeTelegramHtml(lead.description ?? lead.conversation_summary ?? "—")}`,
    `💰 ${escapeTelegramHtml(lead.budget ?? "Aniqlanmagan")} · ⏱ ${escapeTelegramHtml(lead.deadline ?? "Aniqlanmagan")}`,
    `🔥 ${lead.lead_score ?? "—"}/100 · 📌 ${lead.priority} · 📍 ${lead.status}`,
  ].join("\n");
}

function formatLeadList(leads: Awaited<ReturnType<typeof listLeads>>): string {
  if (leads.length === 0) return "Lead topilmadi.";
  return leads
    .map(
      (l) =>
        `• <b>${escapeTelegramHtml(l.project_type ?? "—")}</b> — ${escapeTelegramHtml(l.first_name ?? "—")} (${l.priority}, ${l.status})`,
    )
    .join("\n");
}
