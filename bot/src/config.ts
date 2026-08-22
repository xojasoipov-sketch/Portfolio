import { z } from "zod";

/**
 * All runtime config in one validated place. Values come from the process
 * environment first (Deno.env or process.env), then from the xbot_bot_config
 * table merged in at boot by db/botConfig.ts. The table exists because edge
 * function secrets can only be set from the dashboard or CLI, while the
 * database is reachable with the injected service-role key. Env always wins,
 * so moving a value to real secrets later needs no code change.
 */

/**
 * Every key this app reads, listed explicitly: Deno's env API has no
 * enumeration that works here (`entries` does not exist, `toObject` needs
 * blanket permission).
 */
const ENV_KEYS = [
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_ADMIN_IDS",
  "TELEGRAM_CHANNEL",
  "MINI_APP_URL",
  "TELEGRAM_WEBHOOK_SECRET",
  "AI_PROVIDER",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CONTACT_EMAIL",
  "CONTACT_PHONE",
  "CONTACT_TELEGRAM",
  "CONTACT_INSTAGRAM",
  "NODE_ENV",
  "LOG_LEVEL",
] as const;

export type ConfigKey = (typeof ENV_KEYS)[number];

interface DenoEnvLike {
  env?: { get(key: string): string | undefined };
}
interface NodeProcessLike {
  env?: Record<string, string | undefined>;
}

/**
 * Both globals are reached through `globalThis` rather than a bare `Deno` /
 * `process`, so the file typechecks under both compilers without a @ts-ignore
 * that could hide a real mistake -- the way `Deno.env.entries` once did.
 */
function readEnvVar(key: string): string | undefined {
  const denoGlobal = (globalThis as { Deno?: DenoEnvLike }).Deno;
  if (typeof denoGlobal?.env?.get === "function") return denoGlobal.env.get(key);
  const nodeProcess = (globalThis as { process?: NodeProcessLike }).process;
  return nodeProcess?.env?.[key];
}

function readEnvObject(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of ENV_KEYS) {
    const value = readEnvVar(key);
    // Omit blanks entirely so zod's .default()/.optional() still apply.
    if (value !== undefined && value !== "") out[key] = value;
  }
  return out;
}

const EnvSchema = z.object({
  /** Optional at load time so the module can import before db/botConfig.ts
   * has merged the DB values in; requireBotToken() enforces it at use. */
  TELEGRAM_BOT_TOKEN: z.string().min(20, "TELEGRAM_BOT_TOKEN yo'q yoki noto'g'ri").optional(),
  TELEGRAM_ADMIN_IDS: z
    .string()
    .default("")
    .transform((v) =>
      v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map(Number)
        .filter((n) => Number.isFinite(n)),
    ),
  /** Public showcase channel, e.g. "@xojasoipov_works". Set it in the
   *  xbot_bot_config table; /post is a no-op until it exists. */
  TELEGRAM_CHANNEL: z.string().optional(),
  MINI_APP_URL: z.string().url().optional(),
  /** Verifies inbound requests really came from Telegram; the webhook deploy
   * disables Supabase's own JWT check in favour of Telegram's scheme. */
  TELEGRAM_WEBHOOK_SECRET: z.string().min(16).optional(),

  AI_PROVIDER: z.enum(["gemini"]).default("gemini"),
  GEMINI_API_KEY: z.string().min(10).optional(),
  GEMINI_MODEL: z.string().default("gemini-3.6-flash"),

  /** Injected automatically by the Supabase edge runtime; set by hand under Node. */
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, "SUPABASE_SERVICE_ROLE_KEY yo'q"),

  CONTACT_EMAIL: z.string().default("xojasoipov@gmail.com"),
  CONTACT_PHONE: z.string().default("+998910666777"),
  CONTACT_TELEGRAM: z.string().default("@xojasoipov"),
  CONTACT_INSTAGRAM: z.string().default(""),

  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Env = z.infer<typeof EnvSchema>;

/** The raw strings we parsed from the environment, kept so runtime overrides
 * can be merged and the whole set re-validated as one. */
let rawValues: Record<string, string> = readEnvObject();

function parseOrThrow(values: Record<string, string>): Env {
  const parsed = EnvSchema.safeParse(values);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Environment sozlamalari noto'g'ri:\n${issues}`);
  }
  return parsed.data;
}

/**
 * Mutated in place by applyRuntimeOverrides() so modules that already imported
 * it see merged values -- read `env.X` at call time, never destructure it.
 */
export const env: Env = parseOrThrow(rawValues);

/**
 * Merges late-arriving config (currently: the xbot.bot_config table) under
 * whatever the environment already provided, then re-validates the result.
 */
export function applyRuntimeOverrides(overrides: Record<string, string | null | undefined>): void {
  const merged: Record<string, string> = { ...rawValues };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === null || value === "") continue;
    if (!(ENV_KEYS as readonly string[]).includes(key)) continue; // ignore unknown rows
    if (merged[key] !== undefined) continue; // environment wins
    merged[key] = value;
  }
  rawValues = merged;
  Object.assign(env, parseOrThrow(merged));
}

/** Throws a clear, actionable error instead of letting grammy fail obscurely. */
export function requireBotToken(): string {
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN topilmadi — uni Edge Function secrets'ga yoki xbot.bot_config jadvaliga qo'shing.",
    );
  }
  return env.TELEGRAM_BOT_TOKEN;
}
