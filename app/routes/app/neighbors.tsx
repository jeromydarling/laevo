import { Form, Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { ctx } from "~/lib/loader";
import { requireUser } from "~/lib/auth";
import { clampText, formatPhone } from "~/lib/validate";

const PAGE_SIZE = 25;

export async function loader({ context, request }: LoaderFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);
  const url = new URL(request.url);
  const q = clampText(url.searchParams.get("q"), 60);
  const afterName = url.searchParams.get("afterName") ?? "";
  const afterId = url.searchParams.get("afterId") ?? "";

  // Keyset pagination on (last_name, id). OFFSET gets slower the further in
  // you go; this stays the same speed at any size.
  const where: string[] = [
    "org_id = ?",
    "archived_at IS NULL",
    "roles LIKE '%neighbor%'",
  ];
  const binds: unknown[] = [user.orgId];

  if (q) {
    where.push(
      "(lower(first_name || ' ' || last_name) LIKE ? OR lower(last_name || ' ' || first_name) LIKE ? OR upper(card_code) = upper(?))",
    );
    binds.push(`%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`, q);
  }
  if (afterName && afterId) {
    where.push("(last_name > ? OR (last_name = ? AND id > ?))");
    binds.push(afterName, afterName, afterId);
  }

  const [rows, total] = await Promise.all([
    env.DB.prepare(
      `SELECT id, first_name, last_name, phone, household_size, visit_count, last_visit_at, needs
         FROM contacts
        WHERE ${where.join(" AND ")}
        ORDER BY last_name, id
        LIMIT ${PAGE_SIZE + 1}`,
    )
      .bind(...binds)
      .all<{
        id: string;
        first_name: string;
        last_name: string;
        phone: string | null;
        household_size: number | null;
        visit_count: number;
        last_visit_at: string | null;
        needs: string | null;
      }>(),
    env.DB.prepare(
      `SELECT COUNT(*) AS n FROM contacts
        WHERE org_id = ? AND archived_at IS NULL AND roles LIKE '%neighbor%'`,
    )
      .bind(user.orgId)
      .first<{ n: number }>(),
  ]);

  const results = rows.results ?? [];
  const hasMore = results.length > PAGE_SIZE;
  const page = hasMore ? results.slice(0, PAGE_SIZE) : results;
  const last = page[page.length - 1];

  return {
    q,
    people: page,
    total: total?.n ?? 0,
    nextCursor: hasMore && last ? { name: last.last_name, id: last.id } : null,
  };
}

export default function Neighbors() {
  const { q, people, total, nextCursor } = useLoaderData<typeof loader>();

  return (
    <div className="wrap stack">
      <div>
        <h1>Neighbors</h1>
        <p className="lead" style={{ marginTop: 8 }}>
          {total} {total === 1 ? "household" : "households"} on your books.
        </p>
      </div>

      <Link className="btn btn-primary btn-big btn-block" to="/app/neighbors/new">
        Add a household
      </Link>

      <Form method="get" className="card">
        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="q">Find somebody</label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            autoComplete="off"
            enterKeyHint="search"
          />
        </div>
        <button type="submit" className="btn btn-secondary btn-block">
          Search
        </button>
      </Form>

      {people.length === 0 ? (
        <div className="empty">
          <h2 style={{ fontSize: "var(--t-h3)" }}>
            {q ? "Nobody matches that" : "No households yet"}
          </h2>
          <p style={{ marginTop: 10 }}>
            {q
              ? "Try fewer letters — the spelling on the record may not match the spelling you know."
              : "Add them one at a time as people come in, or bring in the records you already have from another system."}
          </p>
          {!q && (
            <p style={{ marginTop: 20 }}>
              <Link className="btn btn-secondary btn-big" to="/app/switch">
                Bring in existing records
              </Link>
            </p>
          )}
        </div>
      ) : (
        <ul className="row-list">
          {people.map((person) => (
            <li key={person.id}>
              <Link className="row-link" to={`/app/neighbors/${person.id}`}>
                <span>
                  {person.first_name} {person.last_name}
                  <span className="row-sub">
                    {person.household_size
                      ? `${person.household_size} in the household`
                      : "Household size not recorded"}
                    {person.phone ? ` · ${formatPhone(person.phone)}` : ""}
                    {person.visit_count
                      ? ` · ${person.visit_count} ${person.visit_count === 1 ? "visit" : "visits"}`
                      : " · not been in yet"}
                  </span>
                  {person.needs && (
                    <span className="row-sub" style={{ color: "var(--warn)" }}>
                      {person.needs}
                    </span>
                  )}
                </span>
                <span className="chev" aria-hidden="true">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {nextCursor && (
        <Link
          className="btn btn-secondary btn-big btn-block"
          to={`/app/neighbors?${new URLSearchParams({
            ...(q ? { q } : {}),
            afterName: nextCursor.name,
            afterId: nextCursor.id,
          })}`}
        >
          Show the next {PAGE_SIZE}
        </Link>
      )}
    </div>
  );
}
