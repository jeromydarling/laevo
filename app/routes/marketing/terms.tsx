import { Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { publicData } from "~/lib/loader";
import { marketingMeta } from "~/lib/meta";
import { PLANS, formatUsd } from "~/lib/pricing";

export async function loader({ context }: LoaderFunctionArgs) {
  return publicData(context);
}

export function meta({ loaderData }: { loaderData?: { siteUrl: string } }) {
  return marketingMeta({
    title: "Terms",
    description:
      "The agreement between your pantry and Laevo, written in short sentences: what we owe you, what you owe us, and how either of us can end it.",
    path: "/terms",
    siteUrl: loaderData?.siteUrl ?? "https://laevo.app",
  });
}

export default function Terms() {
  useLoaderData<typeof loader>();

  return (
    <section className="hero" style={{ paddingBottom: 64 }}>
      <div className="wrap-narrow prose">
        <p className="eyebrow">Terms</p>
        <h1>Terms of service</h1>
        <p className="lead">
          Written to be read. If any of it seems unfair, tell us — we would
          rather change a term than have it discovered by somebody in a bad
          moment.
        </p>

        <h2>What we owe you</h2>
        <ul>
          <li>
            To keep the service running, and to tell you honestly when it is
            not.
          </li>
          <li>
            To keep your records private, as described on the{" "}
            <Link to="/privacy">privacy page</Link>.
          </li>
          <li>
            To give you a complete export of everything you put in, in one
            click, at any time, free, including after you cancel.
          </li>
          <li>
            To charge you only the price shown on the{" "}
            <Link to="/pricing">pricing page</Link>, with no setup fee, no
            per-user fee and no charge based on how many households you serve.
          </li>
          <li>
            To give at least sixty days' notice before raising a price, and
            never to raise it in the middle of a term you have already paid for.
          </li>
        </ul>

        <h2>What you owe us</h2>
        <ul>
          <li>
            To pay for the plan you are on, if it is a paid one. Community is{" "}
            {formatUsd(PLANS[0].monthlyCents)} and always will be.
          </li>
          <li>
            To have the right to hold the records you put in, and to handle them
            in line with whatever rules your programs place on you.
          </li>
          <li>
            Not to use Laevo to do harm to the people in it. This clause has
            never been needed and we hope it stays that way.
          </li>
          <li>
            Not to attempt to break into other organizations' data. Sensible
            security research told to us first is welcome and we will not
            threaten you for it.
          </li>
        </ul>

        <h2>Ending it</h2>
        <p>
          You can cancel at any time, in one click, without talking to anybody.
          If you have paid for a year and cancel partway, write to us and we
          will refund the unused months.
        </p>
        <p>
          We can end an account for non-payment after telling you, or for using
          Laevo to harm people. Either way you keep your export.
        </p>
        <p>
          If Laevo itself ever had to close, you would get at least ninety days'
          notice, a full export, and help moving to something else.
        </p>

        <h2>The boring but necessary part</h2>
        <p>
          Laevo is provided as it is. We work hard to keep it correct and
          available, but we cannot promise it will never be unavailable, and we
          are not liable for losses beyond what you have paid us in the previous
          twelve months. Keep your paper fallback — this is one of several
          reasons we keep saying so.
        </p>
        <p>
          Laevo drafts report figures from what you recorded. It does not file
          anything and it is not a compliance guarantee. The person who signs a
          report is responsible for it, and we would be uneasy with any vendor
          who claimed otherwise.
        </p>

        <h2>Changes to these terms</h2>
        <p>
          If we change anything meaningful we will email everyone with an
          account and say what changed and why, in the same plain words as the
          rest of this. Not a notice that terms have been updated with a link to
          a document.
        </p>

        <p className="small">Last updated July 2026.</p>
      </div>
    </section>
  );
}
