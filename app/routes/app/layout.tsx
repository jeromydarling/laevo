import { Link, NavLink, Outlet, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { ctx } from "~/lib/loader";
import { requireUser } from "~/lib/auth";
import { WheatMark } from "~/components/Brand";
import { TextSizeControl } from "~/components/TextSize";

export async function loader({ context, request }: LoaderFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);
  return {
    orgName: user.orgName,
    name: user.name,
    isDemo: user.isDemo,
    role: user.role,
  };
}

export function meta() {
  return [
    { title: "Laevo" },
    { name: "robots", content: "noindex,nofollow" },
  ];
}

/**
 * Five tabs across the bottom, where a thumb already is. Not a hamburger, not
 * a drawer, not three dots. Everything else in the product is reachable from
 * the first one.
 */
const TABS = [
  { to: "/app", label: "Today", icon: "M4 5h16v15H4zM4 9h16M8 3v4M16 3v4" },
  { to: "/app/window", label: "Window", icon: "M12 4v16M4 12h16" },
  { to: "/app/neighbors", label: "Neighbors", icon: "M12 11a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 3.6-7 8-7s8 3 8 7" },
  { to: "/app/shelf", label: "Shelf", icon: "M3 6h18M3 12h18M3 18h18" },
  { to: "/app/shifts", label: "Rota", icon: "M5 4h14v16H5zM9 9h6M9 13h6M9 17h3" },
];

export default function AppLayout() {
  const { orgName, isDemo } = useLoaderData<typeof loader>();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            maxWidth: 1080,
            margin: "0 auto",
          }}
        >
          <Link to="/app" className="wordmark">
            <WheatMark size={26} />
            <span>{orgName}</span>
          </Link>
          <TextSizeControl />
        </div>
      </header>

      {isDemo && (
        <p className="demo-banner">
          You are in the demo pantry. Change anything you like — it is rebuilt
          fresh every night, and nothing here is a real person.{" "}
          <Link to="/sign-up" style={{ color: "inherit" }}>
            Start your own
          </Link>
          .
        </p>
      )}

      <main id="main" className="app-main">
        <Outlet />
      </main>

      <nav className="tabbar" aria-label="Main">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.to === "/app"} prefetch="intent">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={tab.icon} />
            </svg>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
