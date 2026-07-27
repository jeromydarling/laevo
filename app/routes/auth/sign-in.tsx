import { Form, Link, redirect, useActionData, useNavigation, useSearchParams } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { AuthShell } from "~/components/AuthShell";
import { ctx } from "~/lib/loader";
import { marketingMeta } from "~/lib/meta";
import { getUser, verifyPassword, createSession } from "~/lib/auth";
import { checkLimit, recordFailure, clearFailures, LIMITS, clientIp } from "~/lib/ratelimit";
import { requireEmail } from "~/lib/validate";

export function meta() {
  return marketingMeta({
    title: "Sign in",
    description: "Sign in to your pantry's Laevo account.",
    path: "/sign-in",
    siteUrl: "https://laevo.app",
    noIndex: true,
  });
}

export async function loader({ context, request }: LoaderFunctionArgs) {
  const { env } = ctx(context);
  const user = await getUser(env, request);
  if (user) throw redirect("/app");
  return null;
}

export async function action({ context, request }: ActionFunctionArgs) {
  const { env } = ctx(context);
  const form = await request.formData();
  const ip = clientIp(request);

  const email = requireEmail(form.get("email"));
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/app");

  if (email.error || !password) {
    return { error: "We need an email address and a password to sign you in." };
  }

  // Limited per IP and email together, so one busy pantry's wifi cannot lock
  // out another pantry that shares it.
  const key = `${ip}:${email.value}`;
  const limit = await checkLimit(env, "signin", key, LIMITS.signIn);
  if (!limit.allowed) {
    return {
      error:
        "That is a lot of tries. Wait fifteen minutes and try again, or use the forgotten password link below — that always works.",
    };
  }

  const row = await env.DB.prepare(
    "SELECT id, password_hash FROM users WHERE email = ? AND active = 1 LIMIT 1",
  )
    .bind(email.value)
    .first<{ id: string; password_hash: string }>();

  const ok = row ? await verifyPassword(password, row.password_hash) : false;
  if (!ok) {
    await recordFailure(env, "signin", key, LIMITS.signIn);
    return {
      error:
        "That email and password do not go together. If you are not sure which password you used, the link below will send you a new one.",
    };
  }

  await clearFailures(env, "signin", key);
  const session = await createSession(env, row!.id);
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/app";
  return redirect(safeNext, { headers: { "Set-Cookie": session.cookie } });
}

export default function SignIn() {
  const result = useActionData<{ error?: string }>();
  const navigation = useNavigation();
  const [params] = useSearchParams();
  const next = params.get("next") ?? "/app";

  return (
    <AuthShell
      title="Sign in"
      intro="Welcome back."
      footer={
        <p>
          No account yet? <Link to="/sign-up">Start your pantry</Link>. Or{" "}
          <Link to="/demo">look around the demo</Link> without signing up at
          all.
        </p>
      }
    >
      {result?.error && (
        <p className="form-error" role="alert">
          {result.error}
        </p>
      )}

      <Form method="post" className="card">
        <input type="hidden" name="next" value={next} />

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            autoFocus
            required
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-big btn-block"
          disabled={navigation.state === "submitting"}
        >
          {navigation.state === "submitting" ? "Signing in…" : "Sign in"}
        </button>

        <p style={{ marginTop: 20 }}>
          <Link to="/forgot">I have forgotten my password</Link>
        </p>
      </Form>
    </AuthShell>
  );
}
