import { Form, Link, useActionData, useLoaderData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { ctx } from "~/lib/loader";
import {
  requireUser,
  hashPassword,
  verifyPassword,
  killAllSessions,
  hashToken,
} from "~/lib/auth";
import { newId, newToken } from "~/lib/ids";
import { clampText, requireEmail, requirePassword, MIN_PASSWORD_LENGTH } from "~/lib/validate";
import { emailIsLive, billingIsLive } from "~/lib/env";
import { sendEmail, teamInviteEmail, selfTestEmail, passwordChangedEmail } from "~/lib/email";
import { PLANS, formatUsd } from "~/lib/pricing";

export async function loader({ context, request }: LoaderFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);

  const [org, team, invites, lastEmails] = await Promise.all([
    env.DB.prepare(
      "SELECT name, plan, service_area_note, visit_note FROM orgs WHERE id = ?",
    )
      .bind(user.orgId)
      .first<{
        name: string;
        plan: string;
        service_area_note: string | null;
        visit_note: string | null;
      }>(),
    env.DB.prepare(
      "SELECT id, name, email, role, active FROM users WHERE org_id = ? ORDER BY name",
    )
      .bind(user.orgId)
      .all<{ id: string; name: string; email: string; role: string; active: number }>(),
    env.DB.prepare(
      `SELECT email, name, role FROM invites
        WHERE org_id = ? AND accepted_at IS NULL AND expires_at > datetime('now')`,
    )
      .bind(user.orgId)
      .all<{ email: string; name: string; role: string }>(),
    env.DB.prepare(
      `SELECT kind, to_email, status, error, created_at FROM email_log
        WHERE org_id = ? ORDER BY created_at DESC LIMIT 5`,
    )
      .bind(user.orgId)
      .all<{
        kind: string;
        to_email: string;
        status: string;
        error: string | null;
        created_at: string;
      }>(),
  ]);

  return {
    me: { name: user.name, email: user.email, role: user.role },
    org: org ?? { name: user.orgName, plan: "community", service_area_note: null, visit_note: null },
    team: team.results ?? [],
    invites: invites.results ?? [],
    lastEmails: lastEmails.results ?? [],
    emailLive: emailIsLive(env),
    billingLive: billingIsLive(env),
    isDemo: user.isDemo,
  };
}

