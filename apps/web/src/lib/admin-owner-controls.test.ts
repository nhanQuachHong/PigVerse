import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AdminOwnerControlClientError,
  recordAdminOwnerControl,
} from "./admin-owner-controls";

const transactionHash = `0x${"a".repeat(64)}` as const;
const response = {
  action: "setMintPrice",
  blockHash: `0x${"b".repeat(64)}`,
  blockNumber: "2748",
  finality: "included",
  newMintPrice: "125000000000000000",
  status: "recorded",
  transactionHash,
  withdrawnAmount: null,
};

afterEach(() => vi.unstubAllGlobals());

describe("Admin Owner control API client", () => {
  it("submits only a normalized transaction hash and parses evidence", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json(response));
    vi.stubGlobal("fetch", fetcher);

    await expect(recordAdminOwnerControl(transactionHash)).resolves.toEqual({
      ...response,
      status: undefined,
    });
    expect(fetcher).toHaveBeenCalledWith("/api/admin/owner-controls", {
      body: JSON.stringify({ transactionHash }),
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
  });

  it("validates action-specific values in successful responses", async () => {
    for (const payload of [
      { ...response, action: "withdraw", withdrawnAmount: null },
      { ...response, action: "pause", newMintPrice: "1" },
      { ...response, blockHash: "0x1234" },
      { ...response, transactionHash: `0x${"c".repeat(64)}` },
    ]) {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => Response.json(payload)),
      );
      await expect(recordAdminOwnerControl(transactionHash)).rejects.toEqual(
        new AdminOwnerControlClientError("INVALID_RESPONSE"),
      );
    }
  });

  it("preserves stable server codes and masks non-JSON failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ code: "TRANSACTION_PENDING" }, { status: 202 }),
      ),
    );
    await expect(recordAdminOwnerControl(transactionHash)).rejects.toEqual(
      new AdminOwnerControlClientError("TRANSACTION_PENDING"),
    );

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("provider-token=secret", { status: 503 })),
    );
    await expect(recordAdminOwnerControl(transactionHash)).rejects.toEqual(
      new AdminOwnerControlClientError("INVALID_RESPONSE"),
    );
  });

  it("rejects malformed hashes before fetch", async () => {
    const fetcher = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetcher);

    await expect(
      recordAdminOwnerControl("0x1234" as `0x${string}`),
    ).rejects.toEqual(new AdminOwnerControlClientError("INVALID_INPUT"));
    expect(fetcher).not.toHaveBeenCalled();
  });
});
