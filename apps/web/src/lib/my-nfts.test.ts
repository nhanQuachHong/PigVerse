import { describe, expect, it } from "vitest";

import type { PublicCollection } from "./public-collection";
import { getMyNfts, selectOwnedTokens } from "./my-nfts";

const walletA = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const walletB = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function collection(owners: Array<string | null>): PublicCollection {
  return {
    block: "0x123",
    collection: "Pigverse Genesis",
    degraded: false,
    deployment: null,
    maxSupply: 10,
    mintedCount: owners.filter(Boolean).length,
    publicationState: "known",
    tokens: owners.map((owner, index) => ({
      artwork: `/assets/nft/${index + 1}.png`,
      metadataUri: `ipfs://fixture/${index + 1}`,
      name: `Pig ${index + 1}`,
      owner,
      status: owner ? "minted" : "available",
      tokenId: index + 1,
    })),
  };
}

describe("My NFTs ownership projection", () => {
  it("matches checksummed ownership without case-sensitive identity errors", () => {
    const snapshot = collection([walletA.toLowerCase(), walletB, null]);
    expect(selectOwnedTokens(snapshot, walletA)).toHaveLength(1);
    expect(selectOwnedTokens(snapshot, walletA)[0]?.tokenId).toBe(1);
  });

  it("reflects an external transfer solely from the next chain snapshot", () => {
    const before = collection([null, walletA]);
    const after = collection([null, walletB]);
    expect(
      selectOwnedTokens(before, walletA).map((token) => token.tokenId),
    ).toEqual([2]);
    expect(selectOwnedTokens(after, walletA)).toEqual([]);
    expect(
      selectOwnedTokens(after, walletB).map((token) => token.tokenId),
    ).toEqual([2]);
  });

  it("returns unavailable rather than false empty ownership without chain config", async () => {
    const result = await getMyNfts(walletA, { PIGVERSE_ENV: "local" });
    expect(result).toMatchObject({
      ownershipStatus: "unavailable",
      tokens: [],
    });
  });

  it("rejects malformed wallet input", async () => {
    await expect(getMyNfts("not-an-address")).resolves.toBeNull();
  });
});
