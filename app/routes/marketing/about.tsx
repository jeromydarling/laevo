import { Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { publicData } from "~/lib/loader";
import { marketingMeta } from "~/lib/meta";

export async function loader({ context }: LoaderFunctionArgs) {
  return publicData(context);
}

export function meta({ loaderData }: { loaderData?: { siteUrl: string } }) {
  return marketingMeta({
    title: "About Laevo",
    description:
      "Why Laevo exists, what the name means, how it stays running, and what would have to be true for it to still be here in ten years.",
    path: "/about",
    siteUrl: loaderData?.siteUrl ?? "https://laevo.app",
  });
}

export default function About() {
  useLoaderData<typeof loader>();

  return (
    <>
      <section className="hero">
        <div className="wrap-narrow">
          <p className="eyebrow">About</p>
          <h1>Laevo means lift up</h1>
          <p className="lead" style={{ marginTop: 20 }}>
            It is a Latin verb, and it is a slightly odd name for software. We
            picked it because it describes what a pantry does and because it
            does not describe the software at all, which felt like the right way
            round.
          </p>
        </div>
      </section>

      <section>
        <div className="wrap-narrow stack-lg">
          <div className="stack">
            <h2>Why this exists</h2>
            <p>
              Food pantries are among the most efficient pieces of social
              infrastructure anywhere. They are also run, overwhelmingly, by
              people doing it on top of everything else, with software either
              priced for an organisation with an IT budget or not built for the
              volunteers actually using it.
            </p>
            <p>
              The gap is not sophistication. Most pantries do not need anything
              clever. They need to know what is on the shelf, who they have
              helped, and who is coming on Saturday — on a phone, quickly,
              without anyone feeling stupid. That is a modest problem and it is
              badly served, and modest problems that are badly served are the
              best kind to work on.
            </p>
          </div>

          <div className="stack">
            <h2>How it stays running</h2>
            <p>
              Pantries on Standard and Network pay for the pantries on
              Community. That is the whole model. No advertising, no data sale,
              no grant that runs out in eighteen months and takes the product
              with it.
            </p>
            <p>
              Laevo runs on Cloudflare's edge network, which means a pantry
              serving three hundred households a month costs a fraction of a
              cent in compute. Being genuinely cheap to run is what makes a free
              tier honest rather than a countdown.
            </p>
          </div>

          <div className="stack">
            <h2>What would have to be true in ten years</h2>
            <p>
              Software that a pantry builds its Saturday around has an
              obligation not to disappear. So, plainly:
            </p>
            <ul className="stack" style={{ paddingLeft: 24 }}>
              <li>
                Your export works, in one click, whole, forever — including if
                we are gone.
              </li>
              <li>
                No investor whose return depends on charging you more later.
              </li>
              <li>
                Costs low enough that the free tier survives a bad year rather
                than becoming the first thing cut.
              </li>
              <li>
                If Laevo ever did have to close, you would get long notice, a
                full export, and help moving — not an email in January saying
                service ends in February.
              </li>
            </ul>
          </div>

          <div className="stack">
            <h2>Who is behind it</h2>
            <p>
              A small team. Small enough that when you write in, one of the
              people who built the thing you are asking about reads it, which is
              the main advantage of being small and the reason we intend to stay
              that way longer than is fashionable.
            </p>
            <p>
              We are not from the food banking world. What we know about pantry
              operations we learned by sitting in them, asking questions, and
              being corrected. If you run a pantry and something here is wrong,
              we would genuinely like to be corrected again.
            </p>
          </div>

          <div className="card">
            <h3>Tell us we are wrong about something</h3>
            <p style={{ marginTop: 10 }}>
              Especially about how pantries actually work. Corrections from
              people doing the work have changed more about this product than
              anything else.
            </p>
            <p style={{ marginTop: 20 }}>
              <Link className="btn btn-primary btn-big" to="/contact">
                Write to us
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
