import { describe, expect, it } from "vitest";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { PHOTOS, PHOTO_DISCLOSURE, type Photo } from "~/content/photos";

const dir = path.join(process.cwd(), "public", "photos");
const entries = Object.entries(PHOTOS) as Array<[string, Photo]>;

describe("photographs", () => {
  it("every photograph referenced in code actually exists on disk", () => {
    for (const [key, photo] of entries) {
      for (const width of photo.widths) {
        const file = path.join(dir, `${photo.name}-${width}.webp`);
        expect(existsSync(file), `${key}: ${file}`).toBe(true);
      }
      const fallback = path.join(dir, `${photo.name}-${photo.widths[1]}.jpg`);
      expect(existsSync(fallback), `${key}: ${fallback}`).toBe(true);
    }
  });

  /**
   * The marketing copy promises Laevo works on an old phone and on the sort of
   * wifi a community hall has. A photograph heavy enough to break that promise
   * makes the page a liar, so the budget is enforced rather than hoped for.
   */
  it("keeps the phone-sized variant under 60KB", () => {
    for (const [key, photo] of entries) {
      const file = path.join(dir, `${photo.name}-${photo.widths[0]}.webp`);
      const kb = statSync(file).size / 1024;
      expect(kb, `${key} is ${Math.round(kb)}KB`).toBeLessThan(60);
    }
  });

  it("keeps the large variant under 200KB", () => {
    for (const [key, photo] of entries) {
      for (const ext of ["webp", "jpg"]) {
        const file = path.join(dir, `${photo.name}-${photo.widths[1]}.${ext}`);
        const kb = statSync(file).size / 1024;
        expect(kb, `${key}.${ext} is ${Math.round(kb)}KB`).toBeLessThan(200);
      }
    }
  });

  it("every photograph has alt text that describes what is in the frame", () => {
    for (const [key, photo] of entries) {
      expect(photo.alt.length, key).toBeGreaterThan(40);
      expect(photo.alt.trim().endsWith("."), key).toBe(true);
      // Alt text describing itself as an image is noise in a screen reader.
      expect(photo.alt.toLowerCase(), key).not.toMatch(
        /^(image|photo|picture|photograph) of/,
      );
    }
  });

  it("has intrinsic dimensions so nothing jumps while the page loads", () => {
    for (const [key, photo] of entries) {
      expect(photo.width, key).toBeGreaterThan(0);
      expect(photo.height, key).toBeGreaterThan(0);
      expect(photo.width, key).toBe(photo.widths[1]);
    }
  });

  it("says out loud that the photographs are not real pantries", () => {
    expect(PHOTO_DISCLOSURE.toLowerCase()).toContain("not real");
  });
});
