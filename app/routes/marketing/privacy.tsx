import { Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { publicData } from "~/lib/loader";
import { marketingMeta } from "~/lib/meta";

export async function loader({ context }: LoaderFunctionArgs) {
  return publicData(context);
}

export function meta({ loaderData }: { loaderData?: { siteUrl: string } }) {
  return marketingMeta({
    title: "Privacy",
    description:
      "What Laevo stores about the people your pantry serves, who can see it, how long it is kept, and the things we will never do with it.",
    path: "/privacy",
    siteUrl: loaderData?.siteUrl ?? "https://laevo.us",
  });
}

export default function Privacy() {
  useLoaderData<typeof loader>();

  return (
    <section className="hero" style={{ paddingBottom: 64 }}>
      <div className="wrap-narrow prose">
        <p className="eyebrow">Privacy</p>
        <h1>Privacy</h1>
        <p className="lead">
          Your pantry's records include some of the most sensitive information
          anybody holds about a household: that they were short of food, and
          when. This page says what happens to it, in short sentences.
        </p>

        <h2>The short version</h2>
        <ul>
          <li>Your pantry's records belong to your pantry.</li>
          <li>
            We do not sell, rent, share, mine, or train anything on them. Not
            now, not later.
          </li>
          <li>
            Only people your pantry has given a login can see your records.
          </li>
          <li>You can export everything, or delete it, at any time.</li>
          <li>
            We only look at your data if you ask us to help with something, and
            we say so when we do.
          </li>
        </ul>

        <h2>What we store</h2>
        <p>
          <strong>About the people your pantry serves:</strong> whatever your
          pantry chooses to record — commonly a name, household size, ages by
          band, contact details, dietary needs and visit dates. You decide which
          of these you collect. Laevo requires only a name.
        </p>
        <p>
          <strong>About people with logins:</strong> name, email, role, and a
          password that is stored as a salted hash and cannot be reversed. We
          cannot see anyone's password, including yours.
        </p>
        <p>
          <strong>About the service:</strong> ordinary server logs, and a record
          of emails we sent on your behalf so you can see whether they arrived.
        </p>

        <h2>Who can see it</h2>
        <p>
          People your pantry has given a login, and nobody else. Records are
          scoped to your organization at the database level — a query without
          your organization's identifier is not something the code can express.
        </p>
        <p>
          Our staff can technically access the database, as anybody running a
          service can. We access an organization's records only when you ask us
          to look at something, and we tell you when we have.
        </p>

        <h2>How long it is kept</h2>
        <p>
          As long as you keep it. We do not delete your records on a schedule,
          because your funders' retention requirements are yours to meet, not
          ours to guess.
        </p>
        <p>
          If you close your account, records are deleted within thirty days.
          Export first — it takes one click and includes everything.
        </p>
        <p>
          Email delivery logs are kept for ninety days and then removed
          automatically.
        </p>

        <h2>Removing one person</h2>
        <p>
          If somebody asks your pantry to remove their details, you can do that
          in one action, and it removes the personal details while keeping the
          anonymous counts your past reports were built on. Your historical
          totals stay correct and their name is gone.
        </p>

        <h2>What we will never do</h2>
        <ul>
          <li>Sell or rent your data to anybody, for any purpose.</li>
          <li>Use your records to train a machine learning model.</li>
          <li>
            Contact the people your pantry serves. Nothing in Laevo emails a
            neighbor without one of your people pressing send.
          </li>
          <li>
            Put advertising trackers on the pages where your records appear.
          </li>
          <li>Make your export worse to keep you from leaving.</li>
        </ul>

        <h2>Cookies</h2>
        <p>
          One cookie, which keeps you signed in. It is set only after you sign
          in, it is not readable by scripts, and it is not used to follow you
          anywhere. We do not run third-party analytics on this site.
        </p>

        <h2>Where it lives</h2>
        <p>
          On Cloudflare's network, in their North American region. Cloudflare
          processes it on our instructions and does not use it for anything of
          their own.
        </p>

        <h2>Children</h2>
        <p>
          Pantry records often include children as part of a household, recorded
          by the adult who came in. Laevo does not require a child's name, and
          for reporting purposes a count and an age band is enough. We would
          encourage you to record no more than that.
        </p>

        <h2>Questions</h2>
        <p>
          Write to <strong>hello@laevo.us</strong> and a person will answer.
          If you need a data processing agreement for a funder,{" "}
          <Link to="/contact">ask</Link> and we will send one.
        </p>

        <p className="small">Last updated July 2026.</p>
      </div>
    </section>
  );
}
