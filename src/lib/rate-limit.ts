/**
 * Dead-simple in-memory token bucket for rate limiting.
 * Adequate for ~80 users on a single instance.
 * Resets when the process restarts. For persistence, back with DB.
 */

type Bucket = { tokens: number; lastRefill: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: max, lastRefill: now };
  // Linear refill
  const elapsed = now - b.lastRefill;
  const refill = (elapsed / windowMs) * max;
  b.tokens = Math.min(max, b.tokens + refill);
  b.lastRefill = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return { ok: false, retryAfterMs: Math.ceil(((1 - b.tokens) / max) * windowMs) };
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return { ok: true, retryAfterMs: 0 };
}
