import type { Api } from "grammy";
import { env } from "../config.js";
import type { LeadDraft, LeadRow } from "../db/types.js";
import { db } from "../db/client.js";
import { escapeTelegramHtml } from "../security/validation.js";
import { logger } from "../utils/logger.js";
import { adminLeadKeyboard } from "../bot/keyboards.js";
import type { LeadScoreResult } from "../ai/scoring.js";

/**
 * Set once from index.ts after the bot is constructed. Kept as a small
 * module-level handle (not a class) so any module can notify admins without
 * threading the Api instance through every function signature.
 */
let apiRef: Api | null = null;
export function registerAdminNotifier(api: Api) {
  apiRef = api;
}

function priorityEmoji(priority: string): string {
  return { LOW: "🟢", MEDIUM: "🟡", HIGH: "🟠", URGENT: "🔴" }[priority] ?? "⚪️";
}

/** Item 17: full new-lead notification, sent to every configured admin. */
export async function notifyNewLead(lead: LeadRow, score: LeadScoreResult): Promise<void> {
  if (!apiRef) return logger.error("notifyNewLead called before registerAdminNotifier");

  const featuresLine = lead.features?.length ? lead.features.map((f) => `• ${f}`).join("\n") : "• —";
  const text = [
    "🚨 <b>YANGI MIJOZ</b>",
    "",
    `👤 <b>Ism:</b> ${escapeTelegramHtml(lead.first_name ?? "—")}`,
    lead.telegram_username ? `📱 <b>Telegram:</b> ${escapeTelegramHtml(lead.telegram_username)}` : null,
    `💼 <b>Loyiha:</b> ${escapeTelegramHtml(lead.project_type ?? lead.project_title ?? "—")}`,
    `🎯 <b>Maqsad:</b> ${escapeTelegramHtml(lead.goal ?? lead.description ?? "—")}`,
    "⚙️ <b>Funksiyalar:</b>",
    escapeTelegramHtml(featuresLine),
    `💰 <b>Budjet:</b> ${escapeTelegramHtml(lead.budget ?? "Aniqlanmagan")}`,
    `⏱ <b>Muddat:</b> ${escapeTelegramHtml(lead.deadline ?? "Aniqlanmagan")}`,
    `🔥 <b>Lead Score:</b> ${score.score}/100`,
    `📌 <b>Priority:</b> ${priorityEmoji(score.priority)} ${score.priority}`,
    lead.ai_summary ? `\n🧠 <b>AI SUMMARY:</b>\n${escapeTelegramHtml(lead.ai_summary)}` : null,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");

  await sendToAllAdmins(text, adminLeadKeyboard(lead.id, lead.telegram_username));
  await db.from("notifications").insert({ type: "new_lead", lead_id: lead.id, payload: { score: score.score } });
}

export async function notifyHumanHandoff(params: {
  firstName: string | null;
  telegramUsername: string | null;
  summary: string;
}): Promise<void> {
  const text = [
    "👤 <b>CLIENT REQUESTS HUMAN</b>",
    "",
    `👤 ${escapeTelegramHtml(params.firstName ?? "Mijoz")}`,
    params.telegramUsername ? `📱 ${escapeTelegramHtml(params.telegramUsername)}` : null,
    "",
    escapeTelegramHtml(params.summary),
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
  await sendToAllAdmins(text);
  await db.from("notifications").insert({ type: "human_handoff", payload: params });
}

export async function notifyAiError(context: string, error: unknown): Promise<void> {
  const text = `⚠️ <b>AI ERROR</b>\n\n${escapeTelegramHtml(context)}\n${escapeTelegramHtml(String(error).slice(0, 300))}`;
  await sendToAllAdmins(text);
  await db.from("notifications").insert({ type: "ai_error", payload: { context } });
}

export async function notifySystemAlert(text: string): Promise<void> {
  await sendToAllAdmins(`🔴 <b>SYSTEM ALERT</b>\n\n${escapeTelegramHtml(text)}`);
  await db.from("notifications").insert({ type: "system_alert", payload: { text } });
}

async function sendToAllAdmins(text: string, keyboard?: ReturnType<typeof adminLeadKeyboard>): Promise<void> {
  if (!apiRef) return;
  for (const adminId of env.TELEGRAM_ADMIN_IDS) {
    try {
      await apiRef.sendMessage(adminId, text, { parse_mode: "HTML", reply_markup: keyboard });
    } catch (err) {
      logger.error({ err, adminId }, "failed to notify admin");
    }
  }
}
