import { describe, expect, it } from "vitest";
import { MAX_LEN, MIN_LEN, validateSubmission } from "@/lib/validation";
import { makeCountry } from "./helpers/country";

const country = makeCountry();

describe("validateSubmission", () => {
  it("accepts a clean submission and returns normalized text", () => {
    const result = validateSubmission("A lovely northern country by the sea.", country);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text).toBe("A lovely northern country by the sea.");
  });

  it("collapses runs of whitespace", () => {
    const result = validateSubmission("This   has    extra   spaces.", country);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text).toBe("This has extra spaces.");
  });

  it(`rejects text shorter than ${MIN_LEN} characters`, () => {
    const result = validateSubmission("tiny", country);
    expect(result).toMatchObject({ ok: false });
  });

  it(`rejects text longer than ${MAX_LEN} characters`, () => {
    const result = validateSubmission("x".repeat(MAX_LEN + 1), country);
    expect(result).toMatchObject({ ok: false });
  });

  it("rejects URLs and links", () => {
    for (const bad of [
      "check this http://example.com out",
      "visit www.example.com now",
      "see example.com for details",
    ]) {
      expect(validateSubmission(bad, country)).toMatchObject({ ok: false });
    }
  });

  it("rejects banned words", () => {
    const result = validateSubmission("this is total shit honestly here", country);
    expect(result).toMatchObject({ ok: false });
  });

  it("rejects text that leaks the country name (giveaway)", () => {
    const result = validateSubmission("The country Alphaland is beautiful.", country);
    expect(result).toMatchObject({ ok: false });
  });

  it("rejects text that leaks a known alias", () => {
    const result = validateSubmission("Some call this place Alfaland by the sea.", country);
    expect(result).toMatchObject({ ok: false });
  });

  it("is case-insensitive about the giveaway check", () => {
    const result = validateSubmission("Welcome to ALPHALAND, traveller.", country);
    expect(result).toMatchObject({ ok: false });
  });
});
