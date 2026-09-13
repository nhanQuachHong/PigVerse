import postgres, { type Sql } from "postgres";

let sharedSql: Sql | undefined;

export function getDatabase(): Sql {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("Database is unavailable");
  sharedSql ??= postgres(databaseUrl, {
    connect_timeout: 5,
    idle_timeout: 20,
    max: 5,
  });
  return sharedSql;
}
