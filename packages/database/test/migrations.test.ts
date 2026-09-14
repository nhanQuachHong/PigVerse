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
      "0006_create_publication_inclusions.sql",
      "0007_create_mint_activity.sql",
      "0008_create_owner_control_inclusions.sql",
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

  it("records idempotent publication inclusions without claiming finality", async () => {
    const source = await readFile(
      new URL(
        "../migrations/0006_create_publication_inclusions.sql",
        import.meta.url,
      ),
      "utf8",
    );

    expect(source).toContain("transaction_hash char(66) PRIMARY KEY");
    expect(source).toContain(
      "UNIQUE (deployment_key, token_id, observed_publication_revision)",
    );
    expect(source).toContain("block_hash char(66) NOT NULL");
    expect(source).toContain(
      "observed_publication_revision = expected_publication_revision + 1",
    );
    expect(source).toContain("do not imply finality");
  });

  it("deduplicates rebuildable mint activity without becoming ownership truth", async () => {
    const source = await readFile(
      new URL("../migrations/0007_create_mint_activity.sql", import.meta.url),
      "utf8",
    );

    expect(source).toContain("UNIQUE (deployment_key, transaction_hash)");
    expect(source).toContain("mint_activity_transfer_event_idx");
    expect(source).toContain(
      "observed_status IN ('PENDING', 'SUCCEEDED', 'REVERTED', 'UNKNOWN')",
    );
    expect(source).toContain("observed_status = 'SUCCEEDED'");
    expect(source).toContain("observed_owner_wallet IS NOT NULL");
    expect(source).toContain("Current chain ownership remains authoritative");
  });

  it("records idempotent Owner control inclusions with action-specific evidence", async () => {
    const source = await readFile(
      new URL(
        "../migrations/0008_create_owner_control_inclusions.sql",
        import.meta.url,
      ),
      "utf8",
    );

    expect(source).toContain("PRIMARY KEY (deployment_key, transaction_hash)");
    expect(source).toContain(
      "action IN ('PAUSE', 'UNPAUSE', 'SET_MINT_PRICE', 'WITHDRAW')",
    );
    expect(source).toContain("action = 'SET_MINT_PRICE'");
    expect(source).toContain("new_mint_price IS NOT NULL");
    expect(source).toContain("action = 'WITHDRAW'");
    expect(source).toContain("withdrawn_amount IS NOT NULL");
    expect(source).toContain("inclusion does not imply product finality");
  });
});
