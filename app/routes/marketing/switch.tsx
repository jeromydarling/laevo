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
    title: "Switching from what you use now",
    description:
      "How to move your existing neighbor records into Laevo from a CSV export — what happens, what we guess, what we ask you to check, and what we do not promise.",
    path: "/switch",
    siteUrl: loaderData?.siteUrl ?? "https://laevo.us",
  });
}

const FAQ = [
  {
    q: "How long does it really take?",
    a: "An afternoon for most pantries, including the part where you look at the preview and change your mind about two columns. We do not promise five minutes. Other pantry software does, and we have never watched anybody actually do it in five minutes.",
  },
  {
    q: "What if our export is a mess?",
    a: "Send it to us and we will look at it. Genuinely — a real person opens the file. Most messes are two columns that got merged or a date format nobody has seen since 1997, and both are quick to sort out once someone has looked.",
  },
  {
    q: "Can we import visit history too?",
    a: "Partly. If your export has a last-visit date, Laevo will record it so your neighbor records are not all brand new. Full visit-by-visit history varies too much between systems for us to import reliably, so we import the last visit and leave the rest in your old export, which you should keep.",
  },
  {
    q: "What happens to our old system?",
    a: "Keep it running until you have done one full month in Laevo and filed one report from it. Then cancel. Anyone who tells you to switch cold on the first of the month has never run a pantry.",
  },
];

export default function Switch() {
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
              { name: "Switching over", path: "/switch" },
            ]),
          ]),
        }}
      />

      <section className="hero">
        <div className="wrap-narrow">
          <p className="eyebrow">Moving in</p>
          <h1>Nobody is retyping four years of records</h1>
          <p className="lead" style={{ marginTop: 20 }}>
            The single biggest reason pantries stay on software they dislike is
            the fear of re-entering everything by hand. So this is the part we
            built carefully, and the part we are most careful not to overpromise
            about.
          </p>
          <div style={{ marginTop: 32 }}>
            <Photo photo="shelf" priority sizes="(min-width: 760px) 680px, 100vw" />
          </div>
        </div>
      </section>

      <section>
        <div className="wrap-narrow stack-lg">
          <div className="card">
            <span className="pill">Step one</span>
            <h2 style={{ fontSize: "var(--t-h3)", marginTop: 12 }}>
              Export a CSV from whatever you use now
            </h2>
            <p style={{ marginTop: 10 }}>
              PantrySoft, Link2Feed, Oasis Insight, Pantry Trak, Airtable,
              Google Sheets, Excel — all of them can produce a CSV, usually from
              a menu called Export or Download. If you cannot find it, send us a
              screenshot of the menu and we will point at the right item.
            </p>
          </div>

          <div className="card">
            <span className="pill">Step two</span>
            <h2 style={{ fontSize: "var(--t-h3)", marginTop: 12 }}>
              Laevo reads the column headings
            </h2>
            <p style={{ marginTop: 10 }}>
              It recognises the header names these systems actually produce —
              FName, Client Last, HH Size, # in Household, DOB, Primary Phone,
              and a few hundred others — and lines each one up with a field.
            </p>
            <div className="in-product" style={{ marginTop: 16 }}>
              <strong>How the guessing works</strong>
              <span className="muted">
                A lookup table, not a language model. Column headers are a
                small, closed problem, and a table gets it right more often,
                gives the same answer every time, costs nothing to run, and can
                be tested. Where we are less sure, the screen says so in words:
                "Fairly sure" or "Not sure — please check".
              </span>
            </div>
          </div>

          <div className="card">
            <span className="pill">Step three</span>
            <h2 style={{ fontSize: "var(--t-h3)", marginTop: 12 }}>
              You look at it before anything is saved
            </h2>
            <p style={{ marginTop: 10 }}>
              You see the first rows exactly as they will land, with every
              column mapping shown and changeable, and every row we could not
              read cleanly flagged with the reason. Nothing is written to your
              pantry until you press the button.
            </p>
            <p style={{ marginTop: 12 }}>
              Rows with problems are never dropped quietly. A date we could not
              parse or a household size that says "four" instead of "4" is shown
              to you, and you decide.
            </p>
          </div>

          <div className="card">
            <span className="pill">Step four</span>
            <h2 style={{ fontSize: "var(--t-h3)", marginTop: 12 }}>
              It imports, and tells you what happened
            </h2>
            <p style={{ marginTop: 10 }}>
              How many neighbors came in, how many rows were skipped and why,
              and how many looked like duplicates of each other. The duplicates
              are put side by side for you to decide about — Laevo never merges
              two people on its own.
            </p>
          </div>
        </div>
      </section>

      <section className="section-tint">
        <div className="wrap-narrow stack">
          <h2>What we do not promise</h2>
          <ul className="stack" style={{ paddingLeft: 24 }}>
            <li>
              <strong>Not five minutes.</strong> An afternoon, including the
              part where you look at the preview and change two columns.
            </li>
            <li>
              <strong>Not full visit history.</strong> Last-visit dates come
              across. Visit-by-visit history varies too much between systems for
              us to import it honestly.
            </li>
            <li>
              <strong>Not your custom fields.</strong> If your old system had
              seven fields we do not have, they will come in as notes rather
              than disappearing — but they will not be searchable columns.
            </li>
            <li>
              <strong>Not your old reports.</strong> Reports already filed stay
              filed. Keep the export from your old system; it is the record.
            </li>
          </ul>
          <p style={{ marginTop: 8 }}>
            Run both systems for one month and file one report from Laevo before
            you cancel anything. We will say this again when you start the
            import, because it is the advice that matters most.
          </p>
        </div>
      </section>

      <section>
        <div className="wrap-narrow">
          <h2 style={{ marginBottom: 24 }}>Questions about switching</h2>
          {FAQ.map((item) => (
            <details key={item.q} className="faq-item">
              <summary>{item.q}</summary>
              <div className="answer">
                <p>{item.a}</p>
              </div>
            </details>
          ))}

          <div className="btn-row" style={{ marginTop: 40 }}>
            <Link className="btn btn-primary btn-big" to="/sign-up">
              Start and bring our records
            </Link>
            <Link className="btn btn-secondary btn-big" to="/contact">
              Send us the file first
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
