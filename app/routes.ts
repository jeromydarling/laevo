import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  // ---- Public marketing -------------------------------------------------
  layout("routes/marketing/layout.tsx", [
    index("routes/marketing/home.tsx"),
    route("why", "routes/marketing/why.tsx"),
    route("how-it-works", "routes/marketing/how-it-works.tsx"),
    route("for-volunteers", "routes/marketing/for-volunteers.tsx"),
    route("pricing", "routes/marketing/pricing.tsx"),
    route("compare", "routes/marketing/compare.tsx"),
    route("compare/:id", "routes/marketing/compare.$id.tsx"),
    route("switch", "routes/marketing/switch.tsx"),
    route("guides", "routes/marketing/guides.tsx"),
    route("guides/:slug", "routes/marketing/guides.$slug.tsx"),
    route("accessibility", "routes/marketing/accessibility.tsx"),
    route("about", "routes/marketing/about.tsx"),
    route("contact", "routes/marketing/contact.tsx"),
    route("privacy", "routes/marketing/privacy.tsx"),
    route("terms", "routes/marketing/terms.tsx"),
  ]),

  // ---- Getting in and out ------------------------------------------------
  route("sign-in", "routes/auth/sign-in.tsx"),
  route("sign-up", "routes/auth/sign-up.tsx"),
  route("sign-out", "routes/auth/sign-out.tsx"),
  route("forgot", "routes/auth/forgot.tsx"),
  route("reset/:token", "routes/auth/reset.$token.tsx"),
  route("join/:token", "routes/auth/join.$token.tsx"),
  route("demo", "routes/auth/demo.tsx"),
  route("unsubscribe/:token", "routes/auth/unsubscribe.$token.tsx"),

  // ---- Public volunteer signup, no account needed -------------------------
  route("v/:slug", "routes/public/shifts.tsx"),

  // ---- The pantry ---------------------------------------------------------
  layout("routes/app/layout.tsx", [
    route("app", "routes/app/today.tsx"),
    route("app/window", "routes/app/window.tsx"),
    route("app/neighbors", "routes/app/neighbors.tsx"),
    route("app/neighbors/new", "routes/app/neighbors.new.tsx"),
    route("app/neighbors/:id", "routes/app/neighbors.$id.tsx"),
    route("app/shelf", "routes/app/shelf.tsx"),
    route("app/shelf/receive", "routes/app/shelf.receive.tsx"),
    route("app/shifts", "routes/app/shifts.tsx"),
    route("app/more", "routes/app/more.tsx"),
    route("app/locations", "routes/app/locations.tsx"),
    route("app/sources", "routes/app/sources.tsx"),
    route("app/reports", "routes/app/reports.tsx"),
    route("app/switch", "routes/app/switch.tsx"),
    route("app/settings", "routes/app/settings.tsx"),
  ]),
] satisfies RouteConfig;
