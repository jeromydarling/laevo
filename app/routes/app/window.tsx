import { Form, Link, useActionData, useLoaderData, useNavigation, useSearchParams } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { ctx } from "~/lib/loader";
import { requireUser } from "~/lib/auth";
import { newId } from "~/lib/ids";
import { clampText, formatPhone, normalizePhone } from "~/lib/validate";

export async function loader({ context, request }: LoaderFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);
  const url = new URL(request.url);
  const q = clampText(url.searchParams.get("q"), 60);

  if (!q) return { q: "", results: [], searched: false };

  // One box, three ways of finding somebody: a bit of a name, a phone number,
  // or the short code on the card they carry.
  const digits = normalizePhone(q);
  const like = `%${q.toLowerCase()}%`;
  const results = await env.DB.prepare(
    `SELECT id, first_name, last_name, phone, household_size, needs, card_code,
            last_visit_at, visit_count
       FROM contacts
      WHERE org_id = ?
        AND archived_at IS NULL
        AND roles LIKE '%neighbor%'
        AND (
          lower(first_name || ' ' || last_name) LIKE ?
          OR lower(last_name || ' ' || first_name) LIKE ?
          OR (? <> '' AND phone LIKE ?)
          OR upper(card_code) = upper(?)
        )
      ORDER BY last_name, first_name
      LIMIT 12`,
  )
    .bind(user.orgId, like, like, digits, `%${digits}%`, q)
    .all<{
      id: string;
      first_name: string;
      last_name: string;
      phone: string | null;
      household_size: number | null;
      needs: string | null;
      card_code: string | null;
      last_visit_at: string | null;
      visit_count: number;
    }>();

  return { q, results: results.results ?? [], searched: true };
}

export async function action({ context, request }: ActionFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);
  const form = await request.formData();
  const contactId = String(form.get("contactId") ?? "");

  const contact = await env.DB.prepare(
    `SELECT id, first_name, last_name, household_size, adults, children, seniors, visit_count
       FROM contacts WHERE id = ? AND org_id = ? LIMIT 1`,
  )
    .bind(contactId, user.orgId)
    .first<{
      id: string;
      first_name: string;
      last_name: string;
      household_size: number | null;
      adults: number | null;
      children: number | null;
      seniors: number | null;
      visit_count: number;
    }>();

  if (!contact) {
    return { error: "We could not find that household. Try the search again." };
  }

  const site = await env.DB.prepare(
    "SELECT id FROM sites WHERE org_id = ? ORDER BY created_at LIMIT 1",
  )
    .bind(user.orgId)
    .first<{ id: string }>();

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO visits (id, org_id, contact_id, site_id, visited_at, household_size,
                           adults, children, seniors, first_visit, recorded_by)
       VALUES (?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?, ?)`,
    ).bind(
      newId("vst"),
      user.orgId,
      contact.id,
      site?.id ?? null,
      contact.household_size,
      contact.adults,
      contact.children,
      contact.seniors,
      contact.visit_count === 0 ? 1 : 0,
      user.id,
    ),
    env.DB.prepare(
      `UPDATE contacts
          SET last_visit_at = datetime('now'),
              visit_count = visit_count + 1,
              first_visit_at = COALESCE(first_visit_at, datetime('now'))
        WHERE id = ? AND org_id = ?`,
    ).bind(contact.id, user.orgId),
  ]);

  return {
    recorded: `${contact.first_name} ${contact.last_name}`.trim(),
  };
}

function sinceLabel(sqlDate: string | null): string {
  if (!sqlDate) return "First time here";
  const days = Math.floor(
    (Date.now() - new Date(sqlDate.replace(" ", "T") + "Z").getTime()) /
      86_400_000,
  );
  if (days <= 0) return "Already been in today";
  if (days === 1) return "Last in yesterday";
  if (days < 30) return `Last in ${days} days ago`;
  const months = Math.round(days / 30);
  return `Last in about ${months} ${months === 1 ? "month" : "months"} ago`;
}

export default function Window() {
  const { q, results, searched } = useLoaderData<typeof loader>();
  const result = useActionData<{ recorded?: string; error?: string }>();
  const navigation = useNavigation();
  const [params] = useSearchParams();

  return (
    <div className="wrap stack">
      <h1>Who is at the window?</h1>

      {result?.recorded && (
        <p className="form-ok" role="status">
          Recorded — {result.recorded} has been in today. That is everything;
          you can go back to the queue.
        </p>
      )}
      {result?.error && (
        <p className="form-error" role="alert">
          {result.error}
        </p>
      )}

      <Form method="get" className="card">
        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="q">A name, a phone number, or their card code</label>
          <span className="hint">
            Three letters is usually enough. It does not matter which name you
            type first.
          </span>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            autoComplete="off"
            enterKeyHint="search"
            autoFocus
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary btn-big btn-block"
          disabled={navigation.state === "loading"}
        >
          {navigation.state === "loading" ? "Looking…" : "Look them up"}
        </button>
      </Form>

      {searched && results.length === 0 && (
        <div className="empty">
          <h2 style={{ fontSize: "var(--t-h3)" }}>Nobody by that name yet</h2>
          <p style={{ marginTop: 10 }}>
            They may be new, or the name might be spelled differently. Try just
            the first few letters — or add them, which takes one screen.
          </p>
          <p style={{ marginTop: 20 }}>
            <Link
              className="btn btn-primary btn-big"
              to={`/app/neighbors/new?name=${encodeURIComponent(params.get("q") ?? "")}`}
            >
              Add this household
            </Link>
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="stack">
          <h2 style={{ fontSize: "var(--t-h3)" }}>
            {results.length === 1 ? "One match" : `${results.length} matches`}
          </h2>

          {results.map((person) => (
            <div key={person.id} className="card">
              <h3 style={{ fontSize: "var(--t-h3)" }}>
                {person.first_name} {person.last_name}
              </h3>
              <p className="small" style={{ marginTop: 6 }}>
                {person.household_size
                  ? `${person.household_size} in the household`
                  : "Household size not recorded"}
                {person.phone ? ` · ${formatPhone(person.phone)}` : ""}
                {person.card_code ? ` · card ${person.card_code}` : ""}
              </p>
              <p className="small">{sinceLabel(person.last_visit_at)}</p>

              {person.needs && (
                <p className="warn-line" style={{ marginTop: 12 }}>
                  {person.needs}
                </p>
              )}

              <Form method="post" style={{ marginTop: 16 }}>
                <input type="hidden" name="contactId" value={person.id} />
                <button
                  type="submit"
                  className="btn btn-primary btn-big btn-block"
                  disabled={navigation.state === "submitting"}
                >
                  Record a visit
                </button>
              </Form>

              <p style={{ marginTop: 12 }}>
                <Link to={`/app/neighbors/${person.id}`}>
                  Open their record
                </Link>
              </p>
            </div>
          ))}

          <p>
            <Link className="btn btn-secondary btn-block" to="/app/neighbors/new">
              None of these — add a new household
            </Link>
          </p>
        </div>
      )}

      {!searched && (
        <div className="card">
          <h2 style={{ fontSize: "var(--t-h3)" }}>If the queue is long</h2>
          <p style={{ marginTop: 10 }}>
            Serve everybody first and record afterwards. Nothing here needs to
            happen while somebody is standing in front of you, and nothing in
            Laevo stands between a person and a bag of groceries.
          </p>
        </div>
      )}
    </div>
  );
}