export async function action({ context, request }: ActionFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  const adminOnly = ["org", "invite", "remove"];
  if (adminOnly.includes(intent) && user.role !== "admin") {
    return {
      error:
        "Only an organizer can change this. Ask whoever set up your pantry's account.",
    };
  }

  if (intent === "org") {
    await env.DB.prepare(
      "UPDATE orgs SET name = ?, service_area_note = ?, visit_note = ? WHERE id = ?",
    )
      .bind(
        clampText(form.get("name"), 160) || user.orgName,
        clampText(form.get("serviceArea"), 1000) || null,
        clampText(form.get("visitNote"), 1000) || null,
        user.orgId,
      )
      .run();
    return { saved: "Saved." };
  }

  if (intent === "invite") {
    const email = requireEmail(form.get("email"));
    const name = clampText(form.get("name"), 120);
    if (email.error || !name) {
      return { error: "We need a name and an email address to send an invite." };
    }
    const existing = await env.DB.prepare("SELECT 1 FROM users WHERE email = ?")
      .bind(email.value)
      .first();
    if (existing) {
      return { error: "There is already an account with that email address." };
    }

    const token = newToken(32);
    await env.DB.prepare(
      `INSERT INTO invites (id, org_id, email, name, role, token_hash, invited_by, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 days'), datetime('now'))`,
    )
      .bind(
        newId("inv"),
        user.orgId,
        email.value,
        name,
        clampText(form.get("role"), 20) || "volunteer",
        await hashToken(token),
        user.id,
      )
      .run();

    const template = teamInviteEmail(env, {
      orgName: user.orgName,
      inviterName: user.name,
      token,
    });
    const sent = await sendEmail(env, {
      to: email.value,
      orgId: user.orgId,
      kind: "team_invite",
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    return {
      saved:
        sent.status === "sent"
          ? `Invitation sent to ${email.value}.`
          : `Invitation created. Email is not switched on yet, so send them this link yourself: ${env.SITE_URL}/join/${token}`,
    };
  }

  if (intent === "remove") {
    const userId = String(form.get("userId") ?? "");
    if (userId === user.id) {
      return { error: "You cannot remove your own account here." };
    }
    await env.DB.prepare(
      "UPDATE users SET active = 0 WHERE id = ? AND org_id = ?",
    )
      .bind(userId, user.orgId)
      .run();
    // Signed out everywhere, immediately.
    await killAllSessions(env, userId);
    return { saved: "Removed, and signed out everywhere." };
  }

  if (intent === "password") {
    const current = String(form.get("current") ?? "");
    const next = requirePassword(form.get("next"));
    if (next.error) return { error: next.error.message };

    const row = await env.DB.prepare(
      "SELECT password_hash FROM users WHERE id = ?",
    )
      .bind(user.id)
      .first<{ password_hash: string }>();
    if (!row || !(await verifyPassword(current, row.password_hash))) {
      return { error: "That current password does not match. Try once more." };
    }

    await env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?")
      .bind(await hashPassword(next.value), user.id)
      .run();

    const template = passwordChangedEmail(env);
    await sendEmail(env, {
      to: user.email,
      orgId: user.orgId,
      kind: "password_changed",
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
    return { saved: "Your password has been changed." };
  }

  if (intent === "email-test") {
    const template = selfTestEmail(env);
    const sent = await sendEmail(env, {
      to: user.email,
      orgId: user.orgId,
      kind: "self_test",
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
    if (sent.status === "sent") {
      return { saved: `Sent to ${user.email}. Check your inbox and your spam folder.` };
    }
    if (sent.status === "logged") {
      return {
        saved:
          "Email is not switched on for this installation yet, so nothing was actually sent — it was written to the logs instead. Everything else in Laevo works normally without it.",
      };
    }
    return { error: `The mail server said: ${sent.error ?? "no reason given"}` };
  }

  return { error: "We did not understand that." };
}

export default function Settings() {
  const data = useLoaderData<typeof loader>();
  const result = useActionData<{ saved?: string; error?: string }>();
  const navigation = useNavigation();
  const isAdmin = data.me.role === "admin";
  const plan = PLANS.find((p) => p.id === data.org.plan) ?? PLANS[0];

  return (
    <div className="wrap stack-lg">
      <h1>Settings</h1>

      {result?.saved && (
        <p className="form-ok" role="status">
          {result.saved}
        </p>
      )}
      {result?.error && (
        <p className="form-error" role="alert">
          {result.error}
        </p>
      )}

      {isAdmin && (
        <Form method="post" className="card">
          <input type="hidden" name="intent" value="org" />
          <h2 style={{ fontSize: "var(--t-h3)" }}>Your pantry</h2>

          <div className="field" style={{ marginTop: 16 }}>
            <label htmlFor="name">Name</label>
            <input id="name" name="name" defaultValue={data.org.name} />
          </div>

          <div className="field">
            <label htmlFor="serviceArea">Who you serve</label>
            <span className="hint">
              For your volunteers to read, not for Laevo to enforce. Include
              what happens when somebody falls outside it — that is the part
              nobody writes down and everybody needs.
            </span>
            <textarea
              id="serviceArea"
              name="serviceArea"
              defaultValue={data.org.service_area_note ?? ""}
              style={{ minHeight: 120 }}
            />
          </div>

          <div className="field">
            <label htmlFor="visitNote">How often people can come</label>
            <span className="hint">
              Also a note, not a rule. Laevo will not stop anybody or warn you
              about a third visit — that judgement is yours.
            </span>
            <textarea
              id="visitNote"
              name="visitNote"
              defaultValue={data.org.visit_note ?? ""}
              style={{ minHeight: 100 }}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-big btn-block">
            Save
          </button>
        </Form>
      )}

      <div className="card">
        <h2 style={{ fontSize: "var(--t-h3)" }}>Your people</h2>
        <p className="small" style={{ marginTop: 8 }}>
          Everyone gets their own login at no extra cost. We do not charge per
          user and never will.
        </p>

        <ul className="row-list" style={{ marginTop: 16 }}>
          {data.team
            .filter((member) => member.active === 1)
            .map((member) => (
              <li key={member.id}>
                <div className="row-link" style={{ cursor: "default" }}>
                  <span>
                    {member.name}
                    <span className="row-sub">
                      {member.email} · {member.role}
                    </span>
                  </span>
                  {isAdmin && member.email !== data.me.email && (
                    <Form method="post">
                      <input type="hidden" name="intent" value="remove" />
                      <input type="hidden" name="userId" value={member.id} />
                      <button type="submit" className="btn btn-danger">
                        Remove
                      </button>
                    </Form>
                  )}
                </div>
              </li>
            ))}
        </ul>

        {data.invites.length > 0 && (
          <p className="small" style={{ marginTop: 16 }}>
            Waiting to accept: {data.invites.map((i) => i.name).join(", ")}
          </p>
        )}

        {isAdmin && (
          <details style={{ marginTop: 20 }}>
            <summary className="btn btn-secondary btn-block">
              Invite somebody
            </summary>
            <Form method="post" style={{ marginTop: 20 }}>
              <input type="hidden" name="intent" value="invite" />
              <div className="field">
                <label htmlFor="inviteName">Their name</label>
                <input id="inviteName" name="name" required />
              </div>
              <div className="field">
                <label htmlFor="inviteEmail">Their email</label>
                <input id="inviteEmail" name="email" type="email" required />
              </div>
              <div className="field">
                <label htmlFor="inviteRole">What can they do?</label>
                <select id="inviteRole" name="role" defaultValue="volunteer">
                  <option value="volunteer">
                    Volunteer — check people in, look things up
                  </option>
                  <option value="staff">
                    Staff — also edit records and the shelf
                  </option>
                  <option value="admin">
                    Organizer — also settings and people
                  </option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-big btn-block">
                Send the invitation
              </button>
              <p className="small" style={{ marginTop: 12 }}>
                They pick their own password. Nobody sees it, including you.
              </p>
            </Form>
          </details>
        )}
      </div>

      <Form method="post" className="card">
        <input type="hidden" name="intent" value="password" />
        <h2 style={{ fontSize: "var(--t-h3)" }}>Change your password</h2>
        <div className="field" style={{ marginTop: 16 }}>
          <label htmlFor="current">Your current password</label>
          <input
            id="current"
            name="current"
            type="password"
            autoComplete="current-password"
          />
        </div>
        <div className="field">
          <label htmlFor="next">A new password</label>
          <span className="hint">
            At least {MIN_PASSWORD_LENGTH} characters. Three ordinary words in a
            row works well.
          </span>
          <input
            id="next"
            name="next"
            type="password"
            autoComplete="new-password"
          />
        </div>
        <button type="submit" className="btn btn-primary btn-big btn-block">
          Change it
        </button>
      </Form>

      <div className="card">
        <h2 style={{ fontSize: "var(--t-h3)" }}>Email</h2>
        <p style={{ marginTop: 10 }}>
          {data.emailLive
            ? "Email is switched on. Invitations, password resets and shift reminders will reach people."
            : "Email is not switched on for this installation yet. Everything in Laevo works without it — messages are written to the logs, and invitation links are shown on screen so you can send them yourself."}
        </p>

        <Form method="post" style={{ marginTop: 16 }}>
          <input type="hidden" name="intent" value="email-test" />
          <button
            type="submit"
            className="btn btn-secondary btn-block"
            disabled={navigation.state === "submitting"}
          >
            Send a test email to {data.me.email}
          </button>
        </Form>

        {data.lastEmails.length > 0 && (
          <>
            <h3 style={{ marginTop: 24, fontSize: "var(--t-body)" }}>
              The last few messages
            </h3>
            <ul className="stack" style={{ listStyle: "none", marginTop: 10 }}>
              {data.lastEmails.map((mail, i) => (
                <li key={i} className="small">
                  {mail.created_at.slice(0, 16)} — {mail.kind} to {mail.to_email}:{" "}
                  <strong>{mail.status}</strong>
                  {mail.error && (
                    <>
                      {" "}
                      <span style={{ color: "var(--danger)" }}>{mail.error}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="card">
        <h2 style={{ fontSize: "var(--t-h3)" }}>Your plan</h2>
        <p style={{ marginTop: 10 }}>
          You are on <strong>{plan.name}</strong> —{" "}
          {formatUsd(plan.monthlyCents)}
          {plan.monthlyCents === 0 ? " forever" : " a month"}.{" "}
          {plan.householdsPerMonth
            ? `It covers up to ${plan.householdsPerMonth} households a month.`
            : "No limit on households."}
        </p>
        {!data.billingLive && (
          <p className="small" style={{ marginTop: 10 }}>
            Card payments are not switched on yet, so nothing is charged and
            nothing is restricted. When they are, you will see the price before
            anything happens.
          </p>
        )}
        <p style={{ marginTop: 16 }}>
          <Link className="btn btn-secondary btn-block" to="/pricing">
            See what the plans include
          </Link>
        </p>
      </div>

      <div className="card">
        <h2 style={{ fontSize: "var(--t-h3)" }}>Your records</h2>
        <p style={{ marginTop: 10 }}>
          Everything you have put into Laevo, in one file, whenever you want it
          — including on the day you decide to leave.
        </p>
        <p style={{ marginTop: 16 }}>
          <a className="btn btn-secondary btn-block" href="/api/export">
            Download everything
          </a>
        </p>
        <p className="small" style={{ marginTop: 12 }}>
          Neighbors, visits, the shelf, deliveries, shifts, signups, reports and
          your history. Passwords are not in it, because they are stored in a
          form that cannot be turned back into a password by anybody, including
          us.
        </p>
      </div>

      <div className="card">
        <h2 style={{ fontSize: "var(--t-h3)" }}>Sign out</h2>
        <p style={{ marginTop: 10 }}>
          {data.isDemo
            ? "This is the demo pantry — it is rebuilt fresh every night, so nothing you did here needs tidying up."
            : "You will need your email and password to get back in."}
        </p>
        <p style={{ marginTop: 16 }}>
          <Link className="btn btn-secondary btn-block" to="/sign-out">
            Sign out
          </Link>
        </p>
      </div>
    </div>
  );
}
