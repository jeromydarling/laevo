import { Form, Link, useActionData, useLoaderData } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { ctx } from "~/lib/loader";
import { requireUser } from "~/lib/auth";
import { clampText } from "~/lib/validate";
import { newId } from "~/lib/ids";
import {
  PROGRAMS,
  programById,
  FIGURE_LABELS,
  type FigureKey,
} from "~/content/programs";

function monthStart(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function loader({ context, request }: LoaderFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);
  const url = new URL(request.url);
  const from = clampText(url.searchParams.get("from"), 10) || monthStart();
  const to = clampText(url.searchParams.get("to"), 10) || today();
  const programId = clampText(url.searchParams.get("program"), 30) || "TEFAP";
  const siteId = clampText(url.searchParams.get("site"), 40);
  const showWorking = url.searchParams.get("working") === "1";

  const siteFilter = siteId ? "AND v.site_id = ?" : "";
  const binds = siteId
    ? [user.orgId, from, to, siteId]
    : [user.orgId, from, to];

  const [totals, byLocation, sites, visits, saved] = await Promise.all([
    env.DB.prepare(
      `SELECT COUNT(*) AS visits,
              COUNT(DISTINCT v.contact_id) AS households,
              COALESCE(SUM(v.household_size), 0) AS individuals,
              COALESCE(SUM(v.first_visit), 0) AS firstTime,
              COALESCE(SUM(v.adults), 0) AS adults,
              COALESCE(SUM(v.children), 0) AS children,
              COALESCE(SUM(v.seniors), 0) AS seniors
         FROM visits v
        WHERE v.org_id = ? AND date(v.visited_at) BETWEEN ? AND ? ${siteFilter}`,
    )
      .bind(...binds)
      .first<Record<FigureKey, number>>(),
    env.DB.prepare(
      `SELECT COALESCE(s.name, 'No location recorded') AS site_name,
              COUNT(*) AS visits,
              COUNT(DISTINCT v.contact_id) AS households,
              COALESCE(SUM(v.household_size), 0) AS individuals
         FROM visits v
         LEFT JOIN sites s ON s.id = v.site_id
        WHERE v.org_id = ? AND date(v.visited_at) BETWEEN ? AND ?
        GROUP BY v.site_id
        ORDER BY visits DESC`,
    )
      .bind(user.orgId, from, to)
      .all<{
        site_name: string;
        visits: number;
        households: number;
        individuals: number;
      }>(),
    env.DB.prepare(
      "SELECT id, name FROM sites WHERE org_id = ? AND archived_at IS NULL ORDER BY created_at",
    )
      .bind(user.orgId)
      .all<{ id: string; name: string }>(),
    showWorking
      ? env.DB.prepare(
          `SELECT v.visited_at, v.household_size, v.first_visit,
                  c.first_name, c.last_name, s.name AS site_name
             FROM visits v
             JOIN contacts c ON c.id = v.contact_id
             LEFT JOIN sites s ON s.id = v.site_id
            WHERE v.org_id = ? AND date(v.visited_at) BETWEEN ? AND ? ${siteFilter}
            ORDER BY v.visited_at DESC LIMIT 500`,
        )
          .bind(...binds)
          .all<{
            visited_at: string;
            household_size: number | null;
            first_visit: number;
            first_name: string;
            last_name: string;
            site_name: string | null;
          }>()
      : Promise.resolve({ results: [] as never[] }),
    env.DB.prepare(
      `SELECT id, program, period_start, period_end, created_at
         FROM reports WHERE org_id = ? ORDER BY created_at DESC LIMIT 6`,
    )
      .bind(user.orgId)
      .all<{
        id: string;
        program: string;
        period_start: string;
        period_end: string;
        created_at: string;
      }>(),
  ]);

  return {
    from,
    to,
    programId,
    siteId,
    showWorking,
    totals: totals ?? {
      visits: 0,
      households: 0,
      individuals: 0,
      firstTime: 0,
      adults: 0,
      children: 0,
      seniors: 0,
    },
    byLocation: byLocation.results ?? [],
    sites: sites.results ?? [],
    visits: visits.results ?? [],
    saved: saved.results ?? [],
    orgName: user.orgName,
  };
}

