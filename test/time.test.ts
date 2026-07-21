import { beforeEach, describe, expect, it } from "vitest";
import { daysSinceEpoch, MS_PER_DAY, nextUtcMidnight } from "@/lib/time";

beforeEach(() => {
  delete process.env.FADAY_DAY_OVERRIDE;
});

describe("daysSinceEpoch", () => {
  it("floors epoch milliseconds to whole UTC days", () => {
    expect(daysSinceEpoch(MS_PER_DAY * 100)).toBe(100);
    expect(daysSinceEpoch(MS_PER_DAY * 100 + 5)).toBe(100);
    expect(daysSinceEpoch(MS_PER_DAY * 101 - 1)).toBe(100);
  });

  it("honours FADAY_DAY_OVERRIDE outside production", () => {
    process.env.FADAY_DAY_OVERRIDE = "20905";
    expect(daysSinceEpoch(MS_PER_DAY * 100)).toBe(20905);
  });
});

describe("nextUtcMidnight", () => {
  it("returns the start of the following UTC day", () => {
    const now = MS_PER_DAY * 100 + 12_345;
    expect(nextUtcMidnight(now)).toBe(MS_PER_DAY * 101);
  });

  it("is always in the future relative to now", () => {
    const now = MS_PER_DAY * 100 + 1;
    expect(nextUtcMidnight(now)).toBeGreaterThan(now);
  });
});
