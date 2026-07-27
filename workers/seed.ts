/**
 * The demo pantry.
 *
 * The demo is the best sales tool this product has, so it must never be empty
 * and never be broken. It is re-seeded nightly, and re-seeded on demand if it
 * is ever found empty.
 *
 * Everything in it is invented. No real person's details are in here, and the
 * demo tenant never sends outbound mail and is never billed.
 */
import type { Env } from "../app/lib/env";
import { newId, newCardCode, newToken } from "../app/lib/ids";
import { hashPassword } from "../app/lib/auth";

export const DEMO_SLUG = "riverbend";
export const DEMO_EMAIL = "demo@laevo.app";
export const DEMO_PASSWORD = "riverbend-demo-pantry";

const FIRST_NAMES = [
  "Maria", "James", "Dorothy", "Hector", "Ruth", "Kwame", "Linda", "Abdi",
  "Frank", "Yolanda", "Nguyen", "Betty", "Marcus", "Sofia", "Earl", "Amara",
  "Consuelo", "Terrence", "Irene", "Pavel", "Gloria", "Samuel", "Fatima",
  "Walter", "Rosa", "Dmitri", "Joyce", "Elias", "Norma", "Tavon", "Ingrid",
  "Curtis", "Blanca", "Harold", "Nadia", "Vernon", "Estelle", "Omar",
  "Lorraine", "Desmond", "Priya", "Clyde",
];

const LAST_NAMES = [
  "Alvarez", "Okafor", "Whitfield", "Nguyen", "Castellanos", "Brennan",
  "Osei", "Lindqvist", "Mbeki", "Vasquez", "Doyle", "Petrov", "Ahmed",
  "Kowalski", "Ferraro", "Boateng", "Sandoval", "McAllister", "Haddad",
  "Reyes", "Novak", "Tran", "Delgado", "Kirkpatrick", "Bello", "Ionescu",
  "Marchetti", "Abadi", "Sorensen", "Fontaine",
];

const NEEDS = [
  "", "", "", "", "",
  "No can opener at home",
  "Diabetic — low sugar please",
  "No stove, microwave only",
  "Peanut allergy in the house",
  "Baby, 8 months — needs formula",
  "Cannot lift heavy boxes",
  "No refrigerator right now",
  "Gluten free",
];

const ITEMS: Array<[string, string, string, number]> = [
  ["Canned green beans", "Vegetables", "cans", 40],
  ["Canned corn", "Vegetables", "cans", 40],
  ["Canned peaches", "Fruit", "cans", 24],
  ["Canned tuna", "Protein", "cans", 60],
  ["Peanut butter", "Protein", "jars", 30],
  ["Dried beans", "Protein", "bags", 25],
  ["Rice", "Grains", "bags", 40],
  ["Pasta", "Grains", "boxes", 50],
  ["Pasta sauce", "Grains", "jars", 40],
  ["Cereal", "Grains", "boxes", 30],
  ["Oatmeal", "Grains", "containers", 20],
  ["Shelf-stable milk", "Dairy", "cartons", 36],
  ["Eggs", "Dairy", "dozens", 12],
  ["Cheese", "Dairy", "blocks", 10],
  ["Potatoes", "Fresh", "lbs", 60],
  ["Onions", "Fresh", "lbs", 30],
  ["Carrots", "Fresh", "lbs", 25],
  ["Apples", "Fresh", "lbs", 40],
  ["Bread", "Bakery", "loaves", 24],
  ["Chicken, frozen", "Protein", "lbs", 50],
  ["Soup", "Prepared", "cans", 48],
  ["Baby formula", "Baby", "containers", 8],
  ["Diapers, size 4", "Baby", "packs", 10],
  ["Toilet paper", "Household", "rolls", 40],
  ["Dish soap", "Household", "bottles", 12],
];

const SHIFT_TITLES = [
  "Saturday distribution",
  "Tuesday evening distribution",
  "Thursday sorting and restock",
  "Food bank pickup",
];

