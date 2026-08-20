/**
 * In-memory sliding-window limiter (item 26). A single Railway instance
 * process is enough for personal-scale traffic; if this ever needs multiple
 * instances, swap the Map for xbot.rate_limits (already in the schema) —
 * the interface below wouldn't need to change.
 */
const WINDOW_MS = 10_000;
const MAX_PER_WINDOW = 8;
const NOTICE_COOLDOWN_MS = 15_000;

interface Bucket {
  windowStart: number;
  count: number;
  lastNoticeAt: number;
}

const buckets = new Map<number, Bucket>();

export type RateLimitVerdict = "allow" | "throttle_notice" | "throttle_silent";

export function checkRateLimit(telegramUserId: number): RateLimitVerdict {
  const now = Date.now();
  const bucket = buckets.get(telegramUserId);

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(telegramUserId, { windowStart: now, count: 1, lastNoticeAt: 0 });
    return "allow";
  }

  bucket.count += 1;
  if (bucket.count <= MAX_PER_WINDOW) return "allow";

  if (now - bucket.lastNoticeAt > NOTICE_COOLDOWN_MS) {
    bucket.lastNoticeAt = now;
    return "throttle_notice";
  }
  return "throttle_silent";
}

/** Periodic cleanup so the map doesn't grow unbounded over a long-running process. */
export function sweepStaleRateLimitBuckets() {
  const now = Date.now();
  for (const [id, bucket] of buckets) {
    if (now - bucket.windowStart > WINDOW_MS * 10) buckets.delete(id);
  }
}
