import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { ctx } from "~/lib/loader";
import { createSession } from "~/lib/auth";

/**
 * Walk into the demo pantry with no signup and no email address.
 *
 * The demo is the best sales tool this product has, so if it is ever found
 * empty it rebuilds itself on the spot rather than showing somebody an empty
 * screen and losing them.
 */
export async function loader({ context }: LoaderFunctionArgs) {
  const { env } = ctx(context);

  const { DEMO_EMAIL, demoIsEmpty, seedDemo } = await import("../../../workers/seed");

  if (await demoIsEmpty(env)) {
    await seedDemo(env);
  }

  const user = await env.DB.prepare(
    `SELECT u.id FROM users u
       JOIN orgs o ON o.id = u.org_id
      WHERE u.email = ? AND o.is_demo = 1
      LIMIT 1`,
  )
    .bind(DEMO_EMAIL)
    .first<{ id: string }>();

  if (!user) {
    throw new Response(
      "The demo pantry is being rebuilt right now. Give it a minute and try again — or start your own free account, which takes about as long.",
      { status: 503 },
    );
  }

  const session = await createSession(env, user.id);
  return redirect("/app", { headers: { "Set-Cookie": session.cookie } });
}
