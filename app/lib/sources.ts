import type { Env } from "./env";
import { newId } from "./ids";

/**
 * Find a food source by name, or start one.
 *
 * Typing a name on the delivery form is how most sources get created, because
 * that is the moment somebody actually knows it. Matching is case-insensitive
 * so "Heinen's" typed twice does not become two shops.
 */
export async function findOrCreateSource(
  env: Env,
  orgId: string,
  name: string,
): Promise<{ id: string; name: string } | null> {
  const clean = name.trim();
  if (!clean) return null;

  const existing = await env.DB.prepare(
    `SELECT id, last_name AS name FROM contacts
      WHERE org_id = ? AND roles LIKE '%donor%' AND merged_into IS NULL
        AND lower(last_name) = lower(?)
      LIMIT 1`,
  )
    .bind(orgId, clean)
    .first<{ id: string; name: string }>();
  if (existing) return existing;

  const id = newId("don");
  await env.DB.prepare(
    `INSERT INTO contacts (id, org_id, roles, first_name, last_name, created_at)
     VALUES (?, ?, 'donor', '', ?, datetime('now'))`,
  )
    .bind(id, orgId, clean)
    .run();
  return { id, name: clean };
}
