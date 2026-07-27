import { Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { publicData } from "~/lib/loader";
import { marketingMeta } from "~/lib/meta";
import { articleLd, breadcrumbLd, faqLd } from "~/lib/jsonld";
import { guideBySlug, readingMinutes, type Block, GUIDES } from "~/content/guides";

export async function loader({ context, params }: LoaderFunctionArgs) {
  const guide = guideBySlug(params.slug!);
  if (!guide) {
    throw new Response("That guide is not here.", { status: 404 });
  }
  return { ...publicData(context), guide };
}

export function meta({
  loaderData,
}: {
  loaderData?: Awaited<ReturnType<typeof loader>>;
}) {
  if (!loaderData) return [{ title: "Guide — Laevo" }];
  return marketingMeta({
    title: loaderData.guide.title,
    description: loaderData.guide.description,
    path: `/guides/${loaderData.guide.slug}`,
    siteUrl: loaderData.siteUrl,
    type: "article",
    publishedTime: loaderData.guide.updated,
  });
}

function renderBlock(block: Block, i: number) {
  switch (block.kind) {
    case "h2":
      return <h2 key={i}>{block.text}</h2>;
    case "p":
      return <p key={i}>{block.text}</p>;
    case "ul":
      return (
        <ul key={i}>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={i}>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      );
    case "callout":
      return (
        <div key={i} className="callout">
          <h3>{block.title}</h3>
          <p>{block.text}</p>
        </div>
      );
    case "quote":
      return (
        <blockquote key={i}>
          {block.text}
          {block.attribution && (
            <footer className="small" style={{ marginTop: 8 }}>
              — {block.attribution}
            </footer>
          )}
        </blockquote>
      );
  }
}

export default function GuidePage() {
  const { guide, siteUrl } = useLoaderData<typeof loader>();
  const related = guide.related
    .map((slug) => GUIDES.find((g) => g.slug === slug))
    .filter((g): g is (typeof GUIDES)[number] => Boolean(g));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            articleLd({
              siteUrl,
              path: `/guides/${guide.slug}`,
              title: guide.title,
              description: guide.description,
              updated: guide.updated,
            }),
            breadcrumbLd(siteUrl, [
              { name: "Laevo", path: "/" },
              { name: "Guides", path: "/guides" },
              { name: guide.h1, path: `/guides/${guide.slug}` },
            ]),
            faqLd(guide.faq),
          ]),
        }}
      />

      <article>
        <section className="hero">
          <div className="wrap-narrow">
            <p className="eyebrow">
              <Link to="/guides">Guides</Link> — {guide.category}
            </p>
            <h1>{guide.h1}</h1>
            <p className="lead" style={{ marginTop: 20 }}>
              {guide.description}
            </p>
            <p className="small" style={{ marginTop: 16 }}>
              About {readingMinutes(guide)} minutes to read. Last checked{" "}
              {new Date(guide.updated).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
              .
            </p>
          </div>
        </section>

        <section style={{ paddingTop: 8 }}>
          <div className="wrap-narrow prose">
            {guide.blocks.map(renderBlock)}
          </div>
        </section>

        {guide.faq.length > 0 && (
          <section className="section-tint">
            <div className="wrap-narrow">
              <h2 style={{ marginBottom: 20 }}>Common questions</h2>
              {guide.faq.map((item) => (
                <details key={item.q} className="faq-item">
                  <summary>{item.q}</summary>
                  <div className="answer">
                    <p>{item.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}
      </article>

      <section>
        <div className="wrap-narrow">
          <div className="card">
            <p className="lead">{guide.cta.text}</p>
            <p style={{ marginTop: 20 }}>
              <Link className="btn btn-primary btn-big" to={guide.cta.href}>
                {guide.cta.label}
              </Link>
            </p>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section style={{ paddingTop: 8 }}>
          <div className="wrap">
            <h2 style={{ marginBottom: 20 }}>Related reading</h2>
            <div className="grid grid-3">
              {related.map((other) => (
                <Link
                  key={other.slug}
                  className="guide-card"
                  to={`/guides/${other.slug}`}
                  prefetch="intent"
                >
                  <span className="pill">{other.category}</span>
                  <h3>{other.h1}</h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
