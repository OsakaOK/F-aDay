import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  FIXTURES,
  FIXTURE_COUNT,
  resetMutable,
  setDay,
  setupTestDb,
} from "./helpers/db";
import { getGameState, submitGuess } from "@/lib/game";
import {
  castFlag,
  castVote,
  FLAG_THRESHOLD,
  submitFact,
  submitHint,
} from "@/lib/community";
import type { DrizzleDb } from "@/db";

let db: DrizzleDb;

const ANSWER = FIXTURES[0]; // AAA / Alphaland
const GOOD_FACT = "The local coastline is famous for its dramatic cliffs.";
const GOOD_HINT = "A small northern place known for an old clifftop castle.";
const HINT_B = "Famous for rugged coastal scenery and seabird colonies.";

/** Play today's puzzle to a win for `cookie`. */
async function win(cookie: string) {
  await submitGuess(cookie, ANSWER.cca3);
}
/** Play today's puzzle to a loss for `cookie`. */
async function lose(cookie: string) {
  for (const wrong of ["BBB", "CCC", "DDD"]) await submitGuess(cookie, wrong);
}

beforeAll(async () => {
  db = await setupTestDb();
});

beforeEach(async () => {
  await resetMutable(db);
  setDay(0); // answer = AAA, cycle 0
});

describe("fun fact submission", () => {
  it("lets a finished player add a fact that then appears in the list", async () => {
    await win("p1");
    await submitFact("p1", GOOD_FACT);
    const state = await getGameState("p1");
    expect(state.community?.facts).toHaveLength(1);
    expect(state.community?.facts[0]).toMatchObject({ text: GOOD_FACT, mine: true });
    expect(state.community?.hasSubmittedFact).toBe(true);
  });

  it("rejects a fact from a player who lost (participation needs a win)", async () => {
    await lose("p2");
    await expect(submitFact("p2", GOOD_FACT)).rejects.toMatchObject({
      code: "not_eligible",
    });
  });

  it("rejects a second fact from the same player in the same cycle", async () => {
    await win("p1");
    await submitFact("p1", GOOD_FACT);
    await expect(submitFact("p1", "A totally different second fact here.")).rejects.toMatchObject(
      { code: "already_submitted" },
    );
  });

  it("rejects a fact from a player who hasn't finished", async () => {
    await expect(submitFact("stranger", GOOD_FACT)).rejects.toMatchObject({
      code: "not_eligible",
    });
  });
});

describe("hint submission", () => {
  it("lets a solver add a hint", async () => {
    await win("p1");
    await submitHint("p1", GOOD_HINT);
    const state = await getGameState("p1");
    expect(state.community?.hasSubmittedHint).toBe(true);
  });

  it("rejects a hint from a player who lost", async () => {
    await lose("p2");
    await expect(submitHint("p2", GOOD_HINT)).rejects.toMatchObject({
      code: "not_eligible",
    });
  });

  it("rejects a hint that gives away the country's name", async () => {
    await win("p1");
    await expect(
      submitHint("p1", "The country Alphaland has lovely green mountains."),
    ).rejects.toMatchObject({ code: "invalid" });
  });

  it("rejects a hint that is too short", async () => {
    await win("p1");
    await expect(submitHint("p1", "tiny")).rejects.toMatchObject({ code: "invalid" });
  });
});

describe("voting", () => {
  async function seedFact(): Promise<string> {
    await win("author");
    await submitFact("author", GOOD_FACT);
    const state = await getGameState("author");
    return state.community!.facts[0].id;
  }

  it("upvotes, toggles off, and switches to downvote with correct score", async () => {
    const factId = await seedFact();
    await win("voter");

    await castVote("voter", "fact", factId, "up");
    let f = (await getGameState("voter")).community!.facts[0];
    expect(f).toMatchObject({ score: 1, myVote: "up", upvotes: 1 });

    // Clicking the same button again clears the vote.
    await castVote("voter", "fact", factId, "up");
    f = (await getGameState("voter")).community!.facts[0];
    expect(f).toMatchObject({ score: 0, myVote: null });

    // Switching sides moves the score, not just adds.
    await castVote("voter", "fact", factId, "down");
    f = (await getGameState("voter")).community!.facts[0];
    expect(f).toMatchObject({ score: -1, myVote: "down", downvotes: 1 });
  });

  it("rejects votes from a player who hasn't finished", async () => {
    const factId = await seedFact();
    await expect(castVote("stranger", "fact", factId, "up")).rejects.toMatchObject({
      code: "not_eligible",
    });
  });

  it("rejects voting on content that belongs to a different day's country", async () => {
    const factId = await seedFact(); // fact for AAA (day 0)
    setDay(1); // today is now BBB
    await submitGuess("voterB", "BBB"); // win today's (BBB)
    await expect(castVote("voterB", "fact", factId, "up")).rejects.toMatchObject({
      code: "wrong_country",
    });
  });
});

