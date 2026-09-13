import { describe, expect, it } from "vitest";

import { getPublicNftDetail, parseGenesisTokenId } from "./public-nft-detail";

describe("public NFT detail", () => {
  it("accepts only canonical route IDs", () => {
    expect(parseGenesisTokenId("1")).toBe(1);
    expect(parseGenesisTokenId("10")).toBe(10);
    for (const value of ["0", "01", "11", "1.0", "1x", "-1", ""])
      expect(parseGenesisTokenId(value)).toBeNull();
  });

  it("returns one canonical token without fabricated deployment state", async () => {
    const detail = await getPublicNftDetail(6, { PIGVERSE_ENV: "local" });
    expect(detail?.token).toMatchObject({
      tokenId: 6,
      name: "Nova",
      owner: null,
      status: "unknown",
      metadataUri: null,
    });
    expect(detail?.deployment).toBeNull();
    expect(detail?.degraded).toBe(true);
    expect(detail?.relatedTokens).toHaveLength(3);
  });

  it("rejects values outside the immutable Genesis domain", async () => {
    await expect(getPublicNftDetail(0)).resolves.toBeNull();
    await expect(getPublicNftDetail(11)).resolves.toBeNull();
  });
});
