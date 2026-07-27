/**
 * The JSON side of the Worker.
 *
 * React Router handles everything a person looks at. Hono handles the things
 * that are not pages: health, the data export, and the email self-test.
 */
import { Hono } from "hono";
import type { Env } from "../../app/lib/env";
import { emailIsLive } from "../../app/lib/env";
import { getUser, requireAdmin } from "../../app/lib/auth";
import { sendEmail, selfTestEmail } from "../../app/lib/email";
import { ORG_TABLES } from "../seed";

export const api = new Hono<{ Bindings: Env }>();

api.get("/api/health", async (c) => {
  let db = "unknown";
  try {
    await c.env.DB.prepare("SELECT 1").first();
    db = "ok";
  } catch (err) {
    db = err instanceof Error ? err.message : "error";
  }
  return c.json({
    ok: db === "ok",
    service: "laevo",
    environment: c.env.ENVIRONMENT,
    db,
    email: emailIsLive(c.env) ? "live" : "logging only",
  });
});

/**
 * Everything the pantry put in, in one file, whenever they want it —
 * including on the day they decide to leave. Password material is never in it.
 */
api.get("/api/export", async (c) => {
  const user = await getUser(c.env, c.req.raw);
  if (!user) return c.json({ error: "Sign in first." }, 401);

  const out: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    organization: await c.env.DB.prepare(
      "SELECT id, name, slug, timezone, plan, service_area_note, distribution_model, visit_note, created_at FROM orgs WHERE id = ?",
    )
      .bind(user.orgId)
      .first(),
    people_with_logins: (
      await c.env.DB.prepare(
        "SELECT id, email, name, role, active, created_at FROM users WHERE org_id = ?",
      )
        .bind(user.orgId)
        .all()
    ).results,
  };

  for (const table of ORG_TABLES) {
    const rows = await c.env.DB.prepare(
      `SELECT * FROM ${table} WHERE org_id = ?`,
    )
      .bind(user.orgId)
      .all();
    out[table] = rows.results;
  }

  // Invites carry a token hash; useful to nobody and safer gone.
  if (Array.isArray(out.invites)) {
    out.invites = (out.invites as Array<Record<string, unknown>>).map(
      ({ token_hash: _drop, ...rest }) => rest,
    );
  }

  const slug = user.orgSlug || "pantry";
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(out, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="laevo-${slug}-${date}.json"`,
    },
  });
});

/**
 * Sends one real email and reports back with the provider's own words. When
 * something is wrong with a domain, the verbatim error is the only useful
 * thing anyone can act on, so it is never swallowed or prettified.
 */
api.post("/api/email-test", async (c) => {
  const user = await requireAdmin(c.env, c.req.raw);
  const template = selfTestEmail(c.env);
  const result = await sendEmail(c.env, {
    to: user.email,
    orgId: user.orgId,
    kind: "self_test",
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
  return c.json(result, result.ok ? 200 : 502);
});

api.all("/api/*", (c) => c.json({ error: "No such endpoint." }, 404));
