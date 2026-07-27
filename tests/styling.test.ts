import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * Controls that shipped looking like the browser's defaults.
 *
 * Three of these were live: an <input> with no type attribute fell outside a
 * stylesheet rule that named types explicitly, every <input type="time"> on
 * the rota did the same, and a <summary> styled as a button still drew the
 * browser's own triangle marker. All three render, so nothing caught them
 * until somebody looked at a screenshot.
 */
const css = readFileSync(path.join(process.cwd(), "app/styles/app.css"), "utf8");

function routeFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".tsx")) out.push(full);
    }
  };
  walk(path.join(process.cwd(), "app/routes"));
  walk(path.join(process.cwd(), "app/components"));
  return out;
}

describe("the stylesheet reaches every control it needs to", () => {
  it("styles an input with no type attribute", () => {
    expect(css).toContain("input:not([type])");
  });

  it("styles every text-like input type actually used in the app", () => {
    for (const type of ["text", "email", "password", "tel", "number", "date", "time", "search"]) {
      expect(css, type).toContain(`input[type="${type}"]`);
    }
  });

  it("styles file inputs, which are the ugliest default on the web", () => {
    expect(css).toContain('input[type="file"]');
    expect(css).toContain("::file-selector-button");
  });

  it("removes the browser marker from a summary styled as a button", () => {
    expect(css).toContain("summary.btn");
    expect(css).toContain("summary.btn::-webkit-details-marker");
    expect(css).toContain("summary.btn::marker");
  });
});

describe("the markup does not rely on the stylesheet being generous", () => {
  it("gives every input an explicit type", () => {
    const offenders: string[] = [];
    for (const file of routeFiles()) {
      const source = readFileSync(file, "utf8");
      for (const tag of source.match(/<input\b[^>]*>/gs) ?? []) {
        if (!tag.includes("type=")) {
          offenders.push(`${path.relative(process.cwd(), file)}: ${tag.slice(0, 60)}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("labels every field, rather than leaning on a placeholder", () => {
    const offenders: string[] = [];
    for (const file of routeFiles()) {
      const source = readFileSync(file, "utf8");
      for (const tag of source.match(/<input\b[^>]*>/gs) ?? []) {
        if (tag.includes('type="hidden"')) continue;
        // Either it has an id a <label htmlFor> can point at, or it is
        // explicitly labelled inline.
        const hasId = /\bid=/.test(tag);
        const hasAria = /aria-label/.test(tag);
        if (!hasId && !hasAria) {
          offenders.push(`${path.relative(process.cwd(), file)}: ${tag.slice(0, 60)}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
