import { Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { ctx } from "~/lib/loader";
import { requireUser } from "~/lib/auth";

/**
 * Everything that is not a daily job, on one screen with big rows.
 *
 * This page exists because the first version of the app put reports and the
 * importer in a list at the bottom of the Today screen, and people did not
 * find them. A thing nobody can find is a thing that does not exist.
 */
export async function loader({ context, request }: LoaderFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);

  const [sites, lastReport, volunteerHours] = await Promise.all([
    env.DB.prepare(
      "SELECT COUNT(*) AS n FROM sites WHERE org_id = ? AND archived_at IS NULL",
    )
      .bind(user.orgId)
      .first<{ n: number }>(),
    env.DB.prepare(
      "SELECT program, created_at FROM reports WHERE org_id = ? ORDER BY created_at DESC LIMIT 1",
    )
      .bind(user.orgId)
      .first<{ program: string; created_at: string }>(),
    env.DB.prepare(
      `SELECT COALESCE(SUM(hours), 0) AS hours FROM signups
        WHERE org_id = ? AND status = 'came'
          AND created_at >= datetime('now', '-365 days')`,
    )
      .bind(user.orgId)
      .first<{ hours: number }>(),
  ]);

  return {
    siteCount: sites?.n ?? 0,
    lastReport: lastReport ?? null,
    volunteerHours: Math.round(volunteerHours?.hours ?? 0),
    isAdmin: user.role === "admin",
  };
}

export default function More() {
  const data = useLoaderData<typeof loader>();

  const rows = [
    {
      to: "/app/shifts",
      title: "The rota",
      sub: "Who is coming, the public signup link, and volunteer hours",
    },
    {
      to: "/app/reports",
      title: "Reports",
      sub: data.lastReport
        ? `Last one: ${data.lastReport.program} on ${data.lastReport.created_at.slice(0, 10)}`
        : "TEFAP, CSFP, state, food bank and grant figures, with the working shown",
    },
    {
      to: "/app/sources",
      title: "Where the food came from",
      sub: "Totals by food bank, shop and drive, for your annual report",
    },
    {
      to: "/app/switch",
      title: "Moving in",
      sub: "Bring in neighbor records from another system with a CSV",
    },
    {
      to: "/app/locations",
      title: "Locations",
      sub:
        data.siteCount === 1
          ? "One location"
          : `${data.siteCount} locations`,
    },
    {
      to: "/app/settings",
      title: "Settings",
      sub: "Your pantry, your people, your export",
    },
  ];

  return (
    <div className="wrap stack">
      <h1>Everything else</h1>
      <p className="lead">
        The jobs that are not a Saturday morning.
      </p>

      {data.volunteerHours > 0 && (
        <div className="card">
          <h2 style={{ fontSize: "var(--t-h3)" }}>
            {data.volunteerHours} volunteer hours this year
          </h2>
          <p className="small" style={{ marginTop: 8 }}>
            Worth putting on a grant application — in-kind hours count as match
            on most of them.
          </p>
        </div>
      )}

      <ul className="row-list">
        {rows.map((row) => (
          <li key={row.to}>
            <Link className="row-link" to={row.to} prefetch="intent">
              <span>
                {row.title}
                <span className="row-sub">{row.sub}</span>
              </span>
              <span className="chev" aria-hidden="true">
                ›
              </span>
            </Link>
          </li>
        ))}
        <li>
          <Link className="row-link" to="/sign-out">
            <span>
              Sign out
              <span className="row-sub">On this device</span>
            </span>
            <span className="chev" aria-hidden="true">
              ›
            </span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
