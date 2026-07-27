import { describe, expect, it } from "vitest";
import {
  scoreMatch,
  findLikelyMatches,
  similarity,
  isNicknameOf,
  normalizeAddress,
  LIKELY_SAME,
  type MatchCandidate,
} from "~/lib/matching";

const base = (over: Partial<MatchCandidate> = {}): MatchCandidate => ({
  id: "a",
  firstName: "Margaret",
  lastName: "Okafor",
  phone: "2165550142",
  email: null,
  dob: "1951-04-07",
  addressLine: "1420 Clifton Boulevard",
  ...over,
});

describe("similarity", () => {
  it("ignores case, accents and punctuation", () => {
    expect(similarity("O'Brien", "obrien")).toBeGreaterThan(0.85);
    expect(similarity("Muñoz", "Munoz")).toBe(1);
    expect(similarity("  Vasquez ", "Vasquez")).toBe(1);
  });

  it("scores a one-letter typo high but not perfect", () => {
    const score = similarity("Whitfield", "Whitfeild");
    expect(score).toBeGreaterThan(0.75);
    expect(score).toBeLessThan(1);
  });

  it("scores unrelated names low", () => {
    expect(similarity("Okafor", "Petrov")).toBeLessThan(0.4);
  });
});

describe("nicknames", () => {
  it("matches in both directions", () => {
    expect(isNicknameOf("Margaret", "Peggy")).toBe(true);
    expect(isNicknameOf("Peggy", "Margaret")).toBe(true);
    expect(isNicknameOf("Bob", "Robert")).toBe(true);
  });

  it("does not invent pairs", () => {
    expect(isNicknameOf("Margaret", "Michael")).toBe(false);
    expect(isNicknameOf("Ann", "Anna")).toBe(false);
  });
});

describe("scoreMatch", () => {
  it("flags the same person entered twice", () => {
    const result = scoreMatch(base({ id: "new" }), base({ id: "b" }));
    expect(result.score).toBeGreaterThanOrEqual(LIKELY_SAME);
  });

  it("flags a nickname plus a shared phone number", () => {
    const result = scoreMatch(
      base({ id: "new", firstName: "Peggy", dob: null }),
      base({ id: "b", dob: null }),
    );
    expect(result.score).toBeGreaterThanOrEqual(LIKELY_SAME);
    expect(result.reasons).toContain("same phone number");
    expect(result.reasons).toContain("first name is a nickname of the other");
  });

  it("does NOT flag two unrelated people who share a surname", () => {
    const result = scoreMatch(
      base({
        id: "new",
        firstName: "Desmond",
        phone: "2165559999",
        dob: "1988-01-02",
        addressLine: "88 Madison Road",
      }),
      base({ id: "b" }),
    );
    expect(result.score).toBeLessThan(LIKELY_SAME);
  });

  it("does not flag a shared household phone with clearly different people", () => {
    const result = scoreMatch(
      base({ id: "new", firstName: "Tavon", lastName: "Reyes", dob: "1999-09-09", addressLine: "" }),
      base({ id: "b", addressLine: "" }),
    );
    expect(result.score).toBeLessThan(LIKELY_SAME);
  });

  it("gives every reason in plain words a volunteer could read out", () => {
    const result = scoreMatch(base({ id: "new" }), base({ id: "b" }));
    for (const reason of result.reasons) {
      expect(reason).toMatch(/^[a-z]/);
      expect(reason.length).toBeLessThan(60);
    }
  });

  it("never scores above 1", () => {
    const result = scoreMatch(
      base({ id: "new", email: "m@example.org" }),
      base({ id: "b", email: "m@example.org" }),
    );
    expect(result.score).toBeLessThanOrEqual(1);
  });
});

describe("findLikelyMatches", () => {
  it("never matches a record against itself", () => {
    const matches = findLikelyMatches(base(), [base()]);
    expect(matches).toHaveLength(0);
  });

  it("returns the strongest match first", () => {
    const matches = findLikelyMatches(base({ id: "new" }), [
      base({ id: "weak", firstName: "Marguerite", phone: null, dob: null, addressLine: "" }),
      base({ id: "strong" }),
    ]);
    expect(matches[0]?.id).toBe("strong");
  });

  it("returns nothing when the books are empty", () => {
    expect(findLikelyMatches(base(), [])).toHaveLength(0);
  });
});

describe("normalizeAddress", () => {
  it("treats common abbreviations as the same address", () => {
    expect(normalizeAddress("1420 Clifton Boulevard")).toBe(
      normalizeAddress("1420 clifton boulevard"),
    );
    expect(normalizeAddress("14 North Main Street")).toBe(
      normalizeAddress("14 N. Main St"),
    );
    expect(normalizeAddress("22 Elm Rd, Apt 4")).toBe(
      normalizeAddress("22 Elm Road Apartment 4"),
    );
  });
});
