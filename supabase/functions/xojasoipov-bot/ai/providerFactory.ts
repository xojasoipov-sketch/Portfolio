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
  if (env.AI_PROVIDER === "gemini" && env.GEMINI_API_KEY) {
    cached = new GeminiProvider(env.GEMINI_API_KEY);
  } else {
    cached = null;
  }
  return cached;
}
