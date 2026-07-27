/**
 * The guides registry.
 *
 * Everything a pantry organizer might search for at eleven at night, written
 * to be useful whether or not they ever sign up. One template renders all of
 * them; the sitemap and llms.txt are generated from this list, so a guide can
 * never exist without being findable.
 *
 * House rule: no guide may end without something the reader can do tomorrow.
 */

export type Block =
  | { kind: "p"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "callout"; title: string; text: string }
  | { kind: "quote"; text: string; attribution?: string };

export interface Guide {
  slug: string;
  title: string;
  h1: string;
  description: string;
  category: "Getting started" | "Paperwork" | "The window" | "Volunteers" | "Food";
  updated: string;
  blocks: Block[];
  faq: Array<{ q: string; a: string }>;
  /** Slugs of other guides. Checked by a test — a broken one fails the build. */
  related: string[];
  cta: { text: string; label: string; href: string };
}

export const GUIDES: readonly Guide[] = [
  {
    slug: "start-a-food-pantry",
    title: "How to start a food pantry that is still running in three years",
    h1: "How to start a food pantry that lasts",
    description:
      "The practical order of operations for starting a food pantry: who to call first, what you legally need, what you can skip, and the two things that close most new pantries inside two years.",
    category: "Getting started",
    updated: "2026-07-01",
    blocks: [
      {
        kind: "p",
        text: "Most guides to starting a food pantry begin with paperwork. That is the wrong end. Start with the two questions that decide whether you are still open in three years: who exactly are you feeding, and where is the food coming from every single week. Everything else is arrangeable.",
      },
      { kind: "h2", text: "Call the food bank before you do anything else" },
      {
        kind: "p",
        text: "Your regional food bank is the single most useful phone call available to you, and it is free. They will tell you whether the neighborhood is already covered, what the gaps are, what a partner agency agreement requires, and what they can supply at what cost per pound. Some of what you are planning to buy, they will give you.",
      },
      {
        kind: "p",
        text: "Ask them three things specifically: what does your agency agreement require of us, what reporting will you expect, and what do pantries in our county most often run short of. That last answer will shape what you collect.",
      },
      { kind: "h2", text: "Decide who you serve, and write it down" },
      {
        kind: "p",
        text: "You are allowed to define this. A zip code, a school district, a parish boundary, anyone who walks up. There is no right answer, but there is a wrong one, which is not deciding — because then every hard case gets decided at the window by whichever volunteer is standing there, and they will each decide differently.",
      },
      {
        kind: "callout",
        title: "Write down what happens when someone falls outside it",
        text: "This matters more than the boundary itself. \"We give them a bag anyway and tell them about the pantry on Fifth Street\" is a fine policy. What is not fine is a volunteer having to invent one while someone waits.",
      },
      { kind: "h2", text: "The legal minimum, honestly" },
      {
        kind: "ul",
        items: [
          "You usually do not need your own 501(c)(3). Operating under an existing church, school, or nonprofit as a program is faster, cheaper, and very common.",
          "Food handling rules vary by state and by what you distribute. Shelf-stable only is a much lighter regime than fresh, frozen, or prepared food.",
          "The federal Good Samaritan Food Donation Act protects donors and distributing organizations acting in good faith. This is why grocery stores can give you food at all.",
          "If you take USDA commodities through TEFAP, that comes with its own eligibility paperwork and its own reporting. That is a real commitment — worth it for the volume, but go in knowing.",
          "Check your state, and get the answer in writing from the person who would inspect you. Not from a website. Not from us.",
        ],
      },
      { kind: "h2", text: "The two things that close new pantries" },
      {
        kind: "p",
        text: "The first is a supply that depended on one person's relationship. A single manager at a single store, and when they move, the food stops. Build three sources before you open, even if two are small.",
      },
      {
        kind: "p",
        text: "The second is founder exhaustion. The person who started it is doing intake, pickup, stocking, and the quarterly report, and one bad month ends it. Every job needs a second person who has actually done it — not who has been told about it.",
      },
      { kind: "h2", text: "What to set up before your first distribution day" },
      {
        kind: "ol",
        items: [
          "Three food sources, at least one of them a food bank agreement.",
          "A named backup for every role, who has done the job once.",
          "A written answer for who you serve and what happens at the edges.",
          "A way to record who you helped that takes under a minute per household — because if it takes longer, it will stop happening by week six.",
          "Somewhere dry, off the floor, that holds a temperature.",
          "One person who knows what the funder or food bank will ask for at quarter end.",
        ],
      },
      {
        kind: "p",
        text: "You will notice none of these are software. On day one, a notebook is fine. The reason pantries eventually move off the notebook is the sixth item on that list: when a report is due, a notebook means an evening of counting.",
      },
    ],
    faq: [
      {
        q: "Do we need a 501(c)(3) to start a food pantry?",
        a: "Usually not. Most new pantries operate as a program of an existing nonprofit, church, or school, which is faster and avoids the filing cost. You need your own status mainly if you intend to hold your own funds and apply for grants in your own name.",
      },
      {
        q: "How much food do we need to start?",
        a: "Enough for the number of households you expect in your first month, plus about a third. Starting small and reliable beats starting big and irregular — a pantry that is open every Saturday with modest bags builds more trust than one with a full shelf that sometimes closes.",
      },
      {
        q: "Can we refuse to serve someone?",
        a: "You can set a service area and hours, and you should write both down. Refusing an individual person is a decision your organization has to think through carefully, and if you take federal commodities, non-discrimination requirements apply. Have the policy before you have the situation.",
      },
    ],
    related: ["what-to-track", "dignity-at-the-window", "recruiting-volunteers"],
    cta: {
      text: "When the notebook starts costing you evenings, Laevo is free for a pantry your size.",
      label: "See what it looks like",
      href: "/demo",
    },
  },

  {
    slug: "tefap-reporting-without-dread",
    title: "TEFAP reporting without the dread",
    h1: "TEFAP reporting without the dread",
    description:
      "What TEFAP actually asks a pantry for, why quarter end hurts, and how to record things during the month so the report is a printout instead of an evening of counting.",
    category: "Paperwork",
    updated: "2026-07-01",
    blocks: [
      {
        kind: "p",
        text: "Nobody dreads TEFAP reporting because the form is hard. They dread it because the information needed to fill it in is spread across a clipboard, two volunteers' memories, and a shoebox. The form takes twenty minutes. Reconstructing the quarter takes an evening.",
      },
      { kind: "h2", text: "What is actually being asked" },
      {
        kind: "p",
        text: "The specifics vary by state agency, but the shape is consistent. You are reporting how many households and how many individuals you served, usually broken out by some combination of age bands and sometimes by first-time versus returning, along with what commodities you received and distributed.",
      },
      {
        kind: "p",
        text: "Notice what that means: almost everything on the form is a count of things you already knew at the moment they happened. The household size was known when the person was at the window. Nobody needs to remember it in October if it was written down in August.",
      },
      {
        kind: "callout",
        title: "The rule that fixes most of it",
        text: "Record at the moment, count at the end. Every minute of reporting pain is a moment where something true was known and not written down.",
      },
      { kind: "h2", text: "The four things to capture at the window" },
      {
        kind: "ol",
        items: [
          "Which household it was — the same household, recognisably, each time they come.",
          "How many people are in it, and roughly how those split by age band.",
          "The date.",
          "Whether this is their first visit with you.",
        ],
      },
      {
        kind: "p",
        text: "That is the whole basis of a TEFAP household report. Everything else on the form is arithmetic performed on those four facts. If your intake takes longer than about forty seconds, you are collecting more than the report needs, and it is worth asking who the extra questions are for.",
      },
      { kind: "h2", text: "What counts as one household" },
      {
        kind: "p",
        text: "This is the question that quietly ruins more reports than any other, because two volunteers at the same window will answer it differently. Two sisters sharing a flat and buying food together are one household. The same two sisters keeping separate cupboards are arguably two. A grandmother who eats with her daughter's family four nights a week is somewhere in between.",
      },
      {
        kind: "p",
        text: "There is no universally correct answer, and your state agency will usually accept any consistent rule. What it will not accept — and what makes your own year-on-year numbers meaningless — is a different rule on different Saturdays. Write your definition down, put it where the intake happens, and use the same one every time.",
      },
      {
        kind: "p",
        text: "The most common workable definition is people who buy and prepare food together. It is easy to say out loud, easy for a neighbor to answer, and it maps cleanly onto how the food is actually used.",
      },
      { kind: "h2", text: "Signatures and self-declaration" },
      {
        kind: "p",
        text: "Most states use a self-declaration of need rather than proof of income for TEFAP. The neighbor attests; you keep the attestation. Which means the awkward part of intake — asking someone to document being poor — is often not required by the program at all, and is being asked because a previous form asked for it once.",
      },
      {
        kind: "p",
        text: "Read your own state's agreement. There is a decent chance you are collecting documents nobody will ever ask you for, and every one of those is a person made to feel like a suspect at a food line.",
      },
      { kind: "h2", text: "Making quarter end boring" },
      {
        kind: "ul",
        items: [
          "Keep one record per household that persists between visits, so returning families are a lookup and not a re-interview.",
          "Record age bands once, at first visit, and confirm rather than re-ask.",
          "Log the visit the day it happens, even if the details are thin.",
          "Reconcile received commodities weekly, when you can still remember the pallet.",
          "Run the report a week early, so a gap is a question you can still answer.",
        ],
      },
      {
        kind: "p",
        text: "Do those five and the report becomes what it should always have been: a document you print, read once to check nothing looks mad, and send.",
      },
      { kind: "h2", text: "Reconciling the commodities" },
      {
        kind: "p",
        text: "The other half of TEFAP reporting is the food itself: what you received from your state agency and what went out. This is where pantries lose an evening, because a pallet that arrived in July gets counted in August, and the numbers stop matching the paperwork the food bank has.",
      },
      {
        kind: "p",
        text: "The fix is unglamorous and it works. Record a delivery the day it lands, against the date on the delivery paperwork rather than the day you got around to shelving it. If the two dates fall either side of a month boundary, the paperwork date is the one that will be checked.",
      },
      {
        kind: "callout",
        title: "Reconcile weekly, not quarterly",
        text: "A discrepancy found in the same week is a phone call. The same discrepancy found in October is an afternoon of detective work in a stack of delivery notes, and quite often it is never resolved at all.",
      },
      { kind: "h2", text: "If your numbers are already a mess" },
      {
        kind: "p",
        text: "Do not try to reconstruct the past. Pick a start date — the first of next month is fine — and be exact from there. A report with a clean, documented three months and a note explaining the gap is far more defensible than one with twelve months of confident-looking figures somebody reconstructed from memory in an evening.",
      },
      {
        kind: "p",
        text: "State agencies deal with this constantly, and in our experience they respond much better to \"here is where we started keeping proper records, and here is why\" than to numbers that quietly do not add up. Tell them before they ask.",
      },
    ],
    faq: [
      {
        q: "Does TEFAP require proof of income?",
        a: "In most states, no — a self-declaration of need is the standard. Requirements are set by your state agency, so confirm with them, but many pantries collect documentation that their own program does not ask for.",
      },
      {
        q: "How long do we need to keep TEFAP records?",
        a: "Record retention is set in your state agreement and is commonly three years plus the current year. Ask your state agency for the exact figure in writing and store it somewhere the next organizer will find it.",
      },
      {
        q: "Can Laevo file the report for us?",
        a: "No, and we would be careful with anyone who says they can. Laevo drafts the numbers from what you recorded and shows you which visits produced each figure, so you can check it. A person signs and files it, because a person is accountable for it.",
      },
    ],
    related: ["what-to-track", "start-a-food-pantry", "dignity-at-the-window"],
    cta: {
      text: "Laevo drafts your household and individual counts from the visits you already logged, and shows its working.",
      label: "See a report drafted",
      href: "/demo",
    },
  },

  {
    slug: "older-volunteers-and-tablets",
    title: "Helping older volunteers use a tablet without anyone feeling stupid",
    h1: "Helping older volunteers use a tablet",
    description:
      "Practical, tested advice for pantries whose volunteers are in their seventies and eighties: what actually goes wrong with tablets and phones, and the setup that removes most of it.",
    category: "Volunteers",
    updated: "2026-07-01",
    blocks: [
      {
        kind: "p",
        text: "A large share of the people keeping food pantries open are retired, and a fair number of them did not use a computer at work. They are not bad at technology. They are being asked to use tools designed by people who have never watched them try.",
      },
      {
        kind: "p",
        text: "Almost everything that goes wrong is one of six things, and five of them are fixable in an afternoon by whoever sets up the tablet.",
      },
      { kind: "h2", text: "What actually goes wrong" },
      {
        kind: "ol",
        items: [
          "Text is too small to read, and the person will not say so, because saying so feels like admitting something.",
          "A tap lands slightly off and nothing happens, so they tap harder and faster, which registers as a double tap and does something unexpected.",
          "A menu hidden behind three lines or three dots is invisible — not overlooked, genuinely not seen as a control.",
          "The screen scrolls under a finger resting on it, and the thing they were reading vanishes.",
          "A message appears and disappears before it can be read, so they never learn whether it worked.",
          "Something goes wrong once, in public, in front of a queue — and after that they avoid the tablet entirely.",
        ],
      },
      {
        kind: "callout",
        title: "Number six is the only one that matters long term",
        text: "The others are annoyances. Public embarrassment is what makes a volunteer quietly stop signing up for the shift with the tablet. Protect against it and everything else is survivable.",
      },
      { kind: "h2", text: "Setting up the device" },
      {
        kind: "ul",
        items: [
          "Turn the system text size up before anyone touches it. Not to the maximum — one or two steps up, then ask them to read something across the room's light.",
          "Turn off auto-lock, or set it to the longest option. Nothing kills confidence like a screen going black mid-task.",
          "Turn off automatic updates during opening hours. A dialog box appearing at 9am on a Saturday is a small disaster.",
          "Put a real case on it with a stand. A tablet that slides on a table is a tablet that gets tapped wrong.",
          "Put the one thing they need on the home screen, alone. Not in a folder. Not on page two.",
          "Write the wifi password on tape on the back. Every time.",
        ],
      },
      { kind: "h2", text: "How to teach it, in one sitting" },
      {
        kind: "p",
        text: "Teach the single most common task, all the way through, three times. Not a tour of the features. Not what everything does. One task, three repetitions, with you sitting beside them and not touching the screen.",
      },
      {
        kind: "p",
        text: "The third repetition is the important one, because that is where they do it without prompting and discover they can. Stop there. Come back next week for the second task.",
      },
      {
        kind: "quote",
        text: "Never take the device out of their hands to show them. The moment you do, the lesson becomes a demonstration of your competence.",
      },
      { kind: "h2", text: "Things worth saying out loud" },
      {
        kind: "ul",
        items: [
          "\"You cannot break it. There is nothing on here you can delete that I cannot get back.\" Say this first, and mean it — make sure it is true before you say it.",
          "\"If it does something strange, that is the software being badly made, not you.\"",
          "\"There is no rush. The queue can wait thirty seconds.\"",
          "\"If you get stuck, put it down and do it on paper. We will type it up later.\" Always have the paper fallback, and never treat using it as a failure.",
        ],
      },
      { kind: "h2", text: "What to demand from your software" },
      {
        kind: "p",
        text: "You are allowed to have standards here. Any tool your pantry uses should have controls big enough to hit reliably, text you can enlarge without the layout falling apart, plain words instead of jargon, confirmation messages that stay on screen until dismissed, and no critical function hidden behind a hover or a swipe.",
      },
      {
        kind: "p",
        text: "This is exactly why Laevo is built the way it is. It is not a coincidence and it is not an accessibility checkbox — it is the main design constraint, and features that break it do not ship.",
      },
    ],
    faq: [
      {
        q: "Should we use tablets or phones at the window?",
        a: "Tablets, if you can. A bigger screen means bigger targets and less scrolling, and a stand means the device does not move when tapped. Phones work — Laevo is built for them first — but a tablet on a stand removes a whole class of problem.",
      },
      {
        q: "What if a volunteer simply refuses to use it?",
        a: "Let them. Pair them with someone who will, and keep the paper fallback. A volunteer who is good with people at the window and will not touch a tablet is a volunteer worth keeping exactly as they are.",
      },
      {
        q: "How large should text be?",
        a: "Large enough to read at arm's length in bad light without leaning in. In practice that is around 18 to 20 pixels for body text as a floor, and any tool that breaks when you enlarge it further is not built for this.",
      },
    ],
    related: ["dignity-at-the-window", "recruiting-volunteers", "what-to-track"],
    cta: {
      text: "Laevo starts at large text, works one-handed, and has a bigger-text button on every screen.",
      label: "Try it on your phone",
      href: "/demo",
    },
  },

  {
    slug: "dignity-at-the-window",
    title: "Small changes at the window that people remember for years",
    h1: "Dignity at the window",
    description:
      "The details of a pantry visit that neighbors actually remember — the queue, the questions, the bag, the goodbye — and small changes that cost nothing.",
    category: "The window",
    updated: "2026-07-01",
    blocks: [
      {
        kind: "p",
        text: "Ask someone about a food pantry they used twenty years ago and they will not describe the food. They will describe how they were spoken to, whether they had to stand in the rain, and whether anyone else could hear the questions they were asked.",
      },
      { kind: "h2", text: "The queue is the first message" },
      {
        kind: "p",
        text: "A line that forms on a public pavement tells the neighborhood who is short of food this week. A line inside, or around the back, or with numbered tickets and chairs, tells it nothing. If you can move the wait indoors or out of sight of the road, that single change does more than most program redesigns.",
      },
      {
        kind: "p",
        text: "If you cannot, give out a time or a number so people are not standing to hold a place. Standing in a line is a public statement. Sitting in a chair with a number is an appointment.",
      },
      { kind: "h2", text: "Who can hear the questions" },
      {
        kind: "p",
        text: "Household size, income, whether there are children, whether anyone is disabled — these are asked at a table with four people within earshot. The same question at a slight angle, quietly, or on a form the person fills in themselves, stops being an interrogation.",
      },
      {
        kind: "callout",
        title: "Ask once, not every time",
        text: "The single most common complaint from pantry users is being asked the same questions on every visit. It reads as suspicion. A record that persists between visits turns a re-interview into \"Still four at home, Mrs. Okafor?\"",
      },
      { kind: "h2", text: "What is in the bag" },
      {
        kind: "p",
        text: "A pre-packed bag is fast and it is fair and it is sometimes the only workable model. It also sends food to houses that cannot use it: no stove, no can opener, a diabetic, an allergy, a baby, a religious restriction, or simply a child who will not eat it and food that will therefore be thrown away.",
      },
      {
        kind: "p",
        text: "You do not need a full choice model to fix most of this. A single question at first visit — is there anything your household cannot eat — and a note on the record captures nearly all of the benefit at nearly none of the cost.",
      },
      { kind: "h2", text: "The wait itself" },
      {
        kind: "p",
        text: "Waiting is not neutral. Forty minutes standing outside with nothing to do is forty minutes to think about why you are there, and it is the part of the visit people describe most bitterly afterwards. The food takes four minutes; the wait is the experience.",
      },
      {
        kind: "p",
        text: "Two changes cost nothing. Give people a number or a time, so the wait can happen sitting down or in a car instead of holding a place in a line. And tell them roughly how long it will be — uncertainty is most of what makes waiting hard, and \"about twenty minutes\" is a kindness even when the answer is forty.",
      },
      {
        kind: "p",
        text: "If you have a wall and a kettle, that is a waiting room. It does not need to be nice. It needs to be indoors, seated, and not visible from the road.",
      },
      { kind: "h2", text: "Who is standing behind the table" },
      {
        kind: "p",
        text: "A pantry staffed entirely by people who have never needed one reads, unavoidably, as one group of people helping another group of people. A pantry where some of the volunteers have used it themselves reads as a neighborhood running something together, and everybody in the room can feel the difference within a minute.",
      },
      {
        kind: "p",
        text: "This is the single largest change available to most pantries and it costs nothing at all. Ask. People who have been through the line often assume they would not be welcome on the other side of it, and the assumption holds until somebody says otherwise out loud.",
      },
      { kind: "h2", text: "Small things, no budget" },
      {
        kind: "ul",
        items: [
          "Learn and use names. It is the whole thing, really.",
          "Have someone whose only job is greeting, not processing.",
          "Say \"welcome\" before you say anything with a form in it.",
          "Let people carry their own bag if they want to, and offer help without insisting.",
          "Do not display a photo of your service without asking each person in it, that day, in words.",
          "Say what happens next: \"You are welcome back on the fourteenth.\" Certainty is a kindness.",
          "Have a chair. Someone will need it and will not ask.",
        ],
      },
      {
        kind: "p",
        text: "None of these need a budget line, a grant, or a committee. Most of them need one person to decide on Tuesday that this is how it will be on Saturday.",
      },
    ],
    faq: [
      {
        q: "Is a choice pantry always better?",
        a: "It is usually better for neighbors and usually harder for volunteers, and it needs floor space many pantries do not have. If you cannot do it, asking about restrictions once and noting them gets you most of the benefit.",
      },
      {
        q: "Should we ask for identification?",
        a: "Ask only for what your funders genuinely require, and check what that is rather than assuming. Many pantries collect ID out of habit, and for people without stable housing or documents it is the barrier that turns them away entirely.",
      },
    ],
    related: ["tefap-reporting-without-dread", "what-to-track", "older-volunteers-and-tablets"],
    cta: {
      text: "Laevo remembers a household between visits, so nobody gets re-interviewed at the window.",
      label: "See how check-in works",
      href: "/demo",
    },
  },

  {
    slug: "what-to-track",
    title: "What to track at a food pantry, and what to stop tracking",
    h1: "What to track, and what to stop",
    description:
      "A short list of what a food pantry genuinely needs to record, what is collected out of habit, and how to tell the difference.",
    category: "Paperwork",
    updated: "2026-07-01",
    blocks: [
      {
        kind: "p",
        text: "Every field you collect costs something. It costs the volunteer's time, it costs the neighbor's patience and sometimes their dignity, and it costs you a thing to keep safe. So each one should be earning its place.",
      },
      { kind: "h2", text: "The test" },
      {
        kind: "p",
        text: "For every field you collect, answer this: who reads it, and what do they do differently because of it? If the answer is nobody and nothing, stop collecting it. If the answer is \"the funder requires it,\" that is a good answer — write the funder's name next to the field so the next organizer knows why it is there.",
      },
      {
        kind: "callout",
        title: "The habit fields",
        text: "Most pantries are collecting at least one field that was required by a grant that ended in 2019. Nobody removed it because nobody knew they were allowed to.",
      },
      { kind: "h2", text: "Worth tracking, almost always" },
      {
        kind: "ul",
        items: [
          "A household, identifiable between visits. This is the backbone of every report you will ever run.",
          "How many people are in it, and roughly their ages. Reported everywhere, asked once.",
          "Visit dates. The single most useful number in the building.",
          "Dietary restrictions and household needs — no stove, no can opener, an allergy, a baby.",
          "What came in, from whom, and roughly when it expires.",
          "Volunteer hours, if you ever intend to apply for a grant. In-kind hours are real match money.",
        ],
      },
      { kind: "h2", text: "Usually not worth it" },
      {
        kind: "ul",
        items: [
          "Precise income figures, unless a program you are in genuinely requires them. Self-declaration is the norm for TEFAP.",
          "Photocopies of identification, kept indefinitely. This is a liability you are storing, not an asset.",
          "Item-level counts of every can leaving the building. Track categories and weights; the per-can precision is bought with volunteer hours and spent on nothing.",
          "Anything you would be uncomfortable having the person read over your shoulder. That discomfort is information.",
        ],
      },
      { kind: "h2", text: "What every field costs you" },
      {
        kind: "p",
        text: "It is worth being concrete about the price of a field, because it is usually treated as free. A question that takes fifteen seconds, asked of two hundred households a month, is fifty minutes of volunteer time a month and ten hours a year — for one field. If it is a field nobody reads, that is ten hours somebody spent on nothing.",
      },
      {
        kind: "p",
        text: "The second cost is not measured in time. Every question about income, documents, or household circumstances asked at a table where other people can hear is a small transaction in which somebody proves they deserve food. A few of those are unavoidable. Every avoidable one is worth removing, and most pantries have several.",
      },
      {
        kind: "p",
        text: "The third cost is that you now hold it. Personal details about people in a difficult period are a responsibility, and the safest data is the data you never collected.",
      },
      { kind: "h2", text: "Tracking your own operation, not just the people" },
      {
        kind: "p",
        text: "Almost all pantry record-keeping points at the people served, because that is what funders ask about. But the numbers that actually change how you run tend to be about the pantry itself, and hardly anybody keeps them.",
      },
      {
        kind: "ul",
        items: [
          "How long a visit takes, end to end. If it has crept up, something has been added to intake that nobody decided to add.",
          "What you threw away, by category. Almost every pantry that counts this for one month is surprised by the answer.",
          "How many volunteer shifts went unfilled. This is your early warning for burnout, months before anybody says anything.",
          "How many households came for the first time each month. A rising number is the clearest signal your neighborhood is getting harder, and it is the number funders find most persuasive.",
        ],
      },
      { kind: "h2", text: "How to stop collecting something" },
      {
        kind: "ol",
        items: [
          "List every field on your intake form.",
          "Next to each, write who reads it. Actually write it.",
          "For any field with a blank next to it, check the funder agreements once.",
          "If it is not there, remove it from the form this week.",
          "Keep the historical data — you are stopping collection, not deleting a record.",
        ],
      },
      {
        kind: "p",
        text: "A pantry that does this usually removes two or three fields, and takes fifteen to twenty seconds off every single intake. Across a year, that is measured in volunteer afternoons.",
      },
    ],
    faq: [
      {
        q: "How long should we keep records?",
        a: "As long as your funders and state agreement require, and no longer. Commonly three years plus the current year for federal commodity programs. Keeping records forever is not caution — it is a growing pile of other people's private information you are responsible for.",
      },
      {
        q: "Can we delete a neighbor's record if they ask?",
        a: "You can remove personal details while keeping the anonymous counts your reports were built on. In Laevo that is one action, and it keeps your historical totals intact.",
      },
    ],
    related: ["tefap-reporting-without-dread", "dignity-at-the-window", "start-a-food-pantry"],
    cta: {
      text: "Laevo ships with the short list already and marks which fields exist because a funder asked.",
      label: "Look at the intake screen",
      href: "/demo",
    },
  },

  {
    slug: "reduce-waste-small-pantry",
    title: "Cutting food waste at a small pantry",
    h1: "Cutting food waste at a small pantry",
    description:
      "Why food goes off in pantries that care about waste, what date labels actually mean, and the rotation habits that fix most of it without new equipment.",
    category: "Food",
    updated: "2026-07-01",
    blocks: [
      {
        kind: "p",
        text: "Food does not usually spoil in pantries because people are careless. It spoils because the newest delivery is the easiest to reach, and because nobody has line of sight on what is closest to its date until it is past it.",
      },
      { kind: "h2", text: "What the dates actually mean" },
      {
        kind: "ul",
        items: [
          "\"Best by\" and \"best before\" are quality dates set by the manufacturer. They are not safety dates and, in the United States, they are not federally regulated for most foods.",
          "\"Use by\" is closer to a safety statement and is the one to respect, particularly on anything refrigerated.",
          "Infant formula is the genuine exception — it carries a federally regulated date and should never be distributed past it.",
          "Canned goods with no dents, no rust, no swelling and a good seal are typically fine well past the printed date. Your food bank will have a written policy on this; use theirs, because it is defensible.",
        ],
      },
      {
        kind: "callout",
        title: "Get your food bank's date policy in writing",
        text: "It settles the argument in the sorting room permanently, and it protects the volunteer who made the call.",
      },
      { kind: "h2", text: "Rotation that survives a busy Saturday" },
      {
        kind: "p",
        text: "First in, first out is the correct answer and it fails constantly, because on a busy morning the person restocking grabs the nearest case. Systems that depend on remembering do not survive contact with a queue.",
      },
      {
        kind: "ol",
        items: [
          "Load new stock from the back. If the shelf cannot be loaded from behind, turn it so it can, even if that makes the room look worse.",
          "Mark the month on the case in marker, big, when it arrives. Not the full date. The month.",
          "Give short-dated stock its own shelf at eye level with a sign, and send it out first, deliberately.",
          "Check one category a week rather than everything monthly. A rolling check gets done; a big audit gets postponed.",
        ],
      },
      { kind: "h2", text: "The cold chain, which is where the real risk is" },
      {
        kind: "p",
        text: "Shelf-stable food that goes past a quality date is a shame. Refrigerated or frozen food that spent four hours in a warm car is a different category of problem, and it is the one worth spending your attention on.",
      },
      {
        kind: "ul",
        items: [
          "Put a thermometer in every fridge and freezer, and write the temperature down once a day on a sheet taped to the door. This takes eight seconds and it is the first thing an inspector asks for.",
          "Agree what happens on a power cut before there is one, including who has the phone number of somebody with a working freezer.",
          "Move frozen and refrigerated items first on every delivery, before the pallet of tins that will happily wait.",
          "Insulated blankets and a few cool boxes cost very little and buy you an hour of margin on a hot day.",
        ],
      },
      {
        kind: "p",
        text: "None of this is exciting and all of it is cheaper than losing a freezer full of chicken in August.",
      },
      { kind: "h2", text: "Where the waste actually is" },
      {
        kind: "p",
        text: "Count what you throw away for one month, by category. Almost every pantry that does this is surprised, and it is almost never the category they were watching. Usually it is fresh produce taken in enthusiastically on a Wednesday with no distribution before Saturday, or a bulk donation of something nobody in the neighborhood cooks with.",
      },
      {
        kind: "p",
        text: "Both have the same fix, and it is a difficult one: sometimes you say no thank you, or you say yes and immediately give half to the pantry across town. A donation you cannot distribute in time is not a gift, it is a disposal cost with a thank-you note attached.",
      },
      { kind: "h2", text: "Things worth doing this month" },
      {
        kind: "ul",
        items: [
          "Write the arrival month on every case in marker.",
          "Make one short-dated shelf at eye level.",
          "Count your waste by category for four weeks.",
          "Get the food bank's date policy printed and pinned up in the sorting room.",
          "Agree in advance who is allowed to say no to a donation, so it is not decided in the car park.",
        ],
      },
    ],
    faq: [
      {
        q: "Can we distribute food past its best-by date?",
        a: "In most cases yes for shelf-stable food in good condition, and your food bank will have a written policy giving specific windows by category. Infant formula is the clear exception. Follow your food bank's policy rather than a rule of thumb, because it is written to be defensible.",
      },
      {
        q: "Should we accept every donation offered?",
        a: "No, and deciding that in advance is one of the more useful hours a pantry can spend. Food you cannot move before it spoils costs you storage, volunteer hours, and disposal. Naming who can decline, and on what grounds, keeps it from being an awkward conversation in the moment.",
      },
    ],
    related: ["what-to-track", "start-a-food-pantry", "recruiting-volunteers"],
    cta: {
      text: "Laevo shows what is closest to its date on the shelf screen, before it becomes a problem.",
      label: "See the shelf",
      href: "/demo",
    },
  },

  {
    slug: "recruiting-volunteers",
    title: "Finding volunteers when you have no budget and no marketing",
    h1: "Finding volunteers with no budget",
    description:
      "Where pantry volunteers actually come from, why the first shift decides whether someone returns, and how to stop losing the people you already have.",
    category: "Volunteers",
    updated: "2026-07-01",
    blocks: [
      {
        kind: "p",
        text: "Most pantries do not have a recruitment problem. They have a retention problem that looks like a recruitment problem, because people come once and do not come back, and the gap gets filled by asking around again.",
      },
      { kind: "h2", text: "Where they actually come from" },
      {
        kind: "ul",
        items: [
          "Someone who already volunteers, asking a specific person directly. This is far and away the largest source and it is nearly free.",
          "People who used the pantry themselves. Often the most committed volunteers you will ever have, and frequently overlooked because nobody thought to ask them.",
          "Retirees within walking distance. Proximity matters more than passion for a weekly commitment.",
          "Students needing service hours. High turnover, entirely worth it, but do not build a core role on them.",
          "Workplace groups wanting a one-day team activity. Great for a big sort, poor for the regular rota — plan them as events, not as staffing.",
        ],
      },
      {
        kind: "callout",
        title: "The ask that works",
        text: "\"Would you come Saturday the 14th, nine to eleven, and help me sort the pallet?\" beats \"we always need volunteers\" by an enormous margin. Specific person, specific date, specific job, specific end time.",
      },
      { kind: "h2", text: "The first shift decides everything" },
      {
        kind: "p",
        text: "A person's first shift is when they decide whether they belong here. The pantries that keep people do four things: someone knows they are coming, someone greets them by name, they are given one job they can do well, and someone thanks them specifically at the end.",
      },
      {
        kind: "p",
        text: "The pantries that lose people have a first shift where the new volunteer stands near a table for twenty minutes waiting to be told what to do, decides they are in the way, and never comes back. They will tell you it was a scheduling conflict.",
      },
      { kind: "h2", text: "Give people a job with edges" },
      {
        kind: "p",
        text: "The most common way to lose a willing person is to say yes to their offer of help and then never define what the help is. \"Come along and see what needs doing\" sounds welcoming and lands as an invitation to stand around being surplus.",
      },
      {
        kind: "p",
        text: "Write down four or five actual jobs — greeting at the door, sorting the delivery, packing bags, checking people in, driving the pickup — with a rough time and what it involves. New volunteers pick one. Everybody knows who is doing what, and nobody has to ask permission to be useful.",
      },
      {
        kind: "p",
        text: "It also means somebody can say \"I can do the sorting but I would rather not deal with the public,\" which is a completely reasonable thing to want and impossible to say when the job has no name.",
      },
      { kind: "h2", text: "The people you will lose, and why" },
      {
        kind: "p",
        text: "Some turnover is unavoidable and healthy. But three causes are avoidable, and they account for most of it.",
      },
      {
        kind: "ul",
        items: [
          "The one who was never given anything to do on their first day and concluded they were in the way.",
          "The one who was quietly doing three roles because they were reliable, until the month it stopped being sustainable. Reliability is not a reason to add work.",
          "The one who needed to step back for a season and had no way of saying so without it sounding like quitting. Make \"not this month\" an ordinary thing to say, or it becomes \"not ever\".",
        ],
      },
      { kind: "h2", text: "Keeping the ones you have" },
      {
        kind: "ol",
        items: [
          "Publish the rota where people can see it without asking anyone.",
          "Send a reminder two days before. Most no-shows are forgetting, not avoiding.",
          "Let people sign up themselves rather than going through one coordinator's inbox.",
          "Notice out loud when someone has been coming for a year.",
          "Ask people what they would rather be doing. The person struggling with the heavy boxes may be very good with the neighbors at the window.",
          "Make it easy to say \"not this month\" without guilt, so it does not become \"not ever.\"",
        ],
      },
      {
        kind: "p",
        text: "The reminder alone typically cuts no-shows meaningfully, and it is the cheapest thing on the list.",
      },
    ],
    faq: [
      {
        q: "How do we get volunteers to sign up without a coordinator doing it all?",
        a: "Put the shifts somewhere public with an open link so people can claim one themselves. The coordinator's job then becomes filling gaps rather than transcribing everyone's availability out of text messages.",
      },
      {
        q: "Should people who use the pantry be allowed to volunteer?",
        a: "Yes, and they are often the best volunteers you will have. It changes the room from people serving other people to people running something together, which is worth more than the labour.",
      },
    ],
    related: ["older-volunteers-and-tablets", "dignity-at-the-window", "start-a-food-pantry"],
    cta: {
      text: "Laevo gives you a public signup link and sends the two-day reminder for you.",
      label: "See volunteer shifts",
      href: "/demo",
    },
  },
] as const;

export const GUIDE_CATEGORIES = [
  "Getting started",
  "Paperwork",
  "The window",
  "Volunteers",
  "Food",
] as const;

export function guideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function guidesByCategory(category: string): Guide[] {
  return GUIDES.filter((g) => g.category === category);
}

/**
 * Reading time, counted from the words actually on the page rather than typed
 * into the registry — a hand-entered number drifts the moment a guide is
 * edited, and "9 minute read" over four minutes of text is a small lie.
 */
export function readingMinutes(guide: Guide): number {
  const words = guide.blocks
    .map((block) =>
      block.kind === "ul" || block.kind === "ol"
        ? block.items.join(" ")
        : (block as { text: string }).text,
    )
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
