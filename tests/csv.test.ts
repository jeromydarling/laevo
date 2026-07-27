import { describe, expect, it } from "vitest";
import {
  parseCsv,
  guessMapping,
  applyMapping,
  normalizeDate,
  confidenceLabel,
} from "~/lib/csv";

describe("parseCsv", () => {
  it("reads a plain file", () => {
    const parsed = parseCsv("First Name,Last Name\nMaria,Alvarez\nJames,Doyle\n");
    expect(parsed.headers).toEqual(["First Name", "Last Name"]);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[1]).toEqual(["James", "Doyle"]);
  });

  it("handles quoted fields with commas and doubled quotes", () => {
    const parsed = parseCsv(
      'Name,Notes\n"Alvarez, Maria","She said ""no can opener"" last time"\n',
    );
    expect(parsed.rows[0][0]).toBe("Alvarez, Maria");
    expect(parsed.rows[0][1]).toBe('She said "no can opener" last time');
  });

  it("handles CRLF line endings and a byte-order mark", () => {
    const parsed = parseCsv("﻿A,B\r\n1,2\r\n");
    expect(parsed.headers).toEqual(["A", "B"]);
    expect(parsed.rows[0]).toEqual(["1", "2"]);
  });

  it("reports ragged rows rather than dropping them", () => {
    const parsed = parseCsv("A,B,C\n1,2,3\n4,5\n");
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.raggedRowNumbers).toEqual([3]);
  });

  it("skips fully blank lines", () => {
    const parsed = parseCsv("A,B\n\n1,2\n\n");
    expect(parsed.rows).toHaveLength(1);
  });
});

describe("guessMapping", () => {
  it("reads a PantrySoft-style export", () => {
    const guesses = guessMapping([
      "Client First",
      "Client Last",
      "DOB",
      "Primary Phone",
      "Street Address",
      "# in Household",
    ]);
    const byField = Object.fromEntries(
      guesses.filter((g) => g.field).map((g) => [g.field, g.sourceHeader]),
    );
    expect(byField.firstName).toBe("Client First");
    expect(byField.lastName).toBe("Client Last");
    expect(byField.dob).toBe("DOB");
    expect(byField.phone).toBe("Primary Phone");
    expect(byField.addressLine).toBe("Street Address");
    expect(byField.householdSize).toBe("# in Household");
  });

  it("reads a homemade spreadsheet", () => {
    const guesses = guessMapping(["FName", "LName", "Cell", "HH Size", "Notes"]);
    const fields = guesses.map((g) => g.field);
    expect(fields).toContain("firstName");
    expect(fields).toContain("lastName");
    expect(fields).toContain("phone");
    expect(fields).toContain("householdSize");
    expect(fields).toContain("notes");
  });

  it("never assigns the same field to two columns", () => {
    const guesses = guessMapping(["First Name", "First", "FName", "Given Name"]);
    const assigned = guesses.filter((g) => g.field === "firstName");
    expect(assigned).toHaveLength(1);
  });

  it("leaves genuinely unknown columns unassigned rather than guessing", () => {
    const guesses = guessMapping(["Referral Source Code XY7"]);
    expect(guesses[0].field).toBeNull();
    expect(guesses[0].confidence).toBe(0);
  });

  it("labels its confidence honestly", () => {
    const exact = guessMapping(["Last Name"])[0];
    expect(confidenceLabel(exact.confidence)).toBe("Sure");
    expect(confidenceLabel(0)).toMatch(/Not sure/);
  });
});

describe("normalizeDate", () => {
  it("reads the formats these exports actually produce", () => {
    expect(normalizeDate("1952-04-07")).toBe("1952-04-07");
    expect(normalizeDate("4/7/1952")).toBe("1952-04-07");
    expect(normalizeDate("04-07-1952")).toBe("1952-04-07");
    expect(normalizeDate("7-Apr-1952")).toBe("1952-04-07");
    expect(normalizeDate("April 7, 1952")).toBe("1952-04-07");
  });

  it("expands two-digit years the way a pantry means them", () => {
    expect(normalizeDate("4/7/52")).toBe("1952-04-07");
    expect(normalizeDate("4/7/05")).toBe("2005-04-07");
  });

  it("returns null rather than inventing a date", () => {
    expect(normalizeDate("last Tuesday")).toBeNull();
    expect(normalizeDate("")).toBeNull();
    expect(normalizeDate("13/45/1952")).toBeNull();
    expect(normalizeDate("1752-01-01")).toBeNull();
  });
});

describe("applyMapping", () => {
  it("flags rather than drops rows it cannot read", () => {
    const parsed = parseCsv(
      "First Name,Last Name,DOB,HH Size\nMaria,Alvarez,4/7/1952,3\n,,1/2/1960,2\nJames,Doyle,last Tuesday,four\n",
    );
    const rows = applyMapping(parsed, guessMapping(parsed.headers));

    expect(rows).toHaveLength(3);
    expect(rows[0].values.dob).toBe("1952-04-07");
    expect(rows[0].warnings).toHaveLength(0);

    expect(rows[1].warnings).toContain("No name in this row");

    expect(rows[2].warnings.some((w) => w.includes("last Tuesday"))).toBe(true);
    expect(rows[2].values.householdSize).toBeUndefined();
  });

  it("pulls a number out of a household size written in words plus digits", () => {
    const parsed = parseCsv("Last Name,HH Size\nDoyle,4 people\n");
    const rows = applyMapping(parsed, guessMapping(parsed.headers));
    expect(rows[0].values.householdSize).toBe("4");
  });

  it("ignores columns the person chose to leave out", () => {
    const parsed = parseCsv("Last Name,Income\nDoyle,32000\n");
    const mapping = guessMapping(parsed.headers).map((g) =>
      g.sourceHeader === "Income" ? { ...g, field: null } : g,
    );
    const rows = applyMapping(parsed, mapping);
    expect(Object.values(rows[0].values)).not.toContain("32000");
  });
});
