import { Form, useActionData, useNavigation, redirect } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { AuthShell } from "~/components/AuthShell";
import { ctx } from "~/lib/loader";
import { marketingMeta } from "~/lib/meta";
import { hashToken, hashPassword, createSession } from "~/lib/auth";
import { newId } from "~/lib/ids";
import { requirePassword, MIN_PASSWORD_LENGTH } from "~/lib/validate";

export function meta() {
  return marketingMeta({
    title: "Join your pantry",
    description: "Set your own password and join your pantry on Laevo.",
    path: "/join",
    siteUrl: "https://laevo.us",
    noIndex: true,
  });
}

export async function loader({ context, params }: LoaderFunctionArgs) {
  const { env } = ctx(context);
  const invite = await env.DB.prepare(
    `SELECT i.name, i.email, o.name AS org_name
       FROM invites i
       JOIN orgs o ON o.id = i.org_id
      WHERE i.token_hash = ? AND i.accepted_at IS NULL AND i.expires_at > datetime('now')
      LIMIT 1`,
  )
    .bind(await hashToken(params.token!))
    .first<{ name: string; email: string; org_name: string }>();
  return { invite: invite ?? null };
}

export async function action({ context, request, params }: ActionFunctionArgs) {
  const { env } = ctx(context);
  const form = await request.formData();
  const password = requirePassword(form.get("password"));
  if (password.error) return { error: password.error.message };

  const tokenHash = await hashToken(params.token!);
  const invite = await env.DB.prepare(
    `SELECT id, org_id, email, name, role FROM invites
      WHERE token_hash = ? AND accepted_at IS NULL AND expires_at > datetime('now')
      LIMIT 1`,
  )
    .bind(tokenHash)
    .first<{
      id: string;
      org_id: string;
      email: string;
      name: string;
      role: string;
    }>();

  if (!invite) {
    return {
      error:
        "That invitation has already been used or has expired. Ask whoever invited you to send another one.",
    };
  }

  const existing = await env.DB.prepare(
    "SELECT 1 FROM users WHERE email = ? LIMIT 1",
  )
    .bind(invite.email)
    .first();
  if (existing) {
    return {
      error:
        "There is already an account with that email address. Try signing in instead, or use the forgotten password link.",
    };
  }

  const userId = newId("usr");
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO users (id, org_id, email, name, role, password_hash, active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
    ).bind(
      userId,
      invite.org_id,
      invite.email,
      invite.name,
      invite.role,
      await hashPassword(password.value),
    ),
    env.DB.prepare(
      "UPDATE invites SET accepted_at = datetime('now') WHERE id = ?",
    ).bind(invite.id),
    env.DB.prepare(
      `INSERT INTO events (id, org_id, kind, summary, actor_user_id)
       VALUES (?, ?, 'member_joined', ?, ?)`,
    ).bind(
      newId("evt"),
      invite.org_id,
      `${invite.name} joined the pantry`,
      userId,
    ),
  ]);

  const session = await createSession(env, userId);
  return redirect("/app", { headers: { "Set-Cookie": session.cookie } });
}

export default function Join({
  loaderData,
}: {
  loaderData: {
    invite: { name: string; email: string; org_name: string } | null;
  };
}) {
  const result = useActionData<{ error?: string }>();
  const navigation = useNavigation();
  const invite = loaderData.invite;

  if (!invite) {
    return (
      <AuthShell
        title="That invitation has expired"
        intro="Invitations last a week. Ask whoever invited you to send a fresh one — it takes them about ten seconds."
      />
    );
  }

  return (
    <AuthShell
      title={`Welcome to ${invite.org_name}`}
      intro={
        <>
          Somebody at {invite.org_name} set up an account for you. Pick your own
          password below — nobody else will ever see it, including them.
        </>
      }
    >
      {result?.error && (
        <p className="form-error" role="alert">
          {result.error}
        </p>
      )}
      <Form method="post" className="card">
        <div className="field">
          <span className="label">Your email</span>
          <p>
            <strong>{invite.email}</strong>
          </p>
        </div>
        <div className="field">
          <label htmlFor="password">Choose a password</label>
          <span className="hint">
            At least {MIN_PASSWORD_LENGTH} characters. Three ordinary words in a
            row is a good one and easy to remember.
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
          {navigation.state === "submitting" ? "Setting up…" : "Join the pantry"}
        </button>
      </Form>
    </AuthShell>
  );
}
