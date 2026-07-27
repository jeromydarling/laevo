/**
 * Passwords, sessions and the tenant scope.
 *
 * Passwords are PBKDF2-SHA256 with a per-password salt. Sessions live in D1
 * with an expiry and ride in an HttpOnly cookie. Removing a member kills their
 * sessions everywhere, immediately.
 */
import type { Env } from "./env";
import { newId, newToken } from "./ids";

/**
 * The Workers runtime refuses PBKDF2 above 100,000 iterations
 * ("NotSupportedError: iteration counts above 100000 are not supported"), so
 * this is a platform ceiling rather than our choice. Miniflare does not
 * enforce it, which means raising this number passes every local test and
 * then breaks every password operation in production — so it is pinned by a
 * test. OWASP currently suggests more for PBKDF2-SHA256; when Workers allows
 * it, raise this. The iteration count is stored inside each hash, so old
 * hashes keep verifying and can be upgraded in place.
 */
export const PBKDF2_ITERATIONS = 100_000;
export const PBKDF2_MAX_SUPPORTED = 100_000;
const SESSION_DAYS = 30;
export const SESSION_COOKIE = "laevo_session";

export type Role = "admin" | "staff" | "volunteer";

/**
 * How this person wants the app laid out. Roomy is the right answer for a
 * shared tablet at the window; standard is the right answer for a laptop on a
 * Tuesday evening. Neither is a downgrade.
 */
export type ViewMode = "standard" | "roomy";

export interface SessionUser {
  id: string;
  orgId: string;
  email: string;
  name: string;
  role: Role;
  orgName: string;
  orgSlug: string;
  isDemo: boolean;
  /** The person asked for larger type; we remember it across devices. */
  largeText: boolean;
  viewMode: ViewMode;
}

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await derive(password, salt);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(new Uint8Array(bits))}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations < 1000) return false;
  const salt = fromBase64(parts[2]);
  const expected = fromBase64(parts[3]);
  const bits = new Uint8Array(await derive(password, salt, iterations));
  return timingSafeEqual(bits, expected);
}

async function derive(
  password: string,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS,
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    key,
    256,
  );
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromBase64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** One-way hash for tokens we store but must never be able to replay. */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return toBase64(new Uint8Array(digest));
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function createSession(
  env: Env,
  userId: string,
): Promise<{ token: string; cookie: string }> {
  const token = newToken(32);
  const id = newId("ses");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
  )
    .bind(id, userId, await hashToken(token), expires.toISOString())
    .run();
  return { token, cookie: sessionCookie(token, SESSION_DAYS * 86_400) };
}

export function sessionCookie(value: string, maxAgeSeconds: number): string {
  return [
    `${SESSION_COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

export function clearSessionCookie(): string {
  return sessionCookie("", 0);
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

/**
 * Memoized per request. A page with six loaders should hit the users table
 * once, not six times.
 */
const userCache = new WeakMap<Request, Promise<SessionUser | null>>();

export function getUser(
  env: Env,
  request: Request,
): Promise<SessionUser | null> {
  const cached = userCache.get(request);
  if (cached) return cached;
  const promise = loadUser(env, request);
  userCache.set(request, promise);
  return promise;
}

async function loadUser(
  env: Env,
  request: Request,
): Promise<SessionUser | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT u.id, u.org_id, u.email, u.name, u.role, u.large_text, u.view_mode,
            o.name AS org_name, o.slug AS org_slug, o.is_demo
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       JOIN orgs o ON o.id = u.org_id
      WHERE s.token_hash = ?
        AND s.expires_at > datetime('now')
        AND u.active = 1
      LIMIT 1`,
  )
    .bind(await hashToken(token))
    .first<{
      id: string;
      org_id: string;
      email: string;
      name: string;
      role: Role;
      large_text: number;
      view_mode: ViewMode;
      org_name: string;
      org_slug: string;
      is_demo: number;
    }>();
  if (!row) return null;
  return {
    id: row.id,
    orgId: row.org_id,
    email: row.email,
    name: row.name,
    role: row.role,
    orgName: row.org_name,
    orgSlug: row.org_slug,
    isDemo: row.is_demo === 1,
    largeText: row.large_text === 1,
    viewMode: row.view_mode === "roomy" ? "roomy" : "standard",
  };
}

export async function requireUser(
  env: Env,
  request: Request,
): Promise<SessionUser> {
  const user = await getUser(env, request);
  if (!user) {
    const url = new URL(request.url);
    throw new Response(null, {
      status: 302,
      headers: {
        Location: `/sign-in?next=${encodeURIComponent(url.pathname + url.search)}`,
      },
    });
  }
  return user;
}

export async function requireAdmin(
  env: Env,
  request: Request,
): Promise<SessionUser> {
  const user = await requireUser(env, request);
  if (user.role !== "admin") {
    throw new Response(
      "Only an organizer can change this. Ask whoever set up your pantry's account.",
      { status: 403 },
    );
  }
  return user;
}

/** Called when a member is removed or changes their password. */
export async function killAllSessions(
  env: Env,
  userId: string,
): Promise<void> {
  await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?")
    .bind(userId)
    .run();
}

export async function endSession(env: Env, request: Request): Promise<void> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return;
  await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
    .bind(await hashToken(token))
    .run();
}