describe("flagging", () => {
  async function seedFact(): Promise<string> {
    await win("author");
    await submitFact("author", GOOD_FACT);
    return (await getGameState("author")).community!.facts[0].id;
  }

  it(`auto-removes an item once it reaches ${FLAG_THRESHOLD} flags`, async () => {
    const factId = await seedFact();
    const flaggers = ["f1", "f2", "f3", "f4", "f5"];

    for (let i = 0; i < flaggers.length; i++) {
      await win(flaggers[i]);
      await castFlag(flaggers[i], "fact", factId);
      const visible = (await getGameState("author")).community!.facts.length;
      if (i < FLAG_THRESHOLD - 1) {
        expect(visible).toBe(1); // still visible below threshold
      } else {
        expect(visible).toBe(0); // removed at the threshold
      }
    }
  });

  it("is idempotent — a repeat flag from the same player doesn't double-count", async () => {
    const factId = await seedFact();
    await win("f1");
    await castFlag("f1", "fact", factId);
    await castFlag("f1", "fact", factId);
    const item = (await getGameState("f1")).community!.facts[0];
    expect(item.flagCount).toBe(1);
    expect(item.myFlagged).toBe(true);
  });
});

describe("community hint pool", () => {
  /** The top-ranked in-game hint a still-guessing player would see (if any). */
  async function inGameHint(cookie: string) {
    const state = await getGameState(cookie);
    return state.hints.find((h) => h.kind === "community");
  }

  it("shows a solver's hint to another player still guessing, right away", async () => {
    await win("author");
    await submitHint("author", GOOD_HINT);

    // A different player, no guesses yet, sees it immediately — same cycle.
    const hint = await inGameHint("player");
    expect(hint).toMatchObject({ kind: "community", text: GOOD_HINT, poolSize: 1 });
  });

  it("shows no hint before anyone has submitted one", async () => {
    expect(await inGameHint("player")).toBeUndefined();
  });

  it("surfaces the highest-scored hint and counts the whole pool", async () => {
    await win("a1");
    await submitHint("a1", GOOD_HINT);
    await win("a2");
    await submitHint("a2", HINT_B);

    // Upvote HINT_B so it outranks the (tied) GOOD_HINT.
    const hintB = (await getGameState("a1")).community!.hintPool.find(
      (h) => h.text === HINT_B,
    )!;
    await win("voter");
    await castVote("voter", "hint", hintB.id, "up");

    const hint = await inGameHint("player");
    expect(hint).toMatchObject({ text: HINT_B, poolSize: 2 });
  });

  it("excludes a hint once it's been removed by flags", async () => {
    await win("author");
    await submitHint("author", GOOD_HINT);
    const hintId = (await getGameState("author")).community!.hintPool[0].id;

    // Flag it to the auto-removal threshold from distinct solvers.
    for (let i = 0; i < FLAG_THRESHOLD; i++) {
      const c = `flag${i}`;
      await win(c);
      await castFlag(c, "hint", hintId);
    }

    expect(await inGameHint("player")).toBeUndefined();
    expect((await getGameState("author")).community!.hintPool).toHaveLength(0);
  });

  it("keeps showing a hint when the flag comes back around a later cycle", async () => {
    // Cycle 0: leave a hint for AAA.
    await win("author");
    await submitHint("author", GOOD_HINT);

    // Jump a full rotation so AAA is today again (cycle 1).
    setDay(FIXTURE_COUNT); // dayIndex 6 → cycleIndex 0 (AAA), cycle 1
    expect(await inGameHint("player")).toMatchObject({ text: GOOD_HINT });
  });
});
