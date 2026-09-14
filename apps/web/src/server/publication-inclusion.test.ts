import { describe, expect, it, vi } from "vitest";

import {
  PublicationInclusionError,
  recordPublicationInclusion,
} from "./publication-inclusion";
import type {
  PublicationInclusionDependencies,
  PublicationInclusionStore,
} from "./publication-inclusion";
import type { PublicationSnapshot } from "./publication-reader";
import type { PublicationTransactionObservation } from "./publication-transaction-reader";

const actorWallet = "0x1111111111111111111111111111111111111111";
const transactionHash = `0x${"a".repeat(64)}`;
const included: Extract<
  PublicationTransactionObservation,
  { status: "included" }
> = {
  block: "0xabc",
  blockHash: `0x${"b".repeat(64)}`,
  call: {
    action: "publish",
    expectedPublicationRevision: 4n,
    metadataIpfsUri: "ipfs://bafyfixture/metadata.json",
    tokenId: 3,
  },
  status: "included",
};

function dependencies() {
  const readTransaction = vi.fn<
    PublicationInclusionDependencies["readTransaction"]
  >(async () => included);
  const readSnapshot = vi.fn<
    (tokenId: number) => Promise<PublicationSnapshot | null>
  >(async () => ({
    block: "0xabd",
    metadataUri: included.call.metadataIpfsUri,
    publicationRevision: 5n,
    tokenState: "unminted",
  }));
  const recordInclusion = vi.fn<PublicationInclusionStore["recordInclusion"]>(
    async () => ({
      contentId: "7",
      contentRevision: 2,
      lifecycleState: "PUBLISHED",
      status: "applied",
    }),
  );
  return {
    deploymentKey: "genesis:base-sepolia:84532",
    readSnapshot,
    readTransaction,
    store: { recordInclusion },
  } satisfies PublicationInclusionDependencies;
}

const input = {
  actorWallet,
  correlationId: "correlation-1",
  transactionHash,
};

describe("publication inclusion recording", () => {
  it("records an exact included publish only after current-chain reconciliation", async () => {
    const runtime = dependencies();
    await expect(recordPublicationInclusion(input, runtime)).resolves.toEqual({
      action: "publish",
      contentId: "7",
      contentRevision: 2,
      finality: "included",
      lifecycleState: "PUBLISHED",
      publicationRevision: "5",
      status: "recorded",
      tokenId: 3,
      transactionHash,
    });
    expect(runtime.store.recordInclusion).toHaveBeenCalledWith(
      expect.objectContaining({
        blockNumber: 2748n,
        expectedPublicationRevision: 4n,
        observedPublicationRevision: 5n,
      }),
    );
  });

  it("keeps pending, failed, invalid and unavailable observations distinct", async () => {
    for (const [status, code] of [
      ["pending", "TRANSACTION_PENDING"],
      ["failed", "TRANSACTION_FAILED"],
      ["invalid", "TRANSACTION_INVALID"],
      ["unavailable", "CHAIN_STATE_UNAVAILABLE"],
    ] as const) {
      const runtime = dependencies();
      runtime.readTransaction.mockResolvedValueOnce(
        status === "failed" ? { call: included.call, status } : { status },
      );
      await expect(recordPublicationInclusion(input, runtime)).resolves.toEqual(
        { code, status: "error" },
      );
      expect(runtime.readSnapshot).not.toHaveBeenCalled();
      expect(runtime.store.recordInclusion).not.toHaveBeenCalled();
    }
  });

  it("rejects a revision/URI mismatch and impossible minted unpublish", async () => {
    const mismatch = dependencies();
    mismatch.readSnapshot.mockResolvedValueOnce({
      block: "0xabd",
      metadataUri: "ipfs://different",
      publicationRevision: 5n,
      tokenState: "unminted",
    });
    await expect(recordPublicationInclusion(input, mismatch)).resolves.toEqual({
      code: "PUBLICATION_STATE_CONFLICT",
      status: "error",
    });

    const mintedUnpublish = dependencies();
    mintedUnpublish.readTransaction.mockResolvedValueOnce({
      ...included,
      call: {
        action: "unpublish",
        expectedPublicationRevision: 4n,
        metadataIpfsUri: null,
        tokenId: 3,
      },
    });
    mintedUnpublish.readSnapshot.mockResolvedValueOnce({
      block: "0xabd",
      metadataUri: null,
      publicationRevision: 5n,
      tokenState: "minted",
    });
    await expect(
      recordPublicationInclusion(input, mintedUnpublish),
    ).resolves.toEqual({
      code: "TOKEN_ALREADY_MINTED",
      status: "error",
    });
  });

  it("surfaces store conflicts without claiming chain failure", async () => {
    const runtime = dependencies();
    runtime.store.recordInclusion.mockResolvedValueOnce({ status: "conflict" });
    await expect(recordPublicationInclusion(input, runtime)).resolves.toEqual({
      code: "PUBLICATION_STATE_CONFLICT",
      status: "error",
    });
  });

  it("rejects malformed actor, correlation or transaction hash before reads", async () => {
    const runtime = dependencies();
    for (const invalid of [
      { ...input, actorWallet: "not-an-address" },
      { ...input, correlationId: "short" },
      { ...input, transactionHash: "0x1234" },
    ])
      await expect(
        recordPublicationInclusion(invalid, runtime),
      ).rejects.toBeInstanceOf(PublicationInclusionError);
    expect(runtime.readTransaction).not.toHaveBeenCalled();
  });
});
