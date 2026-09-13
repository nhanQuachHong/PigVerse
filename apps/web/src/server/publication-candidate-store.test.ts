import type { Sql } from "postgres";
import { describe, expect, it, vi } from "vitest";

import { PostgresPublicationCandidateStore } from "./publication-candidate-store";

function sqlReturning(rows: unknown[]) {
  const sql = vi.fn(async () => rows) as unknown as Sql;
  return { mock: sql as unknown as ReturnType<typeof vi.fn>, sql };
}

const complete = {
  asset_status: "COMPLETE",
  content_id: "7",
  content_revision: 2,
  lifecycle_state: "READY",
  metadata_ipfs_uri: "ipfs://bafyfixture/metadata.json",
  token_id: 3,
};

describe("Postgres publication candidate store", () => {
  it("loads only the current deployment-bound content and exact asset revision", async () => {
    const database = sqlReturning([complete]);
    const store = new PostgresPublicationCandidateStore(database.sql);

    await expect(
      store.loadCurrent("genesis:base-sepolia:84532", 3),
    ).resolves.toEqual({
      assetStatus: "COMPLETE",
      contentId: "7",
      contentRevision: 2,
      lifecycleState: "READY",
      metadataIpfsUri: "ipfs://bafyfixture/metadata.json",
      tokenId: 3,
    });
    const [strings, deploymentKey, tokenId] = database.mock.mock.calls[0] ?? [];
    const query = (strings as TemplateStringsArray).join(" ");
    expect(query).toContain("c.deployment_key =");
    expect(query).toContain("c.is_current");
    expect(query).toContain("ap.content_revision = c.revision");
    expect(deploymentKey).toBe("genesis:base-sepolia:84532");
    expect(tokenId).toBe(3);
  });

  it("preserves missing asset state and returns null for a missing draft", async () => {
    const noAsset = sqlReturning([
      {
        ...complete,
        asset_status: null,
        lifecycle_state: "DRAFT",
        metadata_ipfs_uri: null,
      },
    ]);
    await expect(
      new PostgresPublicationCandidateStore(noAsset.sql).loadCurrent(
        "genesis:base-sepolia:84532",
        3,
      ),
    ).resolves.toMatchObject({
      assetStatus: null,
      lifecycleState: "DRAFT",
      metadataIpfsUri: null,
    });

    const missing = sqlReturning([]);
    await expect(
      new PostgresPublicationCandidateStore(missing.sql).loadCurrent(
        "genesis:base-sepolia:84532",
        3,
      ),
    ).resolves.toBeNull();
  });

  it("fails closed on corrupted status, URI or token data", async () => {
    for (const corrupted of [
      { ...complete, asset_status: "READYISH" },
      { ...complete, metadata_ipfs_uri: "https://mutable.example/3.json" },
      { ...complete, token_id: 11 },
    ]) {
      const database = sqlReturning([corrupted]);
      await expect(
        new PostgresPublicationCandidateStore(database.sql).loadCurrent(
          "genesis:base-sepolia:84532",
          3,
        ),
      ).rejects.toThrow("Invalid publication candidate");
    }
  });
});