export async function action({ context, request }: ActionFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);
  const form = await request.formData();

  if (String(form.get("intent") ?? "") === "delete") {
    await env.DB.prepare("DELETE FROM reports WHERE id = ? AND org_id = ?")
      .bind(String(form.get("reportId") ?? ""), user.orgId)
      .run();
    return { saved: "Removed from the list. The figures themselves are still in your visits." };
  }

  const program = clampText(form.get("program"), 30) || "STATE";
  const periodStart = clampText(form.get("from"), 10);
  const periodEnd = clampText(form.get("to"), 10);
  const payload = clampText(form.get("payload"), 4000);

  await env.DB.prepare(
    `INSERT INTO reports (id, org_id, program, period_start, period_end, payload_json, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
  )
    .bind(
      newId("rpt"),
      user.orgId,
      program,
      periodStart,
      periodEnd,
      payload || "{}",
      user.id,
    )
    .run();

  return {
    saved:
      "Kept. It is in the list below, so you can show what you filed and when — which is the question that gets asked at the worst possible moment.",
  };
}

function when(sqlDate: string): string {
  return new Date(sqlDate.replace(" ", "T") + "Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Reports() {
  const data = useLoaderData<typeof loader>();
  const result = useActionData<{ saved?: string }>();
  const program = programById(data.programId) ?? PROGRAMS[0];

  const value = (key: FigureKey): number => data.totals[key] ?? 0;
  const agesRecorded =
    value("adults") + value("children") + value("seniors") > 0;

  return (
    <div className="wrap stack">
      <p className="back-link">
        <Link to="/app/more">‹ Everything else</Link>
      </p>
      <h1>Reports</h1>
      <p className="lead">
        The figures your programme asks for, built from the visits you already
        recorded. Check them, then file them — a person signs this, not us.
      </p>

      {result?.saved && (
        <p className="form-ok" role="status">
          {result.saved}
        </p>
      )}

      <Form method="get" className="card">
        <div className="field">
          <label htmlFor="program">Which report?</label>
          <select id="program" name="program" defaultValue={data.programId}>
            {PROGRAMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.full}
              </option>
            ))}
          </select>
        </div>

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

        {data.sites.length > 1 && (
          <div className="field">
            <label htmlFor="site">Which location?</label>
            <select id="site" name="site" defaultValue={data.siteId}>
              <option value="">All locations together</option>
              {data.sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-big btn-block">
          Work it out
        </button>
      </Form>

      <div className="card">
        <h2 style={{ fontSize: "var(--t-h3)" }}>
          {program.name} — {program.full}
        </h2>
        <p style={{ marginTop: 10 }}>{program.what}</p>
      </div>

      <div className="stat-row">
        {program.figures.map((figure) => (
          <div className="stat" key={figure}>
            <span className="num">{value(figure)}</span>
            <span className="lbl">{FIGURE_LABELS[figure]}</span>
          </div>
        ))}
      </div>

      {!agesRecorded &&
        program.figures.some((f) =>
          ["children", "adults", "seniors"].includes(f),
        ) && (
          <div className="warn-line">
            This report wants an age breakdown and none is recorded for the
            period. Age bands come from the household record at the time of the
            visit, so they appear here from the next visit after you add them.
          </div>
        )}

      <div className="callout">
        <h3>What this programme does not need</h3>
        <p>{program.doesNotNeed}</p>
        <p style={{ marginTop: 10 }}>
          <strong>Who actually decides:</strong> {program.authority}
        </p>
      </div>

      {data.byLocation.length > 1 && (
        <div className="card">
          <h2 style={{ fontSize: "var(--t-h3)" }}>By location</h2>
          <div className="table-scroll" style={{ marginTop: 14 }}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Location</th>
                  <th scope="col">Households</th>
                  <th scope="col">Individuals</th>
                  <th scope="col">Visits</th>
                </tr>
              </thead>
              <tbody>
                {data.byLocation.map((row) => (
                  <tr key={row.site_name}>
                    <th scope="row" style={{ background: "transparent" }}>
                      {row.site_name}
                    </th>
                    <td>{row.households}</td>
                    <td>{row.individuals}</td>
                    <td>{row.visits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small" style={{ marginTop: 12 }}>
            Households are counted once per location. A family that used two
            locations appears in both rows, so these will not always add up to
            the figure above — which counts them once.
          </p>
        </div>
      )}

      <div className="callout">
        <h3>How these numbers were made</h3>
        <p>
          <strong>Households served</strong> counts each household once however
          many times they came. <strong>Individuals</strong> adds up the
          household size recorded on each visit, which is what most programmes
          mean by the word — it is not a count of distinct people.{" "}
          <strong>First-time</strong> counts visits marked as a household's
          first with you.
        </p>
        <p style={{ marginTop: 10 }}>
          If a number looks wrong it is almost always a household with no size
          recorded. Open the working below and look for a blank.
        </p>
      </div>

      <Form method="get">
        <input type="hidden" name="from" value={data.from} />
        <input type="hidden" name="to" value={data.to} />
        <input type="hidden" name="program" value={data.programId} />
        <input type="hidden" name="site" value={data.siteId} />
        <input type="hidden" name="working" value={data.showWorking ? "0" : "1"} />
        <button type="submit" className="btn btn-secondary btn-big btn-block">
          {data.showWorking
            ? "Hide the working"
            : "Show me every visit behind these numbers"}
        </button>
      </Form>

      {data.showWorking && (
        <div className="card">
          <h2 style={{ fontSize: "var(--t-h3)" }}>
            Every visit from {data.from} to {data.to}
          </h2>
          <p className="small" style={{ marginTop: 8 }}>
            Showing up to 500. Use your browser's print option to keep a copy.
          </p>
          <div className="table-scroll" style={{ marginTop: 14 }}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Household</th>
                  <th scope="col">Size</th>
                  <th scope="col">Where</th>
                  <th scope="col">First visit</th>
                </tr>
              </thead>
              <tbody>
                {data.visits.map((visit, i) => (
                  <tr key={i}>
                    <td>{visit.visited_at.slice(0, 10)}</td>
                    <td>
                      {visit.first_name} {visit.last_name}
                    </td>
                    <td>
                      {visit.household_size ?? (
                        <span style={{ color: "var(--danger)", fontWeight: 700 }}>
                          not recorded
                        </span>
                      )}
                    </td>
                    <td>{visit.site_name ?? "—"}</td>
                    <td>{visit.first_visit ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Form method="post" className="card">
        <input type="hidden" name="program" value={program.id} />
        <input type="hidden" name="from" value={data.from} />
        <input type="hidden" name="to" value={data.to} />
        <input
          type="hidden"
          name="payload"
          value={JSON.stringify(
            Object.fromEntries(program.figures.map((f) => [f, value(f)])),
          )}
        />
        <h2 style={{ fontSize: "var(--t-h3)" }}>Keep a copy of this</h2>
        <p style={{ marginTop: 10 }}>
          Saves the figures and the period, so in eight months you can say what
          you filed and when. It does not send anything to anybody.
        </p>
        <button
          type="submit"
          className="btn btn-primary btn-big btn-block"
          style={{ marginTop: 16 }}
        >
          Keep this {program.name} report
        </button>
      </Form>

      {data.saved.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: "var(--t-h3)" }}>Reports you have kept</h2>
          <ul className="stack" style={{ listStyle: "none", marginTop: 14 }}>
            {data.saved.map((row) => (
              <li
                key={row.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span>
                  <strong>{row.program}</strong> — {row.period_start} to{" "}
                  {row.period_end}
                  <span className="row-sub">Kept {when(row.created_at)}</span>
                </span>
                <Form method="post">
                  <input type="hidden" name="intent" value="delete" />
                  <input type="hidden" name="reportId" value={row.id} />
                  <button type="submit" className="btn btn-quiet">
                    Remove
                  </button>
                </Form>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h2 style={{ fontSize: "var(--t-h3)" }}>Before you file it</h2>
        <ul className="stack" style={{ paddingLeft: 22, marginTop: 12 }}>
          <li>
            Run it a week early, so a gap is still a question somebody can
            answer.
          </li>
          <li>
            Check for households with no size recorded — they are the usual
            cause of an individual count that looks low.
          </li>
          <li>
            Keep your own copy. Laevo is not your system of record for something
            you have signed.
          </li>
        </ul>
      </div>
    </div>
  );
}
