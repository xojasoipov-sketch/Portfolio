import { db } from "./client.js";
import { applyRuntimeOverrides } from "../config.js";
import { logger } from "../utils/logger.js";

/**
 * Loads the Telegram token, admin ids and AI keys from xbot_bot_config.
 *
 * The database rather than function secrets, because secrets can only be
 * written from the dashboard or CLI, while the edge runtime hands every
 * function a service-role key. The table has RLS on with no policies, so that
 * key is the only thing that can read it -- the same trust boundary a secret
 * sits behind. Environment variables still win, so moving these to real
 * secrets later needs no code change.
 */
let loaded: Promise<void> | null = null;

export function loadBotConfig(): Promise<void> {
  if (!loaded) loaded = doLoad();
  return loaded;
}

async function doLoad(): Promise<void> {
  const { data, error } = await db.from("xbot_bot_config").select("key,value");
  if (error) {
    // Non-fatal: if the environment carries everything the bot still boots,
    // and requireBotToken() enforces the one value we cannot run without.
    logger.error({ err: error.message }, "bot_config jadvalini o'qib bo'lmadi");
    return;
  }

  const overrides: Record<string, string> = {};
  for (const row of (data ?? []) as { key: string; value: string | null }[]) {
    if (row.value) overrides[row.key] = row.value;
  }
  applyRuntimeOverrides(overrides);
  logger.info({ keys: Object.keys(overrides).length }, "bot_config yuklandi");
}

/**
 * Reads one row live, bypassing the boot-time merge. `env` is populated once
 * per isolate, so a value an admin binds from inside Telegram would otherwise
 * not apply until the next cold start. Callers are on rare paths (a photo
 * posted to a group), so the extra indexed read is not worth caching.
 */
export async function getConfigValue(key: string): Promise<string | null> {
  const { data, error } = await db
    .from("xbot_bot_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) {
    logger.error({ err: error.message, key }, "bot_config qiymatini o'qib bo'lmadi");
    return null;
  }
  return (data?.value as string | null) ?? null;
}

export async function setConfigValue(key: string, value: string): Promise<boolean> {
  const { error } = await db.from("xbot_bot_config").upsert({ key, value }, { onConflict: "key" });
  if (error) {
    logger.error({ err: error.message, key }, "bot_config qiymatini yozib bo'lmadi");
    return false;
  }
  return true;
}

/** Config key holding the chat id of the group products are submitted in. */
export const PRODUCT_GROUP_KEY = "TELEGRAM_PRODUCT_GROUP";

/** Config key holding the chat id (or @username) of the showcase channel. */
export const CHANNEL_KEY = "TELEGRAM_CHANNEL";
