import { describe, expect, it } from "vitest";

/**
 * The edge-cache rule, tested in isolation.
 *
 * This exists because the first version of the rule used a regex whose first
 * alternative was empty, so it matched every path on the site rather than the
 * marketing pages it named. Nothing leaked — a session cookie bypasses the
 * cache — but "matches everything" is not what anyone reading it would have
 * concluded, and the next person to add a page would have inherited it.
 */
const CACHEABLE_EXACT = new Set([
  "/",
  "/why",
  "/how-it-works",
  "/for-volunteers",
  "/pricing",
  "/compare",
  "/switch",
  "/guides",
  "/accessibility",
  "/about",
  "/privacy",
  "/terms",
  "/robots.txt",
  "/sitemap.xml",
  "/llms.txt",
  "/icon.svg",
  "/og.svg",
]);
const CACHEABLE_PREFIX = ["/guides/", "/compare/"];

function matches(pathname: string): boolean {
  return (
    CACHEABLE_EXACT.has(pathname) ||
    CACHEABLE_PREFIX.some((prefix) => pathname.startsWith(prefix))
  );
}

describe("what the edge is allowed to cache", () => {
  it("caches the public marketing pages", () => {
    for (const path of ["/", "/pricing", "/why", "/guides", "/compare"]) {
      expect(matches(path), path).toBe(true);
    }
  });

  it("caches generated content pages", () => {
    expect(matches("/guides/tefap-reporting-without-dread")).toBe(true);
    expect(matches("/compare/pantrysoft")).toBe(true);
  });

  it("caches the files generated from the registries", () => {
    for (const path of ["/robots.txt", "/sitemap.xml", "/llms.txt"]) {
      expect(matches(path), path).toBe(true);
    }
  });

  it("never caches anything inside the pantry", () => {
    for (const path of [
      "/app",
      "/app/more",
      "/app/neighbors",
      "/app/reports",
      "/app/settings",
      "/app/locations",
    ]) {
      expect(matches(path), path).toBe(false);
    }
  });

  it("never caches anything to do with an account", () => {
    for (const path of [
      "/sign-in",
      "/sign-up",
      "/sign-out",
      "/forgot",
      "/reset/abc123",
      "/join/abc123",
      "/demo",
      "/unsubscribe/abc123",
      "/contact",
    ]) {
      expect(matches(path), path).toBe(false);
    }
  });

  it("never caches a pantry's own public page, which changes as shifts fill", () => {
    expect(matches("/v/riverbend")).toBe(false);
  });

  it("never caches the API", () => {
    expect(matches("/api/health")).toBe(false);
    expect(matches("/api/export")).toBe(false);
  });
});
