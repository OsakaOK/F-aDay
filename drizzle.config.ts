import type { Config } from "drizzle-kit";

// Drizzle Kit only needs the dialect + schema to generate SQL migrations.
// The actual connection (PGlite locally, node-postgres in prod) is chosen at
// runtime in src/db/index.ts, so no live credentials are required to generate.
export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
} satisfies Config;
