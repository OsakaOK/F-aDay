import path from "node:path";

/**
 * Applies generated SQL migrations from ./drizzle using the driver that matches
 * the current environment (node-postgres if DATABASE_URL is set, else PGlite).
 * Run with: npm run db:migrate
 */
async function main() {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  const url = process.env.DATABASE_URL;

  if (url) {
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: url });
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder });
    await pool.end();
    console.log("Migrations applied (node-postgres).");
    return;
  }

  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const { PGlite } = await import("@electric-sql/pglite");
  const client = new PGlite(path.join(process.cwd(), ".pglite"));
  await client.waitReady;
  const db = drizzle(client);
  await migrate(db, { migrationsFolder });
  await client.close();
  console.log("Migrations applied (PGlite → ./.pglite).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
