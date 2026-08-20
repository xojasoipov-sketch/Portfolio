import { db } from "./client.js";
import type { LeadDraft, LeadPriority, LeadRow, LeadStatus } from "./types.js";

/**
 * Fingerprints a lead by user + project type + description so the same
 * person re-sending the same request doesn't create a second row (item 26:
 * duplicate lead detection). Not a security boundary — just noise reduction.
 *
 * Uses the Web Crypto API (globalThis.crypto.subtle) instead of node:crypto
 * so the exact same source file runs under Node (bot/, Railway target) and
 * Deno (supabase/functions/, the actually-deployed target) without a build
 * step swapping the implementation.
 */
export async function computeDedupeHash(userId: string, draft: LeadDraft): Promise<string> {
  const basis = `${userId}::${draft.project_type ?? ""}::${(draft.description ?? "").trim().toLowerCase()}`;
  const bytes = new TextEncoder().encode(basis);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export async function findRecentDuplicateLead(dedupeHash: string, withinHours = 24): Promise<LeadRow | null> {
  const since = new Date(Date.now() - withinHours * 3600_000).toISOString();
  const { data } = await db
    .from("xbot_leads")
    .select("*")
    .eq("dedupe_hash", dedupeHash)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as LeadRow) ?? null;
}

export interface CreateLeadInput extends LeadDraft {
  conversationId: string | null;
  userId: string;
  telegramUsername: string | null;
  firstName: string | null;
  language: "uz" | "en";
  conversationSummary?: string;
  aiSummary?: string;
  leadScore: number;
  priority: LeadPriority;
  source: string;
}

export async function createLead(input: CreateLeadInput): Promise<LeadRow> {
  const dedupeHash = await computeDedupeHash(input.userId, input);
  const { data, error } = await db
    .from("xbot_leads")
    .insert({
      conversation_id: input.conversationId,
      user_id: input.userId,
      telegram_username: input.telegramUsername,
      first_name: input.firstName,
      language: input.language,
      intent: input.intent ?? null,
      project_type: input.project_type ?? null,
      project_title: input.project_title ?? null,
      description: input.description ?? null,
      goal: input.goal ?? null,
      features: input.features ?? [],
      target_users: input.target_users ?? null,
      business_type: input.business_type ?? null,
      current_system: input.current_system ?? null,
      budget: input.budget ?? null,
      deadline: input.deadline ?? null,
      contact: input.contact ?? null,
      conversation_summary: input.conversationSummary ?? null,
      ai_summary: input.aiSummary ?? null,
      lead_score: input.leadScore,
      priority: input.priority,
      source: input.source,
      dedupe_hash: dedupeHash,
    })
    .select("*")
    .single();
  if (error) throw error;

  await logLeadEvent(data.id, "created", "ai", { lead_score: input.leadScore, priority: input.priority });
  return data as LeadRow;
}

export async function updateLeadStatus(leadId: string, status: LeadStatus, actor: string) {
  await db.from("xbot_leads").update({ status, updated_at: new Date().toISOString() }).eq("id", leadId);
  await logLeadEvent(leadId, "status_change", actor, { status });
}

export async function updateLeadPriority(leadId: string, priority: LeadPriority, actor: string) {
  await db.from("xbot_leads").update({ priority, updated_at: new Date().toISOString() }).eq("id", leadId);
  await logLeadEvent(leadId, "priority_change", actor, { priority });
}

export async function markLeadNotified(leadId: string, adminMessageId: number) {
  await db
    .from("xbot_leads")
    .update({ admin_notified_at: new Date().toISOString(), admin_message_id: adminMessageId })
    .eq("id", leadId);
}

export async function getLead(leadId: string): Promise<LeadRow | null> {
  const { data } = await db.from("xbot_leads").select("*").eq("id", leadId).maybeSingle();
  return (data as LeadRow) ?? null;
}

export async function listLeads(filter: {
  status?: LeadStatus;
  priority?: LeadPriority;
  limit?: number;
}): Promise<LeadRow[]> {
  let query = db.from("xbot_leads").select("*").order("created_at", { ascending: false }).limit(filter.limit ?? 20);
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.priority) query = query.eq("priority", filter.priority);
  const { data, error } = await query;
  if (error) throw error;
  return data as LeadRow[];
}

export async function countLeadsByStatus(): Promise<Record<string, number>> {
  const { data, error } = await db.from("xbot_leads").select("status");
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data as { status: string }[]) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
  return counts;
}

async function logLeadEvent(leadId: string, eventType: string, actor: string, payload: Record<string, unknown>) {
  await db.from("xbot_lead_events").insert({ lead_id: leadId, event_type: eventType, actor, payload });
}