/** Deterministic-enough pseudo-random so the demo looks the same shape daily. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function daysAgo(days: number, hour = 10): string {
  const d = new Date(Date.now() - days * 86_400_000);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString().replace("T", " ").slice(0, 19);
}

function daysAhead(days: number, hour = 9): string {
  return daysAgo(-days, hour);
}

export async function demoOrgId(env: Env): Promise<string | null> {
  const row = await env.DB.prepare("SELECT id FROM orgs WHERE slug = ?")
    .bind(DEMO_SLUG)
    .first<{ id: string }>();
  return row?.id ?? null;
}

export async function demoIsEmpty(env: Env): Promise<boolean> {
  const orgId = await demoOrgId(env);
  if (!orgId) return true;
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM contacts WHERE org_id = ?",
  )
    .bind(orgId)
    .first<{ n: number }>();
  return (row?.n ?? 0) < 10;
}

/** Deletes and rebuilds the demo tenant. Safe to run at any time. */
export async function seedDemo(env: Env): Promise<string> {
  const existing = await demoOrgId(env);
  if (existing) await wipeOrg(env, existing);

  const orgId = existing ?? newId("org");
  const siteId = newId("site");
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const statements: D1PreparedStatement[] = [];

  if (!existing) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO orgs (id, name, slug, timezone, plan, service_area_note,
                           distribution_model, visit_note, is_demo, created_at)
         VALUES (?, ?, ?, ?, 'community', ?, 'choice', ?, 1, datetime('now'))`,
      ).bind(
        orgId,
        "Riverbend Community Pantry",
        DEMO_SLUG,
        "America/Chicago",
        "Anyone in the 44107 and 44111 zip codes. If someone comes from outside, we give them a bag anyway and tell them about the pantry on Detroit Avenue.",
        "Every household is welcome twice a month. Nobody is turned away for coming a third time.",
      ),
    );
  }

  statements.push(
    env.DB.prepare(
      `INSERT INTO sites (id, org_id, name, address, hours_note)
       VALUES (?, ?, ?, ?, ?)`,
    ).bind(
      siteId,
      orgId,
      "Riverbend — the hall behind the library",
      "1420 Clifton Boulevard",
      "Saturdays 9am to noon, Tuesdays 5pm to 7pm",
    ),
  );

  const users: Array<[string, string, string, string]> = [
    [newId("usr"), DEMO_EMAIL, "Dolores Whitfield", "admin"],
    [newId("usr"), "volunteer@laevo.app", "Ray Petrov", "volunteer"],
    [newId("usr"), "staff@laevo.app", "Aisha Boateng", "staff"],
  ];
  for (const [id, email, name, role] of users) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO users (id, org_id, email, name, role, password_hash, active, large_text)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      ).bind(id, orgId, email, name, role, passwordHash, role === "volunteer" ? 1 : 0),
    );
  }
  const adminId = users[0][0];

  // ---- Neighbors --------------------------------------------------------
  const random = rng(20260727);
  const contactIds: string[] = [];
  const contactSizes: number[] = [];

  for (let i = 0; i < 46; i++) {
    const id = newId("nb");
    contactIds.push(id);
    const first = FIRST_NAMES[Math.floor(random() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(random() * LAST_NAMES.length)];
    const adults = 1 + Math.floor(random() * 3);
    const children = Math.floor(random() * 4);
    const seniors = random() > 0.72 ? 1 : 0;
    const size = adults + children + seniors;
    contactSizes.push(size);
    const needs = NEEDS[Math.floor(random() * NEEDS.length)];
    const firstVisit = 20 + Math.floor(random() * 160);
    const lastVisit = Math.floor(random() * 18);

    statements.push(
      env.DB.prepare(
        `INSERT INTO contacts (id, org_id, roles, first_name, last_name, phone, email,
                               address_line, city, state, zip, household_size, adults,
                               children, seniors, needs, card_code, unsub_token,
                               first_visit_at, last_visit_at, visit_count, created_at)
         VALUES (?, ?, 'neighbor', ?, ?, ?, NULL, ?, 'Lakewood', 'OH', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        id,
        orgId,
        first,
        last,
        `216${String(5550000 + Math.floor(random() * 9999)).slice(0, 7)}`,
        `${100 + Math.floor(random() * 4800)} ${["Clifton", "Detroit", "Madison", "Hilliard", "Warren"][Math.floor(random() * 5)]} ${random() > 0.5 ? "Avenue" : "Road"}`,
        random() > 0.4 ? "44107" : "44111",
        size,
        adults,
        children,
        seniors,
        needs || null,
        newCardCode(),
        newToken(16),
        daysAgo(firstVisit),
        daysAgo(lastVisit),
        0,
        daysAgo(firstVisit),
      ),
    );
  }

  // ---- Visits over the last 90 days -------------------------------------
  const visitCounts = new Map<string, number>();
  for (let day = 90; day >= 0; day--) {
    const d = new Date(Date.now() - day * 86_400_000);
    const dow = d.getUTCDay();
    if (dow !== 6 && dow !== 2) continue; // Saturdays and Tuesdays
    const howMany = 12 + Math.floor(random() * 14);
    for (let n = 0; n < howMany; n++) {
      const idx = Math.floor(random() * contactIds.length);
      const contactId = contactIds[idx];
      const count = (visitCounts.get(contactId) ?? 0) + 1;
      visitCounts.set(contactId, count);
      statements.push(
        env.DB.prepare(
          `INSERT INTO visits (id, org_id, contact_id, site_id, visited_at, household_size,
                               adults, children, seniors, first_visit, channel, recorded_by)
           VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, 'walk_in', ?)`,
        ).bind(
          newId("vst"),
          orgId,
          contactId,
          siteId,
          daysAgo(day, dow === 6 ? 10 : 17),
          contactSizes[idx],
          count === 1 ? 1 : 0,
          adminId,
        ),
      );
    }
  }
  for (const [contactId, count] of visitCounts) {
    statements.push(
      env.DB.prepare("UPDATE contacts SET visit_count = ? WHERE id = ?").bind(
        count,
        contactId,
      ),
    );
  }

  // ---- The shelf ---------------------------------------------------------
  ITEMS.forEach(([name, category, unit, par], i) => {
    const itemId = newId("itm");
    statements.push(
      env.DB.prepare(
        `INSERT INTO items (id, org_id, name, category, unit, min_par)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(itemId, orgId, name, category, unit, par),
    );

    const lotCount = 1 + Math.floor(random() * 2);
    for (let l = 0; l < lotCount; l++) {
      // A few things are deliberately close to their date, because that is
      // the situation the shelf screen exists to catch.
      const soon = i % 7 === 0 && l === 0;
      const perishable = ["Fresh", "Dairy", "Bakery"].includes(category);
      const expiresIn = soon
        ? 3 + Math.floor(random() * 5)
        : perishable
          ? 10 + Math.floor(random() * 20)
          : 120 + Math.floor(random() * 500);
      statements.push(
        env.DB.prepare(
          `INSERT INTO lots (id, org_id, item_id, site_id, quantity, received_at, expires_at, source_note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(
          newId("lot"),
          orgId,
          itemId,
          siteId,
          Math.round(par * (0.3 + random() * 1.4)),
          daysAgo(Math.floor(random() * 30)),
          daysAhead(expiresIn).slice(0, 10),
          ["Greater Cleveland Food Bank", "Heinen's on Detroit", "Neighborhood food drive", "Individual donation"][
            Math.floor(random() * 4)
          ],
        ),
      );
    }
  });

  // ---- Shifts and signups ------------------------------------------------
  for (let w = 0; w < 4; w++) {
    SHIFT_TITLES.forEach((title, t) => {
      const shiftId = newId("shf");
      const dayOffset = w * 7 + [6, 2, 4, 3][t];
      statements.push(
        env.DB.prepare(
          `INSERT INTO shifts (id, org_id, site_id, title, starts_at, ends_at, slots, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(
          shiftId,
          orgId,
          siteId,
          title,
          daysAhead(dayOffset, t === 1 ? 17 : 9),
          daysAhead(dayOffset, t === 1 ? 19 : 12),
          t === 0 ? 8 : 4,
          t === 3 ? "You will need a vehicle that fits six banana boxes." : null,
        ),
      );
      const filled = Math.floor(random() * (t === 0 ? 7 : 4));
      for (let s = 0; s < filled; s++) {
        const first = FIRST_NAMES[Math.floor(random() * FIRST_NAMES.length)];
        const last = LAST_NAMES[Math.floor(random() * LAST_NAMES.length)];
        statements.push(
          env.DB.prepare(
            `INSERT INTO signups (id, org_id, shift_id, name, email, status)
             VALUES (?, ?, ?, ?, ?, 'coming')`,
          ).bind(
            newId("sup"),
            orgId,
            shiftId,
            `${first} ${last}`,
            `${first.toLowerCase()}@example.org`,
          ),
        );
      }
    });
  }

  statements.push(
    env.DB.prepare(
      `INSERT INTO events (id, org_id, kind, summary, created_at)
       VALUES (?, ?, 'demo_reset', 'Demo pantry rebuilt', datetime('now'))`,
    ).bind(newId("evt"), orgId),
    env.DB.prepare(
      `INSERT INTO system_state (key, value, updated_at)
       VALUES ('demo_seeded_at', datetime('now'), datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = datetime('now'), updated_at = datetime('now')`,
    ),
  );

  // D1 batches run in one transaction, and 90 days of visits is a lot of
  // statements — chunked so a single batch never gets unreasonably large.
  for (let i = 0; i < statements.length; i += 100) {
    await env.DB.batch(statements.slice(i, i + 100));
  }

  return orgId;
}

/**
 * Every org-scoped table, in dependency order. When a migration adds an
 * org-scoped table it goes here too — the demo reset and the account deletion
 * path both read this list.
 */
export const ORG_TABLES = [
  "handouts",
  "signups",
  "shifts",
  "lots",
  "items",
  "visits",
  "contacts",
  "reports",
  "import_jobs",
  "events",
  "invites",
  "sites",
] as const;

export async function wipeOrg(env: Env, orgId: string): Promise<void> {
  const statements = ORG_TABLES.map((table) =>
    env.DB.prepare(`DELETE FROM ${table} WHERE org_id = ?`).bind(orgId),
  );
  statements.push(
    env.DB.prepare(
      "DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE org_id = ?)",
    ).bind(orgId),
    env.DB.prepare("DELETE FROM users WHERE org_id = ?").bind(orgId),
    env.DB.prepare("DELETE FROM email_log WHERE org_id = ?").bind(orgId),
  );
  await env.DB.batch(statements);
}
