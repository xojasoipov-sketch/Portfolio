/**
 * Input hygiene for anything that lands in a DB column, a log line, or gets
 * echoed back to Telegram — cheap insurance against injection-shaped input,
 * even though Supabase's client library parameterizes queries and Telegram
 * messages aren't HTML-rendered by default.
 */

const MAX_MESSAGE_LENGTH = 4000;

export function clampMessage(text: string): string {
  return text.slice(0, MAX_MESSAGE_LENGTH);
}

/** Telegram usernames: 5-32 chars, alnum + underscore, per Telegram's own rules. */
export function isValidTelegramUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{5,32}$/.test(username.replace(/^@/, ""));
}

/** Escapes text placed into an HTML-parse-mode Telegram message. */
export function escapeTelegramHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** True for text that's almost certainly not a real message (repeated chars, pure emoji spam, etc.). */
export function looksLikeSpam(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return true;
  if (trimmed.length > 20 && new Set(trimmed).size <= 2) return true; // "aaaaaaaaaaaaaaaaaaaa"
  return false;
}
