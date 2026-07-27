import { Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { publicData } from "~/lib/loader";
import { marketingMeta, DEFAULT_DESCRIPTION } from "~/lib/meta";
import {
  organizationLd,
  webSiteLd,
  softwareApplicationLd,
  faqLd,
} from "~/lib/jsonld";
import { HOME_PRINCIPLES } from "~/content/principles";
import { GUIDES } from "~/content/guides";
import { PLANS, ALTERNATIVES, formatUsd } from "~/lib/pricing";
import { Calculator } from "~/components/Calculator";
import { WheatMark } from "~/components/Brand";

export async function loader({ context }: LoaderFunctionArgs) {
  return publicData(context);
}

export function meta({ loaderData }: { loaderData?: { siteUrl: string } }) {
  return marketingMeta({
    title: "Laevo — software for food pantries",
    description: DEFAULT_DESCRIPTION,
    path: "/",
    siteUrl: loaderData?.siteUrl ?? "https://laevo.app",
  });
}

const HOME_FAQ = [
  {
    q: "Is the free plan really free?",
    a: "Yes, and it is not a trial. A pantry serving up to 400 households a month at one location pays nothing, forever, with every feature turned on. We do not ask for a card. If you approach the limit we tell you before you cross it, not after.",
  },
  {
    q: "Do you charge per volunteer login?",
    a: "No, and we never will. Charging per user is a tax on including people, and a pantry should not have to decide who is worth a login.",
  },
  {
    q: "Do you charge per family we serve?",
    a: "No. The number of people at your door is not our revenue model, and a pricing page that grows as need grows is a pricing page pointed the wrong way.",
  },
  {
    q: "Our volunteers are older and not confident with phones. Will they manage?",
    a: "That is who Laevo is designed for first, not as an afterthought. Big text that gets bigger with one tap, buttons you can hit while holding a box, one thing per screen, plain words, and no critical function hidden behind a swipe or a menu. There is a whole page about what that changed in the product.",
  },
  {
    q: "Can we get our data back out?",
    a: "In one click, whole, as a plain file, at any time — including on the day you decide to leave. Your records are yours. Holding data hostage is a business model we have chosen not to have.",
  },
  {
    q: "What happens to our existing records?",
    a: "Export a CSV from whatever you use now and Laevo reads the columns itself, shows you its guess, and waits for you to say yes before saving anything. Most pantries are moved over in an afternoon. We do not promise five minutes, because that has not been true for anyone we have watched do it.",
  },
  {
    q: "Do you use our data to train anything, or sell it?",
    a: "No. Not sold, not rented, not mined, not used to train a model. We do not have a business model that would tempt us to, and we would rather say that plainly than bury it in a privacy policy.",
  },
];

export default function Home() {
  const { siteUrl } = useLoaderData<typeof loader>();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            organizationLd(siteUrl),
            webSiteLd(siteUrl),
            softwareApplicationLd(siteUrl),
            faqLd(HOME_FAQ),
          ]),
        }}
      />

      {/* ---- Hero ---- */}
      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">Laevo — Latin for lift up</p>
          <h1>Nobody who comes to your door is a case number.</h1>
          <p className="lead">
            Laevo keeps track of the food on your shelves and the neighbors
            you have helped, so a volunteer-run pantry can spend Saturday on
            people instead of paperwork.
          </p>
          <div className="btn-row" style={{ marginTop: 32 }}>
            <Link className="btn btn-primary btn-big" to="/demo">
              Look around a real pantry
            </Link>
            <Link className="btn btn-secondary btn-big" to="/sign-up">
              Start our pantry — free
            </Link>
          </div>
          <div className="badge-row" style={{ marginTop: 28 }}>
            <span className="badge">Free for most pantries</span>
            <span className="badge">No card, no sales call</span>
            <span className="badge">Built for old phones</span>
            <span className="badge">Your data leaves when you do</span>
          </div>
        </div>
      </section>

      {/* ---- The scene ---- */}
      <section>
        <div className="wrap">
          <div className="grid grid-2" style={{ alignItems: "start" }}>
            <div className="stack">
              <h2>The problem is rarely the food</h2>
              <p className="lead">
                Most pantries can find the food. What runs them into the ground
                is everything around it.
              </p>
              <p>
                It is the third person this morning being asked their household
                size again, out loud, with four people listening. It is the case
                of peaches found behind the newer case, two months past its
                date. It is the volunteer who did not come because nobody
                reminded her. It is the Tuesday evening in October spent
                counting a quarter's worth of clipboard entries into a form
                that was due Friday.
              </p>
              <p>
                None of that is a food problem. All of it is a keeping-track
                problem, and keeping track is something software is genuinely
                good at — if it is built for the person actually doing it.
              </p>
            </div>

            <div className="card">
              <h3>What a Saturday looks like with Laevo</h3>
              <ul className="stack" style={{ listStyle: "none", marginTop: 16 }}>
                <li>
                  <strong>At the window.</strong> Type three letters of a name
                  or a card code. The household is there with its size and its
                  needs. One big button records the visit.
                </li>
                <li>
                  <strong>On the shelf.</strong> What is running low and what is
                  closest to its date, on the screen you already had open.
                </li>
                <li>
                  <strong>On the rota.</strong> Volunteers claim their own
                  shifts from a link. Everyone gets a reminder two days before.
                </li>
                <li>
                  <strong>At the end of the month.</strong> The report is
                  already drafted from the visits you recorded, and it shows you
                  which visits made each number.
                </li>
              </ul>
              <p style={{ marginTop: 20 }}>
                <Link className="btn btn-secondary btn-block" to="/how-it-works">
                  Walk through a week
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- The principles: the heart of the page ---- */}
      <section className="section-tint">
        <div className="wrap">
          <div className="center" style={{ marginBottom: 40 }}>
            <p className="eyebrow">What this is built on</p>
            <h2>Seven things we decided before writing any code</h2>
            <p className="lead" style={{ marginTop: 14, maxWidth: "56ch" }}>
              Each one is paired with the specific thing the software does
              because of it. A value you cannot point at in the product is not a
              value, it is decoration.
            </p>
          </div>

          <div className="grid grid-2">
            {HOME_PRINCIPLES.map((principle) => (
              <div key={principle.id} className="principle">
                <h3>{principle.title}</h3>
                <p>{principle.body}</p>
                <div className="in-product">
                  <strong>In Laevo</strong>
                  <span className="muted">{principle.inProduct}</span>
                </div>
              </div>
            ))}
          </div>

          <p style={{ marginTop: 40 }}>
            <Link className="btn btn-secondary" to="/why">
              Read all ten, and what we refuse to build
            </Link>
          </p>
        </div>
      </section>

      {/* ---- The elderly-first commitment ---- */}
      <section className="section-ink">
        <div className="wrap">
          <div className="grid grid-2" style={{ alignItems: "center" }}>
            <div className="stack">
              <p className="eyebrow" style={{ color: "#f2c14e" }}>
                The main design constraint
              </p>
              <h2>Built for the volunteer who does not love computers</h2>
              <p className="lead">
                A large share of the people keeping pantries open are retired,
                and plenty of them never used a computer at work. They are not
                bad at technology. They are handed tools designed by people who
                have never watched them try.
              </p>
              <p>
                So we watched. Then we made the text big and gave it a button to
                make it bigger. We made every target you have to hit at least
                fifty-six pixels across, because a tap that lands slightly off
                and does nothing is how someone decides they are the problem. We
                put one thing on each screen. We removed every menu hidden
                behind three dots. We made confirmation messages stay on screen
                until they are dismissed, so nobody is left wondering whether it
                worked.
              </p>
              <p>
                None of that is an accessibility checkbox we ticked at the end.
                It is the constraint every feature has to survive, and features
                that break it do not ship.
              </p>
              <p style={{ marginTop: 12 }}>
                <Link className="btn btn-secondary" to="/for-volunteers">
                  See exactly what that changed
                </Link>
              </p>
            </div>

            <div
              className="card"
              style={{ background: "#0b3a27", borderColor: "#2b6349" }}
            >
              <h3 style={{ color: "#fff" }}>The rules we hold ourselves to</h3>
              <ul
                className="stack"
                style={{ listStyle: "none", marginTop: 16, color: "#cfe3d7" }}
              >
                <li>Body text starts at 18 pixels and goes to 24 with one tap.</li>
                <li>Nothing you tap is smaller than 56 pixels on its short edge.</li>
                <li>One column on a phone. Always.</li>
                <li>Nothing important behind a hover, a swipe, or a menu.</li>
                <li>Plain words. No jargon, no abbreviations we invented.</li>
                <li>Every screen works one-handed.</li>
                <li>Every screen has a paper fallback that is not a failure.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---- What it does ---- */}
      <section>
        <div className="wrap">
          <h2>What Laevo actually does</h2>
          <p className="lead" style={{ marginTop: 12, marginBottom: 36 }}>
            Six things, done properly, instead of thirty things done thinly.
          </p>

          <div className="grid grid-3">
            <div className="card">
              <h3>Neighbors</h3>
              <p>
                One record per household that lasts between visits, with size,
                ages and what they cannot eat. Returning is a lookup, not a
                second interview. Laevo notices when a new record looks like one
                you already have and asks you — it never merges anything on its
                own.
              </p>
            </div>
            <div className="card">
              <h3>The window</h3>
              <p>
                Check someone in on one screen in under a minute. Search by
                name, phone, or a short card code they can carry. Serve first
                and record after if the queue is long — no required field ever
                stands between a person and a bag of groceries.
              </p>
            </div>
            <div className="card">
              <h3>The shelf</h3>
              <p>
                What you have, in the units you actually count in — cans, bags,
                loaves, pounds. Plain warnings about what is running low and
                what is closest to its date, on the screen you already look at,
                not in a report you have to remember to run.
              </p>
            </div>
            <div className="card">
              <h3>Volunteers</h3>
              <p>
                Shifts with a public link, so people claim their own instead of
                going through one coordinator's inbox. Reminders two days
                before, which is the cheapest useful thing in this whole
                product. Hours logged, because in-kind hours are real match
                money on a grant application.
              </p>
            </div>
            <div className="card">
              <h3>Reports</h3>
              <p>
                TEFAP, CSFP and state household and individual counts, drafted
                from the visits you already recorded, with the working shown —
                click a number and see which visits made it. A person checks it
                and files it, because a person is accountable for it.
              </p>
            </div>
            <div className="card">
              <h3>Moving in</h3>
              <p>
                Export a CSV from whatever you use now. Laevo reads the column
                headers, shows you its guess with how sure it is, and saves
                nothing until you say yes. Most pantries are moved over in an
                afternoon.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Calculator ---- */}
      <section className="section-tint">
        <div className="wrap">
          <div className="center" style={{ marginBottom: 32 }}>
            <h2>What switching would be worth</h2>
            <p className="lead" style={{ marginTop: 12, maxWidth: "52ch" }}>
              Your numbers, our arithmetic, and every assumption printed
              underneath so you can argue with it.
            </p>
          </div>
          <Calculator />
        </div>
      </section>

      {/* ---- Comparison snapshot ---- */}
      <section>
        <div className="wrap">
          <h2>What pantries actually pay elsewhere</h2>
          <p className="lead" style={{ marginTop: 12, marginBottom: 28 }}>
            Ranges reported by pantry operators, not starting prices from a
            marketing page. Every one of these tools beats Laevo at something,
            and the comparison pages say what.
          </p>

          <div className="table-scroll">
            <table>
              <caption className="visually-hidden">
                Monthly cost comparison between Laevo and other pantry software
              </caption>
              <thead>
                <tr>
                  <th scope="col">What you might use</th>
                  <th scope="col">Typical monthly cost</th>
                  <th scope="col">Charges per user?</th>
                </tr>
              </thead>
              <tbody>
                {ALTERNATIVES.map((alt) => (
                  <tr key={alt.id}>
                    <th scope="row" style={{ background: "transparent" }}>
                      <Link to={`/compare/${alt.id}`}>{alt.name}</Link>
                    </th>
                    <td>
                      {alt.lowCents === alt.highCents
                        ? formatUsd(alt.lowCents)
                        : `${formatUsd(alt.lowCents)} – ${formatUsd(alt.highCents)}`}
                    </td>
                    <td>{alt.perUser ? "Yes" : "No"}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row" style={{ background: "var(--green-wash)" }}>
                    Laevo
                  </th>
                  <td>
                    <strong>
                      {formatUsd(PLANS[0].monthlyCents)} –{" "}
                      {formatUsd(PLANS[2].monthlyCents)}
                    </strong>
                  </td>
                  <td>
                    <strong>Never</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p style={{ marginTop: 24 }}>
            <Link className="btn btn-secondary" to="/compare">
              Read the honest comparisons
            </Link>
          </p>
        </div>
      </section>

      {/* ---- Pricing snapshot ---- */}
      <section className="section-tint">
        <div className="wrap">
          <div className="center" style={{ marginBottom: 36 }}>
            <h2>Three prices, on one page, in numbers</h2>
            <p className="lead" style={{ marginTop: 12 }}>
              No setup fee. No per-user fee. No per-feature fee. No contract.
            </p>
          </div>

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
                <ul>
                  {plan.features.slice(0, 4).map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Link
                  className={`btn ${plan.id === "standard" ? "btn-primary" : "btn-secondary"} btn-block`}
                  to="/sign-up"
                >
                  {plan.monthlyCents === 0 ? "Start free" : `Start on ${plan.name}`}
                </Link>
              </div>
            ))}
          </div>

          <p className="center" style={{ marginTop: 28 }}>
            <Link to="/pricing">Everything on the pricing page, including what is not included</Link>
          </p>
        </div>
      </section>

      {/* ---- Guides ---- */}
      <section>
        <div className="wrap">
          <h2>Writing for people who run pantries</h2>
          <p className="lead" style={{ marginTop: 12, marginBottom: 28 }}>
            Useful whether or not you ever sign up. That is the point of it.
          </p>
          <div className="grid grid-3">
            {GUIDES.slice(0, 3).map((guide) => (
              <Link
                key={guide.slug}
                className="guide-card"
                to={`/guides/${guide.slug}`}
                prefetch="intent"
              >
                <span className="pill">{guide.category}</span>
                <h3>{guide.h1}</h3>
                <p className="small">{guide.description}</p>
              </Link>
            ))}
          </div>
          <p style={{ marginTop: 24 }}>
            <Link className="btn btn-secondary" to="/guides">
              All the guides
            </Link>
          </p>
        </div>
      </section>

      {/* ---- FAQ ---- */}
      <section className="section-tint">
        <div className="wrap-narrow">
          <h2 style={{ marginBottom: 24 }}>Questions people actually ask</h2>
          {HOME_FAQ.map((item) => (
            <details key={item.q} className="faq-item">
              <summary>{item.q}</summary>
              <div className="answer">
                <p>{item.a}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ---- Close ---- */}
      <section>
        <div className="wrap center stack-lg">
          <p style={{ color: "var(--green-deep)" }}>
            <WheatMark size={56} />
          </p>
          <h2>Have a look before you decide anything</h2>
          <p className="lead" style={{ maxWidth: "48ch" }}>
            The demo is a real pantry with a real Saturday in it — forty-six
            neighbors, three months of visits, a shelf with things going out of
            date. No signup, no email address, nothing to cancel.
          </p>
          <div className="btn-row center-row">
            <Link className="btn btn-primary btn-big" to="/demo">
              Look around the demo
            </Link>
            <Link className="btn btn-secondary btn-big" to="/contact">
              Ask us something first
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
