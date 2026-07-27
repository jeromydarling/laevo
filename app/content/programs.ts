/**
 * The report presets.
 *
 * The marketing site names TEFAP and CSFP, so the product has to know what
 * they are rather than offering one generic count. Each preset says which
 * figures that programme actually asks for and, just as usefully, what it
 * does not ask for — because most pantries collect more than their programme
 * requires and nobody has ever told them they could stop.
 *
 * None of these files anything. Laevo drafts the numbers and shows its
 * working; a person checks them and signs them, because a person is
 * accountable for them.
 */

export type FigureKey =
  | "households"
  | "individuals"
  | "visits"
  | "firstTime"
  | "children"
  | "adults"
  | "seniors";

export interface Program {
  id: string;
  name: string;
  full: string;
  /** Which figures to show, in the order the form usually wants them. */
  figures: FigureKey[];
  /** One plain sentence about what this programme is. */
  what: string;
  /** What it does not require, so pantries can stop collecting it. */
  doesNotNeed: string;
  /** Where the real rules live. We are not the authority and say so. */
  authority: string;
}

export const PROGRAMS: readonly Program[] = [
  {
    id: "TEFAP",
    name: "TEFAP",
    full: "The Emergency Food Assistance Program",
    figures: ["households", "individuals", "firstTime", "children", "adults", "seniors"],
    what: "USDA commodities distributed through your state agency. The household and individual counts below are the core of the usual quarterly return.",
    doesNotNeed:
      "In most states TEFAP uses a self-declaration of need rather than proof of income, and does not require you to keep copies of identification. If you are collecting either, check whether your state actually asks for it.",
    authority:
      "Your state agency sets the form, the reporting period and the record retention. Get those three things from them in writing.",
  },
  {
    id: "CSFP",
    name: "CSFP",
    full: "Commodity Supplemental Food Program",
    figures: ["households", "seniors", "visits", "firstTime"],
    what: "Monthly food packages for people aged 60 and over. The figure that matters most is the senior count.",
    doesNotNeed:
      "CSFP is age-based, so household composition beyond the senior count is rarely required. If your form does not ask for children, you do not need to collect it for this programme.",
    authority:
      "Your state agency, and the caseload slots you have been allocated.",
  },
  {
    id: "STATE",
    name: "State or county",
    full: "State or county food programme",
    figures: ["households", "individuals", "visits", "firstTime", "children", "adults", "seniors"],
    what: "The general-purpose return most state and county funders ask for. Everything Laevo can count, in one place.",
    doesNotNeed:
      "Varies more than any other line on this page. Ask your programme officer for the actual form before collecting anything extra.",
    authority: "Whoever sends you the money.",
  },
  {
    id: "FOOD_BANK",
    name: "Food bank",
    full: "Food bank partner agency report",
    figures: ["households", "individuals", "visits"],
    what: "The monthly numbers most regional food banks want from a partner agency, usually alongside poundage they already know.",
    doesNotNeed:
      "Your food bank normally has its own record of what it sent you, so you rarely need to report what you received back to them.",
    authority: "Your partner agency agreement.",
  },
  {
    id: "GRANT",
    name: "Grant or board",
    full: "Grant application or board report",
    figures: ["households", "individuals", "visits", "firstTime", "children", "seniors"],
    what: "For a funding application or a board meeting. First-time households is the number that shows how demand is changing, and it is usually the most persuasive figure you have.",
    doesNotNeed:
      "Nothing is mandatory here — this is your story to tell. Volunteer hours are on the rota page and count as in-kind match on most applications.",
    authority: "You.",
  },
] as const;

export function programById(id: string): Program | undefined {
  return PROGRAMS.find((p) => p.id === id);
}

export const FIGURE_LABELS: Record<FigureKey, string> = {
  households: "Households served",
  individuals: "Individuals served",
  visits: "Visits in total",
  firstTime: "First-time households",
  children: "Children under 18",
  adults: "Adults 18–59",
  seniors: "Adults 60 and over",
};
