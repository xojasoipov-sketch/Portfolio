import { db } from "./client.js";

export async function trackEvent(userId: string | null, eventType: string, metadata: Record<string, unknown> = {}) {
  await db.from("xbot_analytics_events").insert({ user_id: userId, event_type: eventType, metadata });
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
    db.from("xbot_users").select("id", { count: "exact", head: true }).gte("created_at", since),
    db.from("xbot_conversations").select("id", { count: "exact", head: true }).gte("started_at", since),
    db.from("xbot_leads").select("priority,status").gte("created_at", since),
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

export interface SiteReport {
  pageviews: number;
  visitors: number;
  fromTelegram: number;
  topPaths: { path: string; views: number }[];
}

/**
 * Traffic on the public portfolio (xbot_site_pageviews), so the admin can see
 * site numbers in the same place as bot numbers instead of a separate
 * dashboard. `visitors` counts distinct daily-rotating hashes, which is an
 * approximation by construction -- see the table's migration comment.
 */
export async function getSiteReport(sinceDays = 7): Promise<SiteReport> {
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
  const { data, error } = await db
    .from("xbot_site_pageviews")
    .select("path,visitor_hash,is_telegram")
    .gte("created_at", since)
    .limit(50_000);

  if (error || !data) {
    return { pageviews: 0, visitors: 0, fromTelegram: 0, topPaths: [] };
  }

  const byPath = new Map<string, number>();
  for (const row of data) {
    byPath.set(row.path, (byPath.get(row.path) ?? 0) + 1);
  }

  return {
    pageviews: data.length,
    visitors: new Set(data.map((r) => r.visitor_hash)).size,
    fromTelegram: data.filter((r) => r.is_telegram).length,
    topPaths: [...byPath.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([path, views]) => ({ path, views })),
  };
}
