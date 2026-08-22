import { db } from "./client.js";

/** One queued channel post. Text lives in the table so an edit is an update, not a redeploy. */
export interface ChannelPostRow {
  id: string;
  slot: number;
  kind: "project" | "service" | "process" | "package";
  title: string;
  body: string;
  photo_path: string | null;
  status: "pending" | "posted" | "skipped";
  message_id: number | null;
  approved_by: number | null;
  posted_at: string | null;
  created_at: string;
}

/** Next post due, by slot order. Null once the rotation is exhausted. */
export async function getNextPending(): Promise<ChannelPostRow | null> {
  const { data } = await db
    .from("xbot_channel_posts")
    .select("*")
    .eq("status", "pending")
    .order("slot", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as ChannelPostRow) ?? null;
}

export async function getPost(id: string): Promise<ChannelPostRow | null> {
  const { data } = await db.from("xbot_channel_posts").select("*").eq("id", id).maybeSingle();
  return (data as ChannelPostRow) ?? null;
}

/**
 * Moves a post out of the queue. Guarded on status still being 'pending' so a
 * double tap on an approval card cannot publish the same post twice -- the
 * second update matches no row.
 */
export async function settlePost(
  id: string,
  status: "posted" | "skipped",
  adminId: number,
): Promise<boolean> {
  const { data } = await db
    .from("xbot_channel_posts")
    .update({
      status,
      approved_by: adminId,
      posted_at: status === "posted" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");
  return (data?.length ?? 0) > 0;
}

export async function queueCounts(): Promise<{ pending: number; posted: number; skipped: number }> {
  const { data } = await db.from("xbot_channel_posts").select("status");
  const rows = (data ?? []) as { status: string }[];
  return {
    pending: rows.filter((r) => r.status === "pending").length,
    posted: rows.filter((r) => r.status === "posted").length,
    skipped: rows.filter((r) => r.status === "skipped").length,
  };
}

/** Remembers which channel message a published post became. */
export async function recordMessageId(id: string, messageId: number): Promise<void> {
  await db.from("xbot_channel_posts").update({ message_id: messageId }).eq("id", id);
}

/** Returns a post to the queue after a failed publish. */
export async function restorePending(id: string): Promise<void> {
  await db
    .from("xbot_channel_posts")
    .update({ status: "pending", posted_at: null, message_id: null })
    .eq("id", id);
}
