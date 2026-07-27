import { Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { publicData } from "~/lib/loader";
import { marketingMeta } from "~/lib/meta";

export async function loader({ context }: LoaderFunctionArgs) {
  return publicData(context);
}

export function meta({ loaderData }: { loaderData?: { siteUrl: string } }) {
  return marketingMeta({
    title: "Accessibility",
    description:
      "What Laevo does for people with low vision, unsteady hands, low digital confidence and old devices — and, specifically, what it does not do yet.",
    path: "/accessibility",
    siteUrl: loaderData?.siteUrl ?? "https://laevo.us",
  });
}

export default function Accessibility() {
  useLoaderData<typeof loader>();

  return (
    <>
      <section className="hero">
        <div className="wrap-narrow">
          <p className="eyebrow">Accessibility</p>
          <h1>What we have done, and what we have not</h1>
          <p className="lead" style={{ marginTop: 20 }}>
            Most accessibility statements are a paragraph saying a company cares
            and a link to a standard. This one lists what is actually true,
            including the gaps, because a volunteer deciding whether they can
            use this needs facts rather than a commitment.
          </p>
        </div>
      </section>

      <section>
        <div className="wrap-narrow stack-lg">
          <div>
            <h2>Seeing</h2>
            <ul className="stack" style={{ paddingLeft: 24, marginTop: 14 }}>
              <li>
                Body text starts at 18 pixels on a phone and 19 on a larger
                screen. Most business software starts at 14 or 16.
              </li>
              <li>
                A control in the header and footer of every page takes it to 21
                or 24 pixels, and the whole layout scales with it rather than
                just the paragraphs. The choice is remembered on the device.
              </li>
              <li>
                Body text meets or exceeds WCAG AA contrast throughout, and most
                of it meets AAA. Nothing important is carried by colour alone —
                every warning has words.
              </li>
              <li>
                The page also respects your browser's own zoom and your
                operating system's text size, and does not break at 200%.
              </li>
              <li>
                Every image and icon that carries meaning has a text
                description. Decorative marks are hidden from screen readers
                rather than read out as noise.
              </li>
            </ul>
          </div>

          <div>
            <h2>Tapping and typing</h2>
            <ul className="stack" style={{ paddingLeft: 24, marginTop: 14 }}>
              <li>
                Nothing you have to press is smaller than 56 pixels on its short
                edge. The WCAG AAA guidance is 44. At the largest text setting
                ours grow to 64.
              </li>
              <li>
                Controls are spaced so a near miss does not press the one next
                to it, and double-tap zoom is disabled on buttons so an
                impatient second tap does not zoom the page.
              </li>
              <li>
                Every form field has a visible label above it, not a placeholder
                that disappears when you start typing.
              </li>
              <li>
                Text inputs are at least 16 pixels, which stops iOS zooming the
                whole page when you tap into one.
              </li>
              <li>
                Nothing is drag-only, swipe-only or hover-only. Every action has
                a button.
              </li>
            </ul>
          </div>

          <div>
            <h2>Keyboard and screen reader</h2>
            <ul className="stack" style={{ paddingLeft: 24, marginTop: 14 }}>
              <li>
                Everything is reachable and operable with a keyboard alone. The
                focus outline is four pixels thick and high contrast, and it is
                never removed.
              </li>
              <li>
                A skip link goes straight to the main content, which matters a
                great deal when a page has a long navigation.
              </li>
              <li>
                Headings run in order, landmarks are real elements, and forms
                are properly associated with their labels and errors.
              </li>
              <li>
                Things that update after you press a button announce themselves.
              </li>
            </ul>
          </div>

          <div>
            <h2>Motion, connection and old devices</h2>
            <ul className="stack" style={{ paddingLeft: 24, marginTop: 14 }}>
              <li>
                If your device asks for reduced motion, Laevo has essentially no
                motion at all.
              </li>
              <li>
                Pages are rendered on the server and send very little to the
                device, so Laevo works on an old phone and on the sort of wifi a
                community hall has.
              </li>
              <li>
                The whole site works with JavaScript switched off or still
                loading — including the menu, which is a plain disclosure
                element rather than a script.
              </li>
            </ul>
          </div>

          <div className="callout">
            <h3>What we have not done yet</h3>
            <ul className="stack" style={{ paddingLeft: 22, marginTop: 10 }}>
              <li>
                <strong>No offline mode.</strong> You need a connection to save
                a visit. This is the biggest gap and we are not going to dress
                it up.
              </li>
              <li>
                <strong>English only, for now.</strong> Spanish is the next one.
                Until then, plain short sentences at least translate well in a
                browser.
              </li>
              <li>
                <strong>No formal third-party audit.</strong> We have tested
                against WCAG 2.2 AA ourselves and with volunteers. We have not
                paid for an independent audit, and we would rather say that than
                imply a certificate we do not have.
              </li>
              <li>
                <strong>No voice input beyond what your device provides.</strong>{" "}
                Dictation into our fields works because your phone does it, not
                because we built it.
              </li>
            </ul>
          </div>

          <div>
            <h2>If something here is not working for you</h2>
            <p style={{ marginTop: 12 }}>
              Tell us and we will fix it, and we will tell you when it is fixed.
              An accessibility problem is a bug and goes to the front of the
              queue — not into a backlog labelled improvements.
            </p>
            <p style={{ marginTop: 20 }}>
              <Link className="btn btn-primary btn-big" to="/contact">
                Tell us what is not working
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
