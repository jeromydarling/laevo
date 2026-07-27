import { Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { publicData } from "~/lib/loader";
import { marketingMeta } from "~/lib/meta";
import { breadcrumbLd } from "~/lib/jsonld";
import { PRINCIPLES } from "~/content/principles";

export async function loader({ context }: LoaderFunctionArgs) {
  return publicData(context);
}

export function meta({ loaderData }: { loaderData?: { siteUrl: string } }) {
  return marketingMeta({
    title: "What Laevo is built on",
    description:
      "Ten beliefs about the people a food pantry serves, each paired with the specific thing Laevo does — or refuses to build — because of it.",
    path: "/why",
    siteUrl: loaderData?.siteUrl ?? "https://laevo.us",
  });
}

const REFUSALS = [
  {
    thing: "A risk score on a human being",
    why: "Some pantry software will rank a household's likelihood of misusing a service. We will not build this. A person short of food is not a fraud surface, and the small amount of misuse that exists costs less than the dignity it would take to hunt for it.",
  },
  {
    thing: "Charging per family served",
    why: "It would be a price that rises as need rises. On the worst month a neighborhood has, the bill would go up. We would rather earn less than build that incentive into the company.",
  },
  {
    thing: "Charging per volunteer login",
    why: "It makes a pantry decide who is worth an account, which produces shared logins, which means nobody knows who recorded what. The saving is imaginary and the cost is real.",
  },
  {
    thing: "Automatic messages to the people you serve",
    why: "Nothing in Laevo contacts a neighbor without a person pressing send. Automated outreach to somebody in a hard month is a good idea in a slide deck and an intrusion in a kitchen.",
  },
  {
    thing: "Selling, renting or training on your data",
    why: "Not now and not later. This is the promise most easily broken quietly, so it is written here, in public, where breaking it would be visible.",
  },
  {
    thing: "Making your records hard to take with you",
    why: "Export is one click and includes everything. A product that keeps customers by holding their history hostage has stopped competing on being good.",
  },
];

export default function Why() {
  const { siteUrl } = useLoaderData<typeof loader>();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbLd(siteUrl, [
              { name: "Laevo", path: "/" },
              { name: "What we believe", path: "/why" },
            ]),
          ),
        }}
      />

      <section className="hero">
        <div className="wrap-narrow">
          <p className="eyebrow">What we believe</p>
          <h1>Ten things, and what each one costs us</h1>
          <p className="lead" style={{ marginTop: 20 }}>
            Every company has a values page. Most are decoration, because
            nothing on them would ever cause the company to turn down money.
            Each belief here is followed by the specific thing the software does
            because of it — and further down, the six things we have decided not
            to build.
          </p>
        </div>
      </section>

      <section>
        <div className="wrap-narrow">
          <div className="stack-lg">
            {PRINCIPLES.map((principle, i) => (
              <article key={principle.id} className="principle">
                <p
                  className="small"
                  style={{ color: "var(--gold)", fontWeight: 800 }}
                >
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h2 style={{ fontSize: "var(--t-h3)" }}>{principle.title}</h2>
                <p style={{ marginTop: 12 }}>{principle.body}</p>
                <div className="in-product">
                  <strong>In Laevo</strong>
                  <span className="muted">{principle.inProduct}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-tint">
        <div className="wrap-narrow">
          <h2>Six things we will not build</h2>
          <p className="lead" style={{ marginTop: 12, marginBottom: 32 }}>
            A list of refusals describes a company more honestly than a list of
            features. These are the ones that have come up, and what saying no
            to them costs.
          </p>
          <div className="stack-lg">
            {REFUSALS.map((item) => (
              <div key={item.thing} className="card">
                <h3>{item.thing}</h3>
                <p style={{ marginTop: 10 }}>{item.why}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap-narrow center stack">
          <h2>Where this comes from</h2>
          <p className="lead">
            None of it is original. It is the ordinary moral common sense of
            people who have done this work for a long time: that a person is not
            their worst month, that those closest to a problem usually
            understand it best, that unpaid work is still work, and that a
            community is measured by how it treats whoever is having the hardest
            time in it.
          </p>
          <p>
            We did not invent those ideas. We decided that a piece of software
            could either express them or quietly contradict them, and that most
            pantry software quietly contradicts them.
          </p>
          <div className="btn-row center-row" style={{ marginTop: 24 }}>
            <Link className="btn btn-primary btn-big" to="/demo">
              See it in practice
            </Link>
            <Link className="btn btn-secondary btn-big" to="/for-volunteers">
              How it works for older volunteers
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
