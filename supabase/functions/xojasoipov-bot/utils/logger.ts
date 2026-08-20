/**
 * Minimal structured logger with the same PII/secret redaction guarantee as
 * before (item 38/39), but with zero runtime dependencies — pino needs
 * Node's worker-thread transport machinery, which isn't available in the
 * Deno-based Supabase Edge Functions runtime this bot also deploys to.
 * Same source file, both runtimes.
 */
type Level = "debug" | "info" | "warn" | "error" | "fatal";

const REDACT_KEYS = new Set([
  "token", "bottoken", "apikey", "authorization",
  "telegram_bot_token", "gemini_api_key", "supabase_service_role_key",
  "contact", "phone", "email",
]);

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = REDACT_KEYS.has(key.toLowerCase()) ? "[REDACTED]" : redact(val, depth + 1);
  }
  return out;
}

function getLogLevel(): Level {
  const raw = (getEnvSafe("LOG_LEVEL") ?? "info").toLowerCase();
  return (["debug", "info", "warn", "error", "fatal"] as const).includes(raw as Level) ? (raw as Level) : "info";
}

function getEnvSafe(key: string): string | undefined {
  // @ts-ignore Deno is only defined in the edge runtime.
  if (typeof Deno !== "undefined") return Deno.env.get(key);
  const nodeProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return nodeProcess?.env?.[key];
}

const LEVEL_ORDER: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3, fatal: 4 };
const minLevel = getLogLevel();

function log(level: Level, context: Record<string, unknown>, message: string) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;
  const line = {
    level,
    time: new Date().toISOString(),
    service: "xojasoipov-bot",
    msg: message,
    ...(redact(context) as Record<string, unknown>),
  };
  const out = JSON.stringify(line);
  if (level === "error" || level === "fatal") console.error(out);
  else if (level === "warn") console.warn(out);
  else console.log(out);
}

export const logger = {
  debug: (context: Record<string, unknown>, message: string) => log("debug", context, message),
  info: (context: Record<string, unknown>, message: string) => log("info", context, message),
  warn: (contextOrMessage: Record<string, unknown> | string, message?: string) =>
    typeof contextOrMessage === "string" ? log("warn", {}, contextOrMessage) : log("warn", contextOrMessage, message ?? ""),
  error: (context: Record<string, unknown>, message: string) => log("error", context, message),
  fatal: (context: Record<string, unknown>, message: string) => log("fatal", context, message),
};
