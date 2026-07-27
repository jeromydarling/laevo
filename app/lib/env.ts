/**
 * Every binding Laevo touches, in one place.
 *
 * Everything optional here must degrade cleanly when it is missing: the whole
 * product has to be usable end-to-end before a single key is added.
 */

/** The Cloudflare Email Sending binding (`send_email` in wrangler.jsonc). */
export interface EmailBinding {
  send(message: {
    to: string;
    from: string;
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string;
  }): Promise<{ messageId?: string }>;
}

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  FILES: R2Bucket;

  /** Cloudflare Email Sending. Absent in local dev — sends fall back to logs. */
  EMAIL?: EmailBinding;
  /** Workers AI. Absent means every AI surface says "not turned on yet". */
  AI?: unknown;

  ENVIRONMENT: string;
  SITE_URL: string;
  EMAIL_FROM: string;
  EMAIL_REPLY_TO: string;
  EMAIL_FROM_NAME: string;

  /** Set as a Worker secret once billing goes live. Dark until then. */
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}

export interface AppContext {
  env: Env;
  ctx: ExecutionContext;
  /** Best-effort client IP, used for rate limiting only. */
  ip: string;
}

/** True when a real Cloudflare Email Sending binding is wired up. */
export function emailIsLive(env: Env): boolean {
  return typeof env.EMAIL?.send === "function";
}

/** True when billing keys are present. Everything is free until they are. */
export function billingIsLive(env: Env): boolean {
  return Boolean(env.STRIPE_SECRET_KEY);
}

export function siteUrl(env: Env): string {
  return (env.SITE_URL || "https://laevo.app").replace(/\/$/, "");
}
