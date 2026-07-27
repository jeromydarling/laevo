# Laevo

Software for food pantries. *Laevo* is Latin for **lift up**.

Laevo keeps track of the food on a pantry's shelves and the neighbors it has
helped, so a volunteer-run pantry can spend Saturday on people instead of
paperwork.

Two constraints shape every decision in here:

1. **Mobile first, for a volunteer who does not love computers.** The design
   target is a seventy-three-year-old on a five-year-old phone, one-handed,
   in bad light. 18px body text with a one-tap control to 24px, nothing
   tappable smaller than 56px, one column, no three-dot menus, no hover-only
   anything, and a paper fallback that is never treated as a failure.
2. **The people served are neighbors, never clients or cases.** The word is
   used everywhere in the product and there is no setting to change it.

## Stack

- **Cloudflare Workers**, deployed by Workers Builds on push to `main`
- **React Router v8** in SSR mode for the marketing site and the app
- **Hono** at `/api/*` for health, the data export, and the email self-test
- **D1** for relational data, **KV** for rate limiting, **R2** for files
- **Cloudflare Email Sending** via the `send_email` binding

## Running it

```bash
npm install
npm run db:migrate:local     # apply migrations to the local D1
npm run dev                  # http://localhost:5173
npm test                     # vitest — pure logic and content integrity
npm run typecheck
```

Visit `/demo` and you are dropped straight into a seeded pantry — 46
neighbors, three months of Saturdays, a shelf with things going out of date.
It seeds itself on first visit if it is ever found empty.

## Layout

```
app/
  content/      guides, comparisons, principles, the public page registry
  lib/          pricing, auth, email, matching, csv, spam, meta, jsonld
  routes/
    marketing/  the public site
    auth/       sign in, sign up, reset, invite, demo, unsubscribe
    app/        the pantry itself
    public/     the volunteer signup page, no account needed
workers/
  app.ts        entry: routes /api/* to Hono, everything else to React Router
  wellknown.ts  robots.txt, sitemap.xml, llms.txt, icon.svg, og.svg
  seed.ts       the demo pantry
  cron.ts       demo rebuild, housekeeping, shift reminders
migrations/     numbered SQL, applied locally and remotely
tests/          vitest
```

## Conventions that are not negotiable

- **Money is integer cents.** `app/lib/pricing.ts` is the only place a price
  is written. The pricing page, the savings calculator, the comparison tables
  and the billing gate all read from it, and a test pins that the comparison
  prose agrees with it.
- **Every query carries `org_id`.** Multi-tenant from row one.
- **Secrets are Worker secrets**, referenced by name, never in the repo.
- **Everything degrades without keys.** With no email binding, sends log and
  the invite link is shown on screen instead. With no Stripe key, nothing is
  charged and nothing is gated. The product is fully usable before a single
  third-party key exists.
- **Nothing merges, sends, or publishes on its own.** Duplicate detection puts
  two records side by side and asks. Reports draft numbers and show their
  working; a person files them.
- **Rate limiting fails open.** A broken limiter must never lock a pantry out
  of its own account on a Saturday morning.

## Tests worth knowing about

`tests/content.test.ts` is what stops the marketing site rotting: every
internal link resolves, every guide clears a depth floor, every comparison
page still names something the competitor does better, and the prices in prose
still match `pricing.ts`. It also checks the brand voice carries no religious
language.

## Turning things on

Everything below is built and dark. Each is one action.

| What | How |
| --- | --- |
| Email sending | Onboard the domain in **Compute → Email Service → Email Sending**, then set `EMAIL_FROM` in `wrangler.jsonc` to an address on it. The `EMAIL` binding is already declared. |
| Card payments | `wrangler secret put STRIPE_SECRET_KEY`. Until then nothing is charged and nothing is restricted. |
| Workers AI | Add an `ai` binding. Nothing currently requires it — duplicate matching and CSV column mapping are deterministic on purpose. |

## Deliberately not built yet

Said plainly because the marketing site says it too: no offline mode, no
cross-agency record sharing, no donation or accounting features, no versioned
public API or webhooks, and English only.
