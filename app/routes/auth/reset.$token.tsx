import { Form, Link, redirect, useActionData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { AuthShell } from "~/components/AuthShell";
import { ctx } from "~/lib/loader";
import { marketingMeta } from "~/lib/meta";
import {
  hashToken,
  hashPassword,
  createSession,
  killAllSessions,
} from "~/lib/auth";
import { requirePassword, MIN_PASSWORD_LENGTH } from "~/lib/validate";
import { sendLater, passwordChangedEmail } from "~/lib/email";

export function meta() {
  return marketingMeta({
    title: "Set a new password",
    description: "Set a new password for your Laevo account.",
    path: "/reset",
    siteUrl: "https://laevo.us",
    noIndex: true,
  });
}

export async function loader({ context, params }: LoaderFunctionArgs) {
  const { env } = ctx(context);
  const row = await env.DB.prepare(
    `SELECT id FROM password_resets
      WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')
      LIMIT 1`,
  )
    .bind(await hashToken(params.token!))
    .first();
  return { valid: Boolean(row) };
}

export async function action({ context, request, params }: ActionFunctionArgs) {
  const { env, ctx: execution } = ctx(context);
  const form = await request.formData();
  const password = requirePassword(form.get("password"));
  if (password.error) return { error: password.error.message };

  const tokenHash = await hashToken(params.token!);
  const reset = await env.DB.prepare(
    `SELECT pr.id, pr.user_id, u.email
       FROM password_resets pr
       JOIN users u ON u.id = pr.user_id
      WHERE pr.token_hash = ? AND pr.used_at IS NULL AND pr.expires_at > datetime('now')
      LIMIT 1`,
  )
    .bind(tokenHash)
    .first<{ id: string; user_id: string; email: string }>();

  if (!reset) {
    return {
      error:
        "That link has already been used or has expired. Ask for a fresh one — it only takes a moment.",
    };
  }

  await env.DB.batch([
    env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(
      await hashPassword(password.value),
      reset.user_id,
    ),
    env.DB.prepare(
      "UPDATE password_resets SET used_at = datetime('now') WHERE id = ?",
    ).bind(reset.id),
  ]);

  // Everything signed in anywhere is signed out, because a password reset is
  // sometimes a person taking their account back.
  await killAllSessions(env, reset.user_id);

  const template = passwordChangedEmail(env);
  sendLater(env, execution, {
    to: reset.email,
    kind: "password_changed",
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  const session = await createSession(env, reset.user_id);
  return redirect("/app", { headers: { "Set-Cookie": session.cookie } });
}

export default function Reset({
  loaderData,
}: {
  loaderData: { valid: boolean };
}) {
  const result = useActionData<{ error?: string }>();
  const navigation = useNavigation();

  if (!loaderData.valid) {
    return (
      <AuthShell
        title="That link has expired"
        intro="Reset links work once and last an hour, which keeps the account safe. Getting a fresh one takes a moment."
      >
        <Link className="btn btn-primary btn-big btn-block" to="/forgot">
          Send me a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password" intro="Pick something you will remember.">
      {result?.error && (
        <p className="form-error" role="alert">
          {result.error}
        </p>
      )}
      <Form method="post" className="card">
        <div className="field">
          <label htmlFor="password">New password</label>
          <span className="hint">
            At least {MIN_PASSWORD_LENGTH} characters. Three ordinary words in a
            row is a good password and an easy one to remember.
          </span>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            autoFocus
            required
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary btn-big btn-block"
          disabled={navigation.state === "submitting"}
        >
          {navigation.state === "submitting" ? "Saving…" : "Save it and sign me in"}
        </button>
      </Form>
    </AuthShell>
  );
}
