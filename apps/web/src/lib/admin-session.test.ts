import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchAdminSession } from "./admin-session";

describe("admin session client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("maps an unauthenticated response without inventing a session", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetcher);

    await expect(fetchAdminSession()).resolves.toEqual({
      authenticated: false,
    });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/admin/auth/session",
      expect.objectContaining({
        cache: "no-store",
        credentials: "same-origin",
      }),
    );
  });

  it("rejects malformed authenticated responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          authenticated: true,
          expiresAt: "not-a-date",
          walletAddress: "not-an-address",
        }),
      ),
    );

    await expect(fetchAdminSession()).rejects.toThrow(
      "ADMIN_AUTH_INVALID_RESPONSE",
    );
  });
});
