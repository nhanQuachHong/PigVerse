import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { beforeAll, describe, expect, it, vi } from "vitest";

import { MemoryAssetPackageStore, processAssetPackage } from "./asset-pipeline";
import type {
  AssetPipelineDependencies,
  BackupStorage,
  ContentAddressedStorage,
} from "./asset-pipeline";
import type { TokenMutationState } from "./admin-content-store";
import { getCanonicalArtwork } from "./canonical-artwork";

const content = {
  descriptionEn: "An explorer in the clouds.",
  descriptionVi: "Một nhà thám hiểm giữa mây trời.",
  nameEn: "Captain Oink",
  nameVi: "Captain Oink",
  storyEn: "A complete English story.",
  storyVi: "Một câu chuyện tiếng Việt hoàn chỉnh.",
};
let artworkBytes: Uint8Array;
const encoder = new TextEncoder();

function encodeJson(value: unknown) {
  return encoder.encode(JSON.stringify(value));
}

beforeAll(async () => {
  const asset = getCanonicalArtwork(1);
  if (!asset) throw new Error("Missing canonical fixture");
  artworkBytes = await readFile(
    join(process.cwd(), "public", "assets", "nft", asset.filename),
  );
});

function input() {
  return {
    artworkBytes,
    content,
    contentId: "1",
    contentRevision: 1,
    tokenId: 1,
  };
}

function dependencies(store = new MemoryAssetPackageStore()) {
  const backupPut = vi.fn<BackupStorage["put"]>(async ({ idempotencyKey }) => ({
    reference: `backup:${idempotencyKey}`,
  }));
  const buildMetadata = vi.fn<AssetPipelineDependencies["buildMetadata"]>(
    async () => encodeJson({ description: content.descriptionEn }),
  );
  const ipfsPut = vi.fn<ContentAddressedStorage["put"]>(
    async ({ idempotencyKey }) => ({
      uri: `ipfs://bafy${idempotencyKey}`,
    }),
  );
  const readTokenState = vi.fn<() => Promise<TokenMutationState>>(
    async () => "unminted",
  );
  return {
    backup: { put: backupPut },
    buildMetadata,
    ipfs: { put: ipfsPut },
    readTokenState,
    store,
  };
}

