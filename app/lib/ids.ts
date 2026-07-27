/**
 * Prefixed random IDs. One helper, every table.
 *
 * Crockford-ish base32 without look-alike characters, so an ID read aloud over
 * the phone by a volunteer survives the trip.
 */
const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";

export type IdPrefix =
  | "org" // organizations
  | "usr" // users
  | "ses" // sessions
  | "nb" // neighbors (people the pantry serves)
  | "hh" // households
  | "vst" // visits
  | "site" // pantry locations
  | "itm" // shelf items
  | "lot" // received lots
  | "hnd" // hand-outs (distribution lines)
  | "shf" // volunteer shifts
  | "sup" // shift signups
  | "rpt" // compliance reports
  | "imp" // import jobs
  | "inv" // team invites
  | "tok" // password reset tokens
  | "msg" // outbound emails
  | "evt" // activity events
  | "don"; // donations / gifts in kind

export function newId(prefix: IdPrefix, length = 20): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `${prefix}_${out}`;
}

/** URL-safe opaque token for invites, resets, calendar feeds, unsubscribes. */
export function newToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let out = "";
  for (const b of buf) out += ALPHABET[b % ALPHABET.length];
  return out;
}

/**
 * A short human-readable code a volunteer can type or a neighbor can carry on
 * a card. Six characters, no vowels, so it can't spell anything unfortunate.
 */
const CARD_ALPHABET = "23456789CFGHJKLMNPQRSTVWXZ";
export function newCardCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += CARD_ALPHABET[b % CARD_ALPHABET.length];
  return out;
}
