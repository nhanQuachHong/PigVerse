import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AdminContentClientError,
  fetchAdminContent,
  updateAdminDraft,
} from "./admin-content";

const slots = Array.from({ length: 10 }, (_, index) => ({
  chainState: "unminted",
  content: null,
  tokenId: index + 1,
}));

describe("Admin content client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("accepts only an ordered ten-slot response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ slots })));
    await expect(fetchAdminContent()).resolves.toHaveLength(10);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ slots: slots.slice(0, 9) })),
    );
    await expect(fetchAdminContent()).rejects.toBeInstanceOf(
      AdminContentClientError,
    );
  });

  it("preserves stable server error codes for conflict handling", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ code: "STALE_EDIT" }, { status: 409 }),
        ),
    );

    await expect(
      updateAdminDraft(2, {
        descriptionEn: "",
        descriptionVi: "",
        expectedRevision: 1,
        nameEn: "Mochi",
        nameVi: "Mochi",
        storyEn: "",
        storyVi: "",
      }),
    ).rejects.toMatchObject({ code: "STALE_EDIT" });
  });

  it("preserves an authorization loss from the protected list", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ code: "ADMIN_AUTH_REQUIRED" }, { status: 401 }),
        ),
    );

    await expect(fetchAdminContent()).rejects.toMatchObject({
      code: "ADMIN_AUTH_REQUIRED",
    });
  });

  it("rejects a successful response whose revision targets another token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          content: {
            contentId: "1",
            descriptionEn: "",
            descriptionVi: "",
            lifecycleState: "DRAFT",
            nameEn: "Mochi",
            nameVi: "Mochi",
            revision: 1,
            storyEn: "",
            storyVi: "",
            tokenId: 3,
            updatedAt: "2026-09-13T00:00:00.000Z",
          },
        }),
      ),
    );

    await expect(
      updateAdminDraft(2, {
        descriptionEn: "",
        descriptionVi: "",
        expectedRevision: 0,
        nameEn: "Mochi",
        nameVi: "Mochi",
        storyEn: "",
        storyVi: "",
      }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
});
