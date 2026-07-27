import { Form, Link, useActionData, useLoaderData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { ctx } from "~/lib/loader";
import { requireUser } from "~/lib/auth";
import { newId } from "~/lib/ids";
import { clampText, toQuantity } from "~/lib/validate";

export async function loader({ context, request }: LoaderFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);

  const [items, expiring] = await Promise.all([
    env.DB.prepare(
      `SELECT i.id, i.name, i.category, i.unit, i.min_par,
              COALESCE(SUM(l.quantity), 0) AS on_hand,
              MIN(CASE WHEN l.quantity > 0 THEN l.expires_at END) AS soonest
         FROM items i
         LEFT JOIN lots l ON l.item_id = i.id
        WHERE i.org_id = ? AND i.archived_at IS NULL
        GROUP BY i.id
        ORDER BY i.category, i.name`,
    )
      .bind(user.orgId)
      .all<{
        id: string;
        name: string;
        category: string;
        unit: string;
        min_par: number;
        on_hand: number;
        soonest: string | null;
      }>(),
    env.DB.prepare(
      `SELECT i.name, i.unit, l.quantity, l.expires_at
         FROM lots l JOIN items i ON i.id = l.item_id
        WHERE l.org_id = ? AND l.quantity > 0 AND l.expires_at IS NOT NULL
          AND date(l.expires_at) <= date('now', '+14 days')
        ORDER BY l.expires_at ASC LIMIT 12`,
    )
      .bind(user.orgId)
      .all<{ name: string; unit: string; quantity: number; expires_at: string }>(),
  ]);

  return {
    items: items.results ?? [],
    expiring: expiring.results ?? [],
    canEdit: user.role !== "volunteer",
  };
}

