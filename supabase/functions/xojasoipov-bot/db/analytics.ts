import { db } from "./client.ts";

export async function trackEvent(userId: string | null, eventType: string, metadata: Record<string, unknown> = {}) {
  await db.from("analytics_events").insert({ user_id: userId, event_type: eventType, metadata });
}

export interface WeeklyReport {
  users: number;
  aiConversations: number;
  projectInquiries: number;
  leads: number;
  hotLeads: number;
  qualified: number;
  conversionRate: number;
}

export async function getWeeklyReport(sinceDays = 7): Promise<WeeklyReport> {
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();

  const [{ count: users }, { count: aiConversations }, { data: leadRows }] = await Promise.all([
    db.from("users").select("id", { count: "exact", head: true }).gte("created_at", since),
    db.from("conversations").select("id", { count: "exact", head: true }).gte("started_at", since),
    db.from("leads").select("priority,status").gte("created_at", since),
  ]);

  const leads = leadRows ?? [];
  const hotLeads = leads.filter((l) => l.priority === "HIGH" || l.priority === "URGENT").length;
  const qualified = leads.filter((l) => l.status === "QUALIFIED").length;
  const projectInquiries = leads.length;

  return {
    users: users ?? 0,
    aiConversations: aiConversations ?? 0,
    projectInquiries,
    leads: leads.length,
    hotLeads,
    qualified,
    conversionRate: (users ?? 0) > 0 ? Math.round((leads.length / (users ?? 1)) * 1000) / 10 : 0,
  };
}
