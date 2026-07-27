/**
 * Input validation. Errors are kind and specific — they say what we need and
 * never suggest the person did something stupid.
 */

export interface FieldError {
  field: string;
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** Strips control characters, trims, and clamps length. Ordinary spaces stay. */
export function clampText(value: unknown, max: number): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

export function requireText(
  value: unknown,
  field: string,
  label: string,
  max = 200,
): { value: string; error: FieldError | null } {
  const text = clampText(value, max);
  if (!text) {
    return { value: "", error: { field, message: `We need ${label}.` } };
  }
  return { value: text, error: null };
}

export function requireEmail(
  value: unknown,
  field = "email",
): { value: string; error: FieldError | null } {
  const text = clampText(value, 320).toLowerCase();
  if (!text) {
    return { value: "", error: { field, message: "We need an email address." } };
  }
  if (!isEmail(text)) {
    return {
      value: text,
      error: {
        field,
        message:
          "That email address is missing something — check for a typo around the @.",
      },
    };
  }
  return { value: text, error: null };
}

export const MIN_PASSWORD_LENGTH = 10;

export function requirePassword(
  value: unknown,
  field = "password",
): { value: string; error: FieldError | null } {
  const text = String(value ?? "");
  if (!text) {
    return { value: "", error: { field, message: "We need a password." } };
  }
  if (text.length < MIN_PASSWORD_LENGTH) {
    return {
      value: text,
      error: {
        field,
        message: `Passwords need at least ${MIN_PASSWORD_LENGTH} characters. Three ordinary words in a row works well and is easy to remember.`,
      },
    };
  }
  return { value: text, error: null };
}

/** Positive whole numbers, clamped. Used for counts of people and cans. */
export function toCount(value: unknown, max = 1_000_000): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, max);
}

/** Quantities can be fractional — half a case, 2.5 pounds. */
export function toQuantity(value: unknown, max = 1_000_000): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.round(n * 100) / 100, max);
}

export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** US phone digits only. Stored plain, shown formatted. */
export function normalizePhone(value: unknown): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits.slice(0, 15);
}

export function formatPhone(digits: string): string {
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return digits;
}
