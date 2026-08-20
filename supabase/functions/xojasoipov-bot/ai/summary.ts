import type { LeadDraft } from "../db/types.ts";

function orUnspecified(value: string | undefined, uzFallback = "Aniqlanmagan"): string {
  return value && value.trim() ? value : uzFallback;
}

/**
 * The client-facing "Loyiha qisqacha" card shown before confirmation (item
 * 14). Built entirely from the draft's own fields — no LLM call, so it can
 * never introduce a fact the client didn't actually provide.
 */
export function buildClientSummary(draft: LeadDraft): string {
  const features = draft.features?.length ? draft.features.map((f) => `• ${f}`).join("\n") : "• Aniqlanmagan";
  return [
    "📋 <b>Loyiha qisqacha</b>",
    "",
    `💼 <b>Turi:</b> ${orUnspecified(draft.project_type)}`,
    `🎯 <b>Maqsad:</b> ${orUnspecified(draft.goal ?? draft.description)}`,
    draft.target_users ? `👥 <b>Foydalanuvchilar:</b> ${draft.target_users}` : null,
    "⚙️ <b>Asosiy funksiyalar:</b>",
    features,
    `💰 <b>Budjet:</b> ${orUnspecified(draft.budget)}`,
    `⏱ <b>Muddat:</b> ${orUnspecified(draft.deadline)}`,
    "",
    "Shu ma'lumotlarni Saidburxonga yuboraymi?",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

export function buildConversationSummaryPlain(draft: LeadDraft): string {
  const parts = [
    draft.project_type && `Turi: ${draft.project_type}`,
    draft.description && `Tavsif: ${draft.description}`,
    draft.goal && `Maqsad: ${draft.goal}`,
    draft.business_type && `Biznes: ${draft.business_type}`,
    draft.target_users && `Foydalanuvchilar: ${draft.target_users}`,
    draft.features?.length && `Funksiyalar: ${draft.features.join(", ")}`,
    draft.budget && `Budjet: ${draft.budget}`,
    draft.deadline && `Muddat: ${draft.deadline}`,
    draft.current_system && `Joriy tizim: ${draft.current_system}`,
  ].filter(Boolean);
  return parts.join(". ") || "Ma'lumot hali to'liq emas.";
}
