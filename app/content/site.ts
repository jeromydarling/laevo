/**
 * The registry of public pages.
 *
 * sitemap.xml and llms.txt are generated from this, and a test checks that
 * every internal link anywhere in the content resolves to something here. A
 * page that exists but is not listed is a page nobody will find.
 */
import { GUIDES } from "./guides";

export interface PublicPage {
  path: string;
  title: string;
  /** One plain sentence, reused in llms.txt. */
  summary: string;
  changefreq: "daily" | "weekly" | "monthly" | "yearly";
  priority: number;
  /** Excluded from sitemap but still a valid internal link target. */
  hidden?: boolean;
}

export const PUBLIC_PAGES: readonly PublicPage[] = [
  {
    path: "/",
    title: "Laevo — software for food pantries",
    summary:
      "What Laevo is, who it is for, what it costs, and what it believes about the people a pantry serves.",
    changefreq: "weekly",
    priority: 1.0,
  },
  {
    path: "/why",
    title: "What Laevo is built on",
    summary:
      "The ten beliefs behind the product, each paired with the specific thing the software does or refuses to do because of it.",
    changefreq: "monthly",
    priority: 0.9,
  },
  {
    path: "/how-it-works",
    title: "What using Laevo actually looks like",
    summary:
      "A walk through a pantry's week in Laevo: the shelf, the window, the rota, and the report at the end of the month.",
    changefreq: "monthly",
    priority: 0.9,
  },
  {
    path: "/for-volunteers",
    title: "Built for volunteers who do not love computers",
    summary:
      "Why Laevo is designed for a seventy-three-year-old volunteer on a borrowed phone, and exactly what that changed in the product.",
    changefreq: "monthly",
    priority: 0.9,
  },
  {
    path: "/pricing",
    title: "Pricing",
    summary:
      "Three plans: free forever for most pantries, $19 a month for a busy one, $59 a month for a network. No per-user fee, no setup fee, no charge per family served.",
    changefreq: "monthly",
    priority: 0.9,
  },
  {
    path: "/compare",
    title: "Laevo compared with what you use now",
    summary:
      "Honest comparisons with PantrySoft, Link2Feed, Oasis Insight, spreadsheets and paper — including where each of them genuinely beats Laevo.",
    changefreq: "monthly",
    priority: 0.8,
  },
  {
    path: "/switch",
    title: "Switching from what you use now",
    summary:
      "How to move existing neighbor and shelf records into Laevo from a CSV export, and what we do not promise about it.",
    changefreq: "monthly",
    priority: 0.7,
  },
  {
    path: "/guides",
    title: "Guides for people who run food pantries",
    summary:
      "Practical writing on starting a pantry, TEFAP reporting, food waste, volunteers, and treating people well at the window.",
    changefreq: "weekly",
    priority: 0.8,
  },
  {
    path: "/accessibility",
    title: "Accessibility",
    summary:
      "What Laevo does for people with low vision, shaky hands, low digital confidence, and old devices — and what it does not do yet.",
    changefreq: "monthly",
    priority: 0.6,
  },
  {
    path: "/about",
    title: "About Laevo",
    summary: "Who builds Laevo, why, and how it stays running.",
    changefreq: "monthly",
    priority: 0.6,
  },
  {
    path: "/contact",
    title: "Contact",
    summary: "Write to a person. Replies come from a human being.",
    changefreq: "yearly",
    priority: 0.5,
  },
  {
    path: "/privacy",
    title: "Privacy",
    summary:
      "What Laevo stores, who can see it, how long it is kept, and what is never done with it.",
    changefreq: "yearly",
    priority: 0.4,
  },
  {
    path: "/terms",
    title: "Terms",
    summary: "The agreement between your pantry and Laevo, in short sentences.",
    changefreq: "yearly",
    priority: 0.4,
  },
  {
    path: "/demo",
    title: "Try the demo pantry",
    summary:
      "A working pantry with real-looking records, open to anyone, no signup and no email address required.",
    changefreq: "monthly",
    priority: 0.8,
  },
  {
    path: "/sign-up",
    title: "Start a pantry account",
    summary: "Create an account for your pantry. No card, no sales call.",
    changefreq: "yearly",
    priority: 0.7,
  },
  {
    path: "/sign-in",
    title: "Sign in",
    summary: "Sign in to your pantry's Laevo account.",
    changefreq: "yearly",
    priority: 0.3,
    hidden: true,
  },
  {
    path: "/forgot",
    title: "Forgotten password",
    summary: "Get a link to set a new password.",
    changefreq: "yearly",
    priority: 0.2,
    hidden: true,
  },
] as const;

/** Every valid internal link target, including generated ones. */
export function allPublicPaths(): string[] {
  return [
    ...PUBLIC_PAGES.map((p) => p.path),
    ...GUIDES.map((g) => `/guides/${g.slug}`),
    ...["pantrysoft", "link2feed", "oasis", "diy", "paper"].map(
      (id) => `/compare/${id}`,
    ),
  ];
}

export function sitemapEntries(): PublicPage[] {
  const guides: PublicPage[] = GUIDES.map((g) => ({
    path: `/guides/${g.slug}`,
    title: g.title,
    summary: g.description,
    changefreq: "monthly" as const,
    priority: 0.7,
  }));
  const comparisons: PublicPage[] = [
    "pantrysoft",
    "link2feed",
    "oasis",
    "diy",
    "paper",
  ].map((id) => ({
    path: `/compare/${id}`,
    title: `Laevo compared with ${id}`,
    summary: `An honest comparison, including where they win.`,
    changefreq: "monthly" as const,
    priority: 0.6,
  }));
  return [...PUBLIC_PAGES.filter((p) => !p.hidden), ...guides, ...comparisons];
}
