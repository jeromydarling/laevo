import { Form, Link, useActionData, useLoaderData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { ctx } from "~/lib/loader";
import { requireUser } from "~/lib/auth";
import { newId } from "~/lib/ids";
import { clampText, toQuantity } from "~/lib/validate";

export async function loader({ context, request }: LoaderFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);

  const [items, sources] = await Promise.all([
    env.DB.prepare(
      `SELECT id, name, unit, category FROM items
        WHERE org_id = ? AND archived_at IS NULL ORDER BY category, name`,
    )
      .bind(user.orgId)
      .all<{ id: string; name: string; unit: string; category: string }>(),
    env.DB.prepare(
      `SELECT DISTINCT source_note FROM lots
        WHERE org_id = ? AND source_note IS NOT NULL AND source_note <> ''
        ORDER BY source_note LIMIT 20`,
    )
      .bind(user.orgId)
      .all<{ source_note: string }>(),
  ]);

  return {
    items: items.results ?? [],
    sources: (sources.results ?? []).map((s) => s.source_note),
  };
}

export async function action({ context, request }: ActionFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);
  const form = await request.formData();

  const itemId = String(form.get("itemId") ?? "");
  const quantity = toQuantity(form.get("quantity"), 1000000);
  const expiresAt = clampText(form.get("expiresAt"), 10);
  const source = clampText(form.get("source"), 160);

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

  const site = await env.DB.prepare(
    "SELECT id FROM sites WHERE org_id = ? ORDER BY created_at LIMIT 1",
  )
    .bind(user.orgId)
    .first<{ id: string }>();

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO lots (id, org_id, item_id, site_id, quantity, received_at, expires_at, source_note)
       VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?)`,
    ).bind(
      newId("lot"),
      user.orgId,
      itemId,
      site?.id ?? null,
      quantity,
      expiresAt || null,
      source || null,
    ),
    env.DB.prepare(
      `INSERT INTO events (id, org_id, kind, subject_id, summary, actor_user_id)
       VALUES (?, ?, 'delivery_received', ?, ?, ?)`,
    ).bind(
      newId("evt"),
      user.orgId,
      itemId,
      `${quantity} ${item.unit} of ${item.name} received${source ? ` from ${source}` : ""}`,
      user.id,
    ),
  ]);

  return {
    saved: `${quantity} ${item.unit} of ${item.name} added to the shelf.`,
  };
}

export default function Receive() {
  const { items, sources } = useLoaderData<typeof loader>();
  const result = useActionData<{ saved?: string; error?: string }>();
  const navigation = useNavigation();

  return (
    <div className="wrap stack">
      <p>
        <Link to="/app/shelf">‹ The shelf</Link>
      </p>
      <h1>Record a delivery</h1>
      <p className="lead">
        One item at a time. If you do not know a date, leave it blank — we would
        rather have no date than a made-up one.
      </p>

      {result?.saved && (
        <p className="form-ok" role="status">
          {result.saved} Add the next one below, or go back to the shelf.
        </p>
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
            <label htmlFor="source">Where did it come from?</label>
            <span className="hint">
              Optional. Useful at the end of the year when somebody asks.
            </span>
            <input id="source" name="source" type="text" list="sources" />
            <datalist id="sources">
              {sources.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
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
