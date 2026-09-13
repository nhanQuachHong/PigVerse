import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { listMigrationFiles } from "../src/migrations";

describe("database migration foundation", () => {
  it("discovers ordered, uniquely-prefixed migrations", async () => {
    const files = await listMigrationFiles(
      new URL("../migrations/", import.meta.url),
    );

    expect(files).toEqual([
      "0001_create_collection_deployments.sql",
      "0002_create_admin_auth.sql",
      "0003_create_genesis_content.sql",
    ]);
  });

  it("encodes Genesis content, durability and audit invariants", async () => {
    const source = await readFile(
      new URL("../migrations/0003_create_genesis_content.sql", import.meta.url),
      "utf8",
    );

    expect(source).toMatch(/token_id BETWEEN 1 AND 10/g);
    expect(source).toContain("UNIQUE (deployment_key, token_id, revision)");
    expect(source).toContain("nft_contents_current_slot_idx");
    expect(source).toContain("WHERE is_current");
    expect(source).toContain("status <> 'COMPLETE' OR");
    expect(source).toContain("metadata_backup_ref IS NOT NULL");
    expect(source).toContain("CREATE TABLE audit_events");
    expect(source).not.toMatch(/owner_address|ownership_status/);
  });
});
