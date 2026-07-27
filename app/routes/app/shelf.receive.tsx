import { Form, Link, useActionData, useLoaderData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { ctx } from "~/lib/loader";
import { requireUser } from "~/lib/auth";
import { newId } from "~/lib/ids";
import { clampText, toQuantity } from "~/lib/validate";
import { findOrCreateSource } from "~/lib/sources";

export async function loader({ context, request }: LoaderFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);

  const [items, sources, sites] = await Promise.all([
    env.DB.prepare(
      `SELECT id, name, unit, category FROM items
        WHERE org_id = ? AND archived_at IS NULL ORDER BY category, name`,
    )
      .bind(user.orgId)
      .all<{ id: string; name: string; unit: string; category: string }>(),
    env.DB.prepare(
      `SELECT id, last_name AS name FROM contacts
        WHERE org_id = ? AND roles LIKE '%donor%'
          AND archived_at IS NULL AND merged_into IS NULL
        ORDER BY last_name LIMIT 100`,
    )
      .bind(user.orgId)
      .all<{ id: string; name: string }>(),
    env.DB.prepare(
      "SELECT id, name FROM sites WHERE org_id = ? AND archived_at IS NULL ORDER BY created_at",
    )
      .bind(user.orgId)
      .all<{ id: string; name: string }>(),
  ]);

  return {
    items: items.results ?? [],
    sources: sources.results ?? [],
    sites: sites.results ?? [],
  };
}

export async function action({ context, request }: ActionFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);
  const form = await request.formData();

  if (String(form.get("intent") ?? "") === "undo") {
    const lotId = String(form.get("lotId") ?? "");
    await env.DB.prepare("DELETE FROM lots WHERE id = ? AND org_id = ?")
      .bind(lotId, user.orgId)
      .run();
    return { saved: "Taken back off the shelf." };
  }

  const itemId = String(form.get("itemId") ?? "");
  const quantity = toQuantity(form.get("quantity"), 1000000);
  const expiresAt = clampText(form.get("expiresAt"), 10);
  const chosenSourceId = String(form.get("sourceId") ?? "");
  const typedSource = clampText(form.get("source"), 160);

  if (!itemId || quantity <= 0) {
    return {
      error:
        "We need to know which item it is and how much came in. Everything else is optional.",
    };
  }

  const item = await env.DB.prepare(
    "SELECT name, unit FROM items WHERE id = ? AND org_id = ?",
  )
    .bind(itemId, user.orgId)
    .first<{ name: string; unit: string }>();
  if (!item) return { error: "We could not find that item on your shelf." };

  const chosenSite = clampText(form.get("siteId"), 40);
  const site = chosenSite
    ? await env.DB.prepare("SELECT id FROM sites WHERE id = ? AND org_id = ?")
        .bind(chosenSite, user.orgId)
        .first<{ id: string }>()
    : await env.DB.prepare(
        "SELECT id FROM sites WHERE org_id = ? AND archived_at IS NULL ORDER BY created_at LIMIT 1",
      )
        .bind(user.orgId)
        .first<{ id: string }>();

  // A chosen source wins; otherwise a typed name starts a new record, because
  // the moment somebody is holding the delivery note is the moment they know.
  let source: { id: string; name: string } | null = null;
  if (chosenSourceId) {
    source = await env.DB.prepare(
      "SELECT id, last_name AS name FROM contacts WHERE id = ? AND org_id = ?",
    )
      .bind(chosenSourceId, user.orgId)
      .first<{ id: string; name: string }>();
  } else if (typedSource) {
    source = await findOrCreateSource(env, user.orgId, typedSource);
  }

  const lotId = newId("lot");
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO lots (id, org_id, item_id, site_id, quantity, received_at, expires_at, source_contact_id, source_note)
       VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?, ?)`,
    ).bind(
      lotId,
      user.orgId,
      itemId,
      site?.id ?? null,
      quantity,
      expiresAt || null,
      source?.id ?? null,
      source?.name ?? null,
    ),
    env.DB.prepare(
      `INSERT INTO events (id, org_id, kind, subject_id, summary, actor_user_id)
       VALUES (?, ?, 'delivery_received', ?, ?, ?)`,
    ).bind(
      newId("evt"),
      user.orgId,
      itemId,
      `${quantity} ${item.unit} of ${item.name} received${source ? ` from ${source.name}` : ""}`,
      user.id,
    ),
  ]);

  return {
    saved: `${quantity} ${item.unit} of ${item.name} added to the shelf.`,
    // Recorded against the wrong item or twice by mistake — one press away.
    undoLotId: lotId,
  };
}

export default function Receive() {
  const { items, sources, sites } = useLoaderData<typeof loader>();
  const result = useActionData<{
    saved?: string;
    error?: string;
    undoLotId?: string;
  }>();
  const navigation = useNavigation();

  return (
    <div className="wrap stack">
      <p className="back-link">
        <Link to="/app/shelf">‹ The shelf</Link>
      </p>
      <h1>Record a delivery</h1>
      <p className="lead">
        One item at a time. If you do not know a date, leave it blank — we would
        rather have no date than a made-up one.
      </p>

      {result?.saved && (
        <div className="undo-bar" role="status">
          <span>{result.saved}</span>
          {result.undoLotId && (
            <Form method="post">
              <input type="hidden" name="intent" value="undo" />
              <input type="hidden" name="lotId" value={result.undoLotId} />
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

      {items.length === 0 ? (
        <div className="empty">
          <h2 style={{ fontSize: "var(--t-h3)" }}>Nothing on the shelf yet</h2>
          <p style={{ marginTop: 10 }}>
            Add a few items first and then come back to record what came in.
          </p>
          <p style={{ marginTop: 20 }}>
            <Link className="btn btn-primary btn-big" to="/app/shelf">
              Set up the shelf
            </Link>
          </p>
        </div>
      ) : (
        <Form method="post" className="card">
          <div className="field">
            <label htmlFor="itemId">What came in?</label>
            <select id="itemId" name="itemId" required defaultValue="">
              <option value="" disabled>
                Choose an item
              </option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.unit})
                </option>
              ))}
            </select>
          </div>

          {sites.length > 1 && (
            <div className="field">
              <label htmlFor="siteId">Which location?</label>
              <select id="siteId" name="siteId">
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="field">
            <label htmlFor="quantity">How much?</label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="expiresAt">Date on the box</label>
            <span className="hint">
              Optional. If it is blank we simply will not warn you about this
              lot.
            </span>
            <input id="expiresAt" name="expiresAt" type="date" />
          </div>

          <div className="field">
            <label htmlFor="sourceId">Where did it come from?</label>
            <span className="hint">
              Optional, and useful at the end of the year when somebody asks.
            </span>
            <select id="sourceId" name="sourceId" defaultValue="">
              <option value="">Somewhere new, or not recorded</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="source">…or type a new one</label>
            <span className="hint">
              Only used if you left the list above alone. It gets added to your
              sources so it is there next time.
            </span>
            <input id="source" name="source" type="text" autoComplete="off" />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-big btn-block"
            disabled={navigation.state === "submitting"}
          >
            {navigation.state === "submitting" ? "Saving…" : "Add it to the shelf"}
          </button>
        </Form>
      )}
    </div>
  );
}
