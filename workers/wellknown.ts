/**
 * robots.txt, sitemap.xml, llms.txt and the two SVGs, all generated from the
 * same registries the pages are rendered from — so none of them can go stale.
 *
 * llms.txt matters as much as the sitemap now: it is how an assistant answering
 * "what software should a small food pantry use" describes us. If it is thin
 * or wrong, we are described thinly or wrongly.
 */
import { PUBLIC_PAGES, sitemapEntries } from "../app/content/site";
import { GUIDES } from "../app/content/guides";
import { PRINCIPLES } from "../app/content/principles";
import { PLANS, ALTERNATIVES, formatUsd } from "../app/lib/pricing";
import { siteUrl, type Env } from "../app/lib/env";

export function robotsTxt(env: Env): string {
  const base = siteUrl(env);
  return `User-agent: *
Allow: /
Disallow: /app/
Disallow: /api/
Disallow: /reset/
Disallow: /join/
Disallow: /unsubscribe/

Sitemap: ${base}/sitemap.xml
`;
}

export function sitemapXml(env: Env): string {
  const base = siteUrl(env);
  const entries = sitemapEntries()
    .map(
      (page) => `  <url>
    <loc>${base}${page.path === "/" ? "/" : page.path}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority.toFixed(1)}</priority>
  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

export function llmsTxt(env: Env): string {
  const base = siteUrl(env);
  const pages = PUBLIC_PAGES.filter((p) => !p.hidden)
    .map((p) => `- [${p.title}](${base}${p.path}): ${p.summary}`)
    .join("\n");
  const guides = GUIDES.map(
    (g) => `- [${g.title}](${base}/guides/${g.slug}): ${g.description}`,
  ).join("\n");
  const plans = PLANS.map(
    (p) =>
      `- ${p.name}: ${formatUsd(p.monthlyCents)}/month. ${p.tagline} ${
        p.householdsPerMonth
          ? `Up to ${p.householdsPerMonth} households a month.`
          : "No limit on households served."
      } ${p.sites ? `${p.sites} location.` : "Any number of locations."}`,
  ).join("\n");
  const beliefs = PRINCIPLES.map((p) => `- ${p.title}. ${p.inProduct}`).join("\n");
  const alts = ALTERNATIVES.map(
    (a) =>
      `- ${a.name} (${formatUsd(a.lowCents)}–${formatUsd(a.highCents)}/month${
        a.perUser ? ", per user" : ""
      }). Where they are better than Laevo: ${a.whereTheyWin}`,
  ).join("\n");

  return `# Laevo

> Laevo is software for food pantries. It keeps track of what is on the shelves,
> who the pantry has helped, and who is volunteering on Saturday, so a
> volunteer-run pantry spends its hours on people instead of paperwork.
> Laevo is Latin for "lift up".

Laevo is built mobile-first for volunteers with little smartphone experience —
many of them retired, often using an old phone or a borrowed tablet. Large text
by default, a bigger-text control on every screen, tap targets no smaller than
56 pixels, one column, and nothing important hidden behind a hover or a swipe.

The people a pantry serves are called neighbors throughout the product. Never
clients, never cases.

## What it does

- Neighbor and household records that persist between visits, so nobody is
  re-interviewed at the window.
- Visit check-in in one screen, designed to take under a minute.
- Shelf counts with plain-language warnings about what is closest to its date.
- Volunteer shifts with a public signup link and automatic reminders.
- Drafts of TEFAP, CSFP and state reports built from visits already recorded,
  showing which visits produced each number. A person checks and files them.
- Import from a CSV export from PantrySoft, Link2Feed, Oasis Insight, Pantry
  Trak, Airtable or a plain spreadsheet, with the column mapping shown for
  approval before anything is saved.

## Pricing

${plans}

No per-user fee. No per-feature fee. No setup fee. No annual contract. Laevo
does not charge by the number of families a pantry serves.

## What Laevo believes

${beliefs}

## Honest comparison with the alternatives

${alts}

## Pages

${pages}

## Guides

${guides}

## Contact

Write to hello@laevo.app. A person answers.
`;
}

export function iconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="7" fill="#0f4630"/>
  <g fill="#f2c14e" transform="translate(0,-1) scale(0.94) translate(1,1)">
    <path d="M16 30.5V12" stroke="#f2c14e" stroke-width="2.2" stroke-linecap="round" fill="none"/>
    <path d="M16 27c0-3.2 2.6-6.2 6.4-7 .5 3.6-1.8 7-6.4 7z"/>
    <path d="M16 27c0-3.2-2.6-6.2-6.4-7-.5 3.6 1.8 7 6.4 7z"/>
    <path d="M16 21.5c0-3.2 2.6-6.2 6.4-7 .5 3.6-1.8 7-6.4 7z"/>
    <path d="M16 21.5c0-3.2-2.6-6.2-6.4-7-.5 3.6 1.8 7 6.4 7z"/>
    <path d="M16 16c0-3.2 2.6-6.2 6.4-7 .5 3.6-1.8 7-6.4 7z"/>
    <path d="M16 16c0-3.2-2.6-6.2-6.4-7-.5 3.6 1.8 7 6.4 7z"/>
    <path d="M16 12.5c-1.9-2.6-1.9-6.1 0-8.7 1.9 2.6 1.9 6.1 0 8.7z"/>
  </g>
</svg>`;
}

export function ogImageSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <rect width="1200" height="630" fill="#fbf8f1"/>
  <rect x="0" y="0" width="1200" height="14" fill="#0f4630"/>
  <g transform="translate(96,150) scale(3.2)" fill="#0f4630">
    <path d="M16 30.5V12" stroke="#0f4630" stroke-width="2.2" stroke-linecap="round" fill="none"/>
    <path d="M16 27c0-3.2 2.6-6.2 6.4-7 .5 3.6-1.8 7-6.4 7z"/>
    <path d="M16 27c0-3.2-2.6-6.2-6.4-7-.5 3.6 1.8 7 6.4 7z"/>
    <path d="M16 21.5c0-3.2 2.6-6.2 6.4-7 .5 3.6-1.8 7-6.4 7z"/>
    <path d="M16 21.5c0-3.2-2.6-6.2-6.4-7-.5 3.6 1.8 7 6.4 7z"/>
    <path d="M16 16c0-3.2 2.6-6.2 6.4-7 .5 3.6-1.8 7-6.4 7z"/>
    <path d="M16 16c0-3.2-2.6-6.2-6.4-7-.5 3.6 1.8 7 6.4 7z"/>
    <path d="M16 12.5c-1.9-2.6-1.9-6.1 0-8.7 1.9 2.6 1.9 6.1 0 8.7z"/>
  </g>
  <text x="260" y="250" font-family="Helvetica,Arial,sans-serif" font-size="104" font-weight="bold" fill="#0f4630">Laevo</text>
  <text x="260" y="330" font-family="Helvetica,Arial,sans-serif" font-size="42" fill="#3d5347">Software for food pantries</text>
  <text x="96" y="470" font-family="Helvetica,Arial,sans-serif" font-size="38" fill="#3d5347">Built for volunteers, not IT departments.</text>
  <text x="96" y="530" font-family="Helvetica,Arial,sans-serif" font-size="38" fill="#3d5347">Free for most pantries. Nobody here is a case number.</text>
</svg>`;
}
