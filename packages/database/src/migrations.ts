import { readdir } from "node:fs/promises";

const migrationPattern = /^\d{4}_[a-z0-9_]+\.sql$/u;

export async function listMigrationFiles(directory: URL): Promise<string[]> {
  const filenames = (await readdir(directory)).filter((filename) =>
    filename.endsWith(".sql"),
  );

  for (const filename of filenames) {
    if (!migrationPattern.test(filename)) {
      throw new Error(`Invalid migration filename: ${filename}`);
    }
  }

  const ordered = [...filenames].sort();
  if (
    new Set(ordered.map((filename) => filename.slice(0, 4))).size !==
    ordered.length
  ) {
    throw new Error("Migration numeric prefixes must be unique");
  }

  return ordered;
}
