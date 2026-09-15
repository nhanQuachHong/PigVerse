import { afterEach, describe, expect, it, vi } from "vitest";

import { createNftDetailHandler } from "../../app/api/nft/[tokenId]/route";
import type { logPublicReadFailure } from "../server/operational-log";

afterEach(() => vi.unstubAllEnvs());

describe("public NFT detail API", () => {
  it("returns one canonical token without caching or fabricating chain state", async () => {
    vi.stubEnv("PIGVERSE_ENV", "local");
    const logFailure = vi.fn<typeof logPublicReadFailure>();
    const response = await createNftDetailHandler(
      undefined,
      () => "correlation_1",
      logFailure,
    )(new Request("http://localhost/api/nft/1"), {
      params: Promise.resolve({ tokenId: "1" }),
    });
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Correlation-ID")).toBe("correlation_1");
    expect(result.correlationId).toBe("correlation_1");
    expect(result.token).toMatchObject({
      tokenId: 1,
      name: "Captain Oink",
      status: "unknown",
      owner: null,
      metadataUri: null,
    });
    expect(logFailure).toHaveBeenCalledWith({
      category: "configuration_unavailable",
      correlationId: "correlation_1",
      surface: "nft_detail",
    });
  });

  it("returns the same non-enumerating 404 contract for invalid IDs", async () => {
    for (const tokenId of ["0", "01", "11", "not-a-token"]) {
      const logFailure = vi.fn<typeof logPublicReadFailure>();
      const response = await createNftDetailHandler(
        undefined,
        () => "correlation_1",
        logFailure,
      )(new Request(`http://localhost/api/nft/${tokenId}`), {
        params: Promise.resolve({ tokenId }),
      });
      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        code: "GENESIS_TOKEN_NOT_FOUND",
        correlationId: "correlation_1",
        message: "NFT not found",
      });
      expect(logFailure).not.toHaveBeenCalled();
    }
  });

  it("redacts unexpected detail failures and isolates logging", async () => {
    const logFailure = vi.fn<typeof logPublicReadFailure>();
    const handler = createNftDetailHandler(
      async () => {
        throw new Error("rpc-secret");
      },
      () => "correlation_1",
      logFailure,
    );
    const response = await handler(new Request("http://localhost/api/nft/1"), {
      params: Promise.resolve({ tokenId: "1" }),
    });

    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("rpc-secret");
    expect(logFailure).toHaveBeenCalledWith({
      category: "unavailable",
      correlationId: "correlation_1",
      surface: "nft_detail",
    });

    const stable = await createNftDetailHandler(
      async () => null,
      () => "correlation_2",
      () => {
        throw new Error("logging unavailable");
      },
    )(new Request("http://localhost/api/nft/1"), {
      params: Promise.resolve({ tokenId: "1" }),
    });
    expect(stable.status).toBe(404);
  });
});
