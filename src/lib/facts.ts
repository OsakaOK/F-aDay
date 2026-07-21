import type { Country } from "@/db/schema";
import { formatArea, formatPopulation } from "./format";

/**
 * Baseline fun facts derived purely from structured country data. Always present
 * (no cold-start gap); community facts supplement but never replace these.
 */
export function baselineFacts(c: Country): string[] {
  const facts: string[] = [];

  if (c.capital) facts.push(`The capital is ${c.capital}.`);
  if (c.population != null)
    facts.push(`It has a population of about ${formatPopulation(c.population)}.`);
  if (c.subregion) facts.push(`It's located in ${c.subregion}.`);
  else if (c.region) facts.push(`It's located in ${c.region}.`);

  if (c.languages.length === 1) {
    facts.push(`The primary language is ${c.languages[0]}.`);
  } else if (c.languages.length > 1) {
    facts.push(`Languages spoken include ${listToProse(c.languages)}.`);
  }

  if (c.currencies.length > 0) {
    facts.push(
      c.currencies.length === 1
        ? `Its currency is the ${c.currencies[0]}.`
        : `Its currencies include ${listToProse(c.currencies)}.`,
    );
  }

  if (c.area != null) facts.push(`It covers an area of ${formatArea(c.area)}.`);

  if (c.borders.length === 0) {
    facts.push("It has no land borders.");
  } else {
    facts.push(
      `It shares land borders with ${c.borders.length} ${
        c.borders.length === 1 ? "country" : "countries"
      }.`,
    );
  }

  return facts;
}

/**
 * Auto-generated fallback for Hint 2 when no previous-cycle community hint pool
 * exists (a country's first-ever cycle). Prefers capital, then population.
 */
export function autoHint(c: Country): string {
  if (c.capital) return `Its capital city is ${c.capital}.`;
  if (c.population != null)
    return `Its population is about ${formatPopulation(c.population)}.`;
  if (c.subregion) return `It's located in ${c.subregion}.`;
  if (c.region) return `It's located in ${c.region}.`;
  return "This one's a mystery — no extra hint available.";
}

function listToProse(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
