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
      "0004_add_asset_integrity.sql",
      "0005_add_asset_checkpoint_version.sql",
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

  it("requires byte-integrity hashes on complete asset packages", async () => {
    const source = await readFile(
      new URL("../migrations/0004_add_asset_integrity.sql", import.meta.url),
      "utf8",
    );

    expect(source).toContain("artwork_sha256 char(64)");
    expect(source).toContain("metadata_sha256 char(64)");
    expect(source).toContain("asset_packages_complete_hashes");
    expect(source).toContain("status <> 'COMPLETE' OR");
  });

  it("versions asset checkpoints for safe concurrent retries", async () => {
    const source = await readFile(
      new URL(
        "../migrations/0005_add_asset_checkpoint_version.sql",
        import.meta.url,
      ),
      "utf8",
    );

    expect(source).toContain("checkpoint_version integer NOT NULL DEFAULT 0");
    expect(source).toContain("checkpoint_version >= 0");
  });
});
