import { db } from "./client.js";
import type { ConversationRow, Intent, LeadDraft, MessageRow } from "./types.js";

export async function getOrCreateActiveConversation(userId: string): Promise<ConversationRow> {
  const { data: existing } = await db
    .from("xbot_conversations")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing as ConversationRow;

  const { data, error } = await db
    .from("xbot_conversations")
    .insert({ user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data as ConversationRow;
}

export async function setConversationIntent(conversationId: string, intent: Intent) {
  await db.from("xbot_conversations").update({ intent, updated_at: new Date().toISOString() }).eq("id", conversationId);
}

export async function endConversation(conversationId: string, summary?: string) {
  await db
    .from("xbot_conversations")
    .update({ status: "ended", ended_at: new Date().toISOString(), summary: summary ?? null })
    .eq("id", conversationId);
}

export async function appendMessage(
  conversationId: string,
  role: MessageRow["role"],
  content: string,
  tokensUsed?: number,
): Promise<void> {
  await db.from("xbot_messages").insert({
    conversation_id: conversationId,
    role,
    content,
    tokens_used: tokensUsed ?? null,
  });
}

/**
 * Recent turns for the AI's context window. Bounded by `limit` — this is the
 * "context compression" lever from item 41 (cost control): we never load a
 * conversation's full unbounded history into every model call.
 */
export async function getRecentMessages(conversationId: string, limit = 20): Promise<MessageRow[]> {
  const { data, error } = await db
    .from("xbot_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as MessageRow[]).reverse();
}

export async function mergeDraft(
  conversationId: string,
  currentDraft: LeadDraft,
  updates: Partial<LeadDraft>,
): Promise<LeadDraft> {
  // Only fill fields the AI hasn't already captured, and never overwrite a
  // known value with an empty one — this is the "don't ask twice" guarantee
  // from item 7.
  const merged: LeadDraft = { ...currentDraft };
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === null || value === "") continue;
    if (key === "features" && Array.isArray(value)) {
      const existing = new Set(merged.features ?? []);
      for (const f of value) existing.add(f);
      merged.features = Array.from(existing);
      continue;
    }
    (merged as Record<string, unknown>)[key] = value;
  }
  await db.from("xbot_conversations").update({ draft: merged, updated_at: new Date().toISOString() }).eq("id", conversationId);
  return merged;
}

export async function setPendingConfirmation(conversationId: string, pending: boolean) {
  await db.from("xbot_conversations").update({ pending_confirmation: pending }).eq("id", conversationId);
}

export async function clearDraft(conversationId: string) {
  await db
    .from("xbot_conversations")
    .update({ draft: {}, pending_confirmation: false, low_confidence_streak: 0 })
    .eq("id", conversationId);
}

export async function bumpLowConfidence(conversationId: string, low: boolean): Promise<number> {
  const { data } = await db.from("xbot_conversations").select("low_confidence_streak").eq("id", conversationId).single();
  const next = low ? (data?.low_confidence_streak ?? 0) + 1 : 0;
  await db.from("xbot_conversations").update({ low_confidence_streak: next }).eq("id", conversationId);
  return next;
}

export async function getConversation(conversationId: string): Promise<ConversationRow | null> {
  const { data } = await db.from("xbot_conversations").select("*").eq("id", conversationId).maybeSingle();
  return (data as ConversationRow) ?? null;
}
