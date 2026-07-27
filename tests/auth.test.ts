import { describe, expect, it } from "vitest";
import {
  hashPassword,
  verifyPassword,
  hashToken,
  sessionCookie,
  clearSessionCookie,
  readCookie,
  PBKDF2_ITERATIONS,
  PBKDF2_MAX_SUPPORTED,
  SESSION_COOKIE,
} from "~/lib/auth";

describe("password hashing", () => {
  /**
   * This one is not theatre. Workers caps PBKDF2 at 100,000 iterations and
   * Miniflare does not, so raising the number passes every local test and then
   * breaks sign-in, sign-up, password reset and invites in production with
   * "NotSupportedError: iteration counts above 100000 are not supported".
   * That is exactly what happened once. It does not get to happen twice.
   */
  it("stays within the iteration count the Workers runtime will actually run", () => {
    expect(PBKDF2_ITERATIONS).toBeLessThanOrEqual(PBKDF2_MAX_SUPPORTED);
  });

  it("is still a serious number of iterations", () => {
    expect(PBKDF2_ITERATIONS).toBeGreaterThanOrEqual(100_000);
  });

  it("round-trips a password", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", stored)).toBe(true);
  });

  it("rejects the wrong password", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("Correct horse battery staple", stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
  });

  it("salts, so the same password hashes differently every time", async () => {
    const a = await hashPassword("three ordinary words");
    const b = await hashPassword("three ordinary words");
    expect(a).not.toBe(b);
    expect(await verifyPassword("three ordinary words", a)).toBe(true);
    expect(await verifyPassword("three ordinary words", b)).toBe(true);
  });

  it("records the iteration count in the hash, so it can be raised later", async () => {
    const stored = await hashPassword("three ordinary words");
    const [scheme, iterations] = stored.split("$");
    expect(scheme).toBe("pbkdf2");
    expect(Number(iterations)).toBe(PBKDF2_ITERATIONS);
  });

  it("refuses malformed or tampered stored hashes instead of throwing", async () => {
    for (const bad of ["", "nonsense", "pbkdf2$abc$x$y", "md5$1$x$y", "pbkdf2$1$x$y"]) {
      expect(await verifyPassword("anything", bad)).toBe(false);
    }
  });
});

describe("tokens", () => {
  it("hashes the same token to the same digest", async () => {
    expect(await hashToken("abc123")).toBe(await hashToken("abc123"));
  });

  it("hashes different tokens differently", async () => {
    expect(await hashToken("abc123")).not.toBe(await hashToken("abc124"));
  });
});

describe("the session cookie", () => {
  it("is HttpOnly, Secure and SameSite", () => {
    const cookie = sessionCookie("tok", 3600);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Max-Age=3600");
  });

  it("clears with a zero max age", () => {
    expect(clearSessionCookie()).toContain("Max-Age=0");
  });

  it("is read back out of a request", () => {
    const request = new Request("https://laevo.us/app", {
      headers: { Cookie: `other=1; ${SESSION_COOKIE}=abc123; another=2` },
    });
    expect(readCookie(request, SESSION_COOKIE)).toBe("abc123");
    expect(readCookie(request, "nope")).toBeNull();
    expect(readCookie(new Request("https://laevo.us/"), SESSION_COOKIE)).toBeNull();
  });
});
