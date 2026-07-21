import type { Country } from "@/db/schema";

/** Builds a complete Country for pure-unit tests, with sensible defaults. */
export function makeCountry(overrides: Partial<Country> = {}): Country {
  return {
    id: "00000000-0000-0000-0000-000000000000",
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
    ...overrides,
  };
}
