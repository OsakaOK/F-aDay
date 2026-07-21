# Flag a Day

A daily flag-guessing game. Everyone gets the **same flag each day** (Wordle-style),
you get **three guesses**, progressive hints, and a community layer for hints and fun
facts. New puzzle every day at **UTC midnight**.

Built with Next.js (App Router), Drizzle ORM, and Postgres. Runs locally with **zero
external setup** — it falls back to an embedded Postgres (PGlite) so you don't need to
stand up a database to develop.

## How it plays

- **Shared daily puzzle** — the country is chosen from a fixed, deterministic shuffle of
  the full ~250-country dataset, indexed by day (`daysSinceEpoch % 250`). No repeats
  until the whole list cycles (~8 months).
- **Three guesses**, chosen from a searchable country list (no free-text/fuzzy matching).
  A wrong guess is a plain miss — no distance or direction hints.
- **Hints**
  - Hint 1 (after miss 1): the country's region.
  - Hint 2 (after miss 2): the top community hint from the **previous cycle's** surviving
    pool; falls back to an auto-generated hint (capital/population) on a first-ever cycle.
  - After miss 3: the answer is revealed.
- **After finishing** (win or lose): baseline fun facts (always present, from structured
  data) plus a community fun-fact layer.
- **Locked once finished** — revisiting shows a read-only result view.

## Community & moderation

- **Anonymous identity** — a cookie-based `player_id`, set by middleware. No accounts.
- **Gating**
  - Submit / vote / flag a **hint**: only players who *solved* that day's flag.
  - Submit / vote / flag a **fun fact**: anyone who *finished* (won or lost).
  - One hint + one fun fact per player, per country, per cycle.
- **Submission filter** (automatic, no admin step): length bounds, banned-word / URL
  blocklist, and rejection of any text that leaks the country's name or a known alias.
- **Ranking** — Reddit-style up/down votes; highest-scoring shown first.
- **Flagging** — separate from downvotes; **5 flags auto-removes** an item immediately.
- No admin dashboard in v1 — moderation is fully community-driven. Direct DB access is the
  manual escape hatch.

## Tech stack

| Concern      | Choice                                                              |
| ------------ | ------------------------------------------------------------------- |
| Framework    | Next.js 15 (App Router, React 19, TypeScript, Tailwind)             |
| Database     | Postgres — **PGlite** (embedded) locally, node-postgres in prod     |
| ORM          | Drizzle ORM + Drizzle Kit migrations                                |
| Hosting      | Vercel                                                              |
| Country data | [mledoze/countries](https://github.com/mledoze/countries) (the open dataset REST Countries is built from) + World Bank population + [flagcdn.com](https://flagcdn.com) flag images — all keyless |

> The public REST Countries API now requires an API key for the bulk endpoint, so the
> seed pulls the same underlying open data directly. No API key is needed.

## Getting started

```bash
npm install
npm run db:migrate   # applies schema to ./.pglite (embedded Postgres)
npm run db:seed      # fetches country data + populations, seeds 250 countries
npm run dev          # http://localhost:3000
```

No `DATABASE_URL`? The app automatically uses PGlite persisted under `./.pglite`.

Useful scripts:

| Script                | What it does                                            |
| --------------------- | ------------------------------------------------------- |
| `npm run dev`         | Dev server                                              |
| `npm run build`       | Production build                                        |
| `npm test`            | Run the test suite once                                 |
| `npm run test:watch`  | Run tests in watch mode                                 |
| `npm run db:generate` | Generate a new SQL migration from `src/db/schema.ts`    |
| `npm run db:migrate`  | Apply migrations                                        |
| `npm run db:seed`     | (Re)seed the country list (idempotent upsert)           |
| `npm run db:reset`    | Wipe `./.pglite`, migrate, and reseed                   |

### Dev-only day override

To exercise a future day's puzzle (e.g. to see the previous cycle's community hint pool),
set `FADAY_DAY_OVERRIDE` to a day index when running dev. Ignored in production.

```bash
FADAY_DAY_OVERRIDE=20905 npm run dev
```

## Testing

```bash
npm test
```

The suite (Vitest) has two layers:

- **Integration tests** run the real game and community logic against an **in-memory
  PGlite** database (fresh per test file, migrated and seeded with synthetic fixtures) —
  covering guessing, hints, win/lose, the finished-puzzle lock, submission gating, voting,
  flag auto-removal, and the cross-cycle hint pool. Tests drive the puzzle day with the
  `FADAY_DAY_OVERRIDE` hook, so no clock mocking is needed.
- **Unit tests** cover the pure helpers: submission validation (length / URL / banned-word
  / name-giveaway filters), baseline-fact and hint generation, day math, and formatting.

No external database or network is required to run the tests.

## Deploying to Vercel

1. Provision a Postgres database (Supabase or Neon).
2. Set `DATABASE_URL` in the Vercel project env. When present, the app uses node-postgres
   instead of PGlite — no other code changes.
3. Run migrations and seed against that database once:
   ```bash
   DATABASE_URL=postgres://… npm run db:migrate
   DATABASE_URL=postgres://… npm run db:seed
   ```
4. Deploy.

## Data model

`countries`, `player_progress`, `hints`, `fun_facts`, `votes`, `flags` — see
[src/db/schema.ts](src/db/schema.ts). Guess/hint/fact/vote/flag logic lives in
[src/lib/game.ts](src/lib/game.ts) and [src/lib/community.ts](src/lib/community.ts).

## Deferred to v2

Streaks, guess-distribution stats, shareable emoji result cards, an admin moderation
dashboard, and distance/direction feedback on wrong guesses.
