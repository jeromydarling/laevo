import { Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { publicData } from "~/lib/loader";
import { marketingMeta } from "~/lib/meta";
import { faqLd, breadcrumbLd, softwareApplicationLd } from "~/lib/jsonld";
import { PLANS, formatUsd, yearlyFreeMonths, GRACE_DAYS } from "~/lib/pricing";

export async function loader({ context }: LoaderFunctionArgs) {
  return publicData(context);
}

export function meta({ loaderData }: { loaderData?: { siteUrl: string } }) {
  return marketingMeta({
    title: "Pricing",
    description:
      "Free forever for most food pantries. $19 a month for a busy one, $59 for a network. No per-user fee, no setup fee, no contract, and never a charge based on how many families you serve.",
    path: "/pricing",
    siteUrl: loaderData?.siteUrl ?? "https://laevo.us",
  });
}

const FAQ = [
  {
    q: "What happens if we go over 400 households in a month?",
    a: "We tell you before it happens, not after, and nothing stops working. Laevo does not lock your records or shut off a feature mid-Saturday. You will see a note in the app and get an email suggesting Standard, and if a busy December pushed you over once, that is not a reason to charge you.",
  },
  {
    q: "Is there a discount for paying yearly?",
    a: `Yes — a year costs ten months' money, so ${yearlyFreeMonths(PLANS[1])} months are free. There is no discount on Community because Community is already zero.`,
  },
  {
    q: "Do you charge for extra volunteers or extra logins?",
    a: "No, on any plan, ever. Charging per user is a tax on including people, and it produces shared passwords, which is worse for everybody.",
  },
  {
    q: "Do you take a cut of donations?",
    a: "Laevo does not process money at all right now. It tracks gifts of food, not gifts of cash. If that ever changes, the fee will be on the label, in numbers, before you ever use it.",
  },
  {
    q: "What if we genuinely cannot afford $19?",
    a: "Write to us and say so. We would rather have a pantry running well on a plan we discounted than a pantry back on a clipboard because of nineteen dollars. This is not a limited-time offer or a form to fill in — it is an email to a person.",
  },
  {
    q: "Can we cancel?",
    a: "Any time, in one click, without talking to anybody. Your export stays available and includes everything you put in. There is no cancellation flow designed to wear you down.",
  },
  {
    q: "Is the free plan going to disappear?",
    a: "We do not intend it to, and here is the honest version: if we ever had to change it, existing free pantries would stay free. We would not take working software away from a pantry that built its Saturday around it.",
  },
];

export default function Pricing() {
  const { siteUrl } = useLoaderData<typeof loader>();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            softwareApplicationLd(siteUrl),
            faqLd(FAQ),
            breadcrumbLd(siteUrl, [
              { name: "Laevo", path: "/" },
              { name: "Pricing", path: "/pricing" },
            ]),
          ]),
        }}
      />

      <section className="hero">
        <div className="wrap center">
          <p className="eyebrow">Pricing</p>
          <h1 style={{ margin: "0 auto" }}>
            Three prices, on one page, in numbers
          </h1>
          <p className="lead" style={{ marginTop: 20, maxWidth: "52ch" }}>
            No setup fee. No per-user fee. No per-feature fee. No annual
            contract. And never a charge based on how many families you served —
            the number of people at your door is not our revenue model.
          </p>
        </div>
      </section>

      <section style={{ paddingTop: 16 }}>
        <div className="wrap">
          <div className="grid grid-3">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`price-card${plan.id === "standard" ? " featured" : ""}`}
              >
                <h3>{plan.name}</h3>
                <p className="small">{plan.tagline}</p>
                <p className="amount">
                  {formatUsd(plan.monthlyCents)}
                  <span className="per">
                    {plan.monthlyCents === 0 ? " forever" : " / month"}
                  </span>
                </p>
                {plan.yearlyCents > 0 && (
                  <p className="small">
                    or {formatUsd(plan.yearlyCents)} a year —{" "}
                    {yearlyFreeMonths(plan)} months free
                  </p>
                )}
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                {plan.honestCaveat && (
                  <p
                    className="small"
                    style={{ marginBottom: 20, color: "var(--ink-soft)" }}
                  >
                    {plan.honestCaveat}
                  </p>
                )}
                <Link
                  className={`btn ${plan.id === "standard" ? "btn-primary" : "btn-secondary"} btn-block`}
                  to="/sign-up"
                >
                  {plan.monthlyCents === 0
                    ? "Start free"
                    : `Start on ${plan.name}`}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-tint">
        <div className="wrap-narrow stack">
          <h2>What is not included, on any plan</h2>
          <p className="lead">
            Every pricing page lists what you get. Here is what you do not, so
            you can find out now rather than in month three.
          </p>
          <ul className="stack" style={{ paddingLeft: 24 }}>
            <li>
              <strong>Offline use.</strong> Laevo needs a connection to save a
              visit.
            </li>
            <li>
              <strong>Cross-agency record sharing.</strong> If several agencies
              in your community need to see one shared client record, that is
              what Oasis Insight does and we do not.
            </li>
            <li>
              <strong>Donation processing or accounting.</strong> Laevo tracks
              gifts of food, not money.
            </li>
            <li>
              <strong>A phone number on Community.</strong> Free support is
              email, answered by a person, usually within a day. Standard is
              priority email; Network has a phone number.
            </li>
            <li>
              <strong>A mobile app in an app store.</strong> Laevo is a website
              that works properly on a phone. You can add it to a home screen
              and it behaves like an app, but there is nothing to install.
            </li>
          </ul>
        </div>
      </section>

      <section>
        <div className="wrap-narrow stack">
          <h2>How the free plan stays free</h2>
          <p>
            A fair question to ask of anything free, because the usual answers
            are advertising, data, or a bait-and-switch, and all three would be
            disqualifying here.
          </p>
          <p>
            The real answer is that Laevo is cheap to run. It sits on
            Cloudflare's edge network, where a pantry serving three hundred
            households a month costs us a fraction of a cent in compute. The
            free plan is paid for by the pantries on Standard and Network, and
            there are enough of those because a busy pantry genuinely does get
            nineteen dollars of value a month out of not spending an evening on
            a report.
          </p>
          <p>
            No advertising. No data sale. No investor who needs the free tier to
            convert at a particular rate by a particular quarter.
          </p>
          <div className="callout">
            <h3>The billing gate, described plainly</h3>
            <p>
              A new pantry gets {GRACE_DAYS} days and the full free allowance
              before we ask for anything. Nothing is disabled at the end of it —
              you are asked for a card only if you are past the Community
              limits, and we tell you first.
            </p>
          </div>
        </div>
      </section>

      <section className="section-tint">
        <div className="wrap-narrow">
          <h2 style={{ marginBottom: 24 }}>Questions about money</h2>
          {FAQ.map((item) => (
            <details key={item.q} className="faq-item">
              <summary>{item.q}</summary>
              <div className="answer">
                <p>{item.a}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section>
        <div className="wrap center stack">
          <h2>Have a look before you decide</h2>
          <p className="lead" style={{ maxWidth: "46ch" }}>
            The demo needs no signup and no email address. Nothing to cancel.
          </p>
          <div className="btn-row center-row">
            <Link className="btn btn-primary btn-big" to="/demo">
              Look around the demo
            </Link>
            <Link className="btn btn-secondary btn-big" to="/compare">
              Compare with what you use now
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
