import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { ctx } from "~/lib/loader";
import { createSession } from "~/lib/auth";
import type { Env } from "~/lib/env";

/**
 * Walk into the demo pantry with no signup and no email address.
 *
 * The demo is the best sales tool this product has, so if it is ever found
 * empty it rebuilds itself on the spot rather than showing somebody an empty
 * screen and losing them.
 */
export async function loader({ context }: LoaderFunctionArgs) {
  const { env } = ctx(context);

  const { DEMO_EMAIL, demoIsEmpty, seedDemo } = await import(
    "../../../workers/seed"
  );

  if (await demoIsEmpty(env)) {
    try {
      await seedDemo(env);
    } catch (err) {
      // A broken demo is a broken shop window, and the reason has to survive
      // the request or nobody will ever know why. Recorded where an operator
      // can read it without redeploying anything.
      await recordSeedFailure(env, err);
      throw new Response(
        "The demo pantry is being rebuilt right now. Give it a minute and try again — or start your own free account, which takes about as long.",
        { status: 503 },
      );
    }
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
    await recordSeedFailure(env, "seed reported success but no demo user exists");
    throw new Response(
      "The demo pantry is being rebuilt right now. Give it a minute and try again — or start your own free account, which takes about as long.",
      { status: 503 },
    );
  }

  const session = await createSession(env, user.id);
  return redirect("/app", { headers: { "Set-Cookie": session.cookie } });
}

async function recordSeedFailure(env: Env, err: unknown): Promise<void> {
  const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  console.error("[demo:seed-failed]", message);
  try {
    await env.DB.prepare(
      `INSERT INTO system_state (key, value, updated_at)
       VALUES ('demo_seed_error', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    )
      .bind(message.slice(0, 2000))
      .run();
  } catch {
    // If even this fails, the console line above is all we get.
  }
}
