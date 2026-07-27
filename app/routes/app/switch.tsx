import { Form, Link, useActionData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { ctx } from "~/lib/loader";
import { requireUser } from "~/lib/auth";
import { newId, newCardCode, newToken } from "~/lib/ids";
import {
  parseCsv,
  guessMapping,
  applyMapping,
  confidenceLabel,
  type FieldGuess,
  type NeighborField,
} from "~/lib/csv";

const FIELD_LABELS: Record<NeighborField, string> = {
  firstName: "First name",
  lastName: "Last name",
  phone: "Phone",
  email: "Email",
  dob: "Date of birth",
  addressLine: "Address",
  city: "City",
  state: "State",
  zip: "Zip",
  householdSize: "Household size",
  notes: "Notes",
  lastVisit: "Last visit",
};

export async function loader({ context, request }: LoaderFunctionArgs) {
  const { env } = ctx(context);
  await requireUser(env, request);
  return null;
}

export async function action({ context, request }: ActionFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "preview");

  if (intent === "preview") {
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Choose a CSV file and we will read it." };
    }
    if (file.size > 4_000_000) {
      return {
        error:
          "That file is larger than we can read in one go. Split it in half and do it twice, or email it to us and we will handle it.",
      };
    }

    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.headers.length === 0) {
      return {
        error:
          "We could not find a header row in that file. The first line should be the column names.",
      };
    }

    const mapping = guessMapping(parsed.headers);
    const mapped = applyMapping(parsed, mapping);

    return {
      preview: {
        fileName: file.name,
        headers: parsed.headers,
        mapping,
        rowCount: parsed.rows.length,
        ragged: parsed.raggedRowNumbers.slice(0, 10),
        sample: mapped.slice(0, 5),
        warningCount: mapped.filter((r) => r.warnings.length > 0).length,
        csv: text.length < 900_000 ? text : null,
      },
    };
  }

  if (intent === "commit") {
    const csv = String(form.get("csv") ?? "");
    if (!csv) {
      return {
        error:
          "We lost the file between screens — sorry. Choose it again and we will redo the preview.",
      };
    }

    const parsed = parseCsv(csv);
    // The mapping the person actually approved, not the one we guessed.
    const mapping: FieldGuess[] = parsed.headers.map((header, i) => {
      const chosen = String(form.get(`map_${i}`) ?? "");
      return {
        sourceHeader: header,
        field: chosen ? (chosen as NeighborField) : null,
        confidence: 1,
      };
    });

    const rows = applyMapping(parsed, mapping);
    const jobId = newId("imp");
    let imported = 0;
    let skipped = 0;
    const statements: D1PreparedStatement[] = [];

    for (const row of rows) {
      const first = row.values.firstName ?? "";
      const last = row.values.lastName ?? "";
      if (!first && !last) {
        skipped++;
        continue;
      }
      const size = row.values.householdSize
        ? Number(row.values.householdSize)
        : null;
      statements.push(
        env.DB.prepare(
          `INSERT INTO contacts (id, org_id, roles, first_name, last_name, phone, email, dob,
                                 address_line, city, state, zip, household_size, notes,
                                 card_code, unsub_token, last_visit_at, created_at)
           VALUES (?, ?, 'neighbor', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        ).bind(
          newId("nb"),
          user.orgId,
          first,
          last,
          row.values.phone?.replace(/\D/g, "") || null,
          row.values.email?.toLowerCase() || null,
          row.values.dob || null,
          row.values.addressLine || null,
          row.values.city || null,
          row.values.state || null,
          row.values.zip || null,
          Number.isFinite(size) && size ? size : null,
          [row.values.notes, ...row.warnings].filter(Boolean).join(" · ") || null,
          newCardCode(),
          newToken(16),
          row.values.lastVisit || null,
        ),
      );
      imported++;
    }

    statements.push(
      env.DB.prepare(
        `INSERT INTO import_jobs (id, org_id, source, status, file_name, mapping_json,
                                  rows_total, rows_imported, rows_skipped, created_by,
                                  created_at, completed_at)
         VALUES (?, ?, 'csv', 'done', ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      ).bind(
        jobId,
        user.orgId,
        String(form.get("fileName") ?? "import.csv"),
        JSON.stringify(mapping),
        rows.length,
        imported,
        skipped,
        user.id,
      ),
    );

    // Chunked, because a pantry with four years of records is a lot of
    // statements for one batch.
    for (let i = 0; i < statements.length; i += 100) {
      await env.DB.batch(statements.slice(i, i + 100));
    }

    return { done: { imported, skipped } };
  }

  return { error: "We did not understand that." };
}

interface ActionResult {
  error?: string;
  done?: { imported: number; skipped: number };
  preview?: {
    fileName: string;
    headers: string[];
    mapping: FieldGuess[];
    rowCount: number;
    ragged: number[];
    sample: Array<{ values: Record<string, string>; warnings: string[] }>;
    warningCount: number;
    csv: string | null;
  };
}

export default function SwitchOver() {
  const result = useActionData<ActionResult>();
  const navigation = useNavigation();
  const busy = navigation.state === "submitting";

  if (result?.done) {
    return (
      <div className="wrap stack">
        <h1>That is in</h1>
        <p className="form-ok" role="status">
          {result.done.imported}{" "}
          {result.done.imported === 1 ? "household" : "households"} added.
          {result.done.skipped > 0
            ? ` ${result.done.skipped} rows were skipped because they had no name in them.`
            : ""}
        </p>
        <div className="card">
          <h2 style={{ fontSize: "var(--t-h3)" }}>What to do next</h2>
          <ul className="stack" style={{ paddingLeft: 22, marginTop: 12 }}>
            <li>
              Have a look through the list and check a few records against your
              old system.
            </li>
            <li>
              Keep your old system running for one full month and file one
              report from Laevo before you cancel anything.
            </li>
            <li>
              Anything we could not read cleanly was written into that
              household's notes rather than dropped, so nothing is lost.
            </li>
          </ul>
          <p style={{ marginTop: 20 }}>
            <Link className="btn btn-primary btn-big btn-block" to="/app/neighbors">
              Look at the neighbors list
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (result?.preview) {
    const p = result.preview;
    return (
      <div className="wrap stack">
        <h1>Check this before we save anything</h1>
        <p className="lead">
          {p.rowCount} rows in <strong>{p.fileName}</strong>. Nothing has been
          written to your pantry yet.
        </p>

        {p.csv === null && (
          <p className="form-error">
            That file is a little too large to carry between screens. Split it
            in half and import each part, or email it to us and we will do it
            for you.
          </p>
        )}

        <Form method="post" className="card">
          <input type="hidden" name="intent" value="commit" />
          <input type="hidden" name="fileName" value={p.fileName} />
          {p.csv && <input type="hidden" name="csv" value={p.csv} />}

          <h2 style={{ fontSize: "var(--t-h3)" }}>Your columns</h2>
          <p className="small" style={{ marginTop: 8, marginBottom: 20 }}>
            These are our guesses. Change any that are wrong, and set anything
            you do not want to bring across to "Leave it out".
          </p>

          {p.headers.map((header, i) => {
            const guess = p.mapping[i];
            return (
              <div className="field" key={`${header}-${i}`}>
                <label htmlFor={`map_${i}`}>
                  {header || <em>(column with no name)</em>}
                </label>
                <span className="hint">
                  {guess.field
                    ? confidenceLabel(guess.confidence)
                    : "We did not recognise this one"}
                </span>
                <select
                  id={`map_${i}`}
                  name={`map_${i}`}
                  defaultValue={guess.field ?? ""}
                >
                  <option value="">Leave it out</option>
                  {(Object.keys(FIELD_LABELS) as NeighborField[]).map((field) => (
                    <option key={field} value={field}>
                      {FIELD_LABELS[field]}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}

          <h2 style={{ fontSize: "var(--t-h3)", marginTop: 32 }}>
            The first few rows, as they would land
          </h2>
          <div className="table-scroll" style={{ marginTop: 14 }}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Household</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Anything odd</th>
                </tr>
              </thead>
              <tbody>
                {p.sample.map((row, i) => (
                  <tr key={i}>
                    <td>
                      {row.values.firstName} {row.values.lastName}
                    </td>
                    <td>{row.values.householdSize ?? "—"}</td>
                    <td>{row.values.phone ?? "—"}</td>
                    <td>
                      {row.warnings.length ? (
                        <span style={{ color: "var(--warn)", fontWeight: 700 }}>
                          {row.warnings.join("; ")}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(p.warningCount > 0 || p.ragged.length > 0) && (
            <div className="warn-line" style={{ marginTop: 20 }}>
              {p.warningCount > 0 &&
                `${p.warningCount} rows have something we could not read cleanly. `}
              {p.ragged.length > 0 &&
                `Rows ${p.ragged.join(", ")} have a different number of columns than the header. `}
              None of them will be dropped — whatever we could not read is
              written into that household's notes.
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-big btn-block"
            style={{ marginTop: 24 }}
            disabled={busy || p.csv === null}
          >
            {busy ? "Bringing them in…" : `Bring in ${p.rowCount} rows`}
          </button>
        </Form>
      </div>
    );
  }

  return (
    <div className="wrap stack">
      <h1>Bring in records you already have</h1>
      <p className="lead">
        Export a CSV from whatever you use now and we will read the columns. You
        see exactly what will happen before anything is saved.
      </p>

      {result?.error && (
        <p className="form-error" role="alert">
          {result.error}
        </p>
      )}

      <Form method="post" encType="multipart/form-data" className="card">
        <input type="hidden" name="intent" value="preview" />
        <div className="field">
          <label htmlFor="file">Your CSV file</label>
          <span className="hint">
            From PantrySoft, Link2Feed, Oasis Insight, Pantry Trak, Airtable,
            Google Sheets or Excel. Look for Export or Download in the menu.
          </span>
          <input id="file" name="file" type="file" accept=".csv,text/csv" required />
        </div>
        <button
          type="submit"
          className="btn btn-primary btn-big btn-block"
          disabled={busy}
        >
          {busy ? "Reading it…" : "Read the file"}
        </button>
      </Form>

      <div className="card">
        <h2 style={{ fontSize: "var(--t-h3)" }}>What we do not promise</h2>
        <ul className="stack" style={{ paddingLeft: 22, marginTop: 12 }}>
          <li>
            <strong>Not five minutes.</strong> An afternoon, including the part
            where you look at the preview and change two columns.
          </li>
          <li>
            <strong>Not full visit history.</strong> A last-visit date comes
            across if your file has one. Visit-by-visit history varies too much
            between systems to import honestly.
          </li>
          <li>
            <strong>Keep your old system for a month.</strong> Run both and file
            one report from Laevo before cancelling anything.
          </li>
        </ul>
        <p style={{ marginTop: 16 }}>
          Stuck on a messy export? <Link to="/contact">Send it to us</Link> — a
          person will open the file and look.
        </p>
      </div>
    </div>
  );
}
