/**
 * The single source of truth for every number with a dollar sign on it.
 *
 * Money is integer cents. Never floats. Every surface — the pricing page, the
 * savings calculator, the comparison table, the billing gate, the emails —
 * reads from here, so the marketing site can never quote a price the product
 * does not charge.
 */

export type PlanId = "community" | "standard" | "network";

export interface Plan {
  id: PlanId;
  name: string;
  /** Monthly price in integer cents. */
  monthlyCents: number;
  /** Yearly price in integer cents. Ten months' money for twelve months. */
  yearlyCents: number;
  tagline: string;
  /** Households served per month included. null = no ceiling. */
  householdsPerMonth: number | null;
  /** Pantry locations included. null = no ceiling. */
  sites: number | null;
  features: string[];
  /** Shown under the price, in plain words. */
  honestCaveat: string | null;
}

export const PLANS: readonly Plan[] = [
  {
    id: "community",
    name: "Community",
    monthlyCents: 0,
    yearlyCents: 0,
    tagline: "Free forever. Not a trial.",
    householdsPerMonth: 400,
    sites: 1,
    features: [
      "Everything in Laevo — no locked features",
      "One pantry location",
      "Up to 400 households a month",
      "Neighbor records, visits, shelf counts, volunteer shifts",
      "TEFAP, CSFP and state report drafts",
      "Email support from a person",
    ],
    honestCaveat:
      "No credit card. If you outgrow it we will tell you before you hit the line, not after.",
  },
  {
    id: "standard",
    name: "Standard",
    monthlyCents: 1900,
    yearlyCents: 19000,
    tagline: "For a busy pantry that has outgrown free.",
    householdsPerMonth: null,
    sites: 1,
    features: [
      "Everything in Community",
      "No ceiling on households served",
      "One pantry location",
      "Priority email support, same day on weekdays",
      "We do your switch-over with you on a call",
    ],
    honestCaveat:
      "Month to month. Cancel in one click and export everything you put in.",
  },
  {
    id: "network",
    name: "Network",
    monthlyCents: 5900,
    yearlyCents: 59000,
    tagline: "For a food bank or a parish with several pantries.",
    householdsPerMonth: null,
    sites: null,
    features: [
      "Everything in Standard",
      "As many locations as you run",
      "One report across every location",
      "Each location keeps its own login and its own decisions",
      "Phone support",
    ],
    honestCaveat:
      "If you are a network of fewer than three pantries, Standard is almost certainly enough. Start there.",
  },
] as const;

