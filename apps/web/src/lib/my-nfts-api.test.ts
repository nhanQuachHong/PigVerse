import { afterEach, describe, expect, it, vi } from "vitest";

import { createMyNftsHandler } from "../../app/api/my-nfts/route";
import type { logPublicReadFailure } from "../server/operational-log";

afterEach(() => vi.unstubAllEnvs());

describe("My NFTs API", () => {
  it("rejects invalid addresses before querying ownership", async () => {
    const logFailure = vi.fn<typeof logPublicReadFailure>();
    const response = await createMyNftsHandler(
      undefined,
      () => "correlation_1",
      logFailure,
    )(new Request("http://localhost/api/my-nfts?address=invalid"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: "INVALID_WALLET_ADDRESS",
      correlationId: "correlation_1",
      message: "Invalid wallet address",
    });
    expect(logFailure).not.toHaveBeenCalled();
  });

  it("does not turn an unavailable chain read into an empty collection", async () => {
    vi.stubEnv("PIGVERSE_ENV", "local");
    const logFailure = vi.fn<typeof logPublicReadFailure>();
    const response = await createMyNftsHandler(
      undefined,
      () => "correlation_1",
      logFailure,
    )(
      new Request(
        "http://localhost/api/my-nfts?address=0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      ),
    );
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Correlation-ID")).toBe("correlation_1");
    expect(result.correlationId).toBe("correlation_1");
    expect(result.ownershipStatus).toBe("unavailable");
    expect(result.tokens).toEqual([]);
    expect(logFailure).toHaveBeenCalledWith({
      category: "chain_unavailable",
      correlationId: "correlation_1",
      surface: "my_nfts",
    });
    expect(JSON.stringify(logFailure.mock.calls)).not.toContain(
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
  });

  it("redacts unexpected ownership failures and isolates logging", async () => {
    const logFailure = vi.fn<typeof logPublicReadFailure>();
    const response = await createMyNftsHandler(
      async () => {
        throw new Error("rpc-secret");
      },
      () => "correlation_1",
      logFailure,
    )(
      new Request(
        "http://localhost/api/my-nfts?address=0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      ),
    );

    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("rpc-secret");
    expect(logFailure).toHaveBeenCalledWith({
      category: "unavailable",
      correlationId: "correlation_1",
      surface: "my_nfts",
    });

    const stable = await createMyNftsHandler(
      async () => null,
      () => "correlation_2",
      () => {
        throw new Error("logging unavailable");
      },
    )(new Request("http://localhost/api/my-nfts?address=invalid"));
    expect(stable.status).toBe(400);
  });
});
