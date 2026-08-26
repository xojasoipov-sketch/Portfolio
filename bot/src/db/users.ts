import { db } from "./client.js";
import type { Language, Source, UserRow } from "./types.js";
import { logger } from "../utils/logger.js";

/**
 * Upsert-on-see: every inbound Telegram update touches this, so a user row
 * always exists before anything else (conversations, leads) references it.
 */
export async function upsertUser(input: {
  telegramUserId: number;
  telegramUsername?: string | null;
  firstName?: string | null;
  languageHint?: Language;
  source?: Source;
}): Promise<UserRow> {
  const { data: existing } = await db
    .from("xbot_users")
    .select("*")
    .eq("telegram_user_id", input.telegramUserId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await db
      .from("xbot_users")
      .update({
        telegram_username: input.telegramUsername ?? existing.telegram_username,
        first_name: input.firstName ?? existing.first_name,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as UserRow;
  }

  const { data, error } = await db
    .from("xbot_users")
    .insert({
      telegram_user_id: input.telegramUserId,
      telegram_username: input.telegramUsername ?? null,
      first_name: input.firstName ?? null,
      language: input.languageHint ?? "uz",
      source: input.source ?? "direct",
    })
    .select("*")
    .single();
  if (error) throw error;
  logger.info({ telegramUserId: input.telegramUserId }, "new user registered");
  return data as UserRow;
}

export async function isAdmin(telegramUserId: number, envAdminIds: number[]): Promise<boolean> {
  if (envAdminIds.includes(telegramUserId)) return true;
  const { data } = await db
    .from("xbot_admin_users")
    .select("telegram_user_id")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();
  return Boolean(data);
}

/** One page of /start users for the in-bot admin panel, newest-active first. */
export async function listRecentUsers(
  limit: number,
  offset: number,
): Promise<{ users: UserRow[]; total: number }> {
  const { data, error, count } = await db
    .from("xbot_users")
    .select("*", { count: "exact" })
    .order("last_seen_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return { users: (data as UserRow[]) ?? [], total: count ?? 0 };
}
