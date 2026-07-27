import { createRequestHandler, RouterContextProvider } from "react-router";
import { appContext } from "../app/lib/context";
import type { Env } from "../app/lib/env";
import { SESSION_COOKIE } from "../app/lib/auth";
import { clientIp } from "../app/lib/ratelimit";
import { api } from "./api";
import { robotsTxt, sitemapXml, llmsTxt, iconSvg, ogImageSvg } from "./wellknown";
import { runHousekeeping, resetDemoIfDue } from "./cron";

const handler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

/** Anonymous marketing GETs are cheap to cache and expensive to render. */
const CACHEABLE = /^\/(|why|how-it-works|for-volunteers|pricing|compare|switch|guides|accessibility|about|privacy|terms|robots\.txt|sitemap\.xml|llms\.txt|icon\.svg|og\.svg)/;

function isCacheable(request: Request): boolean {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.searchParams.has("preview")) return false;
  if (request.headers.get("Cookie")?.includes(`${SESSION_COOKIE}=`)) return false;
  return CACHEABLE.test(url.pathname);
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // Files that have to be served by the Worker because they are generated
    // from the same registries the pages are built from.
    switch (url.pathname) {
      case "/robots.txt":
        return text(robotsTxt(env), "text/plain; charset=utf-8", 3600);
      case "/sitemap.xml":
        return text(sitemapXml(env), "application/xml; charset=utf-8", 3600);
      case "/llms.txt":
        return text(llmsTxt(env), "text/plain; charset=utf-8", 3600);
      case "/icon.svg":
        return text(iconSvg(), "image/svg+xml", 86400);
      case "/og.svg":
        return text(ogImageSvg(), "image/svg+xml", 86400);
    }

    if (url.pathname.startsWith("/api/")) {
      return api.fetch(request, env, ctx);
    }

    // The DOM CacheStorage type has no `default`; the Workers runtime does.
    const cache = (caches as unknown as { default: Cache }).default;
    const cacheable = isCacheable(request);
    if (cacheable) {
      const hit = await cache.match(request);
      if (hit) return hit;
    }

    const context = new RouterContextProvider();
    context.set(appContext, { env, ctx, ip: clientIp(request) });

    const response = await handler(request, context);

    if (
      cacheable &&
      response.status === 200 &&
      !response.headers.has("Set-Cookie")
    ) {
      const cached = new Response(response.clone().body, response);
      cached.headers.set("Cache-Control", "public, max-age=60, s-maxage=300");
      ctx.waitUntil(cache.put(request, cached.clone()));
      return cached;
    }

    return response;
  },

  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(
      (async () => {
        await runHousekeeping(env);
        await resetDemoIfDue(env, controller.cron);
      })(),
    );
  },
};

function text(body: string, contentType: string, maxAge: number): Response {
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${maxAge}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
