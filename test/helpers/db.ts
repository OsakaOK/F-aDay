import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import { countries } from "@/db/schema";
import type { DrizzleDb } from "@/db";

/**
 * Synthetic country fixtures used across integration tests. cycleIndex is
 * 0..N-1 in array order, so with FADAY_DAY_OVERRIDE=k the day's answer is
 * FIXTURES[k]. Names/aliases are invented to avoid accidental collisions in the
 * giveaway-filter tests. Index 0 has a capital (autoHint → capital); index 1 has
 * none but a population (autoHint → population).
 */
export const FIXTURES = [
  {
    cca3: "AAA",
    cca2: "AA",
    name: "Alphaland",
    officialName: "Republic of Alphaland",
    flagUrl: "https://flagcdn.com/w320/aa.png",
    flagEmoji: "🇦🇦",
    capital: "Alphaville",
    population: 1_000_000,
    region: "Europe",
    subregion: "Northern Europe",
    area: 500,
    languages: ["Alphish"],
    currencies: ["Alpha Dollar"],
    borders: ["BBB"],
    aliases: ["alphaland", "republic of alphaland", "alfaland"],
    cycleIndex: 0,
  },
  {
    cca3: "BBB",
    cca2: "BB",
    name: "Betamar",
    officialName: "Betamar",
    flagUrl: "https://flagcdn.com/w320/bb.png",
    flagEmoji: "🇧🇧",
    capital: null,
    population: 2_000_000,
    region: "Asia",
    subregion: "Southern Asia",
    area: 1000,
    languages: ["Betish", "Gammish"],
    currencies: ["Beta Peso"],
    borders: [] as string[],
    aliases: ["betamar"],
    cycleIndex: 1,
  },
  {
    cca3: "CCC",
    cca2: "CC",
    name: "Gammadia",
    officialName: "Kingdom of Gammadia",
    flagUrl: "https://flagcdn.com/w320/cc.png",
    flagEmoji: "🇨🇨",
    capital: "Gamma City",
    population: 3_000_000,
    region: "Africa",
    subregion: "Eastern Africa",
    area: 1500,
    languages: ["Gammish"],
    currencies: ["Gamma Franc"],
    borders: ["DDD"],
    aliases: ["gammadia"],
    cycleIndex: 2,
  },
  {
    cca3: "DDD",
    cca2: "DD",
    name: "Deltebre",
    officialName: "Deltebre",
    flagUrl: "https://flagcdn.com/w320/dd.png",
    flagEmoji: "🇩🇩",
    capital: "Delta Town",
    population: 4_000_000,
    region: "Americas",
    subregion: "South America",
    area: 2000,
    languages: ["Deltish"],
    currencies: ["Delta Real"],
    borders: ["CCC"],
    aliases: ["deltebre"],
    cycleIndex: 3,
  },
  {
    cca3: "EEE",
    cca2: "EE",
    name: "Epsilonia",
    officialName: "Epsilonia",
    flagUrl: "https://flagcdn.com/w320/ee.png",
    flagEmoji: "🇪🇪",
    capital: "Epsil",
    population: 5_000_000,
    region: "Oceania",
    subregion: "Polynesia",
    area: 2500,
    languages: ["Epsish"],
    currencies: ["Epsilon Kina"],
    borders: [] as string[],
    aliases: ["epsilonia"],
    cycleIndex: 4,
  },
  {
    cca3: "FFF",
    cca2: "FF",
    name: "Zetavia",
    officialName: "Zetavia",
    flagUrl: "https://flagcdn.com/w320/ff.png",
    flagEmoji: "🇫🇫",
    capital: "Zeta",
    population: 6_000_000,
    region: "Europe",
    subregion: "Western Europe",
    area: 3000,
    languages: ["Zetish"],
    currencies: ["Zeta Euro"],
    borders: [] as string[],
    aliases: ["zetavia"],
    cycleIndex: 5,
  },
];

export const FIXTURE_COUNT = FIXTURES.length;

/**
 * Creates a fresh in-memory PGlite, applies migrations, seeds the fixtures, and
 * wires it into the app's getDb() via the global connection cache. Call once per
 * test file in beforeAll.
 */
export async function setupTestDb(): Promise<DrizzleDb> {
  const client = new PGlite(); // in-memory, isolated per test file
  await client.waitReady;
  const db = drizzle(client, { schema }) as unknown as DrizzleDb;
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  await db.insert(countries).values(FIXTURES);

  (globalThis as unknown as { __dbPromise?: Promise<DrizzleDb> }).__dbPromise =
    Promise.resolve(db);
  return db;
}

/** Clears all per-player state between tests; leaves countries (and its cache) intact. */
export async function resetMutable(db: DrizzleDb): Promise<void> {
  await db.execute(
    sql`TRUNCATE player_progress, hints, fun_facts, votes, flags RESTART IDENTITY`,
  );
}

/** Force which UTC day the game treats as "today" (drives the answer + cycle). */
export function setDay(dayIndex: number): void {
  process.env.FADAY_DAY_OVERRIDE = String(dayIndex);
}

export function clearDay(): void {
  delete process.env.FADAY_DAY_OVERRIDE;
}
