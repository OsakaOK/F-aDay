import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb, type DrizzleDb } from "@/db";
import {
  countries,
  funFacts,
  flags as flagsTable,
  hints as hintsTable,
  playerProgress,
  votes as votesTable,
  type Country,
} from "@/db/schema";
import { daysSinceEpoch } from "./time";
import { autoHint, baselineFacts } from "./facts";
import {
  MAX_GUESSES,
  type CommunityItem,
  type CommunitySection,
  type CountryOption,
  type GameState,
  type GameStatus,
  type GuessResult,
  type RevealedHint,
} from "./types";

export class GameError extends Error {
  constructor(
    public code:
      | "invalid_country"
      | "already_finished"
      | "already_guessed"
      | "not_found",
    message: string,
  ) {
    super(message);
  }
}

// ---- Static country data (cached; refreshed only on cold start / reseed) ----

type CountryCache = {
  list: Country[];
  byCca3: Map<string, Country>;
  byIndex: Map<number, Country>;
  count: number;
  options: CountryOption[];
};

let cachePromise: Promise<CountryCache> | null = null;

async function loadCountries(db: DrizzleDb): Promise<CountryCache> {
  if (!cachePromise) {
    cachePromise = (async () => {
      const list = await db.select().from(countries);
      const byCca3 = new Map(list.map((c) => [c.cca3, c]));
      const byIndex = new Map(list.map((c) => [c.cycleIndex, c]));
      const options: CountryOption[] = list
        .map((c) => ({
          cca3: c.cca3,
          cca2: c.cca2,
          name: c.name,
          flagEmoji: c.flagEmoji,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return { list, byCca3, byIndex, count: list.length, options };
    })();
  }
  return cachePromise;
}

export async function getCountryOptions(): Promise<CountryOption[]> {
  const db = await getDb();
  return (await loadCountries(db)).options;
}

// ---- Daily puzzle resolution ----

type TodayContext = {
  country: Country;
  cycleNumber: number;
  dayIndex: number;
  listLength: number;
};

async function getTodayContext(db: DrizzleDb): Promise<TodayContext> {
  const cache = await loadCountries(db);
  if (cache.count === 0) {
    throw new GameError("not_found", "Countries table is empty — run the seed.");
  }
  const dayIndex = daysSinceEpoch();
  const cycleIndex = dayIndex % cache.count;
  const cycleNumber = Math.floor(dayIndex / cache.count);
  const country = cache.byIndex.get(cycleIndex)!;
  return { country, cycleNumber, dayIndex, listLength: cache.count };
}

// ---- Progress → guess / status helpers ----

function toGuessResults(
  guessCodes: string[],
  answerCca3: string,
  byCca3: Map<string, Country>,
): GuessResult[] {
  return guessCodes.map((cca3) => {
    const c = byCca3.get(cca3);
    return {
      cca3,
      name: c?.name ?? cca3,
      flagEmoji: c?.flagEmoji ?? "",
      correct: cca3 === answerCca3,
    };
  });
}

/** Failed guesses so far — drives how many hints are revealed. */
function failedCount(guesses: string[], status: GameStatus): number {
  if (status === "won") return guesses.length - 1;
  return guesses.length; // playing (all wrong so far) or lost (all 3 wrong)
}

// ---- Hint pool (previous cycle's surviving community hints) ----

type PoolHint = { id: string; text: string; upvotes: number; downvotes: number; flagCount: number; submittedBy: string };

async function getHintPool(
  db: DrizzleDb,
  countryId: string,
  cycleNumber: number,
): Promise<PoolHint[]> {
  const prevCycle = cycleNumber - 1;
  if (prevCycle < 0) return [];
  const rows = await db
    .select({
      id: hintsTable.id,
      text: hintsTable.text,
      upvotes: hintsTable.upvotes,
      downvotes: hintsTable.downvotes,
      flagCount: hintsTable.flagCount,
      submittedBy: hintsTable.submittedBy,
    })
    .from(hintsTable)
    .where(
      and(
        eq(hintsTable.countryId, countryId),
        eq(hintsTable.cycleSubmitted, prevCycle),
        eq(hintsTable.status, "active"),
      ),
    )
    .orderBy(desc(hintsTable.upvotes), asc(hintsTable.createdAt));
  // Rank by score (upvotes - downvotes), stable by creation.
  return rows.sort((a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes));
}

function buildRevealedHints(
  country: Country,
  revealedLevels: number,
  pool: PoolHint[],
): RevealedHint[] {
  const hints: RevealedHint[] = [];
  if (revealedLevels >= 1) {
    const where = country.subregion
      ? `${country.subregion}`
      : (country.region ?? "an unknown region");
    hints.push({ level: 1, kind: "region", text: `This country is in ${where}.` });
  }
  if (revealedLevels >= 2) {
    if (pool.length > 0) {
      hints.push({
        level: 2,
        kind: "community",
        text: pool[0].text,
        poolSize: pool.length,
      });
    } else {
      hints.push({ level: 2, kind: "auto", text: autoHint(country) });
    }
  }
  return hints;
}

// ---- Community section (shown once finished) ----

async function buildCommunitySection(
  db: DrizzleDb,
  cookieId: string,
  country: Country,
  cycleNumber: number,
  status: GameStatus,
  pool: PoolHint[],
): Promise<CommunitySection> {
  const factRows = await db
    .select()
    .from(funFacts)
    .where(and(eq(funFacts.countryId, country.id), eq(funFacts.status, "active")))
    .orderBy(desc(funFacts.upvotes), asc(funFacts.createdAt));

  const factsSorted = factRows.sort(
    (a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes),
  );

  // Viewer's votes/flags across every visible target, in two batched queries.
  const targetIds = [...pool.map((h) => h.id), ...factsSorted.map((f) => f.id)];
  const myVotes = new Map<string, "up" | "down">();
  const myFlags = new Set<string>();
  if (targetIds.length > 0) {
    const [voteRows, flagRows] = await Promise.all([
      db
        .select({ targetId: votesTable.targetId, value: votesTable.value })
        .from(votesTable)
        .where(and(eq(votesTable.cookieId, cookieId), inArray(votesTable.targetId, targetIds))),
      db
        .select({ targetId: flagsTable.targetId })
        .from(flagsTable)
        .where(and(eq(flagsTable.cookieId, cookieId), inArray(flagsTable.targetId, targetIds))),
    ]);
    for (const v of voteRows) myVotes.set(v.targetId, v.value);
    for (const f of flagRows) myFlags.add(f.targetId);
  }

  const toItem = (row: {
    id: string;
    text: string;
    upvotes: number;
    downvotes: number;
    flagCount: number;
    submittedBy: string;
  }): CommunityItem => ({
    id: row.id,
    text: row.text,
    upvotes: row.upvotes,
    downvotes: row.downvotes,
    score: row.upvotes - row.downvotes,
    flagCount: row.flagCount,
    myVote: myVotes.get(row.id) ?? null,
    myFlagged: myFlags.has(row.id),
    mine: row.submittedBy === cookieId,
  });

  // "Submitted this cycle" is scoped to the *current* cycle (feeds next cycle's
  // Hint 2 pool), independent of the previous-cycle pool shown above.
  const [mineHint, mineFact] = await Promise.all([
    db
      .select({ id: hintsTable.id })
      .from(hintsTable)
      .where(
        and(
          eq(hintsTable.submittedBy, cookieId),
          eq(hintsTable.countryId, country.id),
          eq(hintsTable.cycleSubmitted, cycleNumber),
        ),
      )
      .limit(1),
    db
      .select({ id: funFacts.id })
      .from(funFacts)
      .where(
        and(
          eq(funFacts.submittedBy, cookieId),
          eq(funFacts.countryId, country.id),
          eq(funFacts.cycleSubmitted, cycleNumber),
        ),
      )
      .limit(1),
  ]);

  return {
    canParticipateHints: status === "won",
    canParticipateFacts: status === "won" || status === "lost",
    hasSubmittedHint: mineHint.length > 0,
    hasSubmittedFact: mineFact.length > 0,
    hintPool: pool.map(toItem),
    facts: factsSorted.map(toItem),
  };
}

// ---- Public: full game state ----

export async function getGameState(cookieId: string): Promise<GameState> {
  const db = await getDb();
  const cache = await loadCountries(db);
  const { country, cycleNumber, dayIndex, listLength } = await getTodayContext(db);

  const [progress] = await db
    .select()
    .from(playerProgress)
    .where(
      and(
        eq(playerProgress.cookieId, cookieId),
        eq(playerProgress.countryId, country.id),
        eq(playerProgress.cycleNumber, cycleNumber),
      ),
    )
    .limit(1);

  const guessCodes = progress?.guesses ?? [];
  const status: GameStatus = progress?.outcome ?? "playing";
  const revealedLevels = Math.min(failedCount(guessCodes, status), 2);

  const pool =
    revealedLevels >= 2 || status !== "playing"
      ? await getHintPool(db, country.id, cycleNumber)
      : [];

  const state: GameState = {
    cycleNumber,
    dayIndex,
    listLength,
    flagUrl: country.flagUrl,
    status,
    guesses: toGuessResults(guessCodes, country.cca3, cache.byCca3),
    maxGuesses: MAX_GUESSES,
    hints: buildRevealedHints(country, revealedLevels, pool),
  };

  if (status !== "playing") {
    state.answer = {
      cca3: country.cca3,
      cca2: country.cca2,
      name: country.name,
      officialName: country.officialName,
      flagEmoji: country.flagEmoji,
      region: country.region,
      subregion: country.subregion,
    };
    state.baselineFacts = baselineFacts(country);
    state.community = await buildCommunitySection(
      db,
      cookieId,
      country,
      cycleNumber,
      status,
      pool,
    );
  }

  return state;
}

// ---- Public: submit a guess ----

export async function submitGuess(
  cookieId: string,
  guessCca3: string,
): Promise<GameState> {
  const db = await getDb();
  const cache = await loadCountries(db);
  const { country, cycleNumber } = await getTodayContext(db);

  if (!cache.byCca3.has(guessCca3)) {
    throw new GameError("invalid_country", "That isn't a country we recognise.");
  }

  const [existing] = await db
    .select()
    .from(playerProgress)
    .where(
      and(
        eq(playerProgress.cookieId, cookieId),
        eq(playerProgress.countryId, country.id),
        eq(playerProgress.cycleNumber, cycleNumber),
      ),
    )
    .limit(1);

  if (existing?.outcome) {
    throw new GameError("already_finished", "You've already finished today's puzzle.");
  }

  const prior = existing?.guesses ?? [];
  if (prior.includes(guessCca3)) {
    throw new GameError("already_guessed", "You've already guessed that country.");
  }
  if (prior.length >= MAX_GUESSES) {
    throw new GameError("already_finished", "No guesses remaining.");
  }

  const guesses = [...prior, guessCca3];
  const correct = guessCca3 === country.cca3;
  const outcome: "won" | "lost" | null = correct
    ? "won"
    : guesses.length >= MAX_GUESSES
      ? "lost"
      : null;
  const completedAt = outcome ? new Date() : null;

  await db
    .insert(playerProgress)
    .values({
      cookieId,
      countryId: country.id,
      cycleNumber,
      guesses,
      outcome,
      completedAt,
    })
    .onConflictDoUpdate({
      target: [
        playerProgress.cookieId,
        playerProgress.countryId,
        playerProgress.cycleNumber,
      ],
      set: { guesses, outcome, completedAt },
    });

  return getGameState(cookieId);
}

/** Resolve today's country + cycle for the write routes (hints/facts/votes/flags). */
export async function getTodayForWrites(): Promise<{
  db: DrizzleDb;
  country: Country;
  cycleNumber: number;
}> {
  const db = await getDb();
  const { country, cycleNumber } = await getTodayContext(db);
  return { db, country, cycleNumber };
}

export async function getPlayerProgressForToday(cookieId: string) {
  const db = await getDb();
  const { country, cycleNumber } = await getTodayContext(db);
  const [progress] = await db
    .select()
    .from(playerProgress)
    .where(
      and(
        eq(playerProgress.cookieId, cookieId),
        eq(playerProgress.countryId, country.id),
        eq(playerProgress.cycleNumber, cycleNumber),
      ),
    )
    .limit(1);
  return { country, cycleNumber, progress };
}
