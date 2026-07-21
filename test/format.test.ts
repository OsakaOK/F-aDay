import { describe, expect, it } from "vitest";
import { formatArea, formatPopulation } from "@/lib/format";

describe("formatPopulation", () => {
  it("formats billions and millions", () => {
    expect(formatPopulation(1_500_000_000)).toBe("1.5 billion");
    expect(formatPopulation(68_720_337)).toBe("68.7 million");
    expect(formatPopulation(1_000_000)).toBe("1.0 million");
  });

  it("formats thousands and small numbers", () => {
    expect(formatPopulation(40_126)).toBe("40,000");
    expect(formatPopulation(500)).toBe("500");
  });
});

describe("formatArea", () => {
  it("adds thousands separators and a km² suffix", () => {
    expect(formatArea(551_695)).toBe("551,695 km²");
    expect(formatArea(6)).toBe("6 km²");
  });
});
