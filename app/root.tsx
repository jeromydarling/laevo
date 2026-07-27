import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
  Link,
} from "react-router";
import stylesUrl from "./styles/app.css?url";
import { TEXT_SIZE_SCRIPT } from "./components/TextSize";
import { WheatMark } from "./components/Brand";

export function links() {
  return [
    { rel: "stylesheet", href: stylesUrl },
    { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
    { rel: "preconnect", href: "https://laevo.app" },
  ];
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0f4630" />
        <Meta />
        <Links />
        <script dangerouslySetInnerHTML={{ __html: TEXT_SIZE_SCRIPT }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to the main content
        </a>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

/**
 * Error pages say what happened and what to do next, in words a volunteer
 * would use. Never a stack trace, never "an unexpected error occurred".
 */
export function ErrorBoundary() {
  const error = useRouteError();

  let heading = "Something on our end went wrong";
  let message =
    "This is our fault, not yours. Nothing you typed has been lost — go back and try once more, and if it happens again please tell us.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      heading = "That page is not here";
      message =
        "The address may have a typo in it, or the page may have moved. The links below go somewhere real.";
    } else if (error.status === 403) {
      heading = "You do not have access to that";
      message =
        typeof error.data === "string"
          ? error.data
          : "Ask whoever set up your pantry's account to give you access.";
    } else if (error.status === 429) {
      heading = "Too many tries in a row";
      message =
        "Give it a few minutes and try again. This limit exists to keep other people's accounts safe.";
    } else if (typeof error.data === "string" && error.data) {
      message = error.data;
    }
  }

  return (
    <main id="main" className="wrap-narrow" style={{ padding: "64px 20px" }}>
      <p style={{ color: "var(--green-deep)" }}>
        <WheatMark size={44} />
      </p>
      <h1 style={{ marginTop: 16 }}>{heading}</h1>
      <p className="lead" style={{ marginTop: 16 }}>
        {message}
      </p>
      <div className="btn-row" style={{ marginTop: 32 }}>
        <Link className="btn btn-primary" to="/">
          Go to the front page
        </Link>
        <Link className="btn btn-secondary" to="/contact">
          Tell us what happened
        </Link>
      </div>
    </main>
  );
}
