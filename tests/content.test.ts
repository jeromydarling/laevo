/**
 * Content integrity.
 *
 * These are the tests that stop the marketing site quietly rotting: a guide
 * that links to a page that no longer exists, a comparison that stopped
 * admitting where the competitor wins, a price in prose that drifted away from
 * pricing.ts, a page nobody can find because it never reached the sitemap.
 */
import { describe, expect, it } from "vitest";
import { GUIDES, GUIDE_CATEGORIES, guideBySlug, readingMinutes } from "~/content/guides";
import { COMPARISONS, comparisonById } from "~/content/comparisons";
import { PRINCIPLES, HOME_PRINCIPLES } from "~/content/principles";
import { PUBLIC_PAGES, allPublicPaths, sitemapEntries } from "~/content/site";
import { ALTERNATIVES, PLANS, formatUsd } from "~/lib/pricing";
import { marketingMeta } from "~/lib/meta";

const VALID_PATHS = new Set(allPublicPaths());

function internalLinksIn(text: string): string[] {
  return text.match(/(?:^|[\s("])(\/[a-z0-9/-]*)/gi)?.map((m) => m.trim().replace(/^["(]/, "")) ?? [];
}

describe("guides", () => {
  it("every slug is unique", () => {
    const slugs = GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every slug is URL-safe", () => {
    for (const guide of GUIDES) {
      expect(guide.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("every category is one we actually render", () => {
    for (const guide of GUIDES) {
      expect(GUIDE_CATEGORIES).toContain(guide.category);
    }
  });

  it("every related slug points at a guide that exists", () => {
    for (const guide of GUIDES) {
      for (const slug of guide.related) {
        expect(guideBySlug(slug), `${guide.slug} → ${slug}`).toBeDefined();
      }
    }
  });

  it("no guide links to itself as related reading", () => {
    for (const guide of GUIDES) {
      expect(guide.related).not.toContain(guide.slug);
    }
  });

  it("every call to action goes somewhere real", () => {
    for (const guide of GUIDES) {
      expect(VALID_PATHS.has(guide.cta.href), `${guide.slug} → ${guide.cta.href}`).toBe(true);
    }
  });

  it("every guide has real depth, not a headline over a signup form", () => {
    for (const guide of GUIDES) {
      expect(guide.blocks.length, guide.slug).toBeGreaterThanOrEqual(8);
      const words = guide.blocks
        .map((b) =>
          b.kind === "ul" || b.kind === "ol" ? b.items.join(" ") : (b as { text: string }).text,
        )
        .join(" ")
        .split(/\s+/).length;
      expect(words, guide.slug).toBeGreaterThan(600);
      expect(guide.faq.length, guide.slug).toBeGreaterThanOrEqual(2);
      expect(guide.description.length, guide.slug).toBeGreaterThan(80);
    }
  });

  it("every guide has at least one heading and one list, so it can be skimmed", () => {
    for (const guide of GUIDES) {
      expect(guide.blocks.some((b) => b.kind === "h2"), guide.slug).toBe(true);
      expect(
        guide.blocks.some((b) => b.kind === "ul" || b.kind === "ol"),
        guide.slug,
      ).toBe(true);
    }
  });

  it("the reading time shown is derived from the words actually on the page", () => {
    for (const guide of GUIDES) {
      const words = guide.blocks
        .map((b) =>
          b.kind === "ul" || b.kind === "ol" ? b.items.join(" ") : (b as { text: string }).text,
        )
        .join(" ")
        .split(/\s+/).length;
      expect(readingMinutes(guide), guide.slug).toBe(Math.max(1, Math.round(words / 200)));
      expect(readingMinutes(guide), guide.slug).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("comparisons stay honest", () => {
  it("there is a comparison page for every alternative we name", () => {
    for (const alt of ALTERNATIVES) {
      expect(comparisonById(alt.id), alt.id).toBeDefined();
    }
  });

  it("every comparison matches a real alternative in pricing.ts", () => {
    for (const comparison of COMPARISONS) {
      expect(
        ALTERNATIVES.some((a) => a.id === comparison.id),
        comparison.id,
      ).toBe(true);
    }
  });

  it("every comparison says when the reader should NOT switch", () => {
    for (const comparison of COMPARISONS) {
      expect(comparison.stayIf.length, comparison.id).toBeGreaterThanOrEqual(2);
      for (const reason of comparison.stayIf) {
        expect(reason.length, comparison.id).toBeGreaterThan(40);
      }
    }
  });

  it("every comparison has a verdict that is not just a pitch", () => {
    for (const comparison of COMPARISONS) {
      expect(comparison.verdict.length, comparison.id).toBeGreaterThan(100);
      expect(comparison.verdict.toLowerCase()).toMatch(/stay|not|unless|if you/);
    }
  });

  it("every comparison table row fills in both columns", () => {
    for (const comparison of COMPARISONS) {
      expect(comparison.rows.length, comparison.id).toBeGreaterThanOrEqual(5);
      for (const row of comparison.rows) {
        expect(row.them.trim(), `${comparison.id}:${row.feature}`).not.toBe("");
        expect(row.laevo.trim(), `${comparison.id}:${row.feature}`).not.toBe("");
      }
    }
  });

  it("Laevo's own prices quoted in comparison rows agree with pricing.ts", () => {
    const free = formatUsd(PLANS[0].monthlyCents);
    const top = formatUsd(PLANS[2].monthlyCents);
    // Only the rows that quote Laevo's headline price — not, say, "cost of
    // adding a volunteer", whose honest answer is "Nothing".
    const costRows = COMPARISONS.flatMap((c) =>
      c.rows
        .filter((r) => /^(typical )?(real )?monthly cost|^cost$/i.test(r.feature))
        .map((r) => ({ id: c.id, laevo: r.laevo })),
    );
    expect(costRows.length).toBeGreaterThan(0);
    const range = `${free}–${top.replace("$", "")}`;
    for (const row of costRows) {
      expect(row.laevo, row.id).toContain(range);
    }
  });
});

describe("principles", () => {
  it("every principle names a specific product decision, not a feeling", () => {
    for (const principle of PRINCIPLES) {
      expect(principle.inProduct.length, principle.id).toBeGreaterThan(120);
      expect(principle.body.length, principle.id).toBeGreaterThan(150);
    }
  });

  it("ids are unique", () => {
    const ids = PRINCIPLES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("the home page shows exactly the seven we promise in the heading", () => {
    expect(HOME_PRINCIPLES).toHaveLength(7);
  });

  it("carries no religious language, per the brand voice", () => {
    const forbidden =
      /\b(god|jesus|christ|christian|catholic|church|faith|prayer|scripture|gospel|blessed|holy|sacred|ministry|parish(?:ioner)?s?\b)/i;
    for (const principle of PRINCIPLES) {
      expect(`${principle.title} ${principle.body} ${principle.inProduct}`).not.toMatch(
        forbidden,
      );
    }
  });
});

describe("the site registry", () => {
  it("every public page has a unique path", () => {
    const paths = PUBLIC_PAGES.map((p) => p.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("every page has a summary good enough for llms.txt", () => {
    for (const page of PUBLIC_PAGES) {
      expect(page.summary.length, page.path).toBeGreaterThan(30);
      expect(page.priority).toBeGreaterThan(0);
      expect(page.priority).toBeLessThanOrEqual(1);
    }
  });

  it("the sitemap includes every guide and every comparison", () => {
    const paths = new Set(sitemapEntries().map((e) => e.path));
    for (const guide of GUIDES) {
      expect(paths.has(`/guides/${guide.slug}`), guide.slug).toBe(true);
    }
    for (const comparison of COMPARISONS) {
      expect(paths.has(`/compare/${comparison.id}`), comparison.id).toBe(true);
    }
  });

  it("the sitemap leaves out the pages we asked robots to skip", () => {
    const paths = sitemapEntries().map((e) => e.path);
    expect(paths).not.toContain("/sign-in");
    expect(paths).not.toContain("/forgot");
  });

  it("every internal link in the guides resolves to a real page", () => {
    for (const guide of GUIDES) {
      const text = [
        guide.cta.href,
        ...guide.blocks.map((b) =>
          b.kind === "ul" || b.kind === "ol" ? b.items.join(" ") : (b as { text: string }).text,
        ),
      ].join(" ");
      for (const link of internalLinksIn(text)) {
        expect(VALID_PATHS.has(link), `${guide.slug} → ${link}`).toBe(true);
      }
    }
  });
});

describe("marketingMeta", () => {
  const tags = marketingMeta({
    title: "Pricing",
    description: "What Laevo costs.",
    path: "/pricing",
    siteUrl: "https://laevo.us",
  });

  const find = (pred: (t: Record<string, unknown>) => boolean) =>
    tags.find((t) => pred(t as Record<string, unknown>)) as Record<string, unknown> | undefined;

  it("always produces a canonical URL", () => {
    const canonical = find((t) => t.rel === "canonical");
    expect(canonical?.href).toBe("https://laevo.us/pricing");
  });

  it("does not double the brand name on the home page", () => {
    const home = marketingMeta({
      title: "Laevo — software for food pantries",
      description: "x",
      path: "/",
      siteUrl: "https://laevo.us",
    });
    const title = home.find((t) => "title" in (t as object)) as { title: string };
    expect(title.title).toBe("Laevo — software for food pantries");
    expect(title.title.match(/Laevo/g)).toHaveLength(1);
  });

  it("suffixes the brand name everywhere else", () => {
    const title = find((t) => "title" in t) as { title: string } | undefined;
    expect(title?.title).toBe("Pricing — Laevo");
  });

  it("copes with a trailing slash on the site URL", () => {
    const tagsWithSlash = marketingMeta({
      title: "x",
      description: "y",
      path: "/pricing",
      siteUrl: "https://laevo.us/",
    });
    const canonical = tagsWithSlash.find(
      (t) => (t as Record<string, unknown>).rel === "canonical",
    ) as Record<string, unknown>;
    expect(canonical.href).toBe("https://laevo.us/pricing");
  });

  it("always sets a social preview image and card type", () => {
    expect(find((t) => t.property === "og:image")?.content).toContain("/og.svg");
    expect(find((t) => t.name === "twitter:card")?.content).toBe(
      "summary_large_image",
    );
  });

  it("marks private pages noindex", () => {
    const priv = marketingMeta({
      title: "Sign in",
      description: "x",
      path: "/sign-in",
      siteUrl: "https://laevo.us",
      noIndex: true,
    });
    const robots = priv.find(
      (t) => (t as Record<string, unknown>).name === "robots",
    ) as Record<string, unknown>;
    expect(robots.content).toBe("noindex,nofollow");
  });
});
