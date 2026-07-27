import { Form, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { ctx } from "~/lib/loader";
import { requireUser } from "~/lib/auth";
import { clampText } from "~/lib/validate";

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
  const showWorking = url.searchParams.get("working") === "1";

  const [totals, ages, visits] = await Promise.all([
    env.DB.prepare(
      `SELECT COUNT(*) AS visits,
              COUNT(DISTINCT contact_id) AS households,
              COALESCE(SUM(household_size), 0) AS individuals,
              COALESCE(SUM(first_visit), 0) AS first_visits
         FROM visits
        WHERE org_id = ? AND date(visited_at) BETWEEN ? AND ?`,
    )
      .bind(user.orgId, from, to)
      .first<{
        visits: number;
        households: number;
        individuals: number;
        first_visits: number;
      }>(),
    env.DB.prepare(
      `SELECT COALESCE(SUM(adults), 0) AS adults,
              COALESCE(SUM(children), 0) AS children,
              COALESCE(SUM(seniors), 0) AS seniors
         FROM visits
        WHERE org_id = ? AND date(visited_at) BETWEEN ? AND ?`,
    )
      .bind(user.orgId, from, to)
      .first<{ adults: number; children: number; seniors: number }>(),
    showWorking
      ? env.DB.prepare(
          `SELECT v.visited_at, v.household_size, v.first_visit,
                  c.first_name, c.last_name
             FROM visits v JOIN contacts c ON c.id = v.contact_id
            WHERE v.org_id = ? AND date(v.visited_at) BETWEEN ? AND ?
            ORDER BY v.visited_at DESC LIMIT 500`,
        )
          .bind(user.orgId, from, to)
          .all<{
            visited_at: string;
            household_size: number | null;
            first_visit: number;
            first_name: string;
            last_name: string;
          }>()
      : Promise.resolve({ results: [] as never[] }),
  ]);

  return {
    from,
    to,
    showWorking,
    totals: totals ?? { visits: 0, households: 0, individuals: 0, first_visits: 0 },
    ages: ages ?? { adults: 0, children: 0, seniors: 0 },
    visits: visits.results ?? [],
    orgName: user.orgName,
  };
}

export default function Reports() {
  const data = useLoaderData<typeof loader>();
  const agesRecorded =
    data.ages.adults + data.ages.children + data.ages.seniors > 0;

  return (
    <div className="wrap stack">
      <h1>Reports</h1>
      <p className="lead">
        The numbers most programmes ask for, built from the visits you already
        recorded. Check them, then file them — a person signs this, not us.
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
          Work it out
        </button>
      </Form>

      <div className="stat-row">
        <div className="stat">
          <span className="num">{data.totals.households}</span>
          <span className="lbl">Households served</span>
        </div>
        <div className="stat">
          <span className="num">{data.totals.individuals}</span>
          <span className="lbl">Individuals served</span>
        </div>
        <div className="stat">
          <span className="num">{data.totals.visits}</span>
          <span className="lbl">Visits in total</span>
        </div>
        <div className="stat">
          <span className="num">{data.totals.first_visits}</span>
          <span className="lbl">First-time households</span>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: "var(--t-h3)" }}>By age band</h2>
        {agesRecorded ? (
          <div className="stat-row" style={{ marginTop: 14 }}>
            <div className="stat">
              <span className="num">{data.ages.children}</span>
              <span className="lbl">Children under 18</span>
            </div>
            <div className="stat">
              <span className="num">{data.ages.adults}</span>
              <span className="lbl">Adults 18–59</span>
            </div>
            <div className="stat">
              <span className="num">{data.ages.seniors}</span>
              <span className="lbl">Adults 60 and over</span>
            </div>
          </div>
        ) : (
          <p style={{ marginTop: 12 }}>
            No age bands recorded for this period. They are filled in from the
            household record at the time of the visit, so once you have added
            them to a household they appear here from the next visit onwards.
            Leaving this blank is fine unless your programme asks for it.
          </p>
        )}
      </div>

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
          If a number looks wrong, it is almost always a household with no size
          recorded. Open the working below and look for a blank.
        </p>
      </div>

      <Form method="get">
        <input type="hidden" name="from" value={data.from} />
        <input type="hidden" name="to" value={data.to} />
        <input type="hidden" name="working" value={data.showWorking ? "0" : "1"} />
        <button type="submit" className="btn btn-secondary btn-big btn-block">
          {data.showWorking ? "Hide the working" : "Show me every visit behind these numbers"}
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
                    <td>{visit.first_visit ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
