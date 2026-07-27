import { Form, Link, useActionData, useLoaderData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { ctx } from "~/lib/loader";
import { requireUser } from "~/lib/auth";
import { newId } from "~/lib/ids";
import { clampText } from "~/lib/validate";
import { PLANS, formatUsd } from "~/lib/pricing";

export async function loader({ context, request }: LoaderFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);

  const [sites, org] = await Promise.all([
    env.DB.prepare(
      `SELECT s.id, s.name, s.address, s.hours_note, s.archived_at,
              (SELECT COUNT(*) FROM visits v
                WHERE v.site_id = s.id
                  AND v.visited_at >= datetime('now', 'start of month')) AS visits_this_month,
              (SELECT COUNT(*) FROM shifts sh
                WHERE sh.site_id = s.id AND sh.starts_at > datetime('now')) AS upcoming_shifts
         FROM sites s
        WHERE s.org_id = ?
        ORDER BY s.archived_at IS NOT NULL, s.created_at`,
    )
      .bind(user.orgId)
      .all<{
        id: string;
        name: string;
        address: string | null;
        hours_note: string | null;
        archived_at: string | null;
        visits_this_month: number;
        upcoming_shifts: number;
      }>(),
    env.DB.prepare("SELECT plan FROM orgs WHERE id = ?")
      .bind(user.orgId)
      .first<{ plan: string }>(),
  ]);

  return {
    sites: sites.results ?? [],
    plan: org?.plan ?? "community",
    isAdmin: user.role === "admin",
  };
}

