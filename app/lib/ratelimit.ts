/**
 * KV-backed rate limiting for public write paths.
 *
 * Fails OPEN. A broken limiter must never lock a pantry out of its own
 * account on a Saturday morning — a wide-open door beats a jammed one.
 */
import type { Env } from "./env";

export interface LimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface LimitRule {
  /** Attempts allowed inside the window. */
  max: number;
  windowSeconds: number;
}

export const LIMITS = {
  signIn: { max: 10, windowSeconds: 900 },
  signUp: { max: 5, windowSeconds: 3600 },
  passwordReset: { max: 5, windowSeconds: 3600 },
  contactForm: { max: 5, windowSeconds: 3600 },
  publicSignup: { max: 20, windowSeconds: 3600 },
} as const satisfies Record<string, LimitRule>;

export async function checkLimit(
  env: Env,
  bucket: string,
  key: string,
  rule: LimitRule,
): Promise<LimitResult> {
  const kvKey = `rl:${bucket}:${key}`;
  try {
    const raw = await env.CACHE.get(kvKey);
    const count = raw ? Number(raw) : 0;
    if (Number.isFinite(count) && count >= rule.max) {
      return { allowed: false, remaining: 0, retryAfterSeconds: rule.windowSeconds };
    }
    return {
      allowed: true,
      remaining: Math.max(0, rule.max - count - 1),
      retryAfterSeconds: 0,
    };
  } catch (err) {
    console.error("[ratelimit] read failed, allowing through", err);
    return { allowed: true, remaining: rule.max, retryAfterSeconds: 0 };
  }
}

/**
 * Only failures are counted. Someone who signs in correctly ten times in a row
 * is having a good day, not attacking us.
 */
export async function recordFailure(
  env: Env,
  bucket: string,
  key: string,
  rule: LimitRule,
): Promise<void> {
  const kvKey = `rl:${bucket}:${key}`;
  try {
    const raw = await env.CACHE.get(kvKey);
    const count = (raw ? Number(raw) : 0) + 1;
    await env.CACHE.put(kvKey, String(count), {
      expirationTtl: rule.windowSeconds,
    });
  } catch (err) {
    console.error("[ratelimit] write failed, ignoring", err);
  }
}

export async function clearFailures(
  env: Env,
  bucket: string,
  key: string,
): Promise<void> {
  try {
    await env.CACHE.delete(`rl:${bucket}:${key}`);
  } catch {
    // Nothing to do; the key expires on its own.
  }
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
