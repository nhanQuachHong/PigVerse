import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AdminPublicationClientError,
  prepareAdminPublication,
  recordAdminPublication,
} from "./admin-publication";

const transactionHash = `0x${"a".repeat(64)}` as const;
const prepared = {
  action: "publish",
  block: "0xabc",
  contentId: "7",
  contentRevision: 2,
  expectedPublicationRevision: "4",
  metadataIpfsUri: "ipfs://bafyfixture/metadata.json",
  status: "prepared",
  transaction: {
    chainId: 84532,
    data: "0x1234",
    to: "0x2222222222222222222222222222222222222222",
    value: "0x0",
  },
};

afterEach(() => vi.unstubAllGlobals());

describe("Admin publication API client", () => {
  it("parses an exact publication transaction request", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json(prepared));
    vi.stubGlobal("fetch", fetcher);

    await expect(prepareAdminPublication(3, "publish")).resolves.toEqual({
      ...prepared,
      status: undefined,
    });
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe("/api/admin/content/3/publication");
    expect(init).toMatchObject({
      body: JSON.stringify({ action: "publish" }),
      credentials: "same-origin",
      method: "POST",
    });
  });

  it("parses an included publication projection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          action: "publish",
          contentId: "7",
          contentRevision: 2,
          finality: "included",
          lifecycleState: "PUBLISHED",
          publicationRevision: "5",
          status: "recorded",
          tokenId: 3,
          transactionHash,
        }),
      ),
    );

    await expect(
      recordAdminPublication(3, transactionHash),
    ).resolves.toMatchObject({
      finality: "included",
      lifecycleState: "PUBLISHED",
      tokenId: 3,
      transactionHash,
    });
  });

  it("rejects malformed successful payloads instead of sending them to a wallet", async () => {
    for (const payload of [
      { ...prepared, transaction: { ...prepared.transaction, chainId: 8453 } },
      { ...prepared, transaction: { ...prepared.transaction, value: "0x1" } },
      { ...prepared, metadataIpfsUri: "https://mutable.example/3.json" },
    ]) {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => Response.json(payload)),
      );
      await expect(prepareAdminPublication(3, "publish")).rejects.toMatchObject(
        { code: "INVALID_RESPONSE" },
      );
    }
  });

  it("preserves stable server error codes and masks invalid error bodies", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ code: "ASSET_NOT_READY" }, { status: 409 }),
      ),
    );
    await expect(prepareAdminPublication(3, "publish")).rejects.toMatchObject({
      code: "ASSET_NOT_READY",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("provider-token=secret", { status: 503 })),
    );
    await expect(prepareAdminPublication(3, "publish")).rejects.toEqual(
      new AdminPublicationClientError("INVALID_RESPONSE"),
    );
  });

  it("rejects invalid token and transaction inputs before fetch", async () => {
    const fetcher = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetcher);
    await expect(prepareAdminPublication(0, "publish")).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    await expect(
      recordAdminPublication(3, "0x1234" as `0x${string}`),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
