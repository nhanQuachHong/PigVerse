import { describe, expect, it, vi } from "vitest";

import {
  type DraftWrite,
  MemoryAdminContentStore,
} from "./admin-content-store";

const draft: DraftWrite = {
  actorWallet: "0x1111111111111111111111111111111111111111",
  correlationId: "request-1",
  deploymentKey: "genesis-base-sepolia",
  descriptionEn: "English description",
  descriptionVi: "Mô tả tiếng Việt",
  expectedRevision: 0,
  nameEn: "Mochi",
  nameVi: "Mochi",
  storyEn: "English story",
  storyVi: "Câu chuyện tiếng Việt",
  tokenId: 2,
};

describe("Admin content store contract", () => {
  it("creates immutable revisions and append-only audit events", async () => {
    const store = new MemoryAdminContentStore();
    const first = await store.replaceDraft(draft, async () => true);
    const second = await store.replaceDraft(
      { ...draft, expectedRevision: 1, storyEn: "Revised story" },
      async () => true,
    );

    expect(first).toMatchObject({
      status: "updated",
      content: { revision: 1 },
    });
    expect(second).toMatchObject({
      status: "updated",
      content: { revision: 2 },
    });
    expect(store.revisions).toHaveLength(2);
    expect(await store.listCurrent(draft.deploymentKey)).toMatchObject([
      { revision: 2, storyEn: "Revised story" },
    ]);
    expect(store.auditEvents).toMatchObject([
      { fromRevision: 0, toRevision: 1 },
      { fromRevision: 1, toRevision: 2 },
    ]);
  });

  it("rejects stale revisions without checking or writing chain state", async () => {
    const store = new MemoryAdminContentStore();
    await store.replaceDraft(draft, async () => true);
    const confirmUnminted = vi.fn().mockResolvedValue(true);

    await expect(
      store.replaceDraft({ ...draft, expectedRevision: 0 }, confirmUnminted),
    ).resolves.toEqual({ status: "conflict" });
    expect(confirmUnminted).not.toHaveBeenCalled();
    expect(store.revisions).toHaveLength(1);
    expect(store.auditEvents).toHaveLength(1);
  });

  it("rejects a minted token without a revision or audit side effect", async () => {
    const store = new MemoryAdminContentStore();

    await expect(store.replaceDraft(draft, async () => false)).resolves.toEqual(
      { status: "minted-locked" },
    );
    expect(store.revisions).toHaveLength(0);
    expect(store.auditEvents).toHaveLength(0);
  });
});
