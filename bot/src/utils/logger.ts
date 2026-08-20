import pino from "pino";
import { env } from "../config.js";

/**
 * Secure logging (item 38 / 39): redact fields that carry secrets or PII
 * before they ever hit stdout, regardless of where in the object tree they
 * appear. Redact by key name, not by call site — so a forgotten log line
 * still can't leak a token.
 */
const REDACT_PATHS = [
  "token",
  "*.token",
  "*.*.token",
  "botToken",
  "*.botToken",
  "apiKey",
  "*.apiKey",
  "authorization",
  "*.authorization",
  "TELEGRAM_BOT_TOKEN",
  "GEMINI_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "contact", // lead's personal contact info — logged as event metadata only, not raw
  "*.contact",
  "phone",
  "*.phone",
  "email",
  "*.email",
];

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: { paths: REDACT_PATHS, censor: "[REDACTED]" },
  base: { service: "xojasoipov-bot" },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/** Structured child logger per request/update, so log lines can be correlated. */
export function childLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
