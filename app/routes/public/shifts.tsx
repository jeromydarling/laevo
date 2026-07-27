import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { ctx, publicData } from "~/lib/loader";
import { marketingMeta } from "~/lib/meta";
import { Wordmark } from "~/components/Brand";
import { TextSizeControl } from "~/components/TextSize";
import { newId } from "~/lib/ids";
import { clampText, requireEmail, normalizePhone } from "~/lib/validate";
import { checkLimit, recordFailure, LIMITS, clientIp } from "~/lib/ratelimit";
import { scoreSubmission } from "~/lib/spam";

export async function loader({ context, request, params }: LoaderFunctionArgs) {
  const { env } = ctx(context);
  const org = await env.DB.prepare(
    "SELECT id, name FROM orgs WHERE slug = ? LIMIT 1",
  )
    .bind(params.slug)
    .first<{ id: string; name: string }>();

  if (!org) {
    throw new Response("We could not find a pantry at that address.", {
      status: 404,
    });
  }

  const shifts = await env.DB.prepare(
    `SELECT sh.id, sh.title, sh.starts_at, sh.ends_at, sh.slots, sh.note,
            (SELECT COUNT(*) FROM signups s WHERE s.shift_id = sh.id AND s.status = 'coming') AS filled
       FROM shifts sh
      WHERE sh.org_id = ? AND sh.starts_at > datetime('now')
      ORDER BY sh.starts_at ASC LIMIT 20`,
  )
    .bind(org.id)
    .all<{
      id: string;
      title: string;
      starts_at: string;
      ends_at: string;
      slots: number;
      note: string | null;
      filled: number;
    }>();

  return {
    ...publicData(context),
    org,
    shifts: shifts.results ?? [],
  };
}

export function meta({
  loaderData,
}: {
  loaderData?: Awaited<ReturnType<typeof loader>>;
}) {
  if (!loaderData) return [{ title: "Volunteer — Laevo" }];
  return marketingMeta({
    title: `Volunteer with ${loaderData.org.name}`,
    description: `Pick a shift with ${loaderData.org.name}. No account, no password, nothing to install.`,
    path: `/v/${loaderData.org.name}`,
    siteUrl: loaderData.siteUrl,
  });
}

export async function action({ context, request, params }: ActionFunctionArgs) {
  const { env } = ctx(context);
  const form = await request.formData();
  const ip = clientIp(request);

  const limit = await checkLimit(env, "vol", ip, LIMITS.publicSignup);
  if (!limit.allowed) {
    return {
      error:
        "That is several signups from one place in a short time. Give it a while, or ring the pantry directly.",
    };
  }

  const org = await env.DB.prepare("SELECT id FROM orgs WHERE slug = ?")
    .bind(params.slug)
    .first<{ id: string }>();
  if (!org) return { error: "We could not find that pantry." };

  const shiftId = String(form.get("shiftId") ?? "");
  const name = clampText(form.get("name"), 120);
  const email = clampText(form.get("email"), 320).toLowerCase();
  const phone = normalizePhone(form.get("phone"));

  if (!name) {
    return { error: "We just need a name so they know who to expect." };
  }
  if (email) {
    const checked = requireEmail(email);
    if (checked.error) return { error: checked.error.message };
  }

  const verdict = scoreSubmission({
    honeypot: String(form.get("website") ?? ""),
    elapsedMs: Number(form.get("elapsed") ?? -1),
    name,
    email,
    message: name,
  });

  const shift = await env.DB.prepare(
    `SELECT sh.id, sh.title, sh.slots,
            (SELECT COUNT(*) FROM signups s WHERE s.shift_id = sh.id AND s.status = 'coming') AS filled
       FROM shifts sh WHERE sh.id = ? AND sh.org_id = ?`,
  )
    .bind(shiftId, org.id)
    .first<{ id: string; title: string; slots: number; filled: number }>();

  if (!shift) return { error: "That shift is no longer on the rota." };
  if (shift.filled >= shift.slots) {
    return {
      error: `${shift.title} filled up. There are usually others — have a look at the list.`,
    };
  }

  // Same cheerful reply either way; spam simply does not land on the rota.
  if (verdict.isSpam) {
    console.log(`[volunteer:dropped] score=${verdict.score} ${verdict.reasons.join("; ")}`);
    return { ok: `Thank you — you are down for ${shift.title}.` };
  }

  await recordFailure(env, "vol", ip, LIMITS.publicSignup);
  await env.DB.prepare(
    `INSERT INTO signups (id, org_id, shift_id, name, email, phone, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'coming', datetime('now'))`,
  )
    .bind(newId("sup"), org.id, shift.id, name, email || null, phone || null)
    .run();

  return {
    ok: `Thank you — you are down for ${shift.title}.${
      email ? " We will send you a reminder two days before." : ""
    }`,
  };
}

