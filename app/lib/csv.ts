/**
 * Reading whatever file the pantry already has.
 *
 * A pantry switching systems has one real fear: retyping four years of
 * records. So the importer takes the export from whatever they use now and
 * guesses the columns itself. The guess is always shown before anything is
 * saved, and it is always labelled as a guess.
 *
 * Deliberately no model call here. Column headers are a small, closed problem
 * and a lookup table gets it right more reliably than a language model, for
 * free, offline, and the same way every time.
 */

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
  /** Rows the parser could not line up with the header. Shown, never dropped silently. */
  raggedRowNumbers: number[];
}

/** RFC4180-ish: quoted fields, doubled quotes, CRLF or LF. */
export function parseCsv(text: string, maxRows = 20_000): ParsedCsv {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  const clean = text.replace(/^\ufeff/, "");
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      if (rows.length > maxRows) break;
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ""));
  const headers = (nonEmpty.shift() ?? []).map((h) => h.trim());
  const raggedRowNumbers: number[] = [];
  nonEmpty.forEach((r, idx) => {
    if (r.length !== headers.length) raggedRowNumbers.push(idx + 2);
  });

  return { headers, rows: nonEmpty, raggedRowNumbers };
}

/** The fields a neighbor record can be built from. */
export type NeighborField =
  | "firstName"
  | "lastName"
  | "phone"
  | "email"
  | "dob"
  | "addressLine"
  | "city"
  | "state"
  | "zip"
  | "householdSize"
  | "notes"
  | "lastVisit";

export interface FieldGuess {
  sourceHeader: string;
  field: NeighborField | null;
  /** 0–1. Shown to the person as "sure" / "fairly sure" / "not sure". */
  confidence: number;
}

/**
 * Header patterns seen in exports from PantrySoft, Link2Feed, Oasis Insight,
 * Pantry Trak, Airtable and every homemade spreadsheet we have been sent.
 * Order matters: the first match wins, so put the specific before the general.
 */
const HEADER_PATTERNS: ReadonlyArray<
  readonly [NeighborField, readonly RegExp[]]
> = [
  [
    "firstName",
    [/^first\s*_?name$/i, /^fname$/i, /^given\s*name$/i, /^client\s*first/i, /^first$/i],
  ],
  [
    "lastName",
    [/^last\s*_?name$/i, /^lname$/i, /^surname$/i, /^family\s*name$/i, /^client\s*last/i, /^last$/i],
  ],
  [
    "phone",
    [/^(primary\s*)?phone/i, /^mobile/i, /^cell/i, /^telephone/i, /^contact\s*number/i],
  ],
  ["email", [/^e-?mail/i, /^email\s*address$/i]],
  [
    "dob",
    [/^d\.?o\.?b\.?$/i, /^date\s*of\s*birth$/i, /^birth\s*date$/i, /^birthdate$/i],
  ],
  [
    "addressLine",
    [/^address\s*(line)?\s*1?$/i, /^street\s*address$/i, /^street$/i, /^home\s*address$/i],
  ],
  ["city", [/^city$/i, /^town$/i, /^municipality$/i]],
  ["state", [/^state$/i, /^province$/i, /^st$/i]],
  ["zip", [/^zip/i, /^postal/i]],
  [
    "householdSize",
    [
      /^household\s*size$/i,
      /^family\s*size$/i,
      /^#\s*in\s*household$/i,
      /^number\s*in\s*(the\s*)?household$/i,
      /^hh\s*size$/i,
      /^people\s*in\s*household$/i,
    ],
  ],
  ["notes", [/^notes?$/i, /^comments?$/i, /^remarks?$/i]],
  [
    "lastVisit",
    [/^last\s*visit/i, /^last\s*service\s*date$/i, /^most\s*recent\s*visit$/i],
  ],
];

