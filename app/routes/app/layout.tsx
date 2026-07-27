import { Form, Link, NavLink, Outlet, useLoaderData, useLocation } from "react-router";
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
    viewMode: user.viewMode,
  };
}

export function meta() {
  return [{ title: "Laevo" }, { name: "robots", content: "noindex,nofollow" }];
}

/**
 * The five things somebody does on a Saturday morning. On a touch screen these
 * are the bottom tabs, where a thumb already is; on a wide screen they are the
 * top of the sidebar. Same five, same order, same words — so a volunteer who
 * learned the tablet is not relearning anything on the office computer.
 */
const PRIMARY = [
  { to: "/app", label: "Today", icon: "M4 5h16v15H4zM4 9h16M8 3v4M16 3v4" },
  { to: "/app/window", label: "Window", icon: "M12 4v16M4 12h16" },
  {
    to: "/app/neighbors",
    label: "Neighbors",
    icon: "M12 11a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 3.6-7 8-7s8 3 8 7",
  },
  { to: "/app/shelf", label: "Shelf", icon: "M3 6h18M3 12h18M3 18h18" },
  { to: "/app/more", label: "More", icon: "M4 6h16M4 12h16M4 18h16" },
];

/**
 * The rest, which only the sidebar has room to show. On a touch screen these
 * live behind More rather than being cut — a wide screen gets shortcuts, not
 * extra features.
 */
const SECONDARY = [
  { to: "/app/shifts", label: "The rota" },
  { to: "/app/reports", label: "Reports" },
  { to: "/app/sources", label: "Where food came from" },
  { to: "/app/switch", label: "Moving in" },
  { to: "/app/locations", label: "Locations" },
  { to: "/app/settings", label: "Settings" },
];

function TabIcon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export default function AppLayout() {
  const { orgName, isDemo, viewMode } = useLoaderData<typeof loader>();
  const location = useLocation();
  const here = location.pathname + location.search;

  return (
    <div className="app-shell" data-view={viewMode}>
      {/* Only ever visible on a wide screen in the standard layout. */}
      <nav className="sidebar" aria-label="Sections">
        <Link to="/app" className="sidebar-brand">
          <WheatMark size={26} />
          <span>{orgName}</span>
        </Link>

        <div className="sidebar-group">
          {PRIMARY.filter((item) => item.to !== "/app/more").map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/app"} prefetch="intent">
              <TabIcon d={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </div>

        <p className="sidebar-heading">Everything else</p>
        <div className="sidebar-group">
          {SECONDARY.map((item) => (
            <NavLink key={item.to} to={item.to} prefetch="intent">
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="sidebar-foot">
          <ViewSwitch mode={viewMode} back={here} />
          <Link to="/sign-out" className="sidebar-signout">
            Sign out
          </Link>
        </div>
      </nav>

      <div className="app-body">
        <header className="app-header">
          <div className="app-header-inner">
            <Link to="/app" className="wordmark app-header-brand">
              <WheatMark size={26} />
              <span>{orgName}</span>
            </Link>
            <div className="app-header-tools">
              <span className="app-header-switch">
                <ViewSwitch mode={viewMode} back={here} compact />
              </span>
              <TextSizeControl />
            </div>
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
      </div>

      <nav className="tabbar" aria-label="Main">
        {PRIMARY.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.to === "/app"} prefetch="intent">
            <TabIcon d={tab.icon} />
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function ViewSwitch({
  mode,
  back,
  compact = false,
}: {
  mode: string;
  back: string;
  compact?: boolean;
}) {
  const next = mode === "roomy" ? "standard" : "roomy";
  return (
    <Form method="post" action="/app/view" className="view-switch">
      <input type="hidden" name="mode" value={next} />
      <input type="hidden" name="back" value={back} />
      <button type="submit" className="view-switch-btn">
        {next === "roomy" ? "Bigger layout" : "Normal layout"}
        {!compact && (
          <span className="view-switch-hint">
            {next === "roomy"
              ? "Large text and large buttons, for a shared tablet"
              : "A denser layout, for a laptop"}
          </span>
        )}
      </button>
    </Form>
  );
}
