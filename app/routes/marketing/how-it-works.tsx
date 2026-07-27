import { Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { publicData } from "~/lib/loader";
import { marketingMeta } from "~/lib/meta";
import { breadcrumbLd, faqLd } from "~/lib/jsonld";
import { Photo } from "~/components/Photo";

export async function loader({ context }: LoaderFunctionArgs) {
  return publicData(context);
}

export function meta({ loaderData }: { loaderData?: { siteUrl: string } }) {
  return marketingMeta({
    title: "What using Laevo actually looks like",
    description:
      "A walk through a pantry's week in Laevo: setting up on Monday, the shelf on Thursday, the window on Saturday, the rota, and the report at the end of the month.",
    path: "/how-it-works",
    siteUrl: loaderData?.siteUrl ?? "https://laevo.app",
  });
}

const FAQ = [
  {
    q: "How long does setting up take?",
    a: "About an hour if you type your shelf in by hand, or an afternoon if you are importing records from another system. You do not have to finish setup before you start using it — a pantry can check people in on its first day with nothing in the shelf at all.",
  },
  {
    q: "Do we need internet at the pantry?",
    a: "Yes, for now. Laevo needs a connection to save a visit, and we would rather say that plainly than promise an offline mode we have not built. This is why the paper fallback exists and why it is a designed-in part of the product rather than an embarrassment.",
  },
  {
    q: "Can two people use it at the same time?",
    a: "Yes, on as many devices as you like, with no extra cost. Two volunteers checking people in at two windows both see the same records immediately.",
  },
];

const WEEK = [
  {
    day: "Monday",
    title: "Somebody types in what is on the shelf",
    body: "Item, how you count it, and roughly how much you like to keep. Cans, bags, loaves, pounds — whatever you actually say out loud. This takes about ten minutes for a normal pantry and it is the thing that makes everything afterward easier.",
    detail:
      "You are not required to do this. A pantry can run the window without the shelf and add it later. But every waste warning and every low-stock warning comes from here, so it is worth the ten minutes.",
  },
  {
    day: "Tuesday",
    title: "The food bank delivery arrives",
    body: "One screen: what came, how much, and roughly when it goes off. Pick the source from a list you build as you go. Two minutes for a pallet.",
    detail:
      "Laevo does not require a date on anything. If you do not know, leave it blank — the warning simply will not fire for that lot, which is honest, rather than inventing a date to fill a field.",
  },
  {
    day: "Thursday",
    title: "The shelf tells you what needs moving",
    body: "Open the shelf and the top of the screen says what is closest to its date and what has fallen below the level you set. Not a report you have to remember to run — the screen you already had open.",
    detail:
      "The warnings are in plain words: \"14 loaves of bread go off in three days\" rather than a red dot on a row. Then you decide what to do about it, because that decision is yours.",
  },
  {
    day: "Saturday morning",
    title: "The window",
    body: "Type three letters of a name, or a phone number, or the short card code the household carries. The record comes up with the household size and what they cannot eat. One big button records the visit.",
    detail:
      "If it is a new household, adding them takes one screen and only a name is required. If the queue is long you can serve everybody first and record afterwards — nothing in Laevo stands between a person and a bag of groceries.",
  },
  {
    day: "Saturday, still",
    title: "Laevo notices a possible duplicate",
    body: "If a new household looks like one you already have — same phone, same date of birth, a surname spelled slightly differently, a first name that is a nickname of the other — Laevo puts the two side by side and asks you.",
    detail:
      "It never merges anything on its own, and it will tell you exactly why it thinks they might be the same person, in words: \"same phone number, first name is a nickname of the other.\" You decide. It is a lookup table and some careful string comparison, not a model guessing.",
  },
  {
    day: "Sunday",
    title: "The rota fills itself in",
    body: "Volunteers claim shifts from a public link you can put in a newsletter or a group chat. No account needed on their end. Everyone signed up gets a reminder two days before.",
    detail:
      "The coordinator's job stops being transcribing everyone's availability out of text messages and becomes filling the gaps that are still open — which is a much smaller job.",
  },
  {
    day: "End of the month",
    title: "The report is already drafted",
    body: "Households, individuals, first-time visits, age bands, broken out for the period you choose. Built from the visits you already recorded during the month.",
    detail:
      "Click any number and Laevo shows you the visits that produced it, so you can check it rather than trusting it. Then a person reads it, signs it, and files it — because a person is accountable for it, and no software should pretend otherwise.",
  },
];

export default function HowItWorks() {
  const { siteUrl } = useLoaderData<typeof loader>();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            faqLd(FAQ),
            breadcrumbLd(siteUrl, [
              { name: "Laevo", path: "/" },
              { name: "How it works", path: "/how-it-works" },
            ]),
          ]),
        }}
      />

      <section className="hero">
        <div className="wrap-narrow">
          <p className="eyebrow">A week in a pantry</p>
          <h1>What using Laevo actually looks like</h1>
          <p className="lead" style={{ marginTop: 20 }}>
            Not a feature list. An ordinary week at a pantry serving a couple of
            hundred households a month, from the Monday somebody sets it up to
            the report at the end of the month.
          </p>
          <div style={{ marginTop: 32 }}>
            <Photo photo="hall" priority sizes="(min-width: 760px) 680px, 100vw" />
          </div>
        </div>
      </section>

      <section>
        <div className="wrap-narrow stack-lg">
          {WEEK.map((step) => (
            <article key={step.title} className="card">
              <span className="pill">{step.day}</span>
              <h2 style={{ fontSize: "var(--t-h3)", marginTop: 12 }}>
                {step.title}
              </h2>
              <p style={{ marginTop: 10 }}>{step.body}</p>
              <div className="in-product" style={{ marginTop: 16 }}>
                <strong>Worth knowing</strong>
                <span className="muted">{step.detail}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-tint">
        <div className="wrap-narrow stack">
          <h2>What Laevo does not do</h2>
          <p className="lead">
            Being clear about this is more useful to you than another paragraph
            about what it does.
          </p>
          <ul className="stack" style={{ paddingLeft: 24 }}>
            <li>
              <strong>It does not work offline.</strong> You need a connection
              to save a visit. Keep the paper.
            </li>
            <li>
              <strong>It does not file your reports for you.</strong> It drafts
              the numbers and shows its working. A person checks and submits.
            </li>
            <li>
              <strong>It does not share records between agencies.</strong> If
              your community runs a shared client network, Oasis Insight does
              that and Laevo does not.
            </li>
            <li>
              <strong>It does not do accounting or donor fundraising.</strong>{" "}
              It tracks gifts of food, not gifts of money.
            </li>
            <li>
              <strong>It does not decide who is eligible.</strong> There are no
              built-in rules and no automatic visit limits. Those are yours.
            </li>
          </ul>
        </div>
      </section>

      <section>
        <div className="wrap-narrow">
          <h2 style={{ marginBottom: 24 }}>Questions</h2>
          {FAQ.map((item) => (
            <details key={item.q} className="faq-item">
              <summary>{item.q}</summary>
              <div className="answer">
                <p>{item.a}</p>
              </div>
            </details>
          ))}

          <div className="btn-row" style={{ marginTop: 40 }}>
            <Link className="btn btn-primary btn-big" to="/demo">
              Try all of this in the demo
            </Link>
            <Link className="btn btn-secondary btn-big" to="/switch">
              Moving records over
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
