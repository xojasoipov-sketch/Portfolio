import type { Context } from "npm:grammy@1.31.0";
import type { Source, UserRow } from "../../db/types.ts";
import { trackEvent } from "../../db/analytics.ts";
import { mainMenuKeyboard } from "../keyboards.ts";
import { t } from "../i18n.ts";

const KNOWN_SOURCES: Source[] = ["instagram", "qr", "website", "telegram", "direct", "other"];

/** Deep-link source tracking (item 34): /start instagram, /start qr, etc. */
export function resolveSource(payload: string | undefined): Source {
  if (!payload) return "direct";
  const normalized = payload.trim().toLowerCase();
  return (KNOWN_SOURCES as string[]).includes(normalized) ? (normalized as Source) : "other";
}

export async function handleStart(ctx: Context, user: UserRow) {
  await trackEvent(user.id, "start", { source: user.source });
  await ctx.reply(t(user.language, "welcome"), { reply_markup: mainMenuKeyboard(user.language) });
}
