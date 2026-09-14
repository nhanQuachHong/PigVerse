import type { Sql } from "postgres";
import { describe, expect, it, vi } from "vitest";

import type { PublicationInclusion } from "./publication-inclusion";
import { PostgresPublicationInclusionStore } from "./publication-inclusion-store";

const inclusion: PublicationInclusion = {
  action: "publish",
  actorWallet: "0x1111111111111111111111111111111111111111",
  blockHash: `0x${"b".repeat(64)}`,
  blockNumber: 2748n,
  correlationId: "correlation-1",
  deploymentKey: "genesis:base-sepolia:84532",
  expectedPublicationRevision: 4n,
  metadataIpfsUri: "ipfs://bafyfixture/metadata.json",
  observedPublicationRevision: 5n,
  observedTokenState: "unminted",
  tokenId: 3,
  transactionHash: `0x${"a".repeat(64)}`,
};

const candidate = {
  asset_status: "COMPLETE",
  content_id: "7",
  content_revision: 2,
  lifecycle_state: "READY",
  metadata_ipfs_uri: inclusion.metadataIpfsUri,
};

const existing = {
  action: "PUBLISH",
  actor_wallet: inclusion.actorWallet,
  block_hash: inclusion.blockHash,
  block_number: inclusion.blockNumber.toString(),
  content_id: "7",
  content_revision: 2,
  deployment_key: inclusion.deploymentKey,
  expected_publication_revision:
    inclusion.expectedPublicationRevision.toString(),
  metadata_ipfs_uri: inclusion.metadataIpfsUri,
  observed_publication_revision:
    inclusion.observedPublicationRevision.toString(),
  observed_token_state: "UNMINTED",
  resulting_lifecycle: "PUBLISHED",
  token_id: 3,
  transaction_hash: inclusion.transactionHash,
};

function sqlHarness({
  candidateRows = [candidate],
  existingRows = [] as unknown[],
  insertedRows = [{ transaction_hash: inclusion.transactionHash }],
}: {
  candidateRows?: unknown[];
  existingRows?: unknown[];
  insertedRows?: unknown[];
} = {}) {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const query = vi.fn(
    async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const text = strings.join("?").replace(/\s+/gu, " ").trim();
      calls.push({ text, values });
      if (text.includes("FROM publication_inclusions")) return existingRows;
      if (text.includes("FROM nft_contents c")) return candidateRows;
      if (text.startsWith("INSERT INTO publication_inclusions"))
        return insertedRows;
      return [];
    },
  );
  const transaction = Object.assign(query, {
    json: vi.fn((value: unknown) => value),
  }) as unknown as Sql;
  const sql = Object.assign(query, {
    begin: vi.fn(
      async (callback: (transactionClient: Sql) => Promise<unknown>) =>
        callback(transaction),
    ),
  }) as unknown as Sql;
  return { calls, json: transaction.json, sql };
}

describe("Postgres publication inclusion store", () => {
  it("atomically records one inclusion, lifecycle update and append-only audit", async () => {
    const harness = sqlHarness();
    const store = new PostgresPublicationInclusionStore(harness.sql);

    await expect(store.recordInclusion(inclusion)).resolves.toEqual({
      contentId: "7",
      contentRevision: 2,
      lifecycleState: "PUBLISHED",
      status: "applied",
    });
    expect(harness.calls[0]?.text).toContain("pg_advisory_xact_lock");
    expect(
      harness.calls.some(
        ({ text, values }) =>
          text.startsWith("UPDATE nft_contents") &&
          values.includes("PUBLISHED"),
      ),
    ).toBe(true);
    expect(
      harness.calls.some(
        ({ text, values }) =>
          text.startsWith("INSERT INTO audit_events") &&
          values.includes("NFT_PUBLISHED"),
      ),
    ).toBe(true);
    expect(harness.json).toHaveBeenCalledWith(
      expect.objectContaining({
        finality: "included",
        transactionHash: inclusion.transactionHash,
      }),
    );
  });

  it("returns an exact duplicate without repeating lifecycle or audit writes", async () => {
    const harness = sqlHarness({ existingRows: [existing] });
    const store = new PostgresPublicationInclusionStore(harness.sql);

    await expect(store.recordInclusion(inclusion)).resolves.toEqual({
      contentId: "7",
      contentRevision: 2,
      lifecycleState: "PUBLISHED",
      status: "duplicate",
    });
    expect(
      harness.calls.some(({ text }) => text.includes("FROM nft_contents c")),
    ).toBe(false);
    expect(
      harness.calls.some(({ text }) =>
        text.startsWith("INSERT INTO audit_events"),
      ),
    ).toBe(false);
  });

  it("rejects a reused hash or publication revision with different evidence", async () => {
    const reused = sqlHarness({
      existingRows: [{ ...existing, block_hash: `0x${"c".repeat(64)}` }],
    });
    await expect(
      new PostgresPublicationInclusionStore(reused.sql).recordInclusion(
        inclusion,
      ),
    ).resolves.toEqual({ status: "conflict" });

    const revisionConflict = sqlHarness({ insertedRows: [] });
    await expect(
      new PostgresPublicationInclusionStore(
        revisionConflict.sql,
      ).recordInclusion(inclusion),
    ).resolves.toEqual({ status: "conflict" });
  });

  it("requires exact COMPLETE current content and metadata", async () => {
    for (const invalidCandidate of [
      { ...candidate, asset_status: "ERROR" },
      { ...candidate, lifecycle_state: "DRAFT" },
      { ...candidate, metadata_ipfs_uri: "ipfs://different" },
    ]) {
      const harness = sqlHarness({ candidateRows: [invalidCandidate] });
      await expect(
        new PostgresPublicationInclusionStore(harness.sql).recordInclusion(
          inclusion,
        ),
      ).resolves.toEqual({ status: "conflict" });
      expect(
        harness.calls.some(({ text }) =>
          text.startsWith("INSERT INTO publication_inclusions"),
        ),
      ).toBe(false);
    }
  });

  it("locks content when a publish inclusion is followed by an on-chain mint", async () => {
    const harness = sqlHarness();
    const store = new PostgresPublicationInclusionStore(harness.sql);

    await expect(
      store.recordInclusion({ ...inclusion, observedTokenState: "minted" }),
    ).resolves.toMatchObject({ lifecycleState: "MINTED_LOCKED" });
    expect(
      harness.calls.some(
        ({ text, values }) =>
          text.startsWith("UPDATE nft_contents") &&
          values.includes("MINTED_LOCKED"),
      ),
    ).toBe(true);
  });

  it("rejects malformed evidence before opening a database transaction", async () => {
    const harness = sqlHarness();
    const store = new PostgresPublicationInclusionStore(harness.sql);

    await expect(
      store.recordInclusion({
        ...inclusion,
        observedPublicationRevision: 7n,
      }),
    ).rejects.toThrow("Invalid publication inclusion");
    expect(harness.sql.begin).not.toHaveBeenCalled();
  });
});
