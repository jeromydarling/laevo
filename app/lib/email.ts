/**
 * Outbound email, on Cloudflare Email Sending.
 *
 * Three rules:
 *  1. Without the binding, sending logs and succeeds. Nothing crashes, nothing
 *     blocks, and the product is fully usable before a domain is verified.
 *  2. Every send is checked against the suppression list first. Someone who
 *     asked to stop hearing from us stops hearing from us.
 *  3. Every send is recorded, so the self-test in settings can show the
 *     provider's own words when something is wrong.
 */
import type { Env } from "./env";
import { emailIsLive, siteUrl } from "./env";
import { newId } from "./ids";

export interface SendResult {
  ok: boolean;
  /** "sent" | "logged" | "suppressed" | "failed" */
  status: "sent" | "logged" | "suppressed" | "failed";
  messageId?: string;
  /** The provider's verbatim error, surfaced in settings. Never swallowed. */
  error?: string;
}

export interface OutboundEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Where a human would answer. Defaults to the org or platform reply-to. */
  replyTo?: string;
  /** Set for org-scoped mail so the log and suppression stay tenant-aware. */
  orgId?: string | null;
  /** Marks the kind of message, for the log and for unsubscribe scoping. */
  kind: EmailKind;
}

export type EmailKind =
  | "welcome"
  | "password_reset"
  | "password_changed"
  | "team_invite"
  | "contact_relay"
  | "visit_receipt"
  | "shift_reminder"
  | "weekly_digest"
  | "low_shelf_alert"
  | "self_test";

/** Transactional mail a person cannot opt out of without losing their account. */
const ESSENTIAL: ReadonlySet<EmailKind> = new Set([
  "password_reset",
  "password_changed",
  "team_invite",
  "self_test",
]);

export async function isSuppressed(env: Env, email: string): Promise<boolean> {
  const row = await env.DB.prepare(
    "SELECT 1 FROM email_suppressions WHERE email = ? LIMIT 1",
  )
    .bind(normalizeEmail(email))
    .first();
  return Boolean(row);
}

export async function suppress(
  env: Env,
  email: string,
  reason: string,
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO email_suppressions (email, reason, created_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(email) DO UPDATE SET reason = excluded.reason`,
  )
    .bind(normalizeEmail(email), reason)
    .run();
}

export async function unsuppress(env: Env, email: string): Promise<void> {
  await env.DB.prepare("DELETE FROM email_suppressions WHERE email = ?")
    .bind(normalizeEmail(email))
    .run();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function sendEmail(
  env: Env,
  message: OutboundEmail,
): Promise<SendResult> {
  const to = normalizeEmail(message.to);
  const id = newId("msg");

  if (!ESSENTIAL.has(message.kind) && (await isSuppressed(env, to))) {
    await logEmail(env, id, message, to, "suppressed", null);
    return { ok: true, status: "suppressed" };
  }

  const from = env.EMAIL_FROM || "hello@laevo.app";
  const fromName = env.EMAIL_FROM_NAME || "Laevo";
  const replyTo = message.replyTo || env.EMAIL_REPLY_TO || from;

  if (!emailIsLive(env)) {
    console.log(
      `[email:logged] kind=${message.kind} to=${to} subject=${JSON.stringify(message.subject)}`,
    );
    await logEmail(env, id, message, to, "logged", null);
    return { ok: true, status: "logged", messageId: id };
  }

  try {
    const res = await env.EMAIL!.send({
      to,
      from: `${fromName} <${from}>`,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo,
    });
    await logEmail(env, id, message, to, "sent", null);
    return { ok: true, status: "sent", messageId: res?.messageId ?? id };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[email:failed] kind=${message.kind} to=${to} ${error}`);
    await logEmail(env, id, message, to, "failed", error);
    return { ok: false, status: "failed", error };
  }
}

async function logEmail(
  env: Env,
  id: string,
  message: OutboundEmail,
  to: string,
  status: string,
  error: string | null,
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO email_log (id, org_id, kind, to_email, subject, status, error, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
      .bind(
        id,
        message.orgId ?? null,
        message.kind,
        to,
        message.subject,
        status,
        error,
      )
      .run();
  } catch (err) {
    // A logging failure must never take an email down with it.
    console.error("[email:log-failed]", err);
  }
}

/**
 * Fire-and-forget send. Nothing a person is waiting on should ever block on
 * the mail server being awake.
 */
