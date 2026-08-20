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
