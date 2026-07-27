/**
 * One helper produces every public page's head tags, so no page can quietly
 * ship without a canonical URL or a social preview.
 *
 * React Router gotcha worth remembering: meta() receives `loaderData`, not
 * `data`. Every public loader therefore returns `{ siteUrl }`.
 */
import type { MetaDescriptor } from "react-router";

export const SITE_NAME = "Laevo";
export const SITE_TAGLINE = "Software for food pantries";
export const DEFAULT_DESCRIPTION =
  "Laevo keeps track of what is on your shelves, who you have helped, and who is coming in on Saturday — so a volunteer-run food pantry can spend its hours on people instead of paperwork.";

export interface MarketingMetaInput {
  title: string;
  description: string;
  /** Path with a leading slash. */
  path: string;
  siteUrl: string;
  image?: string;
  /** Set on guides so search engines see them as articles. */
  type?: "website" | "article";
  publishedTime?: string;
  noIndex?: boolean;
}

export function marketingMeta(input: MarketingMetaInput): MetaDescriptor[] {
  const base = input.siteUrl.replace(/\/$/, "");
  const canonical = `${base}${input.path === "/" ? "" : input.path}` || base;
  const image = input.image ?? `${base}/og.svg`;
  const fullTitle =
    input.path === "/"
      ? `${input.title}`
      : `${input.title} — ${SITE_NAME}`;

  const tags: MetaDescriptor[] = [
    { title: fullTitle },
    { name: "description", content: input.description },
    { tagName: "link", rel: "canonical", href: canonical },

    { property: "og:site_name", content: SITE_NAME },
    { property: "og:type", content: input.type ?? "website" },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: input.description },
    { property: "og:url", content: canonical },
    { property: "og:image", content: image },
    { property: "og:locale", content: "en_US" },

    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: input.description },
    { name: "twitter:image", content: image },
  ];

  if (input.publishedTime) {
    tags.push({ property: "article:published_time", content: input.publishedTime });
  }
  if (input.noIndex) {
    tags.push({ name: "robots", content: "noindex,nofollow" });
  }

  return tags;
}
