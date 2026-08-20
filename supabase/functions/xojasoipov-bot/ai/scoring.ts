import type { LeadDraft, LeadPriority } from "../db/types.ts";

export interface LeadScoreResult {
  score: number;
  priority: LeadPriority;
  reasons: string[];
}

const VAGUE_BUDGET = new Set(["aniqlanmagan", "bilmayman", "noma'lum", "not sure", "unknown", ""]);
const URGENT_DEADLINE_HINTS = ["kun", "hafta", "asap", "tezroq", "shoshilinch", "urgent"];

/**
 * Deterministic, auditable scoring (item 16) — not an LLM self-rating. Every
 * point traces to a concrete signal in the draft, so "Lead Score: 87/100"
 * always means the same thing and can't drift between conversations.
 */
export function scoreLead(draft: LeadDraft): LeadScoreResult {
  let score = 0;
  const reasons: string[] = [];

  // Project clarity — up to 30
  if (draft.project_type) {
    score += 10;
  }
  const descLen = (draft.description ?? "").trim().length;
  if (descLen > 80) {
    score += 15;
    reasons.push("Loyiha tavsifi aniq va batafsil");
  } else if (descLen > 20) {
    score += 8;
  }
  if (draft.goal) {
    score += 5;
    reasons.push("Maqsad belgilangan");
  }

  // Budget — up to 20
  const budget = (draft.budget ?? "").trim().toLowerCase();
  if (budget && !VAGUE_BUDGET.has(budget)) {
    score += 20;
    reasons.push("Budjet ko'rsatilgan");
  }

  // Deadline — up to 15
  const deadline = (draft.deadline ?? "").trim().toLowerCase();
  if (deadline) {
    score += 10;
    if (URGENT_DEADLINE_HINTS.some((hint) => deadline.includes(hint))) {
      score += 5;
      reasons.push("Qisqa muddat — shoshilinch bo'lishi mumkin");
    }
  }

  // Business potential — up to 20
  if (draft.business_type) {
    score += 10;
    reasons.push("Biznes konteksti aniq");
  }
  if (draft.target_users) {
    score += 10;
  }

  // Completeness bonus — up to 15
  const optionalFilled = [draft.features?.length, draft.current_system, draft.contact].filter(Boolean).length;
  score += Math.min(optionalFilled * 5, 15);

  score = Math.max(0, Math.min(100, score));

  let priority: LeadPriority;
  if (score >= 85) priority = "URGENT";
  else if (score >= 65) priority = "HIGH";
  else if (score >= 40) priority = "MEDIUM";
  else priority = "LOW";

  if (reasons.length === 0) reasons.push("Ma'lumot hali to'liq emas");

  return { score, priority, reasons };
}
