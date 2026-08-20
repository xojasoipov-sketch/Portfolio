import { env } from "../config.ts";
import { GeminiProvider } from "./providers/gemini.ts";
import type { AIProvider } from "./provider.ts";

let cached: AIProvider | null | undefined;

/**
 * Returns null (not a throw) when no provider is configured, so callers can
 * cleanly route to the fallback conversation flow (item 39) instead of
 * crashing the bot process.
 */
export function getAIProvider(): AIProvider | null {
  if (cached !== undefined) return cached;
  const keys = parseApiKeys(env.GEMINI_API_KEY);
  if (env.AI_PROVIDER === "gemini" && keys.length > 0) {
    cached = new GeminiProvider(keys);
  } else {
    cached = null;
  }
  return cached;
}

/**
 * GEMINI_API_KEY may hold several free-tier keys, comma-separated — when
 * one account's quota runs out the provider rotates to the next instead of
 * degrading to the canned fallback reply.
 */
function parseApiKeys(raw: string | undefined): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(",").map((k) => k.trim()).filter(Boolean))];
}
