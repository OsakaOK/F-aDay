/** Human-friendly population/number, e.g. 68720337 → "68.7 million". */
export function formatPopulation(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} billion`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} million`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)},000`;
  return n.toLocaleString("en-US");
}

/** Area in km² with thousands separators, e.g. "551,695 km²". */
export function formatArea(n: number): string {
  return `${n.toLocaleString("en-US")} km²`;
}