export async function action({ context, request }: ActionFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "add-item") {
    const name = clampText(form.get("name"), 120);
    if (!name) return { error: "We need a name for the item — that is all." };
    await env.DB.prepare(
      `INSERT INTO items (id, org_id, name, category, unit, min_par)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        newId("itm"),
        user.orgId,
        name,
        clampText(form.get("category"), 60) || "Other",
        clampText(form.get("unit"), 30) || "cans",
        toQuantity(form.get("minPar"), 100000),
      )
      .run();
    return { saved: `${name} added to the shelf.` };
  }

  if (intent === "adjust") {
    const itemId = String(form.get("itemId") ?? "");
    const quantity = toQuantity(form.get("quantity"), 1000000);
    const item = await env.DB.prepare(
      "SELECT name, unit FROM items WHERE id = ? AND org_id = ?",
    )
      .bind(itemId, user.orgId)
      .first<{ name: string; unit: string }>();
    if (!item) return { error: "We could not find that item." };

    // A recount replaces the lots rather than adjusting them: what somebody
    // counted on the shelf just now is more true than our arithmetic.
    await env.DB.batch([
      env.DB.prepare("DELETE FROM lots WHERE item_id = ? AND org_id = ?").bind(
        itemId,
        user.orgId,
      ),
      env.DB.prepare(
        `INSERT INTO lots (id, org_id, item_id, quantity, received_at, source_note)
         VALUES (?, ?, ?, ?, datetime('now'), 'Counted on the shelf')`,
      ).bind(newId("lot"), user.orgId, itemId, quantity),
      env.DB.prepare(
        `INSERT INTO events (id, org_id, kind, subject_id, summary, actor_user_id)
         VALUES (?, ?, 'shelf_counted', ?, ?, ?)`,
      ).bind(
        newId("evt"),
        user.orgId,
        itemId,
        `${item.name} counted at ${quantity} ${item.unit}`,
        user.id,
      ),
    ]);
    return { saved: `${item.name} is now ${quantity} ${item.unit}.` };
  }

  return { error: "We did not understand that." };
}

function daysUntil(dateStr: string): number {
  return Math.round(
    (new Date(dateStr.slice(0, 10) + "T00:00:00Z").getTime() - Date.now()) /
      86_400_000,
  );
}

function expiryWords(days: number): string {
  if (days < 0) return `went past its date ${Math.abs(days)} days ago`;
  if (days === 0) return "reaches its date today";
  if (days === 1) return "reaches its date tomorrow";
  return `reaches its date in ${days} days`;
}

export default function Shelf() {
  const { items, expiring, canEdit } = useLoaderData<typeof loader>();
  const result = useActionData<{ saved?: string; error?: string }>();
  const navigation = useNavigation();

  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <div className="wrap stack">
      <h1>The shelf</h1>

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

      <Link className="btn btn-primary btn-big btn-block" to="/app/shelf/receive">
        Record a delivery
      </Link>

      {expiring.length > 0 && (
        <div className="card" style={{ borderColor: "var(--gold)" }}>
          <h2 style={{ fontSize: "var(--t-h3)", color: "var(--warn)" }}>
            Use these first
          </h2>
          <ul className="stack" style={{ listStyle: "none", marginTop: 14 }}>
            {expiring.map((lot, i) => (
              <li key={i}>
                <strong>
                  {Math.round(lot.quantity)} {lot.unit} of {lot.name}
                </strong>{" "}
                {expiryWords(daysUntil(lot.expires_at))}.
              </li>
            ))}
          </ul>
          <p className="small" style={{ marginTop: 14 }}>
            What to do about it is your call. Laevo will not decide that a date
            means something is no longer good — your food bank's written policy
            does, and it is worth having it pinned up in the sorting room.
          </p>
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty">
          <h2 style={{ fontSize: "var(--t-h3)" }}>Nothing on the shelf yet</h2>
          <p style={{ marginTop: 10 }}>
            Add the things you keep most often — it takes about ten minutes and
            every warning in Laevo comes from it. You can run the window without
            doing this first.
          </p>
        </div>
      ) : (
        categories.map((category) => (
          <div key={category}>
            <h2 style={{ fontSize: "var(--t-h3)", marginBottom: 12 }}>
              {category}
            </h2>
            <div className="stack">
              {items
                .filter((item) => item.category === category)
                .map((item) => {
                  const low = item.min_par > 0 && item.on_hand < item.min_par;
                  return (
                    <div key={item.id} className="card">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 16,
                          alignItems: "baseline",
                          flexWrap: "wrap",
                        }}
                      >
                        <h3 style={{ fontSize: "var(--t-h3)" }}>{item.name}</h3>
                        <p style={{ fontWeight: 800, color: low ? "var(--warn)" : "var(--green-deep)" }}>
                          {Math.round(item.on_hand)} {item.unit}
                        </p>
                      </div>
                      {low && (
                        <p className="small" style={{ color: "var(--warn)", marginTop: 6 }}>
                          Below the {Math.round(item.min_par)} {item.unit} you
                          like to keep.
                        </p>
                      )}
                      {item.soonest && (
                        <p className="small" style={{ marginTop: 6 }}>
                          Soonest date: {item.soonest.slice(0, 10)} —{" "}
                          {expiryWords(daysUntil(item.soonest))}.
                        </p>
                      )}

                      {canEdit && (
                        <Form method="post" style={{ marginTop: 14 }}>
                          <input type="hidden" name="intent" value="adjust" />
                          <input type="hidden" name="itemId" value={item.id} />
                          <div
                            style={{
                              display: "flex",
                              gap: 12,
                              alignItems: "flex-end",
                              flexWrap: "wrap",
                            }}
                          >
                            <div className="field" style={{ flex: "1 1 140px", marginBottom: 0 }}>
                              <label htmlFor={`q-${item.id}`}>
                                Counted on the shelf
                              </label>
                              <input
                                id={`q-${item.id}`}
                                name="quantity"
                                type="number"
                                inputMode="decimal"
                                min={0}
                                defaultValue={Math.round(item.on_hand)}
                              />
                            </div>
                            <button
                              type="submit"
                              className="btn btn-secondary"
                              disabled={navigation.state === "submitting"}
                            >
                              Save count
                            </button>
                          </div>
                        </Form>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))
      )}

      {canEdit && (
        <details className="card">
          <summary className="btn btn-secondary btn-block">
            Add something to the shelf
          </summary>
          <Form method="post" style={{ marginTop: 20 }}>
            <input type="hidden" name="intent" value="add-item" />
            <div className="field">
              <label htmlFor="name">What is it?</label>
              <input id="name" name="name" type="text" required />
            </div>
            <div className="field">
              <label htmlFor="category">Which shelf does it live on?</label>
              <input
                id="category"
                name="category"
                type="text"
                list="categories"
                placeholder="Vegetables, Protein, Fresh…"
              />
              <datalist id="categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="field">
              <label htmlFor="unit">How do you count it?</label>
              <span className="hint">
                Cans, bags, loaves, pounds, dozens — whatever you say out loud.
              </span>
              <input id="unit" name="unit" type="text" defaultValue="cans" />
            </div>
            <div className="field">
              <label htmlFor="minPar">How much do you like to keep?</label>
              <span className="hint">
                Leave at zero if you would rather not be warned about this one.
              </span>
              <input id="minPar" name="minPar" type="number" min={0} defaultValue={0} />
            </div>
            <button type="submit" className="btn btn-primary btn-big btn-block">
              Add it
            </button>
          </Form>
        </details>
      )}
    </div>
  );
}
