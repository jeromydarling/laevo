import { Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { publicData } from "~/lib/loader";
import { marketingMeta } from "~/lib/meta";
import { breadcrumbLd } from "~/lib/jsonld";
import { COMPARISONS } from "~/content/comparisons";
import { ALTERNATIVES, PLANS, formatUsd } from "~/lib/pricing";

export async function loader({ context }: LoaderFunctionArgs) {
  return publicData(context);
}

export function meta({ loaderData }: { loaderData?: { siteUrl: string } }) {
  return marketingMeta({
    title: "Laevo compared with what you use now",
    description:
      "Honest comparisons of Laevo with PantrySoft, Link2Feed, Oasis Insight, spreadsheets and paper — including what each of them does better and when you should not switch.",
    path: "/compare",
    siteUrl: loaderData?.siteUrl ?? "https://laevo.app",
  });
}

export default function Compare() {
  const { siteUrl } = useLoaderData<typeof loader>();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbLd(siteUrl, [
              { name: "Laevo", path: "/" },
              { name: "Compare", path: "/compare" },
            ]),
          ),
        }}
      />

      <section className="hero">
        <div className="wrap-narrow">
          <p className="eyebrow">Comparisons</p>
          <h1>Where each of these beats us</h1>
          <p className="lead" style={{ marginTop: 20 }}>
            Every comparison page here names at least one thing the other tool
            does better than Laevo, in specific terms, and says plainly when you
            should not switch. That is not modesty. A comparison where the
            competitor never wins is an advertisement in a costume, and you can
            tell within a paragraph.
          </p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="table-scroll" style={{ marginBottom: 40 }}>
            <table>
              <caption className="visually-hidden">
                Monthly cost and pricing model across pantry software
              </caption>
              <thead>
                <tr>
                  <th scope="col">What you might use</th>
                  <th scope="col">Typical monthly cost</th>
                  <th scope="col">Per user?</th>
                  <th scope="col">Why people pay it</th>
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
                    <td>{alt.note}</td>
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
                  <td>One price, every feature, built for volunteers.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-2">
            {COMPARISONS.map((comparison) => {
              const alt = ALTERNATIVES.find((a) => a.id === comparison.id);
              return (
                <Link
                  key={comparison.id}
                  className="guide-card"
                  to={`/compare/${comparison.id}`}
                  prefetch="intent"
                >
                  <span className="pill">Comparison</span>
                  <h3>{comparison.h1}</h3>
                  {alt && (
                    <p className="small">
                      <strong>Where they win:</strong> {alt.whereTheyWin}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section-tint">
        <div className="wrap-narrow center stack">
          <h2>Not sure which of these you even are?</h2>
          <p className="lead">
            Open the demo and spend five minutes in it. It is a real pantry with
            three months of Saturdays in it, and it will tell you more than any
            table can.
          </p>
          <div className="btn-row center-row">
            <Link className="btn btn-primary btn-big" to="/demo">
              Look around the demo
            </Link>
            <Link className="btn btn-secondary btn-big" to="/contact">
              Ask us which one fits
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
