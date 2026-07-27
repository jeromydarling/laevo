import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { ctx } from "~/lib/loader";
import { requireUser } from "~/lib/auth";
import { newId } from "~/lib/ids";
import { clampText, toCount, toQuantity } from "~/lib/validate";
import { siteUrl } from "~/lib/env";

export async function loader({ context, request }: LoaderFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);

  const shifts = await env.DB.prepare(
    `SELECT sh.id, sh.title, sh.starts_at, sh.ends_at, sh.slots, sh.note,
            (SELECT COUNT(*) FROM signups s WHERE s.shift_id = sh.id AND s.status = 'coming') AS filled
       FROM shifts sh
      WHERE sh.org_id = ? AND sh.ends_at > datetime('now', '-60 days')
      ORDER BY sh.starts_at ASC LIMIT 80`,
  )
    .bind(user.orgId)
    .all<{
      id: string;
      title: string;
      starts_at: string;
      ends_at: string;
      slots: number;
      note: string | null;
      filled: number;
    }>();

  const ids = (shifts.results ?? []).map((s) => s.id);
  const signups = ids.length
    ? await env.DB.prepare(
        `SELECT id, shift_id, name, status, hours FROM signups
          WHERE org_id = ? AND status <> 'cancelled'
            AND shift_id IN (${ids.map(() => "?").join(",")})
          ORDER BY created_at`,
      )
        .bind(user.orgId, ...ids)
        .all<{ id: string; shift_id: string; name: string; status: string; hours: number | null }>()
    : { results: [] as Array<{ id: string; shift_id: string; name: string; status: string; hours: number | null }> };

  const hours = await env.DB.prepare(
    `SELECT COALESCE(SUM(hours), 0) AS total,
            COUNT(*) AS sessions
       FROM signups
      WHERE org_id = ? AND status = 'came'
        AND created_at >= datetime('now', '-365 days')`,
  )
    .bind(user.orgId)
    .first<{ total: number; sessions: number }>();

  return {
    shifts: shifts.results ?? [],
    signups: signups.results ?? [],
    publicLink: `${siteUrl(env)}/v/${user.orgSlug}`,
    canEdit: user.role !== "volunteer",
    hoursThisYear: Math.round((hours?.total ?? 0) * 10) / 10,
    sessionsThisYear: hours?.sessions ?? 0,
  };
}

