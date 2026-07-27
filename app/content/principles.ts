/**
 * What Laevo is built on.
 *
 * These are not slogans. Each one names a belief, then names the specific
 * product decision that falls out of it — because a value you cannot point at
 * in the software is a value you do not actually hold. If a principle here
 * ever stops matching what the product does, the product changes or the
 * principle comes down.
 */

export interface Principle {
  id: string;
  /** The plain-words headline. */
  title: string;
  /** Two or three sentences. No abstraction that a volunteer would not use. */
  body: string;
  /** The concrete thing Laevo does, or refuses to do, because of it. */
  inProduct: string;
  /** Shown on the home page grid. The rest live on /why. */
  onHome: boolean;
}

export const PRINCIPLES: readonly Principle[] = [
  {
    id: "not-a-case",
    title: "Nobody who comes to your door is a case",
    body: "A person standing at a pantry window on a Tuesday is having a hard month, not a permanent condition. They have a name, a family, and somewhere else they would rather be. The record you keep about them should read like a neighbor's name in a book, not a file number in a system.",
    inProduct:
      "Laevo calls them neighbors, everywhere, with no setting to change it. There is no risk score, no flag, no colour-coded status on a human being. The notes field is for what helps you help them, and it belongs to your pantry alone.",
    onHome: true,
  },
  {
    id: "hardest-week",
    title: "Build for the person having the hardest week",
    body: "Most software is designed for the confident user with a good phone and a quiet room. Almost nobody at a food pantry is that person. The volunteer is seventy-three and borrowed her grandson's tablet. The neighbor is embarrassed and in a hurry and it is raining.",
    inProduct:
      "Every screen works on a five-year-old phone, one-handed, in one column, with buttons big enough to hit while holding a box. Text starts large and gets larger with one tap. Nothing important is hidden behind a hover, a swipe, or a menu.",
    onHome: true,
  },
  {
    id: "not-a-reward",
    title: "Food is not a reward for good behavior",
    body: "Eating is not something a person earns by filling in a form correctly. A pantry may have paperwork it is required to file, and that is real, but the paperwork exists to serve the food — never the other way around.",
    inProduct:
      "A neighbor can be served first and recorded afterward. No required field ever stands between a person and a bag of groceries. Every field except a name is optional, and the ones your funder demands are marked as theirs, not ours.",
    onHome: true,
  },
  {
    id: "closest-decide",
    title: "The people closest to the work make the decisions",
    body: "Nobody at a software company knows whether your pantry should be choice-model or pre-bagged, whether to serve people from the next county, or how often a family can come. Those are judgements made by people who know the street, and they are not ours to make.",
    inProduct:
      "Laevo has no built-in eligibility rules and will not enforce a visit limit unless you set one yourself. Defaults are suggestions with an off switch. Your data exports whole, in one click, forever — including on the day you leave us.",
    onHome: true,
  },
  {
    id: "volunteer-time",
    title: "A volunteer's Saturday is not free",
    body: "Unpaid does not mean worthless. Every hour someone spends copying numbers off a clipboard into a spreadsheet is an hour they did not spend talking to somebody who needed to be talked to, or an hour they did not spend at home.",
    inProduct:
      "We count the minutes a task takes and we treat that as a real cost. Check-in is one screen. The monthly report drafts itself from what you already recorded. If a feature adds a step without removing two, it does not ship.",
    onHome: true,
  },
  {
    id: "second-loss",
    title: "Food thrown away is a loss twice over",
    body: "Somebody grew it, somebody gave it, somebody drove it across town — and then it sat behind the newer cases until it went off. That is not just wasted food. It is wasted work and wasted generosity, and it is almost always a tracking problem rather than a caring problem.",
    inProduct:
      "Laevo warns you about what is closest to its date before it becomes a problem, in plain words, on the shelf screen you already look at. Not a report you have to remember to run.",
    onHome: true,
  },
  {
    id: "not-alone",
    title: "Nobody does this alone",
    body: "A pantry is held up by a food bank, a hall somebody lends them, a grocery manager who sets aside the dented cans, a retired bookkeeper who does the numbers, and forty people who show up. The software should make that web easier to see, not flatten it into one login.",
    inProduct:
      "Everyone gets their own account, at no extra cost, with only the access their job needs. We will never charge per user, because charging per user is a tax on including people.",
    onHome: true,
  },
  {
    id: "say-what-they-need",
    title: "People should be able to say what they need",
    body: "A family that cannot eat what is in the bag has been given a bag, not a meal. Allergies, a diabetic in the house, no can opener, no stove, a baby who needs a specific formula — these are ordinary facts, and a pantry that knows them serves better with the same food.",
    inProduct:
      "Household needs are a first-class field, not a note buried at the bottom. They show up at the window when you are packing, not at reporting time when it is too late to matter.",
    onHome: false,
  },
  {
    id: "common-good",
    title: "A pantry is not an island",
    body: "What one pantry learns about demand in November is useful to the pantry four miles away and to the food bank supplying both. Held privately it is a file. Shared carefully it is a map.",
    inProduct:
      "Networks can roll several pantries into one report while each location keeps its own login, its own records, and its own say. We do not sell, rent, mine, or train on your data, and we do not have a business model that would tempt us to.",
    onHome: false,
  },
  {
    id: "honest-money",
    title: "Say the price out loud",
    body: "Organizations that run on donated money have been burned by software that was cheap until it was not: the setup fee, the per-user creep, the module that turned out to be extra, the export that was only available on the plan above.",
    inProduct:
      "Three prices, on one page, in numbers. No setup fee, no per-user fee, no per-feature fee, no annual contract. We will never charge you by how many families you served — the number of people at your door is not our revenue model.",
    onHome: false,
  },
] as const;

export const HOME_PRINCIPLES = PRINCIPLES.filter((p) => p.onHome);