export function planById(id: PlanId): Plan {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown plan: ${id}`);
  return plan;
}

export const FREE_PLAN = planById("community");

/**
 * What a pantry of this shape actually needs. Deliberately generous: when a
 * month is borderline we recommend the cheaper plan.
 */
export function planForUsage(householdsPerMonth: number, sites: number): Plan {
  if (sites > 1) return planById("network");
  if (householdsPerMonth <= (FREE_PLAN.householdsPerMonth ?? 0)) return FREE_PLAN;
  return planById("standard");
}

export function formatUsd(cents: number): string {
  if (cents === 0) return "$0";
  const dollars = cents / 100;
  return dollars % 1 === 0
    ? `$${dollars.toFixed(0)}`
    : `$${dollars.toFixed(2)}`;
}

/** Months of a yearly plan you get for free. Derived, never hardcoded in copy. */
export function yearlyFreeMonths(plan: Plan): number {
  if (plan.monthlyCents === 0) return 0;
  const monthsPaid = plan.yearlyCents / plan.monthlyCents;
  return Math.round(12 - monthsPaid);
}

/**
 * What pantries actually pay elsewhere, in cents per month.
 *
 * These are ranges reported by pantry operators and taken from public pricing
 * pages, not list-price marketing. `low`/`high` are honest bounds and the
 * comparison page shows both. If a vendor publishes a number that contradicts
 * one of these, the number here is what changes.
 */
export interface Alternative {
  id: string;
  name: string;
  lowCents: number;
  highCents: number;
  perUser: boolean;
  /** Where the alternative genuinely beats Laevo. Never left empty. */
  whereTheyWin: string;
  note: string;
}

export const ALTERNATIVES: readonly Alternative[] = [
  {
    id: "pantrysoft",
    name: "PantrySoft",
    lowCents: 7500,
    highCents: 15000,
    perUser: false,
    whereTheyWin:
      "Years of pantry-specific reporting refinement and a support team that has seen every state's paperwork. If your state auditor names a PantrySoft export by name, that is a real reason to stay.",
    note: "Base plan plus à la carte modules — advanced inventory, client portal, eligibility checks each add monthly cost.",
  },
  {
    id: "link2feed",
    name: "Link2Feed",
    lowCents: 9000,
    highCents: 15000,
    perUser: false,
    whereTheyWin:
      "Deep integration with several regional food bank networks. If your food bank requires Link2Feed reporting, switching may not be your decision to make.",
    note: "Priced per feature — case management, inventory and scheduling stack up separately.",
  },
  {
    id: "oasis",
    name: "Oasis Insight",
    lowCents: 2000,
    highCents: 6000,
    perUser: true,
    whereTheyWin:
      "Cross-agency client sharing inside a community network — several agencies seeing one shared record is genuinely useful and Laevo does not do it yet.",
    note: "Per user per month, so cost climbs with every volunteer who needs a login.",
  },
  {
    id: "diy",
    name: "Spreadsheets and a signup site",
    lowCents: 0,
    highCents: 9000,
    perUser: false,
    whereTheyWin:
      "Free, already understood by everyone on your team, and it will never surprise you with a change. For a pantry serving a dozen families a month this is the right answer and we will say so.",
    note: "Airtable or Sheets plus a volunteer signup tool, with nothing talking to anything else.",
  },
  {
    id: "paper",
    name: "Paper and a binder",
    lowCents: 0,
    highCents: 0,
    perUser: false,
    whereTheyWin:
      "Never goes down, needs no wifi, and no one has to learn it. The binder is not the enemy. The eleven hours of copying it into a report at quarter end is.",
    note: "Costs nothing in money. Costs volunteer evenings at reporting time.",
  },
] as const;

export function alternativeById(id: string): Alternative | undefined {
  return ALTERNATIVES.find((a) => a.id === id);
}

/** Midpoint of an alternative's honest range, for calculator defaults. */
export function typicalCents(alt: Alternative): number {
  return Math.round((alt.lowCents + alt.highCents) / 2);
}

export interface SavingsInput {
  alternativeId: string;
  /** Hours a week spent on counting, copying and chasing paperwork. */
  hoursPerWeek: number;
  /** What an hour of that person's time is worth, in cents. */
  hourlyValueCents: number;
  householdsPerMonth: number;
  sites: number;
}

export interface SavingsResult {
  plan: Plan;
  laevoMonthlyCents: number;
  currentMonthlyCents: number;
  softwareSavedMonthlyCents: number;
  hoursSavedMonthly: number;
  timeValueSavedMonthlyCents: number;
  totalAnnualSavedCents: number;
}

/**
 * How much less a pantry would spend, in money and in evenings.
 *
 * The time figure assumes a third of the manual hours come back, not half.
 * We would rather be low and right than high and impressive: a pantry that
 * beats our estimate stays, one that misses it stops trusting us.
 */
export const TIME_RECLAIMED_SHARE = 0.33;
const WEEKS_PER_MONTH = 52 / 12;

export function calculateSavings(input: SavingsInput): SavingsResult {
  const alt = alternativeById(input.alternativeId);
  const hours = Math.max(0, input.hoursPerWeek || 0);
  const rate = Math.max(0, input.hourlyValueCents || 0);
  const households = Math.max(0, input.householdsPerMonth || 0);
  const sites = Math.max(1, input.sites || 1);

  const plan = planForUsage(households, sites);
  const laevoMonthlyCents = plan.monthlyCents;
  const currentMonthlyCents = alt ? typicalCents(alt) : 0;
  const softwareSavedMonthlyCents = Math.max(
    0,
    currentMonthlyCents - laevoMonthlyCents,
  );

  const hoursSavedMonthly =
    Math.round(hours * WEEKS_PER_MONTH * TIME_RECLAIMED_SHARE * 10) / 10;
  const timeValueSavedMonthlyCents = Math.round(hoursSavedMonthly * rate);
  const totalAnnualSavedCents =
    (softwareSavedMonthlyCents + timeValueSavedMonthlyCents) * 12;

  return {
    plan,
    laevoMonthlyCents,
    currentMonthlyCents,
    softwareSavedMonthlyCents,
    hoursSavedMonthly,
    timeValueSavedMonthlyCents,
    totalAnnualSavedCents,
  };
}

/**
 * The free allowance before the billing gate asks for a card. Separate from
 * plan limits: this is about what a brand-new pantry gets while deciding.
 */
export const GRACE_HOUSEHOLDS = 400;
export const GRACE_DAYS = 60;
