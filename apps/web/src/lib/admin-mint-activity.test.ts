import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchAdminMintActivity } from "./admin-mint-activity";

const activity = {
  blockHash: `0x${"d".repeat(64)}`,
  blockNumber: "2748",
  expectedPublicationRevision: "4",
  finality: "included",
  firstSeenAt: "2026-09-13T00:00:00.000Z",
  lastObservedAt: "2026-09-13T00:01:00.000Z",
  mintObservationId: "9",
  observedOwnerWallet: `0x${"e".repeat(40)}`,
  reconciliation: "current",
  safeErrorCategory: null,
  senderWallet: `0x${"a".repeat(40)}`,
  status: "SUCCEEDED",
  tokenId: 3,
  transactionHash: `0x${"c".repeat(64)}`,
  transferLogIndex: 7,
};

afterEach(() => vi.unstubAllGlobals());

describe("Admin mint activity client", () => {
  it("loads and validates an authenticated cursor page", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({ activities: [activity], nextCursor: "9" }),
      );
    vi.stubGlobal("fetch", fetcher);

    await expect(fetchAdminMintActivity("10")).resolves.toEqual({
      activities: [activity],
      nextCursor: "9",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/admin/mint-activity?limit=10&cursor=10",
      { cache: "no-store", credentials: "same-origin" },
    );
  });

  it.each([
    { ...activity, finality: null },
    { ...activity, blockHash: null },
    { ...activity, observedOwnerWallet: null },
    { ...activity, status: "PENDING" },
  ])("rejects inconsistent success evidence %#", async (candidate) => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ activities: [candidate], nextCursor: null }),
        ),
    );

    await expect(fetchAdminMintActivity(null)).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });

  it.each([
    {
      blockHash: null,
      blockNumber: null,
      finality: null,
      observedOwnerWallet: null,
      safeErrorCategory: null,
      status: "PENDING",
      transferLogIndex: null,
    },
    {
      finality: null,
      observedOwnerWallet: null,
      safeErrorCategory: "EVM_REVERT",
      status: "REVERTED",
      transferLogIndex: null,
    },
    {
      blockHash: null,
      blockNumber: null,
      finality: null,
      observedOwnerWallet: null,
      reconciliation: "unavailable",
      safeErrorCategory: "TRANSACTION_NOT_FOUND",
      status: "UNKNOWN",
      transferLogIndex: null,
    },
  ])("accepts a consistent non-success outcome %#", async (changes) => {
    const candidate = { ...activity, ...changes };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ activities: [candidate], nextCursor: null }),
        ),
    );

    await expect(fetchAdminMintActivity(null)).resolves.toMatchObject({
      activities: [expect.objectContaining({ status: changes.status })],
    });
  });

  it("preserves a stable server error code", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ code: "ADMIN_AUTH_REQUIRED" }, { status: 401 }),
        ),
    );
    await expect(fetchAdminMintActivity(null)).rejects.toMatchObject({
      code: "ADMIN_AUTH_REQUIRED",
    });
  });
});
