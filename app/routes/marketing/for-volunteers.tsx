import { Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { publicData } from "~/lib/loader";
import { marketingMeta } from "~/lib/meta";
import { faqLd, breadcrumbLd } from "~/lib/jsonld";
import { TextSizeControl } from "~/components/TextSize";
import { Photo } from "~/components/Photo";

export async function loader({ context }: LoaderFunctionArgs) {
  return publicData(context);
}

export function meta({ loaderData }: { loaderData?: { siteUrl: string } }) {
  return marketingMeta({
    title: "Built for volunteers who do not love computers",
    description:
      "Laevo is designed first for a seventy-three-year-old volunteer on a borrowed phone. Here is exactly what that changed: text size, tap targets, one column, plain words, and a paper fallback that is never a failure.",
    path: "/for-volunteers",
    siteUrl: loaderData?.siteUrl ?? "https://laevo.app",
  });
}

const FAQ = [
  {
    q: "What if a volunteer refuses to use it at all?",
    a: "Let them. Pair them with someone who will and keep the paper fallback. A volunteer who is wonderful with people at the window and will not touch a tablet is worth keeping exactly as they are, and no software is worth losing them over.",
  },
  {
    q: "Does it work on an old phone?",
    a: "Yes. Laevo renders on the server and sends very little to the device, so it works on a phone several years old and on the sort of wifi a community hall has. Slow connections are the normal condition here, not the edge case.",
  },
  {
    q: "What if someone taps the wrong thing?",
    a: "Almost nothing in Laevo is destructive, and the few things that are ask twice. Nobody can lose your pantry's records by tapping wrongly, and it is worth telling your volunteers that out loud on their first day.",
  },
  {
    q: "Can it be used with a screen reader?",
    a: "Yes. Every control has a real label, headings run in order, forms are properly associated with their labels, and nothing important is carried by colour alone. The accessibility page says what we have done and what we have not done yet.",
  },
];

const CHANGES = [
  {
    problem: "Text is too small to read, and nobody says so",
    change:
      "Body text starts at 18 pixels — larger than almost any business software — and a control in the header takes it to 21 or 24 with one tap. The choice is remembered on the device, so it is still that way tomorrow. Because the whole type scale is derived from one number, enlarging text moves headings, buttons and labels together instead of leaving a page of mismatched sizes.",
  },
  {
    problem: "A tap lands slightly off and nothing happens",
    change:
      "Nothing you have to press is smaller than 56 pixels on its short edge, comfortably above the usual accessibility minimum, and the largest text setting pushes it to 64. Buttons are spaced so a near miss does not hit the neighbouring one. Double-tap zoom is switched off on controls, so an impatient second tap does not zoom the page instead of pressing the button.",
  },
  {
    problem: "A menu behind three dots is genuinely invisible",
    change:
      "There is no three-dot menu anywhere in Laevo. Every action on a screen is a labelled button you can see. The main navigation is five large tabs across the bottom of the screen, where a thumb already is.",
  },
  {
    problem: "The screen scrolls under a resting finger",
    change:
      "One column, short screens, and the main action anchored at the bottom rather than below a long scroll. On most screens there is nothing to scroll past to reach the thing you came to press.",
  },
  {
    problem: "A message flashes up and disappears before it is read",
    change:
      "Confirmations stay until they are dismissed. If something saved, the page says so and keeps saying so. Nobody is left wondering whether it worked — which is the state that makes people press a button four times.",
  },
  {
    problem: "Jargon that means nothing",
    change:
      "The people you serve are neighbors. Food is on the shelf. The list of who is coming is the rota. Nobody is a client, a case, an entity, or a unit of service. Error messages say what we need in ordinary words and never blame the person reading them.",
  },
  {
    problem: "Something went wrong once, in public, in front of a queue",
    change:
      "This is the one that ends a volunteer's relationship with technology, so the whole product is arranged around it. Nothing important is more than two taps away. Nothing destructive happens without asking twice. And the paper fallback is designed in — serve everybody now on paper and type it up afterwards, and nothing about the software treats that as a failure.",
  },
];

export default function ForVolunteers() {
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
              { name: "For volunteers", path: "/for-volunteers" },
            ]),
          ]),
        }}
      />

      <section className="hero">
        <div className="wrap-narrow">
          <p className="eyebrow">The main design constraint</p>
          <h1>Built for volunteers who do not love computers</h1>
          <p className="lead" style={{ marginTop: 20 }}>
            A large share of the people keeping food pantries open are retired,
            and plenty of them never used a computer at work. They are not bad
            at technology. They are handed tools designed by people who have
            never sat next to them and watched.
          </p>
          <p style={{ marginTop: 16 }}>
            So we sat next to them and watched. Nearly everything that goes
            wrong is one of seven things. Here is each one, and what it changed.
          </p>
          <div style={{ marginTop: 32 }}>
            <Photo photo="handsTablet" priority sizes="(min-width: 760px) 680px, 100vw" />
          </div>
        </div>
      </section>

      <section className="section-tint">
        <div className="wrap-narrow">
          <div className="card">
            <h3>Try it right now</h3>
            <p style={{ marginTop: 8 }}>
              This control sits in the footer of every page on this site and in
              the header of every screen in the app. Press the big A and watch
              the whole page grow — headings, buttons and labels together, not
              just the paragraphs.
            </p>
            <p style={{ marginTop: 20 }}>
              <TextSizeControl />
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap-narrow stack-lg">
          {CHANGES.map((item, i) => (
            <article key={item.problem} className="principle">
              <p
                className="small"
                style={{ color: "var(--gold)", fontWeight: 800 }}
              >
                {String(i + 1).padStart(2, "0")}
              </p>
              <h2 style={{ fontSize: "var(--t-h3)" }}>{item.problem}</h2>
              <div className="in-product">
                <strong>What we did</strong>
                <span className="muted">{item.change}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-ink">
        <div className="wrap-narrow stack">
          <h2>What we ask of you in return</h2>
          <p className="lead">
            Software can remove obstacles. It cannot teach somebody, and it
            cannot decide that they are welcome. Those parts are yours.
          </p>
          <ul className="stack" style={{ paddingLeft: 24 }}>
            <li>
              Teach one task, all the way through, three times — sitting beside
              them, without taking the device out of their hands.
            </li>
            <li>
              Say out loud on the first day: you cannot break it, and if it does
              something strange that is the software being badly made, not you.
            </li>
            <li>Turn the text size up before you hand it over, not after.</li>
            <li>
              Keep the paper. Always keep the paper, and never treat reaching
              for it as a failure.
            </li>
          </ul>
          <p style={{ marginTop: 12 }}>
            <Link
              className="btn btn-secondary"
              to="/guides/older-volunteers-and-tablets"
            >
              The full guide to this
            </Link>
          </p>
        </div>
      </section>

      <section>
        <div className="wrap-narrow">
          <h2 style={{ marginBottom: 24 }}>Questions</h2>
          {FAQ.map((item) => (
            <details key={item.q} className="faq-item">
              <summary>{item.q}</summary>
              <div className="answer">
                <p>{item.a}</p>
              </div>
            </details>
          ))}

          <div className="btn-row" style={{ marginTop: 40 }}>
            <Link className="btn btn-primary btn-big" to="/demo">
              Open the demo on your phone
            </Link>
            <Link className="btn btn-secondary btn-big" to="/accessibility">
              Read the accessibility statement
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
