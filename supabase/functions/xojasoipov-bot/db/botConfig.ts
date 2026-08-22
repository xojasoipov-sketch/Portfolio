import { db } from "./client.ts";
import { applyRuntimeOverrides } from "../config.ts";
import { logger } from "../utils/logger.ts";

/**
 * Loads bot configuration (Telegram token, admin ids, AI keys) from
 * xbot.bot_config and merges it into the config module.
 *
 * Why the database and not Edge Function secrets: function secrets can only
 * be written from the Supabase dashboard or the CLI, neither of which is
 * reachable from here, whereas the edge runtime hands every function a
 * service-role key for its own project. xbot.bot_config has RLS on with no
 * policies, exactly like every other xbot table, so the service-role key is
 * the only thing that can read it — the same trust boundary a function
 * secret sits behind.
 *
 * Environment variables still take precedence (see applyRuntimeOverrides),
 * so moving any of these to real function secrets later needs no code change.
 */
let loaded: Promise<void> | null = null;

export function loadBotConfig(): Promise<void> {
  if (!loaded) loaded = doLoad();
  return loaded;
}

async function doLoad(): Promise<void> {
  const { data, error } = await db.from("xbot_bot_config").select("key,value");
  if (error) {
    // Non-fatal on its own: if the environment already carries everything,
    // the bot still boots. requireBotToken() is what actually enforces the
    // one value we cannot run without.
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
 * Reads a single xbot_bot_config row live, rather than through the boot-time
 * merge in loadBotConfig().
 *
 * The merged `env` is populated once per isolate, so a value written by an
 * admin command would not be visible until the next cold start -- fine for
 * secrets that are set once by hand, useless for something the admin binds
 * from inside Telegram and expects to work on the very next message. Callers
 * of this are on rare paths (a photo posted to a group), so the extra indexed
 * read costs nothing worth caching.
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
