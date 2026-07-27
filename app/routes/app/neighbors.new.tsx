import { Form, Link, redirect, useActionData, useNavigation, useSearchParams } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { ctx } from "~/lib/loader";
import { requireUser } from "~/lib/auth";
import { newId, newCardCode, newToken } from "~/lib/ids";
import { clampText, requireText, toCount, normalizePhone, formatPhone } from "~/lib/validate";
import { findLikelyMatches, type MatchCandidate } from "~/lib/matching";

export async function loader({ context, request }: LoaderFunctionArgs) {
  const { env } = ctx(context);
  await requireUser(env, request);
  return null;
}

export async function action({ context, request }: ActionFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);
  const form = await request.formData();

  const firstName = clampText(form.get("firstName"), 80);
  const lastName = requireText(form.get("lastName"), "lastName", "a last name", 80);
  if (lastName.error) {
    return { fieldErrors: [lastName.error] };
  }

  const phone = normalizePhone(form.get("phone"));
  const email = clampText(form.get("email"), 320).toLowerCase();
  const dob = clampText(form.get("dob"), 10);
  const addressLine = clampText(form.get("addressLine"), 200);
  const adults = toCount(form.get("adults"), 30);
  const children = toCount(form.get("children"), 30);
  const seniors = toCount(form.get("seniors"), 30);
  const needs = clampText(form.get("needs"), 400);
  const notes = clampText(form.get("notes"), 2000);
  const confirmedNew = form.get("confirmedNew") === "yes";

  const candidate: MatchCandidate = {
    id: "new",
    firstName,
    lastName: lastName.value,
    phone,
    email,
    dob,
    addressLine,
  };

  // Only ask about duplicates once. If the person has looked at the list and
  // said this is somebody new, we believe them — a second prompt is nagging.
  if (!confirmedNew) {
    const existing = await env.DB.prepare(
      `SELECT id, first_name, last_name, phone, email, dob, address_line
         FROM contacts
        WHERE org_id = ? AND archived_at IS NULL
          AND (
            (? <> '' AND phone = ?)
            OR (? <> '' AND dob = ?)
            OR lower(last_name) LIKE ?
          )
        LIMIT 40`,
    )
      .bind(
        user.orgId,
        phone,
        phone,
        dob,
        dob,
        `${lastName.value.slice(0, 3).toLowerCase()}%`,
      )
      .all<{
        id: string;
        first_name: string;
        last_name: string;
        phone: string | null;
        email: string | null;
        dob: string | null;
        address_line: string | null;
      }>();

    const matches = findLikelyMatches(
      candidate,
      (existing.results ?? []).map((row) => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        phone: row.phone,
        email: row.email,
        dob: row.dob,
        addressLine: row.address_line,
      })),
    );

    if (matches.length > 0) {
      const byId = new Map((existing.results ?? []).map((r) => [r.id, r]));
      return {
        possibleMatches: matches.slice(0, 4).map((m) => {
          const row = byId.get(m.id)!;
          return {
            id: m.id,
            name: `${row.first_name} ${row.last_name}`.trim(),
            phone: row.phone,
            reasons: m.reasons,
          };
        }),
      };
    }
  }

  const id = newId("nb");
  const householdSize = adults + children + seniors;
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO contacts (id, org_id, roles, first_name, last_name, phone, email, dob,
                             address_line, household_size, adults, children, seniors,
                             needs, notes, card_code, unsub_token, created_at)
       VALUES (?, ?, 'neighbor', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    ).bind(
      id,
      user.orgId,
      firstName,
      lastName.value,
      phone || null,
      email || null,
      dob || null,
      addressLine || null,
      householdSize || null,
      adults || null,
      children || null,
      seniors || null,
      needs || null,
      notes || null,
      newCardCode(),
      newToken(16),
    ),
    env.DB.prepare(
      `INSERT INTO events (id, org_id, kind, subject_id, summary, actor_user_id)
       VALUES (?, ?, 'neighbor_added', ?, ?, ?)`,
    ).bind(
      newId("evt"),
      user.orgId,
      id,
      `${firstName} ${lastName.value}`.trim() + " was added",
      user.id,
    ),
  ]);

  return redirect(`/app/neighbors/${id}?added=1`);
}

interface ActionResult {
  fieldErrors?: Array<{ field: string; message: string }>;
  possibleMatches?: Array<{
    id: string;
    name: string;
    phone: string | null;
    reasons: string[];
  }>;
}

