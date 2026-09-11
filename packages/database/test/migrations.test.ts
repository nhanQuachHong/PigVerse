import { describe, expect, it } from "vitest";

import { listMigrationFiles } from "../src/migrations";

describe("database migration foundation", () => {
  it("discovers ordered, uniquely-prefixed migrations", async () => {
    const files = await listMigrationFiles(
      new URL("../migrations/", import.meta.url),
    );

    expect(files).toEqual(["0001_create_collection_deployments.sql"]);
  });
});
