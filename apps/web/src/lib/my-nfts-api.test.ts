import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "../../app/api/my-nfts/route";

afterEach(() => vi.unstubAllEnvs());

describe("My NFTs API", () => {
  it("rejects invalid addresses before querying ownership", async () => {
    const response = await GET(
      new Request("http://localhost/api/my-nfts?address=invalid"),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: "INVALID_WALLET_ADDRESS",
      message: "Invalid wallet address",
    });
  });

  it("does not turn an unavailable chain read into an empty collection", async () => {
    vi.stubEnv("PIGVERSE_ENV", "local");
    const response = await GET(
      new Request(
        "http://localhost/api/my-nfts?address=0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      ),
    );
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(result.ownershipStatus).toBe("unavailable");
    expect(result.tokens).toEqual([]);
  });
});
