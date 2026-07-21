import path from "node:path";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

/**
 * Database access layer with a runtime-selected driver:
 *
 *  - Production (Vercel): if `DATABASE_URL` is set, use node-postgres against a
 *    real Postgres (Supabase / Neon).
 *  - Local development: fall back to PGlite, an embedded Postgres (WASM) that
 *    persists to ./.pglite — no external service or credentials required.
 *
 * Both drivers speak the same Drizzle query API. We expose a single concrete
 * type (node-postgres) so callers — and Drizzle's query-builder generics — are
 * driver-agnostic; the PGlite instance is structurally compatible for our usage.
 */

export type DrizzleDb = NodePgDatabase<typeof schema>;

const PGLITE_DIR = path.join(process.cwd(), ".pglite");

async function createDb(): Promise<DrizzleDb> {
  const url = process.env.DATABASE_URL;

  if (url) {
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: url });
    return drizzle(pool, { schema });
  }

  const { drizzle } = await import("drizzle-orm/pglite");
  const { PGlite } = await import("@electric-sql/pglite");
  const client = new PGlite(PGLITE_DIR);
  await client.waitReady;
  return drizzle(client, { schema }) as unknown as DrizzleDb;
}

// Cache the connection across hot reloads / serverless invocations.
const globalForDb = globalThis as unknown as {
  __dbPromise?: Promise<DrizzleDb>;
};

export function getDb(): Promise<DrizzleDb> {
  if (!globalForDb.__dbPromise) {
    globalForDb.__dbPromise = createDb();
  }
  return globalForDb.__dbPromise;
}

export { schema };