/** Loose fallbacks, only tried when nothing above matched. */
const LOOSE: ReadonlyArray<readonly [NeighborField, readonly string[]]> = [
  ["firstName", ["first"]],
  ["lastName", ["last", "name"]],
  ["phone", ["phone", "tel"]],
  ["email", ["mail"]],
  ["dob", ["birth", "dob", "age"]],
  ["addressLine", ["address", "street", "addr"]],
  ["city", ["city"]],
  ["state", ["state"]],
  ["zip", ["zip", "postal"]],
  ["householdSize", ["household", "family", "hh"]],
  ["notes", ["note", "comment"]],
  ["lastVisit", ["visit", "service"]],
];

export function guessMapping(headers: readonly string[]): FieldGuess[] {
  const taken = new Set<NeighborField>();
  const guesses: FieldGuess[] = headers.map((header) => {
    const trimmed = header.trim();
    for (const [field, patterns] of HEADER_PATTERNS) {
      if (taken.has(field)) continue;
      if (patterns.some((re) => re.test(trimmed))) {
        taken.add(field);
        return { sourceHeader: header, field, confidence: 0.95 };
      }
    }
    return { sourceHeader: header, field: null, confidence: 0 };
  });

  // Second pass: loose contains-matching for anything still unassigned.
  for (const guess of guesses) {
    if (guess.field) continue;
    const lower = guess.sourceHeader.toLowerCase();
    for (const [field, needles] of LOOSE) {
      if (taken.has(field)) continue;
      if (needles.some((n) => lower.includes(n))) {
        guess.field = field;
        guess.confidence = 0.6;
        taken.add(field);
        break;
      }
    }
  }

  return guesses;
}

export function confidenceLabel(confidence: number): string {
  if (confidence >= 0.9) return "Sure";
  if (confidence >= 0.5) return "Fairly sure";
  return "Not sure — please check";
}

export interface MappedRow {
  values: Partial<Record<NeighborField, string>>;
  /** Problems worth showing before import, never a reason to drop the row. */
  warnings: string[];
}

export function applyMapping(
  parsed: ParsedCsv,
  mapping: readonly FieldGuess[],
): MappedRow[] {
  const columnFor = new Map<number, NeighborField>();
  mapping.forEach((guess, idx) => {
    if (guess.field) columnFor.set(idx, guess.field);
  });

  return parsed.rows.map((row) => {
    const values: Partial<Record<NeighborField, string>> = {};
    const warnings: string[] = [];
    columnFor.forEach((field, idx) => {
      const raw = (row[idx] ?? "").trim();
      if (!raw) return;
      values[field] = raw;
    });

    if (!values.firstName && !values.lastName) {
      warnings.push("No name in this row");
    }
    if (values.dob && !normalizeDate(values.dob)) {
      warnings.push(`Could not read the date "${values.dob}"`);
    } else if (values.dob) {
      values.dob = normalizeDate(values.dob)!;
    }
    if (values.householdSize && !/^\d+$/.test(values.householdSize)) {
      const digits = values.householdSize.match(/\d+/)?.[0];
      if (digits) {
        values.householdSize = digits;
      } else {
        warnings.push(`Could not read the household size "${values.householdSize}"`);
        delete values.householdSize;
      }
    }
    return { values, warnings };
  });
}

/**
 * Dates arrive as 4/7/1952, 1952-04-07, 07-Apr-1952 and worse. Ambiguous
 * day/month order resolves to US order, because that is where the pantries
 * are — and any row we are unsure about gets flagged rather than guessed.
 */
export function normalizeDate(value: string): string | null {
  const v = value.trim();
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return iso(Number(m[1]), Number(m[2]), Number(m[3]));

  m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    let year = Number(m[3]);
    if (year < 100) year += year > 30 ? 1900 : 2000;
    return iso(year, Number(m[1]), Number(m[2]));
  }

  m = v.match(/^(\d{1,2})[- ]([A-Za-z]{3,})[- ](\d{4})$/);
  if (m) {
    const month = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1;
    if (month > 0) return iso(Number(m[3]), month, Number(m[1]));
  }

  m = v.match(/^([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const month = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) + 1;
    if (month > 0) return iso(Number(m[3]), month, Number(m[2]));
  }

  return null;
}

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

function iso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (year < 1900 || year > 2100) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
