import { Form, useActionData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useEffect, useState } from "react";
import { ctx, publicData } from "~/lib/loader";
import { marketingMeta } from "~/lib/meta";
import { newId } from "~/lib/ids";
import { scoreSubmission } from "~/lib/spam";
import { clampText, requireEmail, requireText } from "~/lib/validate";
import { checkLimit, recordFailure, LIMITS, clientIp } from "~/lib/ratelimit";
import { sendLater, contactRelayEmail } from "~/lib/email";

export async function loader({ context }: LoaderFunctionArgs) {
  return publicData(context);
}

export function meta({ loaderData }: { loaderData?: { siteUrl: string } }) {
  return marketingMeta({
    title: "Contact",
    description:
      "Write to Laevo. A person reads it and a person answers, usually within a day.",
    path: "/contact",
    siteUrl: loaderData?.siteUrl ?? "https://laevo.us",
  });
}

const THANKS =
  "Thank you — that reached us. Somebody will read it and write back, usually within a day.";

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, ctx: execution } = ctx(context);
  const form = await request.formData();
  const ip = clientIp(request);

  const limit = await checkLimit(env, "contact", ip, LIMITS.contactForm);
  if (!limit.allowed) {
    return {
      error:
        "That is several messages in a short time. Give it an hour, or write to hello@laevo.us directly — that always works.",
      ok: false,
    };
  }

  const name = requireText(form.get("name"), "name", "a name to reply to", 120);
  const email = requireEmail(form.get("email"));
  const message = requireText(
    form.get("message"),
    "message",
    "a message — even one line is fine",
    5000,
  );
  const orgName = clampText(form.get("org"), 160);

  const errors = [name.error, email.error, message.error].filter(Boolean);
  if (errors.length) {
    await recordFailure(env, "contact", ip, LIMITS.contactForm);
    return { ok: false, fieldErrors: errors as Array<{ field: string; message: string }> };
  }

  const verdict = scoreSubmission({
    honeypot: String(form.get("website") ?? ""),
    elapsedMs: Number(form.get("elapsed") ?? -1),
    name: name.value,
    email: email.value,
    message: message.value,
  });

  await env.DB.prepare(
    `INSERT INTO inquiries (id, name, email, org_name, message, spam_score, spam_reasons, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
  )
    .bind(
      newId("evt"),
      name.value,
      email.value,
      orgName || null,
      message.value,
      verdict.score,
      verdict.reasons.join("; ") || null,
    )
    .run();

  // Spam gets the same cheerful thank-you a real message gets, and then goes
  // nowhere. Bots that never learn what tripped them never adapt.
  if (verdict.isSpam) {
    console.log(`[contact:dropped] score=${verdict.score} ${verdict.reasons.join("; ")}`);
    return { ok: true, message: THANKS };
  }

  const template = contactRelayEmail({
    name: name.value,
    email: email.value,
    orgName,
    message: message.value,
  });
  sendLater(env, execution, {
    to: env.EMAIL_REPLY_TO || "hello@laevo.us",
    kind: "contact_relay",
    replyTo: email.value,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  return { ok: true, message: THANKS };
}

interface ActionResult {
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Array<{ field: string; message: string }>;
}

export default function Contact() {
  const result = useActionData<ActionResult>();
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";
  const [renderedAt, setRenderedAt] = useState(0);

  // Stamped on the client, because a server timestamp is stale the moment the
  // page is served from the edge cache.
  useEffect(() => setRenderedAt(Date.now()), []);

  const errorFor = (field: string) =>
    result?.fieldErrors?.find((e) => e.field === field)?.message;

  return (
    <>
      <section className="hero">
        <div className="wrap-narrow">
          <p className="eyebrow">Contact</p>
          <h1>Write to a person</h1>
          <p className="lead" style={{ marginTop: 20 }}>
            No ticket number, no chatbot, no form that routes you to an article.
            One of the people who built Laevo reads this and writes back, and
            usually it is the same day.
          </p>
          <p style={{ marginTop: 16 }}>
            You can also email <strong>hello@laevo.us</strong> directly, which
            is the same inbox.
          </p>
        </div>
      </section>

      <section style={{ paddingTop: 8 }}>
        <div className="wrap-narrow">
          {result?.ok && result.message && (
            <p className="form-ok" role="status">
              {result.message}
            </p>
          )}
          {result?.error && (
            <p className="form-error" role="alert">
              {result.error}
            </p>
          )}

          <Form method="post" className="card">
            <input type="hidden" name="elapsed" value={renderedAt ? Date.now() - renderedAt : -1} />

            <div className="honeypot" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
              />
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
              <span className="hint">So we can write back. Nothing else.</span>
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

            <div className="field">
              <label htmlFor="org">Your pantry or organization</label>
              <span className="hint">Optional.</span>
              <input id="org" name="org" type="text" autoComplete="organization" />
            </div>

            <div className={`field${errorFor("message") ? " field-error" : ""}`}>
              <label htmlFor="message">What can we help with?</label>
              <span className="hint">
                One line is fine. So is three paragraphs about your quarter-end
                report.
              </span>
              <textarea id="message" name="message" required />
              {errorFor("message") && (
                <span className="error-text">{errorFor("message")}</span>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-big btn-block"
              disabled={submitting}
            >
              {submitting ? "Sending…" : "Send it"}
            </button>
          </Form>
        </div>
      </section>
    </>
  );
}
