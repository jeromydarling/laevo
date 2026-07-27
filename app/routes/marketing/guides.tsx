import { Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { publicData } from "~/lib/loader";
import { marketingMeta } from "~/lib/meta";
import { breadcrumbLd } from "~/lib/jsonld";
import { GUIDES, GUIDE_CATEGORIES, readingMinutes } from "~/content/guides";

export async function loader({ context }: LoaderFunctionArgs) {
  return publicData(context);
}

export function meta({ loaderData }: { loaderData?: { siteUrl: string } }) {
  return marketingMeta({
    title: "Guides for people who run food pantries",
    description:
      "Practical writing on starting a pantry, TEFAP reporting, cutting food waste, finding volunteers, helping older volunteers with tablets, and treating people well at the window.",
    path: "/guides",
    siteUrl: loaderData?.siteUrl ?? "https://laevo.app",
  });
}

export default function Guides() {
  const { siteUrl } = useLoaderData<typeof loader>();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbLd(siteUrl, [
              { name: "Laevo", path: "/" },
              { name: "Guides", path: "/guides" },
            ]),
          ),
        }}
      />

      <section className="hero">
        <div className="wrap-narrow">
          <p className="eyebrow">Guides</p>
          <h1>Writing for people who run food pantries</h1>
          <p className="lead" style={{ marginTop: 20 }}>
            Written to be useful whether or not you ever sign up. Nothing here
            is a feature list with a headline on it — if a guide does not end
            with something you could do tomorrow, it does not go up.
          </p>
        </div>
      </section>

      {GUIDE_CATEGORIES.map((category) => {
        const inCategory = GUIDES.filter((g) => g.category === category);
        if (!inCategory.length) return null;
        return (
          <section key={category} style={{ paddingTop: 8 }}>
            <div className="wrap">
              <h2 style={{ marginBottom: 20 }}>{category}</h2>
              <div className="grid grid-2">
                {inCategory.map((guide) => (
                  <Link
                    key={guide.slug}
                    className="guide-card"
                    to={`/guides/${guide.slug}`}
                    prefetch="intent"
                  >
                    <span className="pill">
                      {readingMinutes(guide)} minute read
                    </span>
                    <h3>{guide.h1}</h3>
                    <p className="small">{guide.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      <section className="section-tint">
        <div className="wrap-narrow center stack">
          <h2>Something missing?</h2>
          <p className="lead">
            If you run a pantry and there is a question you cannot find a
            straight answer to anywhere, tell us. We would rather write the
            answer than watch you spend an evening looking for it.
          </p>
          <p>
            <Link className="btn btn-secondary btn-big" to="/contact">
              Suggest a guide
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
