import { Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { ctx } from "~/lib/loader";
import { requireUser } from "~/lib/auth";
import { FREE_PLAN } from "~/lib/pricing";

export async function loader({ context, request }: LoaderFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);

  // Independent reads, so they go together rather than one after another.
  const [visitsToday, visitsMonth, householdsMonth, lowStock, expiring, nextShift] =
    await Promise.all([
      env.DB.prepare(
        `SELECT COUNT(*) AS n FROM visits
          WHERE org_id = ? AND date(visited_at) = date('now')`,
      )
        .bind(user.orgId)
        .first<{ n: number }>(),
      env.DB.prepare(
        `SELECT COUNT(*) AS n FROM visits
          WHERE org_id = ? AND visited_at >= datetime('now', 'start of month')`,
      )
        .bind(user.orgId)
        .first<{ n: number }>(),
      env.DB.prepare(
        `SELECT COUNT(DISTINCT contact_id) AS n FROM visits
          WHERE org_id = ? AND visited_at >= datetime('now', 'start of month')`,
      )
        .bind(user.orgId)
        .first<{ n: number }>(),
      env.DB.prepare(
        `SELECT i.name, i.unit, i.min_par, COALESCE(SUM(l.quantity), 0) AS on_hand
           FROM items i
           LEFT JOIN lots l ON l.item_id = i.id
          WHERE i.org_id = ? AND i.archived_at IS NULL AND i.min_par > 0
          GROUP BY i.id
         HAVING on_hand < i.min_par
          ORDER BY (on_hand * 1.0 / i.min_par) ASC
          LIMIT 5`,
      )
        .bind(user.orgId)
        .all<{ name: string; unit: string; min_par: number; on_hand: number }>(),
      env.DB.prepare(
        `SELECT i.name, i.unit, l.quantity, l.expires_at
           FROM lots l JOIN items i ON i.id = l.item_id
          WHERE l.org_id = ? AND l.quantity > 0 AND l.expires_at IS NOT NULL
            AND date(l.expires_at) <= date('now', '+10 days')
          ORDER BY l.expires_at ASC
          LIMIT 5`,
      )
        .bind(user.orgId)
        .all<{ name: string; unit: string; quantity: number; expires_at: string }>(),
      env.DB.prepare(
        `SELECT sh.title, sh.starts_at, sh.slots,
                (SELECT COUNT(*) FROM signups s WHERE s.shift_id = sh.id AND s.status = 'coming') AS filled
           FROM shifts sh
          WHERE sh.org_id = ? AND sh.starts_at > datetime('now')
          ORDER BY sh.starts_at ASC
          LIMIT 1`,
      )
        .bind(user.orgId)
        .first<{ title: string; starts_at: string; slots: number; filled: number }>(),
    ]);

  return {
    name: user.name.split(" ")[0],
    role: user.role,
    visitsToday: visitsToday?.n ?? 0,
    visitsMonth: visitsMonth?.n ?? 0,
    householdsMonth: householdsMonth?.n ?? 0,
    lowStock: lowStock.results ?? [],
    expiring: expiring.results ?? [],
    nextShift: nextShift ?? null,
    freeLimit: FREE_PLAN.householdsPerMonth ?? 0,
  };
}

