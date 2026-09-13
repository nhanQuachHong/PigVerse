import { describe, expect, it, vi } from "vitest";
import type { Sql } from "postgres";

import { PostgresAssetPackageStore } from "./asset-package-store";
import type { AssetPackage } from "./asset-pipeline";
import type { ContentLifecycle } from "./admin-content-store";

type Row = {
  artwork_backup_ref: string | null;
  artwork_ipfs_uri: string | null;
  artwork_sha256: string | null;
  checkpoint_version: number;
  content_id: string;
  content_revision: number;
  metadata_backup_ref: string | null;
  metadata_ipfs_uri: string | null;
  metadata_sha256: string | null;
  safe_error_code: string | null;
  status: string;
  token_id: number;
};

const hashA = "a".repeat(64);
const hashB = "b".repeat(64);

function row(overrides: Partial<Row> = {}): Row {
  return {
    artwork_backup_ref: null,
    artwork_ipfs_uri: null,
    artwork_sha256: null,
    checkpoint_version: 0,
    content_id: "7",
    content_revision: 2,
    metadata_backup_ref: null,
    metadata_ipfs_uri: null,
    metadata_sha256: null,
    safe_error_code: null,
    status: "PENDING",
    token_id: 3,
    ...overrides,
  };
}

function assetPackage(overrides: Partial<AssetPackage> = {}): AssetPackage {
  return {
    artworkBackupRef: "backup:artwork",
    artworkIpfsUri: "ipfs://bafyartwork",
    artworkSha256: hashA,
    checkpointVersion: 3,
    contentId: "7",
    contentRevision: 2,
    metadataBackupRef: null,
    metadataIpfsUri: "ipfs://bafymetadata",
    metadataSha256: hashB,
    safeErrorCode: null,
    status: "METADATA_STORED",
    tokenId: 3,
    ...overrides,
  };
}

function sqlHarness({
  current = row(),
  lifecycle = "DRAFT",
  updated = current,
}: {
  current?: Row | null;
  lifecycle?: ContentLifecycle;
  updated?: Row | null;
} = {}) {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const query = vi.fn(
    async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const text = strings.join("?").replace(/\s+/gu, " ").trim();
      calls.push({ text, values });
      if (text.startsWith("SELECT token_id, lifecycle_state"))
        return current ? [{ lifecycle_state: lifecycle, token_id: 3 }] : [];
      if (text.startsWith("SELECT ap.content_id"))
        return current ? [current] : [];
      if (text.startsWith("UPDATE asset_packages"))
        return updated ? [updated] : [];
      return [];
    },
  );
  const sql = Object.assign(query, {
    begin: vi.fn(async (callback: (transaction: Sql) => Promise<unknown>) =>
      callback(query as unknown as Sql),
    ),
  }) as unknown as Sql;
  return { calls, sql };
}

