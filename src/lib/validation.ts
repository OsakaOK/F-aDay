import type { Country } from "@/db/schema";

export const MIN_LEN = 8;
export const MAX_LEN = 240;

// Small starter blocklist. In production this would be a larger managed list;
// the point here is the enforcement path, not exhaustive coverage.
const BANNED_WORDS = [
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "nigger",
  "faggot",
  "retard",
  "rape",
];

const URL_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|co|xyz|ru)\b)/i;

export type ValidationResult = { ok: true; text: string } | { ok: false; reason: string };

/**
 * Baseline automatic filter applied at submission time (no admin step):
 *  - length bounds
 *  - banned-word / URL blocklist
 *  - rejects text that leaks the country's name or a known alias (answer giveaway)
 */
export function validateSubmission(raw: string, country: Country): ValidationResult {
  const text = raw.trim().replace(/\s+/g, " ");

  if (text.length < MIN_LEN) {
    return { ok: false, reason: `Too short — at least ${MIN_LEN} characters.` };
  }
  if (text.length > MAX_LEN) {
    return { ok: false, reason: `Too long — keep it under ${MAX_LEN} characters.` };
  }

  const lower = text.toLowerCase();

  if (URL_RE.test(lower)) {
    return { ok: false, reason: "Links aren't allowed." };
  }

  for (const w of BANNED_WORDS) {
    if (new RegExp(`\\b${w}\\b`, "i").test(lower)) {
      return { ok: false, reason: "That contains language we don't allow." };
    }
  }

  // Answer giveaway: reject if the text contains the country name or any alias.
  for (const alias of aliasesForMatch(country)) {
    if (alias.length >= 3 && lower.includes(alias)) {
      return {
        ok: false,
        reason: "That gives away the answer — don't mention the country's name.",
      };
    }
  }

  return { ok: true, text };
}

/** Country name aliases (already lowercased) worth matching, longest first. */
function aliasesForMatch(country: Country): string[] {
  const set = new Set<string>(country.aliases);
  set.add(country.name.toLowerCase());
  set.add(country.officialName.toLowerCase());
  // Drop very short/noisy aliases (2-letter codes) handled by the length guard.
  return [...set].sort((a, b) => b.length - a.length);
}
