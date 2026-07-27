import { redirect } from "react-router";
import type { ActionFunctionArgs } from "react-router";
import { ctx } from "~/lib/loader";
import { requireUser } from "~/lib/auth";

/**
 * Switching between the two layouts.
 *
 * A plain form post rather than a script, so it works on a device with
 * JavaScript still loading — which is exactly the sort of device whose owner
 * is most likely to want the roomy layout.
 */
export async function action({ context, request }: ActionFunctionArgs) {
  const { env } = ctx(context);
  const user = await requireUser(env, request);
  const form = await request.formData();

  const wanted = String(form.get("mode") ?? "");
  const mode = wanted === "roomy" ? "roomy" : "standard";

  await env.DB.prepare("UPDATE users SET view_mode = ? WHERE id = ?")
    .bind(mode, user.id)
    .run();

  // Back where they were, so changing the layout never costs somebody their
  // place in what they were doing.
  const back = String(form.get("back") ?? "/app");
  const safe = back.startsWith("/app") && !back.startsWith("//") ? back : "/app";
  return redirect(safe);
}

export function loader() {
  return redirect("/app");
}