export default function NewNeighbor() {
  const result = useActionData<ActionResult>();
  const navigation = useNavigation();
  const [params] = useSearchParams();
  const prefill = params.get("name") ?? "";
  const errorFor = (field: string) =>
    result?.fieldErrors?.find((e) => e.field === field)?.message;

  return (
    <div className="wrap stack">
      <h1>Add a household</h1>
      <p className="lead">
        Only a last name is required. Everything else can be filled in later, or
        never.
      </p>

      {result?.possibleMatches && result.possibleMatches.length > 0 && (
        <div className="card" style={{ borderColor: "var(--gold)" }}>
          <h2 style={{ fontSize: "var(--t-h3)", color: "var(--warn)" }}>
            Is this somebody you already have?
          </h2>
          <p style={{ marginTop: 10 }}>
            These look close. Have a look before you add a second record for the
            same family — nothing has been saved yet.
          </p>
          <ul className="row-list" style={{ marginTop: 16 }}>
            {result.possibleMatches.map((match) => (
              <li key={match.id}>
                <Link className="row-link" to={`/app/neighbors/${match.id}`}>
                  <span>
                    {match.name}
                    <span className="row-sub">
                      {match.phone ? `${formatPhone(match.phone)} · ` : ""}
                      {match.reasons.join(", ")}
                    </span>
                  </span>
                  <span className="chev" aria-hidden="true">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="small" style={{ marginTop: 14 }}>
            Laevo will never join two records together on its own. If none of
            these is the right person, use the button at the bottom of the form
            and it will be added as somebody new.
          </p>
        </div>
      )}

      <Form method="post" className="card">
        <div className="field">
          <label htmlFor="firstName">First name</label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            defaultValue={prefill.split(" ")[0] ?? ""}
            autoComplete="off"
          />
        </div>

        <div className={`field${errorFor("lastName") ? " field-error" : ""}`}>
          <label htmlFor="lastName">Last name</label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            defaultValue={prefill.split(" ").slice(1).join(" ")}
            autoComplete="off"
            required
          />
          {errorFor("lastName") && (
            <span className="error-text">{errorFor("lastName")}</span>
          )}
        </div>

        <div className="field">
          <label htmlFor="phone">Phone</label>
          <span className="hint">Optional. Useful for finding them quickly next time.</span>
          <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="off" />
        </div>

        <fieldset style={{ border: "none", marginBottom: 8 }}>
          <legend className="label" style={{ fontWeight: 700, marginBottom: 8 }}>
            Who is in the household?
          </legend>
          <span className="hint" style={{ display: "block", marginBottom: 12 }}>
            Counts only — no names needed. This is what every report is built
            from, so it is the one thing worth asking.
          </span>
          <div className="grid grid-3">
            <div className="field">
              <label htmlFor="adults">Adults 18–59</label>
              <input id="adults" name="adults" type="number" inputMode="numeric" min={0} defaultValue={1} />
            </div>
            <div className="field">
              <label htmlFor="children">Children under 18</label>
              <input id="children" name="children" type="number" inputMode="numeric" min={0} defaultValue={0} />
            </div>
            <div className="field">
              <label htmlFor="seniors">Adults 60 and over</label>
              <input id="seniors" name="seniors" type="number" inputMode="numeric" min={0} defaultValue={0} />
            </div>
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="needs">Anything they cannot eat or cook</label>
          <span className="hint">
            No stove, no can opener, an allergy, a diabetic in the house, a baby
            who needs formula. This shows up at the window while you are
            packing.
          </span>
          <input id="needs" name="needs" type="text" autoComplete="off" />
        </div>

        <details style={{ marginBottom: 20 }}>
          <summary
            className="btn btn-quiet"
            style={{ display: "inline-flex", padding: "12px 0" }}
          >
            Add address and date of birth
          </summary>
          <div style={{ marginTop: 16 }}>
            <div className="field">
              <label htmlFor="addressLine">Address</label>
              <input id="addressLine" name="addressLine" type="text" autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="dob">Date of birth</label>
              <span className="hint">
                Only worth collecting if a programme you are in asks for it.
              </span>
              <input id="dob" name="dob" type="date" />
            </div>
            <div className="field">
              <label htmlFor="notes">Notes</label>
              <span className="hint">
                For your pantry only. Write what would help somebody serve them
                well — nothing you would be uncomfortable having them read.
              </span>
              <textarea id="notes" name="notes" style={{ minHeight: 110 }} />
            </div>
          </div>
        </details>

        {result?.possibleMatches && result.possibleMatches.length > 0 ? (
          <>
            <input type="hidden" name="confirmedNew" value="yes" />
            <button
              type="submit"
              className="btn btn-primary btn-big btn-block"
              disabled={navigation.state === "submitting"}
            >
              None of those — add as somebody new
            </button>
          </>
        ) : (
          <button
            type="submit"
            className="btn btn-primary btn-big btn-block"
            disabled={navigation.state === "submitting"}
          >
            {navigation.state === "submitting" ? "Saving…" : "Save this household"}
          </button>
        )}
      </Form>
    </div>
  );
}
