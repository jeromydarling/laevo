import { Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { publicData } from "~/lib/loader";
import { marketingMeta } from "~/lib/meta";
import { breadcrumbLd, articleLd } from "~/lib/jsonld";
import { comparisonById, COMPARISONS } from "~/content/comparisons";
import { alternativeById, formatUsd, PLANS } from "~/lib/pricing";

export async function loader({ context, params }: LoaderFunctionArgs) {
  const comparison = comparisonById(params.id!);
  if (!comparison) {
    throw new Response("We do not have a comparison page for that one yet.", {
      status: 404,
    });
  }
  return { ...publicData(context), comparison };
}

export function meta({
  loaderData,
}: {
  loaderData?: Awaited<ReturnType<typeof loader>>;
}) {
  if (!loaderData) return [{ title: "Comparison — Laevo" }];
  return marketingMeta({
    title: loaderData.comparison.h1,
    description: loaderData.comparison.description,
    path: `/compare/${loaderData.comparison.id}`,
    siteUrl: loaderData.siteUrl,
    type: "article",
  });
}

export default function CompareDetail() {
  const { comparison, siteUrl } = useLoaderData<typeof loader>();
  const alt = alternativeById(comparison.id);
  const others = COMPARISONS.filter((c) => c.id !== comparison.id);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            articleLd({
              siteUrl,
              path: `/compare/${comparison.id}`,
              title: comparison.h1,
              description: comparison.description,
              updated: "2026-07-01",
            }),
            breadcrumbLd(siteUrl, [
              { name: "Laevo", path: "/" },
              { name: "Compare", path: "/compare" },
              { name: comparison.h1, path: `/compare/${comparison.id}` },
            ]),
          ]),
        }}
      />

      <section className="hero">
        <div className="wrap-narrow">
          <p className="eyebrow">
            <Link to="/compare">Comparisons</Link>
          </p>
          <h1>{comparison.h1}</h1>
          <div className="stack" style={{ marginTop: 20 }}>
            {comparison.intro.map((paragraph, i) => (
              <p key={i} className={i === 0 ? "lead" : undefined}>
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>

      {alt && (
        <section style={{ paddingTop: 0 }}>
          <div className="wrap-narrow">
            <div className="callout">
              <h3>Where they are better than us</h3>
              <p>{alt.whereTheyWin}</p>
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="wrap-narrow">
          <div className="grid grid-2">
            <div className="card">
              <h2 style={{ fontSize: "var(--t-h3)" }}>Stay where you are if</h2>
              <ul className="stack" style={{ paddingLeft: 22, marginTop: 14 }}>
                {comparison.stayIf.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="card">
              <h2 style={{ fontSize: "var(--t-h3)" }}>Worth switching if</h2>
              <ul className="stack" style={{ paddingLeft: 22, marginTop: 14 }}>
                {comparison.switchIf.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section-tint">
        <div className="wrap">
          <h2 style={{ marginBottom: 24 }}>Side by side</h2>
          <div className="table-scroll">
            <table>
              <caption className="visually-hidden">{comparison.h1}</caption>
              <thead>
                <tr>
                  <th scope="col">&nbsp;</th>
                  <th scope="col">{alt?.name ?? "Them"}</th>
                  <th scope="col">Laevo</th>
                </tr>
              </thead>
              <tbody>
                {comparison.rows.map((row) => (
                  <tr key={row.feature}>
                    <th scope="row" style={{ background: "transparent" }}>
                      {row.feature}
                    </th>
                    <td>{row.them}</td>
                    <td>{row.laevo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small" style={{ marginTop: 16 }}>
            Laevo's own prices on this page come from the same file the billing
            system reads, so they cannot drift out of date. Costs for{" "}
            {alt?.name ?? "the other tool"} are ranges reported by pantry
            operators rather than published starting prices. If you have a
            current quote that contradicts one of these,{" "}
            <Link to="/contact">send it to us</Link> and we will change the
            number.
          </p>
        </div>
      </section>

      <section>
        <div className="wrap-narrow stack">
          <h2>Our honest verdict</h2>
          <p className="lead">{comparison.verdict}</p>
          <div className="btn-row" style={{ marginTop: 16 }}>
            <Link className="btn btn-primary btn-big" to="/demo">
              Look around the demo
            </Link>
            <Link className="btn btn-secondary btn-big" to="/pricing">
              See our prices ({formatUsd(PLANS[0].monthlyCents)}–
              {formatUsd(PLANS[2].monthlyCents)})
            </Link>
          </div>
        </div>
      </section>

      <section className="section-tint">
        <div className="wrap">
          <h2 style={{ marginBottom: 24 }}>Other comparisons</h2>
          <div className="grid grid-2">
            {others.map((other) => (
              <Link
                key={other.id}
                className="guide-card"
                to={`/compare/${other.id}`}
              >
                <span className="pill">Comparison</span>
                <h3>{other.h1}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
