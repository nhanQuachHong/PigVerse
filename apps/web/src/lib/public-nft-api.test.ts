import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "../../app/api/nft/[tokenId]/route";

afterEach(() => vi.unstubAllEnvs());

describe("public NFT detail API", () => {
  it("returns one canonical token without caching or fabricating chain state", async () => {
    vi.stubEnv("PIGVERSE_ENV", "local");
    const response = await GET(new Request("http://localhost/api/nft/1"), {
      params: Promise.resolve({ tokenId: "1" }),
    });
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(result.token).toMatchObject({
      tokenId: 1,
      name: "Captain Oink",
      status: "unknown",
      owner: null,
      metadataUri: null,
    });
  });

  it("returns the same non-enumerating 404 contract for invalid IDs", async () => {
    for (const tokenId of ["0", "01", "11", "not-a-token"]) {
      const response = await GET(
        new Request(`http://localhost/api/nft/${tokenId}`),
        {
          params: Promise.resolve({ tokenId }),
        },
      );
      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        code: "GENESIS_TOKEN_NOT_FOUND",
        message: "NFT not found",
      });
    }
  });
});
