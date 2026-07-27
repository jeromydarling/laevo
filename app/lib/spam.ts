/**
 * Layered defense for public forms.
 *
 * Honeypot + timing trap + a content scorer. Spam is accepted with the same
 * cheerful "thanks" a real message gets and then dropped, so bots never learn
 * what tripped them. The reason is logged for us, never shown to them.
 */

export interface SpamSignals {
  /** Hidden field a human never fills in. */
  honeypot?: string;
  /** Milliseconds between the form rendering and submitting, stamped client-side. */
  elapsedMs?: number;
  name: string;
  email: string;
  message: string;
}

export interface SpamVerdict {
  isSpam: boolean;
  score: number;
  reasons: string[];
}

/** At or above this, the message is dropped. */
export const SPAM_THRESHOLD = 5;

const PITCH_PHRASES = [
  "seo services",
  "guest post",
  "backlink",
  "increase your traffic",
  "web design services",
  "crypto",
  "bitcoin",
  "forex",
  "casino",
  "loan offer",
  "work from home",
  "make money online",
  "digital marketing agency",
  "we can rank your",
  "buy now",
  "viagra",
  "cheap flights",
  "click here to claim",
];

const FORM_LETTER_OPENERS = [
  "dear sir or madam",
  "dear sir/madam",
  "hello dear",
  "i hope this email finds you well and",
  "greetings of the day",
  "i came across your website and noticed",
];

const LOOKALIKE_DOMAINS = [
  "gmial.com",
  "gmai.com",
  "gmil.com",
  "yahooo.com",
  "hotmial.com",
  "outlok.com",
];

export function scoreSubmission(signals: SpamSignals): SpamVerdict {
  const reasons: string[] = [];
  let score = 0;

  if (signals.honeypot && signals.honeypot.trim() !== "") {
    score += 10;
    reasons.push("honeypot filled");
  }

  // Nobody reads a form, thinks, and types a real message in under three
  // seconds. Missing timing is not held against anyone.
  if (typeof signals.elapsedMs === "number" && signals.elapsedMs >= 0) {
    if (signals.elapsedMs < 3000) {
      score += 4;
      reasons.push("submitted in under three seconds");
    }
  }

  const message = signals.message.toLowerCase();
  const name = signals.name.toLowerCase();
  const email = signals.email.toLowerCase();

  const linkCount = (message.match(/https?:\/\//g) || []).length;
  if (linkCount >= 3) {
    score += 4;
    reasons.push(`${linkCount} links`);
  } else if (linkCount === 2) {
    score += 2;
    reasons.push("two links");
  }

  if (/\[url=|<a\s+href=|\[link=/i.test(signals.message)) {
    score += 4;
    reasons.push("bbcode or html link markup");
  }

  for (const phrase of PITCH_PHRASES) {
    if (message.includes(phrase)) {
      score += 3;
      reasons.push(`pitch phrase: ${phrase}`);
      break;
    }
  }

  for (const opener of FORM_LETTER_OPENERS) {
    if (message.startsWith(opener) || message.includes(opener)) {
      score += 3;
      reasons.push("form-letter opener");
      break;
    }
  }

  const domain = email.split("@")[1] ?? "";
  if (LOOKALIKE_DOMAINS.includes(domain)) {
    score += 3;
    reasons.push("look-alike sender domain");
  }

  if (name && /https?:\/\//.test(name)) {
    score += 4;
    reasons.push("url in the name field");
  }

  if (message.length > 40) {
    const upper = signals.message.replace(/[^A-Z]/g, "").length;
    const letters = signals.message.replace(/[^A-Za-z]/g, "").length || 1;
    if (upper / letters > 0.6) {
      score += 2;
      reasons.push("shouting");
    }
  }

  // Cyrillic or CJK in a message otherwise addressed to an English-language
  // pantry contact form is a weak signal, worth one point and no more.
  if (/[Ѐ-ӿ一-鿿]/.test(signals.message)) {
    score += 1;
    reasons.push("unexpected script");
  }

  return { isSpam: score >= SPAM_THRESHOLD, score, reasons };
}
