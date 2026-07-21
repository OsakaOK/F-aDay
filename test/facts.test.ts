import { describe, expect, it } from "vitest";
import { autoHint, baselineFacts } from "@/lib/facts";
import { makeCountry } from "./helpers/country";

describe("baselineFacts", () => {
  it("includes capital, population, region, language, currency, area", () => {
    const facts = baselineFacts(makeCountry());
    expect(facts.some((f) => f.includes("Alphaville"))).toBe(true);
    expect(facts.some((f) => f.includes("1.0 million"))).toBe(true);
    expect(facts.some((f) => f.includes("Northern Europe"))).toBe(true);
    expect(facts.some((f) => f.includes("Alphish"))).toBe(true);
    expect(facts.some((f) => f.includes("Alpha Dollar"))).toBe(true);
  });

  it("states when a country has no land borders", () => {
    const facts = baselineFacts(makeCountry({ borders: [] }));
    expect(facts).toContain("It has no land borders.");
  });

  it("uses the singular for a single border", () => {
    const facts = baselineFacts(makeCountry({ borders: ["BBB"] }));
    expect(facts.some((f) => f.includes("1 country"))).toBe(true);
  });

  it("omits facts for missing data without crashing", () => {
    const facts = baselineFacts(
      makeCountry({
        capital: null,
        population: null,
        area: null,
        languages: [],
        currencies: [],
      }),
    );
    expect(facts.every((f) => !f.includes("capital"))).toBe(true);
    expect(Array.isArray(facts)).toBe(true);
  });
});

describe("autoHint", () => {
  it("prefers the capital city", () => {
    expect(autoHint(makeCountry())).toContain("Alphaville");
  });

  it("falls back to population when there is no capital", () => {
    const hint = autoHint(makeCountry({ capital: null, population: 2_000_000 }));
    expect(hint).toContain("2.0 million");
  });

  it("falls back to region when there is no capital or population", () => {
    const hint = autoHint(
      makeCountry({ capital: null, population: null, subregion: "Polynesia" }),
    );
    expect(hint).toContain("Polynesia");
  });
});
