import { Form, Link, useActionData, useNavigation } from "react-router";
import type { ActionFunctionArgs } from "react-router";
import { AuthShell } from "~/components/AuthShell";
import { ctx } from "~/lib/loader";
import { marketingMeta } from "~/lib/meta";
import { newId, newToken } from "~/lib/ids";
import { hashToken } from "~/lib/auth";
import { checkLimit, recordFailure, LIMITS, clientIp } from "~/lib/ratelimit";
import { requireEmail } from "~/lib/validate";
import { sendLater, passwordResetEmail } from "~/lib/email";

export function meta() {
  return marketingMeta({
    title: "Forgotten password",
    description: "Get a link to set a new Laevo password.",
    path: "/forgot",
    siteUrl: "https://laevo.us",
    noIndex: true,
  });
}

/** Always the same words, whether or not the account exists. */
const SENT =
  "If there is an account with that email, a link is on its way. It works once and stops working in an hour. Check the spam folder if it is not there in a few minutes.";

export async function action({ context, request }: ActionFunctionArgs) {
  const { env, ctx: execution } = ctx(context);
  const form = await request.formData();
  const ip = clientIp(request);

  const email = requireEmail(form.get("email"));
  if (email.error) return { message: SENT };

  const limit = await checkLimit(env, "reset", ip, LIMITS.passwordReset);
  if (!limit.allowed) return { message: SENT };
  await recordFailure(env, "reset", ip, LIMITS.passwordReset);

  const user = await env.DB.prepare(
    "SELECT id FROM users WHERE email = ? AND active = 1 LIMIT 1",
  )
    .bind(email.value)
    .first<{ id: string }>();

  // No account enumeration: the reply is identical either way, and the work
  // done in the two branches is close enough not to be timed apart usefully.
  if (user) {
    const token = newToken(32);
    await env.DB.prepare(
      `INSERT INTO password_resets (id, user_id, token_hash, expires_at, created_at)
       VALUES (?, ?, ?, datetime('now', '+1 hour'), datetime('now'))`,
    )
      .bind(newId("tok"), user.id, await hashToken(token))
      .run();

    const template = passwordResetEmail(env, { token });
    sendLater(env, execution, {
      to: email.value,
      kind: "password_reset",
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  return { message: SENT };
}

export default function Forgot() {
  const result = useActionData<{ message?: string }>();
  const navigation = useNavigation();

  return (
    <AuthShell
      title="Forgotten password"
      intro="This happens to everybody. Put your email in and we will send you a link."
      footer={
        <p>
          Remembered it? <Link to="/sign-in">Sign in</Link>.
        </p>
      }
    >
      {result?.message && (
        <p className="form-ok" role="status">
          {result.message}
        </p>
      )}

      <Form method="post" className="card">
        <div className="field">
          <label htmlFor="email">Your email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            autoFocus
            required
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary btn-big btn-block"
          disabled={navigation.state === "submitting"}
        >
          {navigation.state === "submitting" ? "Sending…" : "Send me a link"}
        </button>
      </Form>
    </AuthShell>
  );
}
