import { db } from "./client.ts";

/**
 * The one pending multi-step admin action for a Telegram user -- e.g. "the
 * next free text you send is the new price for catalog item 2/1". Edge
 * functions keep no memory between invocations, so this DB row is what lets
 * handleTextMessage recognise, on the very next message, that the text is
 * form input rather than a question for the AI. Mirrors the xbot_conversations
 * draft/pending_confirmation pattern in db/conversations.ts.
 */
export interface AdminSession {
  telegram_user_id: number;
  action: string;
  context: Record<string, unknown>;
  updated_at: string;
}

export async function getAdminSession(telegramUserId: number): Promise<AdminSession | null> {
  const { data } = await db
    .from("xbot_admin_sessions")
    .select("*")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();
  return (data as AdminSession) ?? null;
}

export async function setAdminSession(
  telegramUserId: number,
  action: string,
  context: Record<string, unknown> = {},
): Promise<void> {
  await db
    .from("xbot_admin_sessions")
    .upsert({ telegram_user_id: telegramUserId, action, context, updated_at: new Date().toISOString() });
}

export async function clearAdminSession(telegramUserId: number): Promise<void> {
  await db.from("xbot_admin_sessions").delete().eq("telegram_user_id", telegramUserId);
}