export function sendLater(
  env: Env,
  ctx: ExecutionContext,
  message: OutboundEmail,
): void {
  ctx.waitUntil(sendEmail(env, message));
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/**
 * One layout for everything. Big text, one obvious link, no image-only content
 * — a lot of the people reading these are on an old phone in a bright kitchen.
 */
export function layout(opts: {
  heading: string;
  body: string;
  action?: { label: string; href: string };
  footerNote?: string;
  unsubscribeUrl?: string;
}): string {
  const button = opts.action
    ? `<p style="margin:28px 0;">
         <a href="${escapeAttr(opts.action.href)}"
            style="display:inline-block;background:#12492f;color:#ffffff;font-size:19px;font-weight:700;
                   text-decoration:none;padding:16px 28px;border-radius:10px;">
           ${escapeHtml(opts.action.label)}
         </a>
       </p>
       <p style="font-size:15px;color:#5a6b60;margin:0 0 8px;">
         If the button does not work, copy this address into your browser:<br />
         <span style="word-break:break-all;">${escapeHtml(opts.action.href)}</span>
       </p>`
    : "";

  const unsubscribe = opts.unsubscribeUrl
    ? `<p style="font-size:14px;color:#5a6b60;margin-top:24px;">
         <a href="${escapeAttr(opts.unsubscribeUrl)}" style="color:#5a6b60;">
           Stop sending me these
         </a> — one click, no questions.
       </p>`
    : "";

  return `<!doctype html>
<html lang="en"><body style="margin:0;padding:0;background:#fbf8f1;">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#12211a;line-height:1.6;font-size:18px;">
    <p style="font-size:22px;font-weight:800;color:#12492f;margin:0 0 24px;">Laevo</p>
    <h1 style="font-size:26px;line-height:1.25;color:#12492f;margin:0 0 16px;">${escapeHtml(opts.heading)}</h1>
    ${opts.body}
    ${button}
    ${opts.footerNote ? `<p style="font-size:15px;color:#5a6b60;">${opts.footerNote}</p>` : ""}
    ${unsubscribe}
    <p style="font-size:14px;color:#5a6b60;margin-top:32px;border-top:1px solid #e5e0d3;padding-top:16px;">
      Laevo helps food pantries keep track of what they have and who they have helped.
      A person reads replies to this address.
    </p>
  </div>
</body></html>`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

export function welcomeEmail(env: Env, opts: { name: string; orgName: string }) {
  const url = `${siteUrl(env)}/app`;
  return {
    subject: "Welcome to Laevo",
    html: layout({
      heading: `Welcome, ${escapeHtml(opts.name)}`,
      body: `<p>${escapeHtml(opts.orgName)} is set up. Nothing else is required from you today.</p>
             <p>When you are ready, the first useful thing is usually adding the food you already have on the shelf. It takes about ten minutes and everything else gets easier afterward.</p>`,
      action: { label: "Open Laevo", href: url },
      footerNote:
        "Stuck anywhere? Reply to this email and tell us what you were trying to do. We answer in plain words.",
    }),
    text: `Welcome, ${opts.name}.\n\n${opts.orgName} is set up. Nothing else is required today.\n\nWhen you are ready: ${url}\n\nStuck? Reply to this email.`,
  };
}

export function passwordResetEmail(env: Env, opts: { token: string }) {
  const url = `${siteUrl(env)}/reset/${opts.token}`;
  return {
    subject: "Set a new Laevo password",
    html: layout({
      heading: "Set a new password",
      body: `<p>Use the button below to pick a new password. The link works once and stops working in an hour.</p>
             <p>If you did not ask for this, you can ignore this email. Nothing has changed.</p>`,
      action: { label: "Set a new password", href: url },
    }),
    text: `Set a new Laevo password.\n\n${url}\n\nThe link works once and expires in an hour. If you did not ask for this, ignore it — nothing has changed.`,
  };
}

export function passwordChangedEmail(env: Env) {
  return {
    subject: "Your Laevo password changed",
    html: layout({
      heading: "Your password changed",
      body: `<p>This is just so you know. If it was you, there is nothing to do.</p>
             <p>If it was not you, reply to this email right away and we will lock the account.</p>`,
    }),
    text: "Your Laevo password changed. If it was you, nothing to do. If it was not, reply to this email right away.",
  };
}

export function teamInviteEmail(
  env: Env,
  opts: { orgName: string; inviterName: string; token: string },
) {
  const url = `${siteUrl(env)}/join/${opts.token}`;
  return {
    subject: `${opts.inviterName} added you to ${opts.orgName}`,
    html: layout({
      heading: `You have been added to ${escapeHtml(opts.orgName)}`,
      body: `<p>${escapeHtml(opts.inviterName)} set up an account for you in Laevo, which ${escapeHtml(opts.orgName)} uses to keep track of the pantry.</p>
             <p>Pick your own password with the button below. Nobody else will see it, including ${escapeHtml(opts.inviterName)}.</p>`,
      action: { label: "Pick my password", href: url },
    }),
    text: `${opts.inviterName} added you to ${opts.orgName} on Laevo.\n\nPick your own password: ${url}`,
  };
}

export function contactRelayEmail(opts: {
  name: string;
  email: string;
  orgName: string;
  message: string;
}) {
  return {
    subject: `Laevo message from ${opts.name}${opts.orgName ? ` (${opts.orgName})` : ""}`,
    html: layout({
      heading: "Someone wrote in",
      body: `<p><strong>${escapeHtml(opts.name)}</strong> &lt;${escapeHtml(opts.email)}&gt;${
        opts.orgName ? ` — ${escapeHtml(opts.orgName)}` : ""
      }</p>
      <p style="white-space:pre-wrap;background:#ffffff;border:1px solid #e5e0d3;border-radius:10px;padding:16px;">${escapeHtml(
        opts.message,
      )}</p>`,
    }),
    text: `${opts.name} <${opts.email}>${opts.orgName ? ` — ${opts.orgName}` : ""}\n\n${opts.message}`,
  };
}

export function selfTestEmail(env: Env) {
  return {
    subject: "Laevo email test",
    html: layout({
      heading: "Email is working",
      body: `<p>If you are reading this, Laevo can send mail from your domain. Password resets, invites and reminders will reach people.</p>`,
    }),
    text: "Email is working. If you are reading this, Laevo can send mail from your domain.",
  };
}

export function unsubscribeUrl(env: Env, token: string): string {
  return `${siteUrl(env)}/unsubscribe/${token}`;
}
