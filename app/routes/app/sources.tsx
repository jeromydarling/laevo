import { Form, Link, useActionData, useLoaderData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { ctx } from "~/lib/loader";
import { requireUser } from "~/lib/auth";
import { newId } from "~/lib/ids";
import { clampText, normalizePhone, formatPhone } from "~/lib/validate";

/**
 * Where the food comes from.
 *
 * Pantries are asked this every year — by a board, a grant application, or
 * whoever writes the thank-you letters — and it is normally reconstructed from
 * memory in an evening. It was already recorded on every delivery; it only
 * needed adding up, and then making correctable, because a misspelled shop
 * noticed in November was previously stuck that way forever.
 *
 * Sources are contacts with the donor role rather than a table of their own,
 * because the grocery manager who sets aside the dented cans is often already
 * in your book as something else.
 */
export async function loader({ context, request }: LoaderFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);
  const url = new URL(request.url);
  const from =
    clampText(url.searchParams.get("from"), 10) ||
    new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
  const to =
    clampText(url.searchParams.get("to"), 10) ||
    new Date().toISOString().slice(0, 10);

  const [sources, categories, untracked] = await Promise.all([
    env.DB.prepare(
      `SELECT c.id, c.last_name AS name, c.phone, c.email, c.notes, c.archived_at,
              COUNT(l.id) AS deliveries,
              COUNT(DISTINCT l.item_id) AS kinds,
              MAX(l.received_at) AS last_delivery
         FROM contacts c
         LEFT JOIN lots l
           ON l.source_contact_id = c.id
          AND date(l.received_at) BETWEEN ? AND ?
        WHERE c.org_id = ? AND c.roles LIKE '%donor%' AND c.merged_into IS NULL
        GROUP BY c.id
        ORDER BY c.archived_at IS NOT NULL, deliveries DESC, c.last_name`,
    )
      .bind(from, to, user.orgId)
      .all<{
        id: string;
        name: string;
        phone: string | null;
        email: string | null;
        notes: string | null;
        archived_at: string | null;
        deliveries: number;
        kinds: number;
        last_delivery: string | null;
      }>(),
    env.DB.prepare(
      `SELECT i.category, COUNT(*) AS deliveries
         FROM lots l JOIN items i ON i.id = l.item_id
        WHERE l.org_id = ? AND date(l.received_at) BETWEEN ? AND ?
        GROUP BY i.category ORDER BY deliveries DESC`,
    )
      .bind(user.orgId, from, to)
      .all<{ category: string; deliveries: number }>(),
    env.DB.prepare(
      `SELECT COUNT(*) AS n FROM lots
        WHERE org_id = ? AND date(received_at) BETWEEN ? AND ?
          AND source_contact_id IS NULL`,
    )
      .bind(user.orgId, from, to)
      .first<{ n: number }>(),
  ]);

  return {
    from,
    to,
    sources: sources.results ?? [],
    categories: categories.results ?? [],
    untracked: untracked?.n ?? 0,
    canEdit: user.role !== "volunteer",
  };
}

