/**
 * Honest comparison pages.
 *
 * House rule, enforced by a test: every comparison must name at least one
 * thing the other tool does better, in specific terms, and must say plainly
 * when a reader should not switch. A comparison page where the competitor
 * never wins is an advertisement wearing a comparison's clothes, and readers
 * can tell.
 *
 * Prices come from pricing.ts so this page cannot quote a figure the pricing
 * page disagrees with.
 */
import { ALTERNATIVES, type Alternative } from "~/lib/pricing";

export interface Comparison {
  id: string;
  h1: string;
  description: string;
  /** How the reader most likely arrived here. */
  intro: string[];
  /** Specific, concrete, no hedging. */
  stayIf: string[];
  switchIf: string[];
  rows: Array<{ feature: string; them: string; laevo: string }>;
  verdict: string;
}

export const COMPARISONS: readonly Comparison[] = [
  {
    id: "pantrysoft",
    h1: "Laevo compared with PantrySoft",
    description:
      "An honest comparison of Laevo and PantrySoft for food pantries: real monthly cost, what PantrySoft does better, and when you should not switch.",
    intro: [
      "PantrySoft is one of the two or three names every pantry organizer has heard, and for good reason — it has been doing this a long time and it knows the paperwork.",
      "The complaint we hear is not that it is bad. It is that the price on the page is not the price you pay: the base plan plus advanced inventory plus the client portal plus eligibility checking plus the annual support renewal is a very different number, and most pantries with a full setup land somewhere between seventy-five and a hundred and fifty dollars a month.",
    ],
    stayIf: [
      "Your state agency or food bank names a PantrySoft export in its reporting instructions. Do not fight that for nineteen dollars.",
      "You use their eligibility and income verification modules and your program genuinely requires that documentation. Laevo deliberately does not have this, because most pantries collect more than their program asks for.",
      "You have staff who know it well and a distribution running smoothly. Working software you understand beats better software you do not.",
    ],
    switchIf: [
      "You are paying for modules you were told were included.",
      "Your volunteers are older and struggle with the interface. This is the difference people notice fastest.",
      "You are a small pantry paying a big-pantry price for features you have never opened.",
    ],
    rows: [
      {
        feature: "Real monthly cost, full setup",
        them: "$75–150 with common add-ons",
        laevo: "$0–59, everything included",
      },
      { feature: "Per-user fees", them: "No, but modules are à la carte", laevo: "Never" },
      {
        feature: "Designed for low digital confidence",
        them: "Conventional business software interface",
        laevo: "The primary design constraint",
      },
      {
        feature: "Depth of compliance reporting",
        them: "Very deep, many years of refinement",
        laevo: "Common programs drafted; less breadth",
      },
      { feature: "Eligibility and income verification", them: "Yes, as a paid module", laevo: "Deliberately not built" },
      { feature: "Data export", them: "Available", laevo: "One click, everything, always free" },
    ],
    verdict:
      "If your reporting is unusual or your state names PantrySoft directly, stay. If you are a volunteer-run pantry paying à la carte for a system your team finds hard, Laevo will cost you less in both money and Saturdays.",
  },
  {
    id: "link2feed",
    h1: "Laevo compared with Link2Feed",
    description:
      "An honest comparison of Laevo and Link2Feed: per-feature pricing, food bank network requirements, and when switching is not actually your decision.",
    intro: [
      "Link2Feed is deeply embedded in several regional food bank networks, and that is its real strength — if your food bank runs on it, your data flows where it needs to go without anyone doing anything.",
      "Its pricing is per feature, so case management plus inventory plus scheduling stack up quickly. Pantries commonly describe landing above ninety dollars a month once they have the pieces they actually need.",
    ],
    stayIf: [
      "Your food bank requires Link2Feed reporting. This is the most common situation and switching may not be your decision to make — ask them before you spend an evening on it.",
      "You benefit from network-level aggregation across many agencies in your region.",
      "You need the case management depth for wraparound services beyond food.",
    ],
    switchIf: [
      "You are an independent pantry paying for a network integration you do not use.",
      "You bought three features separately and only use one and a half.",
      "Your volunteers find it heavy, which is the usual complaint from a small team.",
    ],
    rows: [
      { feature: "Real monthly cost", them: "$90–150 across features", laevo: "$0–59, everything included" },
      { feature: "Pricing model", them: "Per feature", laevo: "One price, all features" },
      { feature: "Food bank network integration", them: "Strong in several regions", laevo: "None — this is a real gap" },
      { feature: "Case management beyond food", them: "Yes", laevo: "No" },
      { feature: "Setup effort", them: "Moderate to high", laevo: "An hour, or an afternoon with an import" },
      { feature: "Built for low digital confidence", them: "Not the design centre", laevo: "The design centre" },
    ],
    verdict:
      "If your food bank mandates it, the comparison is over and you should stay. If you are independent and paying per feature, Laevo does the pantry-side work for a fraction of it — but it will not talk to your food bank's system, and that is a genuine loss you should weigh.",
  },
  {
    id: "oasis",
    h1: "Laevo compared with Oasis Insight",
    description:
      "An honest comparison of Laevo and Oasis Insight: per-user pricing, cross-agency client sharing, and the one thing Oasis does that Laevo cannot.",
    intro: [
      "Oasis Insight does something genuinely valuable that Laevo does not do at all: it lets several agencies in a community see a shared record for the same household, so a family is not telling their story four times in one week.",
      "Its pricing is per user per month, which is where pantries feel it. Reviewers commonly report an effective sixty dollars a month once enough volunteers have logins — and the pressure that creates is to give fewer people logins, which is exactly the wrong direction.",
    ],
    stayIf: [
      "You are part of a community network sharing client records across agencies. Laevo has nothing equivalent and we would be misleading you to suggest otherwise.",
      "Your county coordinates services through Oasis and your participation is expected.",
    ],
    switchIf: [
      "You are a standalone pantry paying per user for a network feature you do not use.",
      "You have started sharing logins to keep the bill down, which is a security problem and an accountability problem at once.",
      "Most of your team are volunteers who each need occasional access.",
    ],
    rows: [
      { feature: "Pricing model", them: "Per user, per month", laevo: "Flat, unlimited people" },
      { feature: "Typical monthly cost", them: "$20–60 depending on logins", laevo: "$0–59 regardless of logins" },
      { feature: "Cross-agency client sharing", them: "Yes — its main strength", laevo: "No" },
      { feature: "Shelf and expiry tracking", them: "Limited", laevo: "Built in, with plain warnings" },
      { feature: "Volunteer shifts", them: "Not the focus", laevo: "Built in, with a public signup link" },
      { feature: "Cost of adding a volunteer", them: "Another monthly charge", laevo: "Nothing" },
    ],
    verdict:
      "Cross-agency sharing is a real thing Oasis does and we do not. If you use it, stay. If you are paying per user for software you use alone, you are paying for a network of one.",
  },
  {
    id: "diy",
    h1: "Laevo compared with spreadsheets and a signup site",
    description:
      "An honest comparison of Laevo and the do-it-yourself stack: Airtable or Sheets plus a volunteer signup tool. When the spreadsheet is genuinely the right answer.",
    intro: [
      "Most pantries run on some version of this: a spreadsheet for neighbors, another for the shelf, and a signup site for shifts. It is free or nearly free, everyone understands it, and it will never change under you.",
      "We are not going to pretend that is a bad choice. For a small pantry it is often the correct one, and a tool that makes you learn something new to do what you already do fine is not an improvement.",
    ],
    stayIf: [
      "You serve a few dozen households a month and the reporting is an hour, not an evening.",
      "One person maintains it, that person is comfortable with it, and there is no succession problem.",
      "You have no external reporting obligations beyond a simple count.",
    ],
    switchIf: [
      "Two people have edited the same sheet and you have two versions of the truth.",
      "Quarter end takes an evening of counting rows.",
      "Nothing warns you about anything — no expiry, no low stock, no volunteer reminders.",
      "The person who built it is the only one who understands it, and they are tired.",
    ],
    rows: [
      { feature: "Cost", them: "$0–90 depending on tiers", laevo: "$0–59" },
      { feature: "Learning curve", them: "None — everyone knows it", laevo: "An hour" },
      { feature: "Two people at once", them: "Fragile", laevo: "Fine, on any number of devices" },
      { feature: "Warnings about expiry or low stock", them: "None", laevo: "On the screen you already use" },
      { feature: "Report drafting", them: "You count it yourself", laevo: "Drafted, with the working shown" },
      { feature: "Duplicate detection", them: "None", laevo: "Flags likely matches and asks you" },
      { feature: "Data ownership", them: "Total — it is your file", laevo: "Export in one click, whole" },
    ],
    verdict:
      "Under about fifty households a month, stay on the spreadsheet and spend the hour on something else. Above that, or with more than one person editing, the spreadsheet stops being free — it just moves the cost onto whoever does the counting.",
  },
  {
    id: "paper",
    h1: "Laevo compared with paper and a binder",
    description:
      "An honest comparison of Laevo and running a pantry on paper. What paper does better than any software, and the single point where it starts costing you.",
    intro: [
      "Paper never goes down, never needs wifi, never updates itself at nine on a Saturday morning, and nobody has to be taught it. It is genuinely good technology and it deserves more respect than software companies usually give it.",
      "It has exactly one cost, and it arrives all at once at the end of the quarter.",
    ],
    stayIf: [
      "You have no reporting obligation beyond a number you can count on one page.",
      "Your volunteers are firmly not going to use a device, and you would rather keep them than change the system. This is a completely legitimate trade and we would make it too.",
      "Your wifi is genuinely unreliable — Laevo needs a connection to save a visit.",
    ],
    switchIf: [
      "Somebody is spending an evening at quarter end turning the binder into a form.",
      "You cannot answer \"how many households did we serve in March\" without counting.",
      "Food is going off because nobody can see what is closest to its date.",
      "You are being asked the same questions of the same families at every visit because there is no record to look at.",
    ],
    rows: [
      { feature: "Cost", them: "Free", laevo: "$0–59" },
      { feature: "Works without power or wifi", them: "Always", laevo: "No — keep the paper" },
      { feature: "Training needed", them: "None", laevo: "About an hour" },
      { feature: "Answering a question about last quarter", them: "Counting", laevo: "Immediate" },
      { feature: "Report preparation", them: "An evening", laevo: "Print and check" },
      { feature: "Two people at once", them: "One binder, one person", laevo: "As many as you like" },
    ],
    verdict:
      "The binder is not the enemy. The eleven hours of copying it into a report at quarter end is. If those hours do not exist for you, stay on paper with our blessing — and either way, keep the binder as your fallback.",
  },
] as const;

export function comparisonById(id: string): Comparison | undefined {
  return COMPARISONS.find((c) => c.id === id);
}

export function alternativeFor(comparison: Comparison): Alternative | undefined {
  return ALTERNATIVES.find((a) => a.id === comparison.id);
}