export async function action({ context, request }: ActionFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);
  if (user.role !== "admin") {
    return {
      error:
        "Only an organizer can change locations. Ask whoever set up your pantry's account.",
    };
  }

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "add") {
    const name = clampText(form.get("name"), 160);
    if (!name) return { error: "A location needs a name — that is all." };
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO sites (id, org_id, name, address, hours_note)
         VALUES (?, ?, ?, ?, ?)`,
      ).bind(
        newId("site"),
        user.orgId,
        name,
        clampText(form.get("address"), 300) || null,
        clampText(form.get("hours"), 300) || null,
      ),
      env.DB.prepare(
        `INSERT INTO events (id, org_id, kind, summary, actor_user_id)
         VALUES (?, ?, 'site_added', ?, ?)`,
      ).bind(newId("evt"), user.orgId, `${name} added as a location`, user.id),
    ]);
    return { saved: `${name} added.` };
  }

  if (intent === "update") {
    const id = String(form.get("siteId") ?? "");
    const name = clampText(form.get("name"), 160);
    if (!name) return { error: "A location needs a name." };
    await env.DB.prepare(
      "UPDATE sites SET name = ?, address = ?, hours_note = ? WHERE id = ? AND org_id = ?",
    )
      .bind(
        name,
        clampText(form.get("address"), 300) || null,
        clampText(form.get("hours"), 300) || null,
        id,
        user.orgId,
      )
      .run();
    return { saved: "Saved." };
  }

  if (intent === "archive" || intent === "reopen") {
    const id = String(form.get("siteId") ?? "");
    const open = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM sites WHERE org_id = ? AND archived_at IS NULL",
    )
      .bind(user.orgId)
      .first<{ n: number }>();

    if (intent === "archive" && (open?.n ?? 0) <= 1) {
      return {
        error:
          "That is your only open location, so closing it would leave nowhere to record a visit. Add another one first.",
      };
    }

    // Closing a location never deletes what happened there — past visits still
    // belong to it, and a filed report must not change because somebody tidied
    // up a list.
    await env.DB.prepare(
      `UPDATE sites SET archived_at = ${intent === "archive" ? "datetime('now')" : "NULL"}
        WHERE id = ? AND org_id = ?`,
    )
      .bind(id, user.orgId)
      .run();
    return {
      saved:
        intent === "archive"
          ? "Closed. Everything recorded there is still in your reports."
          : "Open again.",
    };
  }

  return { error: "We did not understand that." };
}

export default function Locations() {
  const { sites, plan, isAdmin } = useLoaderData<typeof loader>();
  const result = useActionData<{ saved?: string; error?: string }>();
  const navigation = useNavigation();

  const open = sites.filter((s) => !s.archived_at);
  const closed = sites.filter((s) => s.archived_at);
  const networkPlan = PLANS.find((p) => p.id === "network")!;
  const needsNetwork = plan !== "network" && open.length >= 1;

  return (
    <div className="wrap stack">
      <p className="back-link">
        <Link to="/app/more">‹ Everything else</Link>
      </p>
      <h1>Locations</h1>
      <p className="lead">
        Where you hand food out. Visits, deliveries and shifts are all recorded
        against one, so your reports can be broken down by location.
      </p>

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

      <div className="stack">
        {open.map((site) => (
          <div key={site.id} className="card">
            <h2 style={{ fontSize: "var(--t-h3)" }}>{site.name}</h2>
            {site.address && (
              <p className="small" style={{ marginTop: 6 }}>
                {site.address}
              </p>
            )}
            {site.hours_note && (
              <p className="small" style={{ marginTop: 4 }}>
                {site.hours_note}
              </p>
            )}
            <p className="small" style={{ marginTop: 10 }}>
              {site.visits_this_month} visits this month ·{" "}
              {site.upcoming_shifts} shift
              {site.upcoming_shifts === 1 ? "" : "s"} coming up
            </p>

            {isAdmin && (
              <details style={{ marginTop: 16 }}>
                <summary className="btn btn-secondary btn-block">
                  Change this location
                </summary>
                <Form method="post" style={{ marginTop: 20 }}>
                  <input type="hidden" name="intent" value="update" />
                  <input type="hidden" name="siteId" value={site.id} />
                  <div className="field">
                    <label htmlFor={`name-${site.id}`}>Name</label>
                    <input type="text"
                      id={`name-${site.id}`}
                      name="name"
                      defaultValue={site.name}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`address-${site.id}`}>Address</label>
                    <input type="text"
                      id={`address-${site.id}`}
                      name="address"
                      defaultValue={site.address ?? ""}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`hours-${site.id}`}>When it is open</label>
                    <span className="hint">
                      In your own words — "Saturdays 9 to noon" is perfect.
                    </span>
                    <input type="text"
                      id={`hours-${site.id}`}
                      name="hours"
                      defaultValue={site.hours_note ?? ""}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-block">
                    Save
                  </button>
                </Form>

                <Form method="post" style={{ marginTop: 20 }}>
                  <input type="hidden" name="intent" value="archive" />
                  <input type="hidden" name="siteId" value={site.id} />
                  <button type="submit" className="btn btn-danger btn-block">
                    Close this location
                  </button>
                  <p className="small" style={{ marginTop: 8 }}>
                    Nothing recorded here is deleted. Past visits stay in your
                    reports exactly as they are.
                  </p>
                </Form>
              </details>
            )}
          </div>
        ))}
      </div>

      {isAdmin && (
        <details className="card">
          <summary className="btn btn-primary btn-big btn-block">
            Add a location
          </summary>
          <Form method="post" style={{ marginTop: 20 }}>
            <input type="hidden" name="intent" value="add" />
            <div className="field">
              <label htmlFor="new-name">What is it called?</label>
              <span className="hint">
                Whatever your volunteers call it. "The hall behind the library"
                is a better name than "Site 2".
              </span>
              <input type="text" id="new-name" name="name" required />
            </div>
            <div className="field">
              <label htmlFor="new-address">Address</label>
              <input type="text" id="new-address" name="address" />
            </div>
            <div className="field">
              <label htmlFor="new-hours">When it is open</label>
              <input type="text" id="new-hours" name="hours" />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-big btn-block"
              disabled={navigation.state === "submitting"}
            >
              Add it
            </button>
          </Form>

          {needsNetwork && (
            <p className="small" style={{ marginTop: 16 }}>
              More than one location needs the {networkPlan.name} plan,{" "}
              {formatUsd(networkPlan.monthlyCents)} a month. Nothing is charged
              or switched off today — add what you need and we will talk about
              it before any money changes hands.
            </p>
          )}
        </details>
      )}

      {closed.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: "var(--t-h3)" }}>Closed locations</h2>
          <p className="small" style={{ marginTop: 8 }}>
            Kept so their history stays in your reports.
          </p>
          <ul className="stack" style={{ listStyle: "none", marginTop: 14 }}>
            {closed.map((site) => (
              <li
                key={site.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span>{site.name}</span>
                {isAdmin && (
                  <Form method="post">
                    <input type="hidden" name="intent" value="reopen" />
                    <input type="hidden" name="siteId" value={site.id} />
                    <button type="submit" className="btn btn-quiet">
                      Open again
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
