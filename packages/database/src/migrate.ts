import { readFile } from "node:fs/promises";

import postgres from "postgres";

import { listMigrationFiles } from "./migrations.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run migrations");
}

const sql = postgres(databaseUrl, { max: 1 });
const migrationsDirectory = new URL("../migrations/", import.meta.url);

try {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  const migrationFiles = await listMigrationFiles(migrationsDirectory);
  const appliedRows = await sql<
    { name: string }[]
  >`SELECT name FROM schema_migrations`;
  const applied = new Set(appliedRows.map(({ name }) => name));

  for (const filename of migrationFiles) {
    if (applied.has(filename)) continue;

    const source = await readFile(
      new URL(filename, migrationsDirectory),
      "utf8",
    );
    await sql.begin(async (transaction) => {
      await transaction.unsafe(source);
      await transaction`INSERT INTO schema_migrations (name) VALUES (${filename})`;
    });
    console.log(`Applied ${filename}`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
