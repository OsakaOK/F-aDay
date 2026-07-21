import { getDb } from "./index";
import { countries } from "./schema";
import { sql } from "drizzle-orm";

/**
 * Seeds the `countries` table from open data (no API key required):
 *   - mledoze/countries  → names, codes, capital, region, languages, borders…
 *     (this is the source dataset REST Countries itself is built from)
 *   - World Bank         → total population, joined on ISO3 (cca3)
 *   - flagcdn.com        → flag image URLs, derived from cca2 (no auth)
 *
 * The daily puzzle order is a fixed, deterministic Fisher-Yates shuffle over the
 * full dataset (seeded constant), assigned to `cycleIndex`. Re-running the seed
 * is idempotent: it upserts on cca3 and re-applies the same cycle order.
 */

const MLEDOZE_URL =
  "https://raw.githubusercontent.com/mledoze/countries/master/countries.json";
const WORLDBANK_URL =
  "https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&mrnev=1&per_page=400";

// Fixed seed → the shuffled sequence is stable across environments and re-seeds.
const SHUFFLE_SEED = 0x5f3a9c21;

type MledozeCountry = {
  name: {
    common: string;
    official: string;
    native?: Record<string, { official: string; common: string }>;
  };
  cca2: string;
  cca3: string;
  capital?: string[];
  region?: string;
  subregion?: string;
  area?: number;
  borders?: string[];
  languages?: Record<string, string>;
  currencies?: Record<string, { name: string; symbol?: string }>;
  altSpellings?: string[];
  translations?: Record<string, { official: string; common: string }>;
  flag?: string;
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic Fisher-Yates shuffle over a copy of `items`. */
function seededShuffle<T>(items: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function buildAliases(c: MledozeCountry): string[] {
  const set = new Set<string>();
  const add = (s?: string) => {
    if (s && s.trim()) set.add(s.trim().toLowerCase());
  };
  add(c.name.common);
  add(c.name.official);
  for (const n of Object.values(c.name.native ?? {})) {
    add(n.common);
    add(n.official);
  }
  for (const alt of c.altSpellings ?? []) add(alt);
  for (const tr of Object.values(c.translations ?? {})) {
    add(tr.common);
    add(tr.official);
  }
  return [...set];
}

async function main() {
  console.log("Fetching source datasets…");
  const [raw, wb] = await Promise.all([
    fetchJson<MledozeCountry[]>(MLEDOZE_URL),
    fetchJson<[unknown, Array<{ countryiso3code: string; value: number | null }>]>(
      WORLDBANK_URL,
    ),
  ]);

  const popByIso3 = new Map<string, number>();
  for (const row of wb[1] ?? []) {
    if (row.value != null && row.countryiso3code) {
      popByIso3.set(row.countryiso3code, row.value);
    }
  }

  // Sort by cca3 for a stable pre-shuffle input order, then shuffle deterministically.
  const sorted = [...raw].sort((a, b) => a.cca3.localeCompare(b.cca3));
  const shuffled = seededShuffle(sorted, SHUFFLE_SEED);

  const rows = shuffled.map((c, i) => {
    const cca2lower = c.cca2.toLowerCase();
    return {
      cca3: c.cca3,
      cca2: c.cca2,
      name: c.name.common,
      officialName: c.name.official,
      flagUrl: `https://flagcdn.com/w320/${cca2lower}.png`,
      flagEmoji: c.flag ?? "",
      capital: c.capital?.[0] ?? null,
      population: popByIso3.get(c.cca3) ?? null,
      region: c.region ?? null,
      subregion: c.subregion ?? null,
      area: c.area != null ? Math.round(c.area) : null,
      languages: Object.values(c.languages ?? {}),
      currencies: Object.values(c.currencies ?? {}).map((x) => x.name),
      borders: c.borders ?? [],
      aliases: buildAliases(c),
      cycleIndex: i,
    };
  });

  const db = await getDb();
  console.log(`Upserting ${rows.length} countries…`);

  // Upsert on cca3; refresh every field including the (re-derived) cycle order.
  for (const row of rows) {
    await db
      .insert(countries)
      .values(row)
      .onConflictDoUpdate({
        target: countries.cca3,
        set: {
          cca2: row.cca2,
          name: row.name,
          officialName: row.officialName,
          flagUrl: row.flagUrl,
          flagEmoji: row.flagEmoji,
          capital: row.capital,
          population: row.population,
          region: row.region,
          subregion: row.subregion,
          area: row.area,
          languages: row.languages,
          currencies: row.currencies,
          borders: row.borders,
          aliases: row.aliases,
          cycleIndex: row.cycleIndex,
        },
      });
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(countries);
  console.log(`Done. countries table now has ${count} rows.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
