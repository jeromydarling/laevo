import { Form, Link, redirect, useActionData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { AuthShell } from "~/components/AuthShell";
import { ctx, publicData } from "~/lib/loader";
import { marketingMeta } from "~/lib/meta";
import { getUser, hashPassword, createSession } from "~/lib/auth";
import { newId } from "~/lib/ids";
import { checkLimit, recordFailure, LIMITS, clientIp } from "~/lib/ratelimit";
import { requireEmail, requirePassword, requireText, toSlug, MIN_PASSWORD_LENGTH } from "~/lib/validate";
import { sendLater, welcomeEmail } from "~/lib/email";

export async function loader({ context, request }: LoaderFunctionArgs) {
  const { env } = ctx(context);
  const user = await getUser(env, request);
  if (user) throw redirect("/app");
  return publicData(context);
}

export function meta({ loaderData }: { loaderData?: { siteUrl: string } }) {
  return marketingMeta({
    title: "Start a pantry account",
    description:
      "Create a free Laevo account for your food pantry. No card, no sales call, and nothing to cancel.",
    path: "/sign-up",
    siteUrl: loaderData?.siteUrl ?? "https://laevo.us",
  });
}

export async function action({ context, request }: ActionFunctionArgs) {
  const { env, ctx: execution } = ctx(context);
  const form = await request.formData();
  const ip = clientIp(request);

  const limit = await checkLimit(env, "signup", ip, LIMITS.signUp);
  if (!limit.allowed) {
    return {
      fieldErrors: [
        {
          field: "form",
          message:
            "That is several accounts from one place in a short time. Write to hello@laevo.us and we will set it up with you.",
        },
      ],
    };
  }

  const orgName = requireText(form.get("org"), "org", "your pantry's name", 160);
  const name = requireText(form.get("name"), "name", "your name", 120);
  const email = requireEmail(form.get("email"));
  const password = requirePassword(form.get("password"));

  const fieldErrors = [orgName.error, name.error, email.error, password.error].filter(
    Boolean,
  ) as Array<{ field: string; message: string }>;
  if (fieldErrors.length) {
    await recordFailure(env, "signup", ip, LIMITS.signUp);
    return { fieldErrors };
  }

  const existing = await env.DB.prepare(
    "SELECT 1 FROM users WHERE email = ? LIMIT 1",
  )
    .bind(email.value)
    .first();
  if (existing) {
    return {
      fieldErrors: [
        {
          field: "email",
          message:
            "There is already an account with that email. Try signing in, or use the forgotten password link.",
        },
      ],
    };
  }

  const orgId = newId("org");
  const userId = newId("usr");
  const siteId = newId("site");
  let slug = toSlug(orgName.value) || "pantry";
  const slugTaken = await env.DB.prepare("SELECT 1 FROM orgs WHERE slug = ?")
    .bind(slug)
    .first();
  if (slugTaken) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO orgs (id, name, slug, plan, is_demo, created_at)
       VALUES (?, ?, ?, 'community', 0, datetime('now'))`,
    ).bind(orgId, orgName.value, slug),
    env.DB.prepare(
      `INSERT INTO users (id, org_id, email, name, role, password_hash, active)
       VALUES (?, ?, ?, ?, 'admin', ?, 1)`,
    ).bind(userId, orgId, email.value, name.value, await hashPassword(password.value)),
    // One location to start with, so the pantry is never looking at an empty
    // screen wondering what to do first.
    env.DB.prepare(
      `INSERT INTO sites (id, org_id, name) VALUES (?, ?, ?)`,
    ).bind(siteId, orgId, orgName.value),
    env.DB.prepare(
      `INSERT INTO events (id, org_id, kind, summary, actor_user_id)
       VALUES (?, ?, 'org_created', 'Pantry account created', ?)`,
    ).bind(newId("evt"), orgId, userId),
  ]);

  const template = welcomeEmail(env, { name: name.value, orgName: orgName.value });
  sendLater(env, execution, {
    to: email.value,
    orgId,
    kind: "welcome",
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  const session = await createSession(env, userId);
  return redirect("/app", { headers: { "Set-Cookie": session.cookie } });
}

export default function SignUp() {
  const result = useActionData<{
    fieldErrors?: Array<{ field: string; message: string }>;
  }>();
  const navigation = useNavigation();
  const errorFor = (field: string) =>
    result?.fieldErrors?.find((e) => e.field === field)?.message;

  return (
    <AuthShell
      title="Start your pantry"
      intro="Four boxes. No card, no sales call, nothing to cancel."
      footer={
        <p>
          Already have an account? <Link to="/sign-in">Sign in</Link>. Want to
          look first? <Link to="/demo">Open the demo</Link> — no signup at all.
        </p>
      }
    >
      {errorFor("form") && (
        <p className="form-error" role="alert">
          {errorFor("form")}
        </p>
      )}

      <Form method="post" className="card">
        <div className={`field${errorFor("org") ? " field-error" : ""}`}>
          <label htmlFor="org">Your pantry's name</label>
          <span className="hint">
            Whatever people call it. You can change this later.
          </span>
          <input id="org" name="org" type="text" autoFocus required />
          {errorFor("org") && (
            <span className="error-text">{errorFor("org")}</span>
          )}
        </div>

        <div className={`field${errorFor("name") ? " field-error" : ""}`}>
          <label htmlFor="name">Your name</label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
          />
          {errorFor("name") && (
            <span className="error-text">{errorFor("name")}</span>
          )}
        </div>

        <div className={`field${errorFor("email") ? " field-error" : ""}`}>
          <label htmlFor="email">Your email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
          {errorFor("email") && (
            <span className="error-text">{errorFor("email")}</span>
          )}
        </div>

        <div className={`field${errorFor("password") ? " field-error" : ""}`}>
          <label htmlFor="password">A password</label>
          <span className="hint">
            At least {MIN_PASSWORD_LENGTH} characters. Three ordinary words in a
            row works well and is much easier to remember than something with a
            symbol in it.
          </span>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
          {errorFor("password") && (
            <span className="error-text">{errorFor("password")}</span>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-big btn-block"
          disabled={navigation.state === "submitting"}
        >
          {navigation.state === "submitting" ? "Setting it up…" : "Start our pantry"}
        </button>

        <p className="small" style={{ marginTop: 20 }}>
          By starting you agree to our <Link to="/terms">terms</Link> and{" "}
          <Link to="/privacy">privacy page</Link>, both of which are short and
          written to be read.
        </p>
      </Form>
    </AuthShell>
  );
}
