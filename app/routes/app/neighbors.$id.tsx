import { Form, Link, useActionData, useLoaderData, useNavigation, useSearchParams } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { ctx } from "~/lib/loader";
import { requireUser } from "~/lib/auth";
import { newId } from "~/lib/ids";
import { clampText, toCount, formatPhone, normalizePhone } from "~/lib/validate";

export async function loader({ context, request, params }: LoaderFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);

  const [person, visits, events] = await Promise.all([
    env.DB.prepare(
      `SELECT * FROM contacts WHERE id = ? AND org_id = ? LIMIT 1`,
    )
      .bind(params.id, user.orgId)
      .first<Record<string, string | number | null>>(),
    env.DB.prepare(
      `SELECT id, visited_at, household_size, first_visit
         FROM visits WHERE contact_id = ? AND org_id = ?
        ORDER BY visited_at DESC LIMIT 25`,
    )
      .bind(params.id, user.orgId)
      .all<{
        id: string;
        visited_at: string;
        household_size: number | null;
        first_visit: number;
      }>(),
    env.DB.prepare(
      `SELECT summary, created_at FROM events
        WHERE subject_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 10`,
    )
      .bind(params.id, user.orgId)
      .all<{ summary: string; created_at: string }>(),
  ]);

  if (!person) {
    throw new Response("That household is not in your records.", { status: 404 });
  }

  return {
    person,
    visits: visits.results ?? [],
    events: events.results ?? [],
    canEdit: user.role !== "volunteer",
  };
}

export async function action({ context, request, params }: ActionFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "visit") {
    const person = await env.DB.prepare(
      `SELECT household_size, adults, children, seniors, visit_count
         FROM contacts WHERE id = ? AND org_id = ?`,
    )
      .bind(params.id, user.orgId)
      .first<{
        household_size: number | null;
        adults: number | null;
        children: number | null;
        seniors: number | null;
        visit_count: number;
      }>();
    if (!person) return { error: "That household is not in your records." };

    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO visits (id, org_id, contact_id, visited_at, household_size,
                             adults, children, seniors, first_visit, recorded_by)
         VALUES (?, ?, ?, datetime('now'), ?, ?, ?, ?, ?, ?)`,
      ).bind(
        newId("vst"),
        user.orgId,
        params.id,
        person.household_size,
        person.adults,
        person.children,
        person.seniors,
        person.visit_count === 0 ? 1 : 0,
        user.id,
      ),
      env.DB.prepare(
        `UPDATE contacts SET last_visit_at = datetime('now'), visit_count = visit_count + 1,
                first_visit_at = COALESCE(first_visit_at, datetime('now'))
          WHERE id = ? AND org_id = ?`,
      ).bind(params.id, user.orgId),
    ]);
    return { saved: "Visit recorded." };
  }

  if (intent === "update") {
    const adults = toCount(form.get("adults"), 30);
    const children = toCount(form.get("children"), 30);
    const seniors = toCount(form.get("seniors"), 30);
    await env.DB.prepare(
      `UPDATE contacts
          SET first_name = ?, last_name = ?, phone = ?, needs = ?, notes = ?,
              adults = ?, children = ?, seniors = ?, household_size = ?
        WHERE id = ? AND org_id = ?`,
    )
      .bind(
        clampText(form.get("firstName"), 80),
        clampText(form.get("lastName"), 80),
        normalizePhone(form.get("phone")) || null,
        clampText(form.get("needs"), 400) || null,
        clampText(form.get("notes"), 2000) || null,
        adults || null,
        children || null,
        seniors || null,
        adults + children + seniors || null,
        params.id,
        user.orgId,
      )
      .run();
    return { saved: "Saved." };
  }

  if (intent === "forget") {
    // Somebody asked to be removed. Their details go; the counts that past
    // reports were built on stay correct.
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE contacts
            SET first_name = 'Removed', last_name = 'at their request',
                phone = NULL, email = NULL, dob = NULL, address_line = NULL,
                city = NULL, zip = NULL, needs = NULL, notes = NULL,
                card_code = NULL, unsub_token = NULL,
                archived_at = datetime('now')
          WHERE id = ? AND org_id = ?`,
      ).bind(params.id, user.orgId),
      env.DB.prepare(
        `INSERT INTO events (id, org_id, kind, subject_id, summary, actor_user_id)
         VALUES (?, ?, 'neighbor_forgotten', ?, 'Personal details removed at their request; visit counts kept', ?)`,
      ).bind(newId("evt"), user.orgId, params.id, user.id),
    ]);
    return { saved: "Their details have been removed. Your report totals are unchanged." };
  }

  return { error: "We did not understand that." };
}