function dayName(sqlDate: string): string {
  const d = new Date(sqlDate.replace(" ", "T") + "Z");
  return d.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function daysUntil(dateStr: string): number {
  const then = new Date(dateStr + "T00:00:00Z").getTime();
  return Math.round((then - Date.now()) / 86_400_000);
}

export default function Today() {
  const data = useLoaderData<typeof loader>();
  const nearLimit =
    data.freeLimit > 0 && data.householdsMonth > data.freeLimit * 0.85;

  return (
    <div className="wrap stack-lg">
      <div>
        <h1>Good to see you, {data.name}</h1>
        <p className="lead" style={{ marginTop: 8 }}>
          {data.visitsToday > 0
            ? `${data.visitsToday} ${data.visitsToday === 1 ? "household has" : "households have"} been through today.`
            : "Nobody has been through yet today."}
        </p>
      </div>

      <Link className="btn btn-primary btn-big btn-block" to="/app/window">
        Check somebody in
      </Link>

      <div className="stat-row">
        <div className="stat">
          <span className="num">{data.visitsToday}</span>
          <span className="lbl">Visits today</span>
        </div>
        <div className="stat">
          <span className="num">{data.visitsMonth}</span>
          <span className="lbl">Visits this month</span>
        </div>
        <div className="stat">
          <span className="num">{data.householdsMonth}</span>
          <span className="lbl">Households this month</span>
        </div>
        <div className="stat">
          <span className="num">{data.lowStock.length}</span>
          <span className="lbl">Things running low</span>
        </div>
      </div>

      {nearLimit && (
        <div className="warn-line">
          You have served {data.householdsMonth} households this month. The free
          plan covers {data.freeLimit}. Nothing will stop working when you pass
          it — we would just rather tell you now than surprise you.
        </div>
      )}

      {data.expiring.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: "var(--t-h3)" }}>Use these first</h2>
          <ul className="stack" style={{ listStyle: "none", marginTop: 14 }}>
            {data.expiring.map((lot) => {
              const days = daysUntil(lot.expires_at.slice(0, 10));
              return (
                <li key={`${lot.name}-${lot.expires_at}`}>
                  <strong>
                    {Math.round(lot.quantity)} {lot.unit} of {lot.name}
                  </strong>{" "}
                  {days < 0
                    ? `went past its date ${Math.abs(days)} days ago`
                    : days === 0
                      ? "reaches its date today"
                      : `reaches its date in ${days} ${days === 1 ? "day" : "days"}`}
                  .
                </li>
              );
            })}
          </ul>
          <p style={{ marginTop: 16 }}>
            <Link className="btn btn-secondary btn-block" to="/app/shelf">
              Open the shelf
            </Link>
          </p>
        </div>
      )}

      {data.lowStock.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: "var(--t-h3)" }}>Running low</h2>
          <ul className="stack" style={{ listStyle: "none", marginTop: 14 }}>
            {data.lowStock.map((item) => (
              <li key={item.name}>
                <strong>{item.name}</strong> — {Math.round(item.on_hand)}{" "}
                {item.unit} left, you like to keep {Math.round(item.min_par)}.
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.nextShift && (
        <div className="card">
          <h2 style={{ fontSize: "var(--t-h3)" }}>Next on the rota</h2>
          <p style={{ marginTop: 10 }}>
            <strong>{data.nextShift.title}</strong>
            <br />
            {dayName(data.nextShift.starts_at)}
          </p>
          <p style={{ marginTop: 8 }}>
            {data.nextShift.filled} of {data.nextShift.slots} spots filled
            {data.nextShift.filled < data.nextShift.slots
              ? ` — ${data.nextShift.slots - data.nextShift.filled} still open.`
              : " — full."}
          </p>
          <p style={{ marginTop: 16 }}>
            <Link className="btn btn-secondary btn-block" to="/app/shifts">
              Open the rota
            </Link>
          </p>
        </div>
      )}

      <div>
        <h2 style={{ fontSize: "var(--t-h3)", marginBottom: 14 }}>
          Everything else
        </h2>
        <ul className="row-list">
          <li>
            <Link className="row-link" to="/app/neighbors">
              <span>
                Neighbors
                <span className="row-sub">Look somebody up or add a household</span>
              </span>
              <span className="chev" aria-hidden="true">
                ›
              </span>
            </Link>
          </li>
          <li>
            <Link className="row-link" to="/app/shelf/receive">
              <span>
                Record a delivery
                <span className="row-sub">What came in and when it goes off</span>
              </span>
              <span className="chev" aria-hidden="true">
                ›
              </span>
            </Link>
          </li>
          <li>
            <Link className="row-link" to="/app/reports">
              <span>
                Reports
                <span className="row-sub">
                  Household and individual counts, with the working shown
                </span>
              </span>
              <span className="chev" aria-hidden="true">
                ›
              </span>
            </Link>
          </li>
          <li>
            <Link className="row-link" to="/app/switch">
              <span>
                Bring in records from another system
                <span className="row-sub">Upload a CSV and check the columns</span>
              </span>
              <span className="chev" aria-hidden="true">
                ›
              </span>
            </Link>
          </li>
          <li>
            <Link className="row-link" to="/app/settings">
              <span>
                Settings
                <span className="row-sub">
                  Your pantry, your team, your export
                </span>
              </span>
              <span className="chev" aria-hidden="true">
                ›
              </span>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