function shiftWhen(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt.replace(" ", "T") + "Z");
  const end = new Date(endsAt.replace(" ", "T") + "Z");
  const time = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${start.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })}, ${time(start)} to ${time(end)}`;
}

export default function PublicShifts() {
  const { org, shifts } = useLoaderData<typeof loader>();
  const result = useActionData<{ ok?: string; error?: string }>();
  const navigation = useNavigation();

  return (
    <main id="main" style={{ padding: "24px 0 64px" }}>
      <div className="wrap-narrow">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <Wordmark />
          <TextSizeControl />
        </div>

        <h1>Volunteer with {org.name}</h1>
        <p className="lead" style={{ marginTop: 16 }}>
          Pick a time that suits you. No account, no password, nothing to
          install — just your name.
        </p>

        {result?.ok && (
          <p className="form-ok" role="status" style={{ marginTop: 24 }}>
            {result.ok}
          </p>
        )}
        {result?.error && (
          <p className="form-error" role="alert" style={{ marginTop: 24 }}>
            {result.error}
          </p>
        )}

        <div className="stack" style={{ marginTop: 28 }}>
          {shifts.length === 0 && (
            <div className="empty">
              <h2 style={{ fontSize: "var(--t-h3)" }}>
                Nothing on the rota just now
              </h2>
              <p style={{ marginTop: 10 }}>
                Check back in a few days, or get in touch with {org.name}{" "}
                directly — they will be glad you asked.
              </p>
            </div>
          )}

          {shifts.map((shift) => {
            const open = Math.max(0, shift.slots - shift.filled);
            return (
              <div key={shift.id} className="card">
                <h2 style={{ fontSize: "var(--t-h3)" }}>{shift.title}</h2>
                <p style={{ marginTop: 8 }}>
                  {shiftWhen(shift.starts_at, shift.ends_at)}
                </p>
                <p
                  className="small"
                  style={{
                    marginTop: 6,
                    fontWeight: 700,
                    color: open > 0 ? "var(--green-deep)" : "var(--ink-faint)",
                  }}
                >
                  {open > 0
                    ? `${open} ${open === 1 ? "spot" : "spots"} still open`
                    : "This one is full"}
                </p>
                {shift.note && (
                  <p className="small" style={{ marginTop: 8 }}>
                    {shift.note}
                  </p>
                )}

                {open > 0 && (
                  <details style={{ marginTop: 16 }}>
                    <summary className="btn btn-primary btn-big btn-block">
                      I can come to this one
                    </summary>
                    <Form method="post" style={{ marginTop: 20 }}>
                      <input type="hidden" name="shiftId" value={shift.id} />
                      <input type="hidden" name="elapsed" value={12000} />
                      <div className="honeypot" aria-hidden="true">
                        <label htmlFor={`website-${shift.id}`}>Website</label>
                        <input
                          id={`website-${shift.id}`}
                          name="website"
                          type="text"
                          tabIndex={-1}
                          autoComplete="off"
                        />
                      </div>

                      <div className="field">
                        <label htmlFor={`name-${shift.id}`}>Your name</label>
                        <input
                          id={`name-${shift.id}`}
                          name="name"
                          type="text"
                          autoComplete="name"
                          required
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`email-${shift.id}`}>Your email</label>
                        <span className="hint">
                          Optional — but it is how we send you a reminder two
                          days before, and most people who miss a shift simply
                          forgot.
                        </span>
                        <input
                          id={`email-${shift.id}`}
                          name="email"
                          type="email"
                          autoComplete="email"
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`phone-${shift.id}`}>Your phone</label>
                        <span className="hint">
                          Optional. Only used if something changes on the day.
                        </span>
                        <input
                          id={`phone-${shift.id}`}
                          name="phone"
                          type="tel"
                          autoComplete="tel"
                        />
                      </div>
                      <button
                        type="submit"
                        className="btn btn-primary btn-big btn-block"
                        disabled={navigation.state === "submitting"}
                      >
                        Put me down
                      </button>
                    </Form>
                  </details>
                )}
              </div>
            );
          })}
        </div>

        <p className="small" style={{ marginTop: 40 }}>
          {org.name} keeps its rota with Laevo. Your name and contact details go
          to them and nowhere else — not sold, not shared, not used for
          anything but this shift.
        </p>
      </div>
    </main>
  );
}