function when(sqlDate: string): string {
  return new Date(sqlDate.replace(" ", "T") + "Z").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function NeighborDetail() {
  const { person, visits, events, canEdit } = useLoaderData<typeof loader>();
  const result = useActionData<{ saved?: string; error?: string }>();
  const navigation = useNavigation();
  const [params] = useSearchParams();
  const justAdded = params.get("added") === "1";

  const str = (key: string) => (person[key] == null ? "" : String(person[key]));
  const num = (key: string) => (person[key] == null ? 0 : Number(person[key]));

  return (
    <div className="wrap stack">
      <p>
        <Link to="/app/neighbors">‹ All neighbors</Link>
      </p>

      <h1>
        {str("first_name")} {str("last_name")}
      </h1>

      {justAdded && (
        <p className="form-ok" role="status">
          Added. Their card code is <strong>{str("card_code")}</strong> — write
          it on a card and they can be found in one go next time.
        </p>
      )}
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

      {str("needs") && <p className="warn-line">{str("needs")}</p>}

      <div className="stat-row">
        <div className="stat">
          <span className="num">{num("household_size") || "—"}</span>
          <span className="lbl">In the household</span>
        </div>
        <div className="stat">
          <span className="num">{num("visit_count")}</span>
          <span className="lbl">Visits recorded</span>
        </div>
        <div className="stat">
          <span className="num">{str("card_code") || "—"}</span>
          <span className="lbl">Card code</span>
        </div>
        <div className="stat">
          <span className="num" style={{ fontSize: "var(--t-h3)" }}>
            {str("phone") ? formatPhone(str("phone")) : "—"}
          </span>
          <span className="lbl">Phone</span>
        </div>
      </div>

      {!str("archived_at") && (
        <Form method="post">
          <input type="hidden" name="intent" value="visit" />
          <button
            type="submit"
            className="btn btn-primary btn-big btn-block"
            disabled={navigation.state === "submitting"}
          >
            Record a visit today
          </button>
        </Form>
      )}

      <div className="card">
        <h2 style={{ fontSize: "var(--t-h3)" }}>Visits</h2>
        {visits.length === 0 ? (
          <p style={{ marginTop: 12 }}>Nothing recorded yet.</p>
        ) : (
          <ul className="stack" style={{ listStyle: "none", marginTop: 12 }}>
            {visits.map((visit) => (
              <li key={visit.id}>
                {when(visit.visited_at)}
                {visit.household_size ? ` · ${visit.household_size} in the household` : ""}
                {visit.first_visit ? " · first visit" : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

      {canEdit && !str("archived_at") && (
        <details className="card">
          <summary
            className="btn btn-secondary btn-block"
            style={{ marginBottom: 4 }}
          >
            Change their details
          </summary>

          <Form method="post" style={{ marginTop: 20 }}>
            <input type="hidden" name="intent" value="update" />
            <div className="field">
              <label htmlFor="firstName">First name</label>
              <input id="firstName" name="firstName" defaultValue={str("first_name")} />
            </div>
            <div className="field">
              <label htmlFor="lastName">Last name</label>
              <input id="lastName" name="lastName" defaultValue={str("last_name")} />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" type="tel" defaultValue={str("phone")} />
            </div>
            <div className="grid grid-3">
              <div className="field">
                <label htmlFor="adults">Adults 18–59</label>
                <input id="adults" name="adults" type="number" min={0} defaultValue={num("adults")} />
              </div>
              <div className="field">
                <label htmlFor="children">Children under 18</label>
                <input id="children" name="children" type="number" min={0} defaultValue={num("children")} />
              </div>
              <div className="field">
                <label htmlFor="seniors">Adults 60+</label>
                <input id="seniors" name="seniors" type="number" min={0} defaultValue={num("seniors")} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="needs">Anything they cannot eat or cook</label>
              <input id="needs" name="needs" defaultValue={str("needs")} />
            </div>
            <div className="field">
              <label htmlFor="notes">Notes</label>
              <textarea id="notes" name="notes" defaultValue={str("notes")} />
            </div>
            <button type="submit" className="btn btn-primary btn-big btn-block">
              Save changes
            </button>
          </Form>

          <div style={{ marginTop: 32, paddingTop: 24, borderTop: "2px solid var(--line)" }}>
            <h3 style={{ color: "var(--danger)" }}>If they ask to be removed</h3>
            <p className="small" style={{ marginTop: 8 }}>
              This deletes their name and contact details permanently. The
              visit counts your past reports were built on stay correct, so
              nothing you have already filed becomes wrong. It cannot be undone.
            </p>
            <Form
              method="post"
              style={{ marginTop: 16 }}
              onSubmit={(e) => {
                if (
                  !confirm(
                    "Remove this person's name and contact details permanently? Visit counts will be kept so your reports stay correct.",
                  )
                ) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="intent" value="forget" />
              <button type="submit" className="btn btn-danger btn-block">
                Remove their details
              </button>
            </Form>
          </div>
        </details>
      )}

      {events.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: "var(--t-h3)" }}>History</h2>
          <ul className="stack" style={{ listStyle: "none", marginTop: 12 }}>
            {events.map((event, i) => (
              <li key={i} className="small">
                {when(event.created_at)} — {event.summary}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