describe("Postgres asset package store", () => {
  it("creates a revision-bound package and marks its current content processing", async () => {
    const harness = sqlHarness();
    const store = new PostgresAssetPackageStore(harness.sql);

    await expect(
      store.loadOrCreate({ contentId: "7", contentRevision: 2, tokenId: 3 }),
    ).resolves.toMatchObject({
      checkpointVersion: 0,
      contentId: "7",
      contentRevision: 2,
      status: "PENDING",
      tokenId: 3,
    });
    expect(
      harness.calls.some(({ text }) =>
        text.includes("ON CONFLICT (content_id, content_revision) DO NOTHING"),
      ),
    ).toBe(true);
    expect(
      harness.calls.some(({ text }) =>
        text.includes("SET lifecycle_state = 'PROCESSING_ASSETS'"),
      ),
    ).toBe(true);
  });

  it("rejects a missing or non-current content binding before creating a package", async () => {
    const harness = sqlHarness({ current: null });
    const store = new PostgresAssetPackageStore(harness.sql);

    await expect(
      store.loadOrCreate({ contentId: "7", contentRevision: 2, tokenId: 3 }),
    ).rejects.toThrow("content binding is unavailable");
    expect(
      harness.calls.some(({ text }) => text.startsWith("INSERT INTO")),
    ).toBe(false);
  });

  it("atomically advances a complete checkpoint and content to READY", async () => {
    const current = row({
      artwork_backup_ref: "backup:artwork",
      artwork_ipfs_uri: "ipfs://bafyartwork",
      artwork_sha256: hashA,
      checkpoint_version: 3,
      metadata_ipfs_uri: "ipfs://bafymetadata",
      metadata_sha256: hashB,
      status: "METADATA_STORED",
    });
    const updated = row({
      ...current,
      checkpoint_version: 4,
      metadata_backup_ref: "backup:metadata",
      status: "COMPLETE",
    });
    const harness = sqlHarness({
      current,
      lifecycle: "PROCESSING_ASSETS",
      updated,
    });
    const store = new PostgresAssetPackageStore(harness.sql);

    await expect(
      store.save(
        assetPackage({
          metadataBackupRef: "backup:metadata",
          status: "COMPLETE",
        }),
      ),
    ).resolves.toMatchObject({ checkpointVersion: 4, status: "COMPLETE" });
    const lifecycleUpdate = harness.calls.find(({ text }) =>
      text.startsWith("UPDATE nft_contents"),
    );
    expect(lifecycleUpdate?.values).toContain("READY");
    expect(
      harness.calls.some(({ text }) =>
        text.includes("checkpoint_version = checkpoint_version + 1"),
      ),
    ).toBe(true);
  });

  it("rejects stale versions, checkpoint rewinds and changed durable references", async () => {
    const current = row({
      artwork_backup_ref: "backup:artwork",
      artwork_ipfs_uri: "ipfs://bafyartwork",
      artwork_sha256: hashA,
      checkpoint_version: 3,
      metadata_ipfs_uri: "ipfs://bafymetadata",
      metadata_sha256: hashB,
      status: "METADATA_STORED",
    });
    const harness = sqlHarness({ current, lifecycle: "PROCESSING_ASSETS" });
    const store = new PostgresAssetPackageStore(harness.sql);

    await expect(
      store.save(assetPackage({ checkpointVersion: 2 })),
    ).rejects.toThrow("checkpoint conflict");
    await expect(
      store.save(
        assetPackage({
          artworkIpfsUri: "ipfs://different",
          status: "BACKUP_STORED",
        }),
      ),
    ).rejects.toThrow("checkpoint conflict");
    expect(
      harness.calls.some(({ text }) =>
        text.startsWith("UPDATE asset_packages"),
      ),
    ).toBe(false);
  });

  it("maps a minted race to MINTED_LOCKED without persisting unsafe diagnostics", async () => {
    const current = row({
      artwork_backup_ref: "backup:artwork",
      artwork_ipfs_uri: "ipfs://bafyartwork",
      artwork_sha256: hashA,
      checkpoint_version: 3,
      metadata_ipfs_uri: "ipfs://bafymetadata",
      metadata_sha256: hashB,
      status: "METADATA_STORED",
    });
    const updated = row({
      ...current,
      checkpoint_version: 4,
      safe_error_code: "TOKEN_ALREADY_MINTED",
      status: "ERROR",
    });
    const harness = sqlHarness({ current, updated });
    const store = new PostgresAssetPackageStore(harness.sql);

    await store.save(
      assetPackage({
        safeErrorCode: "TOKEN_ALREADY_MINTED",
        status: "ERROR",
      }),
    );
    const lifecycleUpdate = harness.calls.find(({ text }) =>
      text.startsWith("UPDATE nft_contents"),
    );
    expect(lifecycleUpdate?.values).toContain("MINTED_LOCKED");
    expect(JSON.stringify(harness.calls)).not.toContain("database unavailable");
  });

  it("rejects malformed complete packages before opening a transaction", async () => {
    const harness = sqlHarness();
    const store = new PostgresAssetPackageStore(harness.sql);

    await expect(
      store.save(assetPackage({ metadataBackupRef: null, status: "COMPLETE" })),
    ).rejects.toThrow("Invalid asset package checkpoint");
    expect(harness.sql.begin).not.toHaveBeenCalled();
  });
});
