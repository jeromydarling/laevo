/**
 * Finding the record you already have.
 *
 * Pantries end up with the same family entered four times because a volunteer
 * spelled it differently at the window. This is deterministic string work, not
 * a guess from a model: it is explainable, it is testable, and it costs nothing
 * to run. A high score never merges anything by itself — it puts two records
 * side by side and asks a person.
 */

export interface MatchCandidate {
  id: string;
  firstName: string;
  lastName: string;
  /** Digits only. */
  phone?: string | null;
  email?: string | null;
  dob?: string | null;
  addressLine?: string | null;
}

export interface MatchResult {
  id: string;
  score: number;
  /** Plain words a volunteer can read out. */
  reasons: string[];
}

/** At or above this we show "is this the same person?" before creating a new record. */
export const LIKELY_SAME = 0.72;

export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s'-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Levenshtein distance, iterative, two-row. Short strings only. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** 1 = identical, 0 = nothing in common. */
export function similarity(a: string, b: string): number {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x && !y) return 1;
  if (!x || !y) return 0;
  if (x === y) return 1;
  const longest = Math.max(x.length, y.length);
  return Math.max(0, 1 - editDistance(x, y) / longest);
}

/**
 * Common nickname pairs, both directions. Deliberately short and boring —
 * a wrong entry here creates a false merge, which is worse than a duplicate.
 */
const NICKNAMES: ReadonlyArray<readonly [string, string]> = [
  ["robert", "bob"],
  ["robert", "rob"],
  ["william", "bill"],
  ["william", "will"],
  ["richard", "rick"],
  ["richard", "dick"],
  ["margaret", "peggy"],
  ["margaret", "maggie"],
  ["elizabeth", "liz"],
  ["elizabeth", "beth"],
  ["elizabeth", "betty"],
  ["james", "jim"],
  ["john", "jack"],
  ["joseph", "joe"],
  ["michael", "mike"],
  ["thomas", "tom"],
  ["charles", "chuck"],
  ["katherine", "kathy"],
  ["catherine", "cathy"],
  ["patricia", "patty"],
  ["patricia", "pat"],
  ["deborah", "debbie"],
  ["barbara", "barb"],
  ["susan", "sue"],
  ["theresa", "terry"],
  ["antonio", "tony"],
  ["francisco", "frank"],
  ["jose", "pepe"],
  ["guadalupe", "lupe"],
];

export function isNicknameOf(a: string, b: string): boolean {
  const x = normalizeName(a);
  const y = normalizeName(b);
  return NICKNAMES.some(
    ([full, short]) =>
      (x === full && y === short) || (x === short && y === full),
  );
}

/**
 * Score two people against each other.
 *
 * Weighting reflects what is actually reliable at a pantry window: a phone
 * number or a birth date is worth far more than a surname, because surnames
 * repeat and get misspelled and people share them.
 */
export function scoreMatch(
  input: MatchCandidate,
  existing: MatchCandidate,
): MatchResult {
  const reasons: string[] = [];
  let score = 0;

  const lastSim = similarity(input.lastName, existing.lastName);
  const firstSim = similarity(input.firstName, existing.firstName);
  const firstNick = isNicknameOf(input.firstName, existing.firstName);

  if (lastSim >= 0.99) {
    score += 0.3;
    reasons.push("same last name");
  } else if (lastSim >= 0.8) {
    score += 0.2;
    reasons.push("last name spelled a little differently");
  }

  if (firstSim >= 0.99) {
    score += 0.22;
    reasons.push("same first name");
  } else if (firstNick) {
    score += 0.18;
    reasons.push("first name is a nickname of the other");
  } else if (firstSim >= 0.8) {
    score += 0.12;
    reasons.push("first name spelled a little differently");
  }

  const phoneA = (input.phone ?? "").replace(/\D/g, "");
  const phoneB = (existing.phone ?? "").replace(/\D/g, "");
  if (phoneA.length >= 10 && phoneA === phoneB) {
    score += 0.4;
    reasons.push("same phone number");
  }

  const emailA = (input.email ?? "").trim().toLowerCase();
  const emailB = (existing.email ?? "").trim().toLowerCase();
  if (emailA && emailA === emailB) {
    score += 0.35;
    reasons.push("same email address");
  }

  if (input.dob && existing.dob && input.dob === existing.dob) {
    score += 0.35;
    reasons.push("same date of birth");
  }

  const addrA = normalizeAddress(input.addressLine ?? "");
  const addrB = normalizeAddress(existing.addressLine ?? "");
  if (addrA && addrA === addrB) {
    score += 0.2;
    reasons.push("same address");
  }

  return { id: existing.id, score: Math.min(1, score), reasons };
}

export function normalizeAddress(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,#]/g, " ")
    .replace(/\b(street|st)\b/g, "st")
    .replace(/\b(avenue|ave)\b/g, "ave")
    .replace(/\b(road|rd)\b/g, "rd")
    .replace(/\b(drive|dr)\b/g, "dr")
    .replace(/\b(apartment|apt|unit)\b/g, "apt")
    .replace(/\b(north|n)\b/g, "n")
    .replace(/\b(south|s)\b/g, "s")
    .replace(/\b(east|e)\b/g, "e")
    .replace(/\b(west|w)\b/g, "w")
    .replace(/\s+/g, " ")
    .trim();
}

export function findLikelyMatches(
  input: MatchCandidate,
  existing: readonly MatchCandidate[],
  threshold = LIKELY_SAME,
): MatchResult[] {
  return existing
    .filter((row) => row.id !== input.id)
    .map((row) => scoreMatch(input, row))
    .filter((m) => m.score >= threshold)
    .sort((a, b) => b.score - a.score);
}
