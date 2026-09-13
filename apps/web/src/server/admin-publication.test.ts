import { decodeFunctionData } from "viem";
import { describe, expect, it, vi } from "vitest";

import { genesisAbi } from "../lib/genesis-contract";
import {
  AdminPublicationError,
  type AdminPublicationDependencies,
  preparePublicationTransaction,
  type PublicationCandidate,
  type PublicationCandidateStore,
} from "./admin-publication";
import type { PublicationSnapshot } from "./publication-reader";

const contractAddress = `0x${"1".repeat(40)}` as const;
const candidate: PublicationCandidate = {
  assetStatus: "COMPLETE",
  contentId: "7",
  contentRevision: 2,
  lifecycleState: "READY",
  metadataIpfsUri: "ipfs://bafyfixture/metadata.json",
  tokenId: 3,
};

function dependencies() {
  const readSnapshot = vi.fn<
    (tokenId: number) => Promise<PublicationSnapshot | null>
  >(async () => ({
    block: "0xabc",
    metadataUri: null,
    publicationRevision: 4n,
    tokenState: "unminted",
  }));
  const loadCurrent = vi.fn<PublicationCandidateStore["loadCurrent"]>(
    async () => candidate,
  );
  return {
    chainId: 84532 as const,
    contractAddress,
    deploymentKey: "genesis:base-sepolia:84532",
    readSnapshot,
    store: { loadCurrent },
  } satisfies AdminPublicationDependencies;
}

describe("Admin publication preparation", () => {
  it("constructs an exact owner publish call from READY durable assets", async () => {
    const runtime = dependencies();
    const result = await preparePublicationTransaction(
      { action: "publish", tokenId: 3 },
      runtime,
    );

    expect(result).toMatchObject({
      action: "publish",
      block: "0xabc",
      contentId: "7",
      contentRevision: 2,
      expectedPublicationRevision: "4",
      metadataIpfsUri: candidate.metadataIpfsUri,
      status: "prepared",
      transaction: { chainId: 84532, to: contractAddress, value: "0x0" },
    });
    if (result.status !== "prepared") throw new Error("Expected transaction");
    expect(
      decodeFunctionData({ abi: genesisAbi, data: result.transaction.data }),
    ).toEqual({
      args: [3n, 4n, candidate.metadataIpfsUri],
      functionName: "publish",
    });
  });

  it("constructs unpublish only from PUBLISHED content and a published chain URI", async () => {
    const runtime = dependencies();
    runtime.store.loadCurrent.mockResolvedValueOnce({
      ...candidate,
      lifecycleState: "PUBLISHED",
    });
    runtime.readSnapshot.mockResolvedValueOnce({
      block: "0xdef",
      metadataUri: candidate.metadataIpfsUri,
      publicationRevision: 5n,
      tokenState: "unminted",
    });

    const result = await preparePublicationTransaction(
      { action: "unpublish", tokenId: 3 },
      runtime,
    );
    if (result.status !== "prepared") throw new Error("Expected transaction");
    expect(result.metadataIpfsUri).toBeNull();
    expect(
      decodeFunctionData({ abi: genesisAbi, data: result.transaction.data }),
    ).toEqual({ args: [3n, 5n], functionName: "unpublish" });
  });

  it("fails before chain reads when assets or lifecycle are not eligible", async () => {
    const missingAssets = dependencies();
    missingAssets.store.loadCurrent.mockResolvedValueOnce({
      ...candidate,
      assetStatus: "ERROR",
    });
    await expect(
      preparePublicationTransaction(
        { action: "publish", tokenId: 3 },
        missingAssets,
      ),
    ).resolves.toEqual({ code: "ASSET_NOT_READY", status: "error" });
    expect(missingAssets.readSnapshot).not.toHaveBeenCalled();

    const wrongLifecycle = dependencies();
    wrongLifecycle.store.loadCurrent.mockResolvedValueOnce({
      ...candidate,
      lifecycleState: "DRAFT",
    });
    await expect(
      preparePublicationTransaction(
        { action: "publish", tokenId: 3 },
        wrongLifecycle,
      ),
    ).resolves.toEqual({
      code: "PUBLICATION_STATE_CONFLICT",
      status: "error",
    });
    expect(wrongLifecycle.readSnapshot).not.toHaveBeenCalled();
  });

  it("fails closed for unavailable, minted or already-applied chain state", async () => {
    const unavailable = dependencies();
    unavailable.readSnapshot.mockResolvedValueOnce(null);
    await expect(
      preparePublicationTransaction(
        { action: "publish", tokenId: 3 },
        unavailable,
      ),
    ).resolves.toEqual({
      code: "CHAIN_STATE_UNAVAILABLE",
      status: "error",
    });

    const minted = dependencies();
    minted.readSnapshot.mockResolvedValueOnce({
      block: "0xabc",
      metadataUri: candidate.metadataIpfsUri,
      publicationRevision: 4n,
      tokenState: "minted",
    });
    await expect(
      preparePublicationTransaction({ action: "publish", tokenId: 3 }, minted),
    ).resolves.toEqual({ code: "TOKEN_ALREADY_MINTED", status: "error" });

    const alreadyApplied = dependencies();
    alreadyApplied.readSnapshot.mockResolvedValueOnce({
      block: "0xabc",
      metadataUri: candidate.metadataIpfsUri,
      publicationRevision: 4n,
      tokenState: "unminted",
    });
    await expect(
      preparePublicationTransaction(
        { action: "publish", tokenId: 3 },
        alreadyApplied,
      ),
    ).resolves.toEqual({
      code: "PUBLICATION_STATE_CONFLICT",
      status: "error",
    });
  });

  it("rejects invalid token IDs", async () => {
    await expect(
      preparePublicationTransaction(
        { action: "publish", tokenId: 11 },
        dependencies(),
      ),
    ).rejects.toBeInstanceOf(AdminPublicationError);
  });
});