export async function action({ context, request }: ActionFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);
  if (user.role === "volunteer") {
    return { error: "Ask a member of staff to change this." };
  }

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const name = clampText(form.get("name"), 160);
  const sourceId = String(form.get("sourceId") ?? "");

  if (intent === "add") {
    if (!name) return { error: "A source needs a name — that is all." };
    const existing = await env.DB.prepare(
      `SELECT id FROM contacts WHERE org_id = ? AND roles LIKE '%donor%'
        AND lower(last_name) = lower(?) LIMIT 1`,
    )
      .bind(user.orgId, name)
      .first();
    if (existing) return { error: `${name} is already on the list.` };

    await env.DB.prepare(
      `INSERT INTO contacts (id, org_id, roles, first_name, last_name, phone, email, notes, created_at)
       VALUES (?, ?, 'donor', '', ?, ?, ?, ?, datetime('now'))`,
    )
      .bind(
        newId("don"),
        user.orgId,
        name,
        normalizePhone(form.get("phone")) || null,
        clampText(form.get("email"), 320).toLowerCase() || null,
        clampText(form.get("notes"), 1000) || null,
      )
      .run();
    return { saved: `${name} added.` };
  }

  if (intent === "update") {
    if (!name) return { error: "A source needs a name." };
    // The typed copy on past deliveries updates too, so correcting a spelling
    // fixes it everywhere instead of leaving two of them.
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE contacts SET last_name = ?, phone = ?, email = ?, notes = ?
          WHERE id = ? AND org_id = ? AND roles LIKE '%donor%'`,
      ).bind(
        name,
        normalizePhone(form.get("phone")) || null,
        clampText(form.get("email"), 320).toLowerCase() || null,
        clampText(form.get("notes"), 1000) || null,
        sourceId,
        user.orgId,
      ),
      env.DB.prepare(
        "UPDATE lots SET source_note = ? WHERE source_contact_id = ? AND org_id = ?",
      ).bind(name, sourceId, user.orgId),
    ]);
    return { saved: "Saved." };
  }

  if (intent === "archive" || intent === "reopen") {
    const archiving = intent === "archive";
    await env.DB.prepare(
      `UPDATE contacts SET archived_at = ${archiving ? "datetime('now')" : "NULL"}
        WHERE id = ? AND org_id = ? AND roles LIKE '%donor%'`,
    )
      .bind(sourceId, user.orgId)
      .run();
    return {
      saved: archiving
        ? "Retired. Past deliveries from them are untouched."
        : "Back on the list.",
      undo: archiving ? { intent: "reopen", sourceId } : null,
    };
  }

  if (intent === "merge") {
    // Two spellings of one shop. Deliveries move; nothing is deleted.
    const intoId = String(form.get("intoId") ?? "");
    if (!intoId || intoId === sourceId) {
      return { error: "Choose a different source to join it into." };
    }
    const [keep, drop] = await Promise.all([
      env.DB.prepare("SELECT id, last_name FROM contacts WHERE id = ? AND org_id = ?")
        .bind(intoId, user.orgId)
        .first<{ id: string; last_name: string }>(),
      env.DB.prepare("SELECT id, last_name FROM contacts WHERE id = ? AND org_id = ?")
        .bind(sourceId, user.orgId)
        .first<{ id: string; last_name: string }>(),
    ]);
    if (!keep || !drop) return { error: "One of those is no longer there." };

    await env.DB.batch([
      env.DB.prepare(
        `UPDATE lots SET source_contact_id = ?, source_note = ?
          WHERE source_contact_id = ? AND org_id = ?`,
      ).bind(keep.id, keep.last_name, drop.id, user.orgId),
      env.DB.prepare(
        `UPDATE contacts SET archived_at = datetime('now'), merged_into = ?
          WHERE id = ? AND org_id = ?`,
      ).bind(keep.id, drop.id, user.orgId),
    ]);
    return {
      saved: `${drop.last_name} joined into ${keep.last_name}. Every delivery moved across.`,
    };
  }

  return { error: "We did not understand that." };
}

interface Result {
  saved?: string;
  error?: string;
  undo?: { intent: string; sourceId: string } | null;
}

export default function Sources() {
  const data = useLoaderData<typeof loader>();
  const result = useActionData<Result>();
  const navigation = useNavigation();
  const busy = navigation.state === "submitting";

  const active = data.sources.filter((s) => !s.archived_at);
  const retired = data.sources.filter((s) => s.archived_at);
  const total = active.reduce((sum, s) => sum + s.deliveries, 0);

  return (
    <div className="wrap stack">
      <p className="back-link">
        <Link to="/app/more">‹ Everything else</Link>
      </p>
      <h1>Where the food comes from</h1>
      <p className="lead">
        Counted from the deliveries you recorded. Useful at the end of the year
        when somebody asks, and for the thank-you letters nobody enjoys writing
        from memory.
      </p>

      {result?.saved && (
        <div className="undo-bar" role="status">
          <span>{result.saved}</span>
          {result.undo && (
            <Form method="post">
              <input type="hidden" name="intent" value={result.undo.intent} />
              <input type="hidden" name="sourceId" value={result.undo.sourceId} />
              <button type="submit" className="btn btn-secondary">
                Undo
              </button>
            </Form>
          )}
        </div>
      )}
      {result?.error && (
        <p className="form-error" role="alert">
          {result.error}
        </p>
      )}

      <Form method="get" className="card">
        <div className="grid grid-2">
          <div className="field">
            <label htmlFor="from">From</label>
            <input id="from" name="from" type="date" defaultValue={data.from} />
          </div>
          <div className="field">
            <label htmlFor="to">To</label>
            <input id="to" name="to" type="date" defaultValue={data.to} />
          </div>
        </div>
        <button type="submit" className="btn btn-primary btn-big btn-block">
          Add it up
        </button>
      </Form>

      {data.canEdit && (
        <details className="card">
          <summary className="btn btn-primary btn-big btn-block">
            Add a source
          </summary>
          <Form method="post" style={{ marginTop: 20 }}>
            <input type="hidden" name="intent" value="add" />
            <div className="field">
              <label htmlFor="new-name">Who are they?</label>
              <span className="hint">
                A food bank, a shop, a school drive, a person. Whatever you would
                write on the thank-you card.
              </span>
              <input type="text" id="new-name" name="name" required />
            </div>
            <div className="field">
              <label htmlFor="new-phone">Phone</label>
              <span className="hint">Optional.</span>
              <input id="new-phone" name="phone" type="tel" />
            </div>
            <div className="field">
              <label htmlFor="new-email">Email</label>
              <span className="hint">Optional.</span>
              <input id="new-email" name="email" type="email" />
            </div>
            <div className="field">
              <label htmlFor="new-notes">Notes</label>
              <span className="hint">
                Who to ask for, when they do their clear-out, what they never
                have.
              </span>
              <textarea id="new-notes" name="notes" style={{ minHeight: 100 }} />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-big btn-block"
              disabled={busy}
            >
              Add them
            </button>
          </Form>
        </details>
      )}

      {active.length === 0 ? (
        <div className="empty">
          <h2 style={{ fontSize: "var(--t-h3)" }}>No sources yet</h2>
          <p style={{ marginTop: 10 }}>
            Add them here, or just type a name when you record a delivery and
            Laevo will start the list for you.
          </p>
          <p style={{ marginTop: 20 }}>
            <Link className="btn btn-primary btn-big" to="/app/shelf/receive">
              Record a delivery
            </Link>
          </p>
        </div>
      ) : (
        <>
          <div className="card">
            <h2 style={{ fontSize: "var(--t-h3)" }}>
              {total} deliveries from {active.length}{" "}
              {active.length === 1 ? "source" : "sources"}
            </h2>
            <p className="small" style={{ marginTop: 8 }}>
              Between {data.from} and {data.to}.
            </p>
          </div>

          <div className="stack">
            {active.map((source) => (
              <div key={source.id} className="card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                    alignItems: "baseline",
                  }}
                >
                  <h3 style={{ fontSize: "var(--t-h3)" }}>{source.name}</h3>
                  <p style={{ fontWeight: 800, color: "var(--green-deep)" }}>
                    {source.deliveries}{" "}
                    {source.deliveries === 1 ? "delivery" : "deliveries"}
                  </p>
                </div>
                <p className="small" style={{ marginTop: 6 }}>
                  {source.kinds} different item{source.kinds === 1 ? "" : "s"}
                  {source.last_delivery
                    ? ` · last one ${source.last_delivery.slice(0, 10)}`
                    : " · nothing in this period"}
                  {source.phone ? ` · ${formatPhone(source.phone)}` : ""}
                  {source.email ? ` · ${source.email}` : ""}
                </p>
                {source.notes && (
                  <p className="small" style={{ marginTop: 6 }}>
                    {source.notes}
                  </p>
                )}

                {data.canEdit && (
                  <details style={{ marginTop: 14 }}>
                    <summary className="btn btn-secondary btn-block">
                      Change or retire
                    </summary>

                    <Form method="post" style={{ marginTop: 20 }}>
                      <input type="hidden" name="intent" value="update" />
                      <input type="hidden" name="sourceId" value={source.id} />
                      <div className="field">
                        <label htmlFor={`n-${source.id}`}>Name</label>
                        <span className="hint">
                          Fixing a spelling here fixes it on every past delivery
                          too.
                        </span>
                        <input type="text"
                          id={`n-${source.id}`}
                          name="name"
                          defaultValue={source.name}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`p-${source.id}`}>Phone</label>
                        <input
                          id={`p-${source.id}`}
                          name="phone"
                          type="tel"
                          defaultValue={source.phone ?? ""}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`e-${source.id}`}>Email</label>
                        <input
                          id={`e-${source.id}`}
                          name="email"
                          type="email"
                          defaultValue={source.email ?? ""}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`no-${source.id}`}>Notes</label>
                        <textarea
                          id={`no-${source.id}`}
                          name="notes"
                          defaultValue={source.notes ?? ""}
                          style={{ minHeight: 90 }}
                        />
                      </div>
                      <button type="submit" className="btn btn-primary btn-block">
                        Save
                      </button>
                    </Form>

                    {active.length > 1 && (
                      <Form method="post" style={{ marginTop: 24 }}>
                        <input type="hidden" name="intent" value="merge" />
                        <input type="hidden" name="sourceId" value={source.id} />
                        <div className="field">
                          <label htmlFor={`m-${source.id}`}>
                            Same as another source?
                          </label>
                          <span className="hint">
                            Two spellings of one shop. Deliveries move across;
                            nothing is deleted.
                          </span>
                          <select
                            id={`m-${source.id}`}
                            name="intoId"
                            defaultValue=""
                          >
                            <option value="" disabled>
                              Join into…
                            </option>
                            {active
                              .filter((o) => o.id !== source.id)
                              .map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.name}
                                </option>
                              ))}
                          </select>
                        </div>
                        <button
                          type="submit"
                          className="btn btn-secondary btn-block"
                        >
                          Join them together
                        </button>
                      </Form>
                    )}

                    <Form method="post" style={{ marginTop: 24 }}>
                      <input type="hidden" name="intent" value="archive" />
                      <input type="hidden" name="sourceId" value={source.id} />
                      <button type="submit" className="btn btn-danger btn-block">
                        Retire this source
                      </button>
                      <p className="small" style={{ marginTop: 8 }}>
                        For a shop that closed. Past deliveries stay in your
                        totals, and you can undo it straight away.
                      </p>
                    </Form>
                  </details>
                )}
              </div>
            ))}
          </div>

          {data.categories.length > 0 && (
            <div className="card">
              <h2 style={{ fontSize: "var(--t-h3)" }}>What kind of food</h2>
              <ul className="stack" style={{ listStyle: "none", marginTop: 14 }}>
                {data.categories.map((category) => (
                  <li key={category.category}>
                    <strong>{category.category}</strong> — {category.deliveries}{" "}
                    {category.deliveries === 1 ? "delivery" : "deliveries"}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.untracked > 0 && (
            <div className="warn-line">
              {data.untracked}{" "}
              {data.untracked === 1 ? "delivery has" : "deliveries have"} no
              source recorded. Not a problem — but adding it as you go makes this
              page worth having.
            </div>
          )}
        </>
      )}

      {retired.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: "var(--t-h3)" }}>Retired</h2>
          <p className="small" style={{ marginTop: 8 }}>
            Kept so their deliveries stay in your history.
          </p>
          <ul className="stack" style={{ listStyle: "none", marginTop: 14 }}>
            {retired.map((source) => (
              <li
                key={source.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span>
                  {source.name}
                  <span className="row-sub">
                    {source.deliveries} deliveries in this period
                  </span>
                </span>
                {data.canEdit && (
                  <Form method="post">
                    <input type="hidden" name="intent" value="reopen" />
                    <input type="hidden" name="sourceId" value={source.id} />
                    <button type="submit" className="btn btn-quiet">
                      Bring back
                    </button>
                  </Form>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
