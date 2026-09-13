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
    const first = await store.replaceDraft(draft, async () => "unminted");
    const second = await store.replaceDraft(
      { ...draft, expectedRevision: 1, storyEn: "Revised story" },
      async () => "unminted",
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
    await store.replaceDraft(draft, async () => "unminted");
    const readTokenState = vi.fn().mockResolvedValue("unminted");

    await expect(
      store.replaceDraft({ ...draft, expectedRevision: 0 }, readTokenState),
    ).resolves.toEqual({ status: "conflict" });
    expect(readTokenState).not.toHaveBeenCalled();
    expect(store.revisions).toHaveLength(1);
    expect(store.auditEvents).toHaveLength(1);
  });

  it("rejects a minted token without a revision or audit side effect", async () => {
    const store = new MemoryAdminContentStore();

    await expect(
      store.replaceDraft(draft, async () => "minted"),
    ).resolves.toEqual({ status: "minted-locked" });
    expect(store.revisions).toHaveLength(0);
    expect(store.auditEvents).toHaveLength(0);
  });

  it("fails closed without labelling an RPC outage as minted", async () => {
    const store = new MemoryAdminContentStore();

    await expect(
      store.replaceDraft(draft, async () => "unavailable"),
    ).resolves.toEqual({ status: "chain-unavailable" });
    expect(store.revisions).toHaveLength(0);
    expect(store.auditEvents).toHaveLength(0);
  });

  it("registers one exact environment-bound deployment identity", async () => {
    const store = new MemoryAdminContentStore();
    const deployment = {
      chainId: 84532,
      contractAddress: "0x3333333333333333333333333333333333333333",
      deploymentKey: "genesis:base-sepolia:84532",
      environment: "base-sepolia",
    } as const;
    await store.ensureDeployment(deployment);
    await expect(store.ensureDeployment(deployment)).resolves.toBeUndefined();
    await expect(
      store.ensureDeployment({
        ...deployment,
        contractAddress: "0x4444444444444444444444444444444444444444",
      }),
    ).rejects.toThrow("does not match database");
  });
});
