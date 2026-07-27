import type { RouterContextProvider } from "react-router";
import { appContext } from "./context";
import type { AppContext } from "./env";

/** Pulls the Worker bindings out of the router context in a loader or action. */
export function ctx(context: unknown): AppContext {
  return (context as RouterContextProvider).get(appContext);
}

/**
 * Every public page's loader returns at least this, because meta() needs the
 * canonical host and React Router hands meta() `loaderData`, not `data`.
 */
export interface PublicLoaderData {
  siteUrl: string;
}

export function publicData(context: unknown): PublicLoaderData {
  const { env } = ctx(context);
  return { siteUrl: (env.SITE_URL || "https://laevo.us").replace(/\/$/, "") };
}