describe("provider-neutral asset pipeline", () => {
  it("reaches COMPLETE only after both IPFS and backup copies exist", async () => {
    const runtime = dependencies();
    const result = await processAssetPackage(input(), runtime);

    expect(result).toMatchObject({
      assetPackage: {
        artworkBackupRef: expect.any(String),
        artworkIpfsUri: expect.stringMatching(/^ipfs:\/\//),
        artworkSha256: expect.stringMatching(/^[0-9a-f]{64}$/),
        metadataBackupRef: expect.any(String),
        metadataIpfsUri: expect.stringMatching(/^ipfs:\/\//),
        metadataSha256: expect.stringMatching(/^[0-9a-f]{64}$/),
        safeErrorCode: null,
        status: "COMPLETE",
      },
      status: "complete",
    });
    expect(runtime.ipfs.put).toHaveBeenCalledTimes(2);
    expect(runtime.backup.put).toHaveBeenCalledTimes(2);
    expect(runtime.readTokenState).toHaveBeenCalledTimes(2);
    expect(runtime.ipfs.put).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ name: "01-captain-oink.png" }),
    );
  });

  it("preserves completed checkpoints and safely retries a partial failure", async () => {
    const runtime = dependencies();
    runtime.ipfs.put
      .mockResolvedValueOnce({ uri: "ipfs://bafyartwork" })
      .mockRejectedValueOnce(new Error("metadata provider unavailable"))
      .mockResolvedValueOnce({ uri: "ipfs://bafymetadata" });

    const failed = await processAssetPackage(input(), runtime);
    expect(failed).toMatchObject({
      errorCode: "METADATA_IPFS_FAILED",
      assetPackage: {
        artworkBackupRef: expect.any(String),
        artworkIpfsUri: "ipfs://bafyartwork",
        metadataIpfsUri: null,
        status: "ERROR",
      },
    });

    const retried = await processAssetPackage(input(), runtime);
    expect(retried).toMatchObject({ status: "complete" });
    expect(runtime.ipfs.put).toHaveBeenCalledTimes(3);
    expect(
      runtime.ipfs.put.mock.calls.filter(
        ([request]) => request.contentType === "image/png",
      ),
    ).toHaveLength(1);
    expect(
      runtime.backup.put.mock.calls.filter(
        ([request]) => request.contentType === "image/png",
      ),
    ).toHaveLength(1);
  });

  it("rejects incomplete content and altered canonical artwork before providers", async () => {
    const runtime = dependencies();
    await expect(
      processAssetPackage(
        { ...input(), content: { ...content, storyVi: "" } },
        runtime,
      ),
    ).resolves.toMatchObject({ errorCode: "INCOMPLETE_CONTENT" });
    await expect(
      processAssetPackage(
        { ...input(), artworkBytes: new Uint8Array([1, 2, 3]) },
        runtime,
      ),
    ).resolves.toMatchObject({ errorCode: "INVALID_CANONICAL_ARTWORK" });
    expect(runtime.ipfs.put).not.toHaveBeenCalled();
    expect(runtime.backup.put).not.toHaveBeenCalled();
  });

  it("rejects an asset package bound to a different token", async () => {
    const runtime = dependencies();
    vi.spyOn(runtime.store, "loadOrCreate").mockResolvedValueOnce({
      artworkBackupRef: null,
      artworkIpfsUri: null,
      artworkSha256: null,
      contentId: "1",
      contentRevision: 1,
      metadataBackupRef: null,
      metadataIpfsUri: null,
      metadataSha256: null,
      safeErrorCode: null,
      status: "PENDING",
      tokenId: 2,
    });

    await expect(processAssetPackage(input(), runtime)).resolves.toMatchObject({
      errorCode: "INVALID_CONTENT_BINDING",
    });
    expect(runtime.ipfs.put).not.toHaveBeenCalled();
    expect(runtime.backup.put).not.toHaveBeenCalled();
  });

  it("fails closed when chain is unavailable or minted at either recheck", async () => {
    const unavailableRuntime = dependencies();
    unavailableRuntime.readTokenState.mockResolvedValue("unavailable");
    await expect(
      processAssetPackage(input(), unavailableRuntime),
    ).resolves.toMatchObject({ errorCode: "CHAIN_STATE_UNAVAILABLE" });
    expect(unavailableRuntime.ipfs.put).not.toHaveBeenCalled();

    const raceRuntime = dependencies();
    raceRuntime.readTokenState
      .mockResolvedValueOnce("unminted")
      .mockResolvedValueOnce("minted");
    const raced = await processAssetPackage(input(), raceRuntime);
    expect(raced).toMatchObject({
      assetPackage: { status: "ERROR" },
      errorCode: "TOKEN_ALREADY_MINTED",
    });
  });

  it("refuses metadata bytes that change between a failed attempt and retry", async () => {
    const runtime = dependencies();
    runtime.backup.put
      .mockResolvedValueOnce({ reference: "backup:artwork" })
      .mockRejectedValueOnce(new Error("metadata backup unavailable"));
    const first = await processAssetPackage(input(), runtime);
    expect(first).toMatchObject({ errorCode: "METADATA_BACKUP_FAILED" });

    runtime.buildMetadata.mockResolvedValueOnce(
      encodeJson({ description: "changed nondeterministically" }),
    );
    const retry = await processAssetPackage(input(), runtime);
    expect(retry).toMatchObject({
      errorCode: "METADATA_INTEGRITY_MISMATCH",
    });
    expect(runtime.backup.put).toHaveBeenCalledTimes(2);
  });

  it("does not mislabel checkpoint-store failures as provider failures", async () => {
    const runtime = dependencies();
    vi.spyOn(runtime.store, "save").mockRejectedValueOnce(
      new Error("database unavailable"),
    );

    await expect(processAssetPackage(input(), runtime)).rejects.toThrow(
      "database unavailable",
    );
    expect(runtime.ipfs.put).toHaveBeenCalledTimes(1);
    expect(runtime.store.save).toHaveBeenCalledTimes(1);
  });
});
