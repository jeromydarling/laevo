import { Form, Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { ctx } from "~/lib/loader";
import { requireUser } from "~/lib/auth";
import { clampText } from "~/lib/validate";

/**
 * Where the food came from.
 *
 * Pantries are asked this every year — by a board, a grant application, or
 * the person writing the thank-you letters — and it is normally reconstructed
 * from memory in an evening. It is already recorded on every delivery, so it
 * only ever needed adding up.
 */
export async function loader({ context, request }: LoaderFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);
  const url = new URL(request.url);
  const from = clampText(url.searchParams.get("from"), 10) ||
    new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
  const to = clampText(url.searchParams.get("to"), 10) ||
    new Date().toISOString().slice(0, 10);

  const [sources, categories, untracked] = await Promise.all([
    env.DB.prepare(
      `SELECT COALESCE(NULLIF(TRIM(l.source_note), ''), 'Not recorded') AS source,
              COUNT(*) AS deliveries,
              COUNT(DISTINCT l.item_id) AS kinds,
              MAX(l.received_at) AS last_delivery
         FROM lots l
        WHERE l.org_id = ? AND date(l.received_at) BETWEEN ? AND ?
        GROUP BY source
        ORDER BY deliveries DESC`,
    )
      .bind(user.orgId, from, to)
      .all<{
        source: string;
        deliveries: number;
        kinds: number;
        last_delivery: string;
      }>(),
    env.DB.prepare(
      `SELECT i.category, COUNT(*) AS deliveries
         FROM lots l JOIN items i ON i.id = l.item_id
        WHERE l.org_id = ? AND date(l.received_at) BETWEEN ? AND ?
        GROUP BY i.category
        ORDER BY deliveries DESC`,
    )
      .bind(user.orgId, from, to)
      .all<{ category: string; deliveries: number }>(),
    env.DB.prepare(
      `SELECT COUNT(*) AS n FROM lots
        WHERE org_id = ? AND date(received_at) BETWEEN ? AND ?
          AND (source_note IS NULL OR TRIM(source_note) = '')`,
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
  };
}

export default function Sources() {
  const data = useLoaderData<typeof loader>();
  const total = data.sources.reduce((sum, s) => sum + s.deliveries, 0);

  return (
    <div className="wrap stack">
      <p>
        <Link to="/app/more">‹ Everything else</Link>
      </p>
      <h1>Where the food came from</h1>
      <p className="lead">
        Counted from the deliveries you recorded. Useful at the end of the year
        when somebody asks, and for the thank-you letters nobody enjoys writing
        from memory.
      </p>

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

      {data.sources.length === 0 ? (
        <div className="empty">
          <h2 style={{ fontSize: "var(--t-h3)" }}>No deliveries recorded yet</h2>
          <p style={{ marginTop: 10 }}>
            Every time you record a delivery you can say where it came from.
            After a few months this page writes your annual report for you.
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
              {total} deliveries from {data.sources.length}{" "}
              {data.sources.length === 1 ? "source" : "sources"}
            </h2>
            <div className="table-scroll" style={{ marginTop: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Where from</th>
                    <th scope="col">Deliveries</th>
                    <th scope="col">Different items</th>
                    <th scope="col">Last one</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sources.map((source) => (
                    <tr key={source.source}>
                      <th scope="row" style={{ background: "transparent" }}>
                        {source.source}
                      </th>
                      <td>{source.deliveries}</td>
                      <td>{source.kinds}</td>
                      <td>{source.last_delivery.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
              source recorded. Not a problem — but adding it as you go makes
              this page worth having.
            </div>
          )}
        </>
      )}
    </div>
  );
}
