/**
 * Scheduled work.
 *
 * Two triggers: a nightly one that rebuilds the demo pantry, and a half-hourly
 * one that clears expired rows and sends shift reminders. Everything here is
 * idempotent — a re-run must never double-send or double-delete.
 */
import type { Env } from "../app/lib/env";
import { sendEmail, layout, escapeHtml } from "../app/lib/email";
import { seedDemo } from "./seed";

export async function runHousekeeping(env: Env): Promise<void> {
  try {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')"),
      env.DB.prepare(
        "DELETE FROM password_resets WHERE expires_at < datetime('now', '-1 day')",
      ),
      env.DB.prepare(
        "DELETE FROM invites WHERE expires_at < datetime('now', '-7 days') AND accepted_at IS NULL",
      ),
      env.DB.prepare(
        "DELETE FROM email_log WHERE created_at < datetime('now', '-90 days')",
      ),
    ]);
  } catch (err) {
    console.error("[cron] housekeeping failed", err);
  }

  await sendShiftReminders(env);
}

/**
 * Most volunteer no-shows are forgetting, not avoiding. A reminder two days
 * out is the cheapest useful thing this product does.
 *
 * `reminded_at` is stamped before sending, so a retry cannot send twice.
 */
async function sendShiftReminders(env: Env): Promise<void> {
  try {
    const due = await env.DB.prepare(
      `SELECT s.id, s.name, s.email, sh.title, sh.starts_at, o.name AS org_name, o.id AS org_id
         FROM signups s
         JOIN shifts sh ON sh.id = s.shift_id
         JOIN orgs o ON o.id = s.org_id
        WHERE s.status = 'coming'
          AND s.reminded_at IS NULL
          AND s.email IS NOT NULL
          AND o.is_demo = 0
          AND sh.starts_at BETWEEN datetime('now', '+1 day') AND datetime('now', '+2 days')
        LIMIT 50`,
    ).all<{
      id: string;
      name: string;
      email: string;
      title: string;
      starts_at: string;
      org_name: string;
      org_id: string;
    }>();

    for (const row of due.results ?? []) {
      await env.DB.prepare(
        "UPDATE signups SET reminded_at = datetime('now') WHERE id = ?",
      )
        .bind(row.id)
        .run();

      const when = friendlyWhen(row.starts_at);
      await sendEmail(env, {
        to: row.email,
        orgId: row.org_id,
        kind: "shift_reminder",
        subject: `Reminder: ${row.title}, ${when}`,
        html: layout({
          heading: `See you ${escapeHtml(when)}`,
          body: `<p>You signed up for <strong>${escapeHtml(row.title)}</strong> at ${escapeHtml(row.org_name)}.</p>
                 <p>If something has come up, that is completely fine — just let them know so they can fill the spot.</p>`,
        }),
        text: `Reminder: you signed up for ${row.title} at ${row.org_name}, ${when}. If something has come up, that is fine — just let them know.`,
      });
    }
  } catch (err) {
    console.error("[cron] shift reminders failed", err);
  }
}

/** Only the nightly trigger rebuilds the demo. */
export async function resetDemoIfDue(env: Env, cron: string): Promise<void> {
  if (!cron.startsWith("17 7")) return;
  try {
    await seedDemo(env);
    console.log("[cron] demo pantry rebuilt");
  } catch (err) {
    console.error("[cron] demo reset failed", err);
  }
}

function friendlyWhen(sqlDate: string): string {
  const d = new Date(sqlDate.replace(" ", "T") + "Z");
  return d.toLocaleString("en-US", {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  });
}
