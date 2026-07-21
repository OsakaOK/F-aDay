import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  FIXTURES,
  resetMutable,
  setDay,
  setupTestDb,
} from "./helpers/db";
import { getCountryOptions, getGameState, submitGuess } from "@/lib/game";
import type { DrizzleDb } from "@/db";

let db: DrizzleDb;

beforeAll(async () => {
  db = await setupTestDb();
});

beforeEach(async () => {
  await resetMutable(db);
  setDay(0); // day 0 → answer is FIXTURES[0] (Alphaland), cycle 0
});

const ANSWER = FIXTURES[0]; // AAA / Alphaland

describe("country options", () => {
  it("returns every country, sorted by name", async () => {
    const options = await getCountryOptions();
    expect(options).toHaveLength(FIXTURES.length);
    expect(options[0].name).toBe("Alphaland");
    expect(options.map((o) => o.name)).toEqual([
      "Alphaland",
      "Betamar",
      "Deltebre",
      "Epsilonia",
      "Gammadia",
      "Zetavia",
    ]);
  });
});

describe("fresh game state", () => {
  it("is playing with no guesses, hints, or answer", async () => {
    const state = await getGameState("p1");
    expect(state.status).toBe("playing");
    expect(state.guesses).toEqual([]);
    expect(state.hints).toEqual([]);
    expect(state.answer).toBeUndefined();
    expect(state.community).toBeUndefined();
    expect(state.flagUrl).toBe(ANSWER.flagUrl);
    expect(state.maxGuesses).toBe(3);
  });
});

describe("guessing and hints", () => {
  it("reveals the region hint after the first wrong guess", async () => {
    const state = await submitGuess("p1", "BBB");
    expect(state.status).toBe("playing");
    expect(state.guesses).toHaveLength(1);
    expect(state.guesses[0]).toMatchObject({ cca3: "BBB", correct: false });
    expect(state.hints).toHaveLength(1);
    expect(state.hints[0]).toMatchObject({ level: 1, kind: "region" });
    expect(state.hints[0].text).toContain("Northern Europe");
  });

  it("reveals an auto hint (capital) after the second wrong guess when no pool exists", async () => {
    await submitGuess("p1", "BBB");
    const state = await submitGuess("p1", "CCC");
    expect(state.hints).toHaveLength(2);
    const hint2 = state.hints.find((h) => h.level === 2)!;
    expect(hint2.kind).toBe("auto");
    expect(hint2.text).toContain("Alphaville"); // AAA's capital
  });

  it("reconstructs revealed hints on a fresh state load (persistence)", async () => {
    await submitGuess("p1", "BBB");
    await submitGuess("p1", "CCC");
    const reloaded = await getGameState("p1");
    expect(reloaded.status).toBe("playing");
    expect(reloaded.hints).toHaveLength(2);
  });

  it("rejects a code that is not a real country", async () => {
    await expect(submitGuess("p1", "ZZZ")).rejects.toMatchObject({
      code: "invalid_country",
    });
  });

  it("rejects guessing the same country twice", async () => {
    await submitGuess("p1", "BBB");
    await expect(submitGuess("p1", "BBB")).rejects.toMatchObject({
      code: "already_guessed",
    });
  });
});

describe("winning", () => {
  it("wins, reveals the answer, baseline facts, and community section", async () => {
    await submitGuess("p1", "BBB");
    const state = await submitGuess("p1", "AAA");
    expect(state.status).toBe("won");
    expect(state.answer?.name).toBe("Alphaland");
    expect(state.baselineFacts?.length).toBeGreaterThan(0);
    expect(state.community).toBeDefined();
    expect(state.community?.canParticipateHints).toBe(true);
    expect(state.community?.canParticipateFacts).toBe(true);
  });

  it("reveals no hints when won on the first guess", async () => {
    const state = await submitGuess("p1", "AAA");
    expect(state.status).toBe("won");
    expect(state.hints).toHaveLength(0);
  });

  it("locks the puzzle once finished", async () => {
    await submitGuess("p1", "AAA");
    await expect(submitGuess("p1", "BBB")).rejects.toMatchObject({
      code: "already_finished",
    });
  });
});

describe("losing", () => {
  it("loses after three wrong guesses and reveals the answer", async () => {
    await submitGuess("p1", "BBB");
    await submitGuess("p1", "CCC");
    const state = await submitGuess("p1", "DDD");
    expect(state.status).toBe("lost");
    expect(state.guesses).toHaveLength(3);
    expect(state.answer?.name).toBe("Alphaland");
    // Losers can add fun facts but not hints.
    expect(state.community?.canParticipateHints).toBe(false);
    expect(state.community?.canParticipateFacts).toBe(true);
  });
});

describe("shared daily puzzle", () => {
  it("gives every player the same flag on a given day", async () => {
    const a = await getGameState("player-a");
    const b = await getGameState("player-b");
    expect(a.flagUrl).toBe(b.flagUrl);
    expect(a.flagUrl).toBe(ANSWER.flagUrl);
  });

  it("changes the answer on a different day", async () => {
    const day0 = await getGameState("p1");
    setDay(1); // → FIXTURES[1] (Betamar)
    const day1 = await getGameState("p1");
    expect(day1.flagUrl).not.toBe(day0.flagUrl);
    expect(day1.flagUrl).toBe(FIXTURES[1].flagUrl);
  });
});
