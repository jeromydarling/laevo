/**
 * Structured data. Search engines and assistants both read it; keeping it
 * generated from the same registries as the pages means it cannot drift.
 */
import { PLANS, formatUsd } from "./pricing";
import { DEFAULT_DESCRIPTION, SITE_NAME } from "./meta";

export function organizationLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl,
    logo: `${siteUrl}/icon.svg`,
    description: DEFAULT_DESCRIPTION,
    slogan: "Lift up.",
    knowsAbout: [
      "food pantry management",
      "food bank reporting",
      "TEFAP reporting",
      "volunteer scheduling",
      "food insecurity",
    ],
  };
}

export function webSiteLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteUrl,
    description: DEFAULT_DESCRIPTION,
  };
}

export function softwareApplicationLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    url: siteUrl,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Food pantry management",
    operatingSystem: "Any modern web browser",
    description: DEFAULT_DESCRIPTION,
    offers: PLANS.map((plan) => ({
      "@type": "Offer",
      name: plan.name,
      price: (plan.monthlyCents / 100).toFixed(2),
      priceCurrency: "USD",
      description: `${plan.tagline} ${formatUsd(plan.monthlyCents)} a month.`,
    })),
    featureList: [
      "Neighbor records and household history",
      "Visit check-in",
      "Shelf counts and expiry warnings",
      "Volunteer shifts and reminders",
      "TEFAP and CSFP report drafts",
      "Import from an existing system",
    ],
  };
}

export function faqLd(faq: ReadonlyArray<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function articleLd(opts: {
  siteUrl: string;
  path: string;
  title: string;
  description: string;
  updated: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.title,
    description: opts.description,
    dateModified: opts.updated,
    mainEntityOfPage: `${opts.siteUrl}${opts.path}`,
    author: { "@type": "Organization", name: SITE_NAME, url: opts.siteUrl },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${opts.siteUrl}/icon.svg` },
    },
  };
}

export function breadcrumbLd(
  siteUrl: string,
  trail: ReadonlyArray<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${siteUrl}${item.path}`,
    })),
  };
}