export async function action({ context, request }: ActionFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "add") {
    const title = clampText(form.get("title"), 120);
    const date = clampText(form.get("date"), 10);
    const start = clampText(form.get("start"), 5) || "09:00";
    const end = clampText(form.get("end"), 5) || "12:00";
    if (!title || !date) {
      return { error: "We need a name for the shift and a date." };
    }
    const site = await env.DB.prepare(
      "SELECT id FROM sites WHERE org_id = ? ORDER BY created_at LIMIT 1",
    )
      .bind(user.orgId)
      .first<{ id: string }>();

    await env.DB.prepare(
      `INSERT INTO shifts (id, org_id, site_id, title, starts_at, ends_at, slots, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        newId("shf"),
        user.orgId,
        site?.id ?? null,
        title,
        `${date} ${start}:00`,
        `${date} ${end}:00`,
        toCount(form.get("slots"), 200) || 4,
        clampText(form.get("note"), 400) || null,
      )
      .run();
    return { saved: `${title} added to the rota.` };
  }

  if (intent === "attendance") {
    // Marking who came is also how hours get logged, because asking a
    // coordinator to do those as two separate jobs means the second one never
    // happens. In-kind hours are real match money on a grant application.
    const signupId = String(form.get("signupId") ?? "");
    const came = String(form.get("came") ?? "") === "yes";
    const hours = came ? toQuantity(form.get("hours"), 24) : null;
    await env.DB.prepare(
      "UPDATE signups SET status = ?, hours = ? WHERE id = ? AND org_id = ?",
    )
      .bind(came ? "came" : "no_show", hours, signupId, user.orgId)
      .run();
    return { saved: came ? "Marked as came, thank you." : "Marked as did not come." };
  }

  if (intent === "remove-signup") {
    await env.DB.prepare(
      "UPDATE signups SET status = 'cancelled' WHERE id = ? AND org_id = ?",
    )
      .bind(String(form.get("signupId") ?? ""), user.orgId)
      .run();
    return { saved: "Taken off the rota." };
  }

  return { error: "We did not understand that." };
}

function shiftWhen(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt.replace(" ", "T") + "Z");
  const end = new Date(endsAt.replace(" ", "T") + "Z");
  const day = start.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const time = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day}, ${time(start)} to ${time(end)}`;
}

export default function Shifts() {
  const { shifts, signups, publicLink, canEdit, hoursThisYear, sessionsThisYear } =
    useLoaderData<typeof loader>();
  const now = Date.now();
  const result = useActionData<{ saved?: string; error?: string }>();
  const navigation = useNavigation();

  return (
    <div className="wrap stack">
      <h1>The rota</h1>

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

      <div className="card">
        <h2 style={{ fontSize: "var(--t-h3)" }}>Your signup link</h2>
        <p style={{ marginTop: 10 }}>
          Put this in a newsletter, a group chat, or on a poster. Volunteers
          claim their own shift — no account, no password, nothing to install.
        </p>
        <p
          style={{
            marginTop: 12,
            padding: "14px 16px",
            background: "var(--green-wash)",
            borderRadius: "var(--radius-sm)",
            wordBreak: "break-all",
            fontWeight: 700,
          }}
        >
          {publicLink}
        </p>
        <p className="small" style={{ marginTop: 10 }}>
          Everyone who signs up with an email address gets a reminder two days
          before. That one thing does more for attendance than anything else in
          here.
        </p>
      </div>

      {sessionsThisYear > 0 && (
        <div className="card">
          <h2 style={{ fontSize: "var(--t-h3)" }}>
            {hoursThisYear} volunteer hours this year
          </h2>
          <p style={{ marginTop: 8 }}>
            Across {sessionsThisYear} shift{sessionsThisYear === 1 ? "" : "s"}{" "}
            somebody turned up for.
          </p>
          <p className="small" style={{ marginTop: 8 }}>
            Worth putting on a grant application — most funders count in-kind
            volunteer hours as match, and this is the number they ask for.
          </p>
        </div>
      )}

      {shifts.length === 0 ? (
        <div className="empty">
          <h2 style={{ fontSize: "var(--t-h3)" }}>Nothing on the rota yet</h2>
          <p style={{ marginTop: 10 }}>
            Add your next distribution day and share the link above.
          </p>
        </div>
      ) : (
        <div className="stack">
          {shifts.map((shift) => {
            const people = signups.filter((s) => s.shift_id === shift.id);
            const open = Math.max(0, shift.slots - shift.filled);
            const isPast =
              new Date(shift.ends_at.replace(" ", "T") + "Z").getTime() < now;
            // Pre-filled with the length of the shift, because that is what
            // most people gave and retyping it forty times is how a coordinator
            // stops bothering.
            const shiftHours =
              Math.round(
                ((new Date(shift.ends_at.replace(" ", "T") + "Z").getTime() -
                  new Date(shift.starts_at.replace(" ", "T") + "Z").getTime()) /
                  3_600_000) *
                  2,
              ) / 2;
            return (
              <div key={shift.id} className="card">
                <h2 style={{ fontSize: "var(--t-h3)" }}>{shift.title}</h2>
                <p style={{ marginTop: 6 }}>
                  {shiftWhen(shift.starts_at, shift.ends_at)}
                </p>
                <p
                  className="small"
                  style={{
                    marginTop: 6,
                    color: open > 0 ? "var(--warn)" : "var(--green-deep)",
                    fontWeight: 700,
                  }}
                >
                  {shift.filled} of {shift.slots} filled
                  {open > 0 ? ` — ${open} still open` : " — full"}
                </p>
                {shift.note && (
                  <p className="small" style={{ marginTop: 8 }}>
                    {shift.note}
                  </p>
                )}

                {people.length > 0 && (
                  <ul
                    className="stack"
                    style={{ listStyle: "none", marginTop: 14 }}
                  >
                    {people.map((person) => (
                      <li
                        key={person.id}
                        style={{
                          borderTop: "2px solid var(--line)",
                          paddingTop: 12,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={{ fontWeight: 700 }}>
                            {person.name}
                            {person.status === "came" && (
                              <span className="row-sub">
                                Came
                                {person.hours
                                  ? ` · ${person.hours} hours`
                                  : ""}
                              </span>
                            )}
                            {person.status === "no_show" && (
                              <span className="row-sub">Did not come</span>
                            )}
                          </span>

                          {canEdit && person.status === "coming" && !isPast && (
                            <Form method="post">
                              <input
                                type="hidden"
                                name="intent"
                                value="remove-signup"
                              />
                              <input
                                type="hidden"
                                name="signupId"
                                value={person.id}
                              />
                              <button type="submit" className="btn btn-quiet">
                                Take off
                              </button>
                            </Form>
                          )}
                        </div>

                        {/* Attendance only appears once the shift has been and
                            gone. Asking before then is asking somebody to
                            predict the future. */}
                        {canEdit && isPast && person.status === "coming" && (
                          <Form
                            method="post"
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "flex-end",
                              flexWrap: "wrap",
                              marginTop: 10,
                            }}
                          >
                            <input
                              type="hidden"
                              name="intent"
                              value="attendance"
                            />
                            <input
                              type="hidden"
                              name="signupId"
                              value={person.id}
                            />
                            <div
                              className="field"
                              style={{ marginBottom: 0, flex: "0 1 140px" }}
                            >
                              <label htmlFor={`h-${person.id}`}>Hours</label>
                              <input
                                id={`h-${person.id}`}
                                name="hours"
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step="0.5"
                                defaultValue={shiftHours}
                              />
                            </div>
                            <button
                              type="submit"
                              name="came"
                              value="yes"
                              className="btn btn-primary"
                            >
                              They came
                            </button>
                            <button
                              type="submit"
                              name="came"
                              value="no"
                              className="btn btn-secondary"
                            >
                              They did not
                            </button>
                          </Form>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canEdit && (
        <details className="card">
          <summary className="btn btn-primary btn-big btn-block">
            Add a shift
          </summary>
          <Form method="post" style={{ marginTop: 20 }}>
            <input type="hidden" name="intent" value="add" />
            <div className="field">
              <label htmlFor="title">What is it?</label>
              <input
                id="title"
                name="title"
                type="text"
                placeholder="Saturday distribution"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="date">Which day?</label>
              <input id="date" name="date" type="date" required />
            </div>
            <div className="grid grid-2">
              <div className="field">
                <label htmlFor="start">Starts</label>
                <input id="start" name="start" type="time" defaultValue="09:00" />
              </div>
              <div className="field">
                <label htmlFor="end">Ends</label>
                <input id="end" name="end" type="time" defaultValue="12:00" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="slots">How many people do you need?</label>
              <input id="slots" name="slots" type="number" min={1} defaultValue={4} />
            </div>
            <div className="field">
              <label htmlFor="note">Anything they should know</label>
              <span className="hint">
                Optional. "Wear closed shoes" or "you will need a car".
              </span>
              <input id="note" name="note" type="text" />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-big btn-block"
              disabled={navigation.state === "submitting"}
            >
              Add it to the rota
            </button>
          </Form>
        </details>
      )}
    </div>
  );
}
