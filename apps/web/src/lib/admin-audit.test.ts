import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchAdminAudit } from "./admin-audit";

const event = {
  action: "NFT_DRAFT_UPDATED",
  actorWallet: "0x2222222222222222222222222222222222222222",
  auditEventId: "7",
  correlationId: "correlation_7",
  createdAt: "2026-09-13T00:00:07.000Z",
  safeContext: { fromRevision: 1, toRevision: 2 },
  target: { id: "7", tokenId: 5, type: "NFT_CONTENT" },
};

afterEach(() => vi.unstubAllGlobals());

describe("Admin audit client", () => {
  it("requests an authenticated cursor page and validates its events", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ events: [event], nextCursor: "7" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchAdminAudit("10")).resolves.toEqual({
      events: [event],
      nextCursor: "7",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/audit?limit=10&cursor=10",
      {
        cache: "no-store",
        credentials: "same-origin",
      },
    );
  });

  it("rejects malformed historical evidence from the network boundary", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            events: [{ ...event, actorWallet: "not-a-wallet" }],
            nextCursor: null,
          }),
          { headers: { "Content-Type": "application/json" }, status: 200 },
        ),
      ),
    );

    await expect(fetchAdminAudit(null)).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });

  it("preserves stable server error codes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: "ADMIN_AUTH_REQUIRED" }), {
          headers: { "Content-Type": "application/json" },
          status: 401,
        }),
      ),
    );

    await expect(fetchAdminAudit(null)).rejects.toMatchObject({
      code: "ADMIN_AUTH_REQUIRED",
    });
  });
});
