import { Link, NavLink, Outlet, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { Wordmark, WheatMark } from "~/components/Brand";
import { TextSizeControl } from "~/components/TextSize";
import { ctx } from "~/lib/loader";
import { getUser } from "~/lib/auth";

export async function loader({ context, request }: LoaderFunctionArgs) {
  const { env } = ctx(context);
  const user = await getUser(env, request);
  return {
    siteUrl: (env.SITE_URL || "https://laevo.app").replace(/\/$/, ""),
    signedIn: Boolean(user),
  };
}

const NAV = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/for-volunteers", label: "For volunteers" },
  { to: "/why", label: "What we believe" },
  { to: "/pricing", label: "Pricing" },
  { to: "/compare", label: "Compare" },
  { to: "/guides", label: "Guides" },
];

export default function MarketingLayout() {
  const { signedIn } = useLoaderData<typeof loader>();

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <Wordmark />
          <nav className="nav-desktop" aria-label="Main">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} prefetch="intent">
                {item.label}
              </NavLink>
            ))}
            <Link
              to={signedIn ? "/app" : "/demo"}
              className="btn btn-primary"
              style={{ marginLeft: 8, minHeight: 48, padding: "10px 20px" }}
            >
              {signedIn ? "Open my pantry" : "Try the demo"}
            </Link>
          </nav>

          <details className="nav-mobile-wrap">
            <summary className="nav-toggle" aria-label="Menu">
              Menu
            </summary>
            <div className="nav-mobile">
              {NAV.map((item) => (
                <Link key={item.to} to={item.to}>
                  {item.label}
                </Link>
              ))}
              <Link to={signedIn ? "/app" : "/demo"}>
                {signedIn ? "Open my pantry" : "Try the demo"}
              </Link>
              <Link to="/sign-in">Sign in</Link>
            </div>
          </details>
        </div>
      </header>

      <main id="main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-grid">
            <div>
              <p
                className="wordmark"
                style={{ color: "#fff", marginBottom: 12 }}
              >
                <WheatMark size={30} />
                <span>Laevo</span>
              </p>
              <p style={{ color: "#cfe3d7", maxWidth: "34ch" }}>
                Software for food pantries. Laevo is Latin for lift up.
              </p>
              <p style={{ marginTop: 20 }}>
                <TextSizeControl />
              </p>
            </div>

            <div>
              <h3>Product</h3>
              <ul>
                <li>
                  <Link to="/how-it-works">How it works</Link>
                </li>
                <li>
                  <Link to="/for-volunteers">For volunteers</Link>
                </li>
                <li>
                  <Link to="/pricing">Pricing</Link>
                </li>
                <li>
                  <Link to="/switch">Switching over</Link>
                </li>
                <li>
                  <Link to="/demo">Try the demo</Link>
                </li>
              </ul>
            </div>

            <div>
              <h3>Reading</h3>
              <ul>
                <li>
                  <Link to="/guides">Guides</Link>
                </li>
                <li>
                  <Link to="/compare">Compare</Link>
                </li>
                <li>
                  <Link to="/why">What we believe</Link>
                </li>
                <li>
                  <Link to="/accessibility">Accessibility</Link>
                </li>
              </ul>
            </div>

            <div>
              <h3>Laevo</h3>
              <ul>
                <li>
                  <Link to="/about">About</Link>
                </li>
                <li>
                  <Link to="/contact">Contact</Link>
                </li>
                <li>
                  <Link to="/privacy">Privacy</Link>
                </li>
                <li>
                  <Link to="/terms">Terms</Link>
                </li>
                <li>
                  <Link to="/sign-in">Sign in</Link>
                </li>
              </ul>
            </div>
          </div>

          <p
            className="small"
            style={{
              color: "#a9c6b6",
              marginTop: 36,
              borderTop: "1px solid #2b6349",
              paddingTop: 20,
              maxWidth: "none",
            }}
          >
            Built on Cloudflare Workers. Made for the people who keep their
            neighbors fed.
          </p>
        </div>
      </footer>
    </>
  );
}
