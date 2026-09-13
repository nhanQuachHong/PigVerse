import { describe, expect, it, vi } from "vitest";

import {
  MemoryAdminContentStore,
  type TokenMutationState,
} from "./admin-content-store";
import {
  AdminContentError,
  GENESIS_SEPOLIA_DEPLOYMENT_KEY,
  listGenesisContent,
  saveGenesisDraft,
} from "./admin-content";

const contractAddress = "0x3333333333333333333333333333333333333333" as const;
const unminted = (): Map<number, TokenMutationState> =>
  new Map<number, TokenMutationState>(
    Array.from({ length: 10 }, (_, index) => [index + 1, "unminted" as const]),
  );
const draft = {
  actorWallet: "0x1111111111111111111111111111111111111111",
  correlationId: "request_1234",
  descriptionEn: "English description",
  descriptionVi: "Mô tả tiếng Việt",
  expectedRevision: 0,
  nameEn: "Mochi",
  nameVi: "Mochi",
  storyEn: "English story",
  storyVi: "Câu chuyện tiếng Việt",
  tokenId: 2,
};

describe("Admin Genesis content service", () => {
  it("lists all ten fixed slots with explicit chain state", async () => {
    const store = new MemoryAdminContentStore();
    const result = await listGenesisContent({
      contractAddress,
      readTokenStates: async () => unminted(),
      store,
    });

    expect(result).toHaveLength(10);
    expect(result.map(({ tokenId }) => tokenId)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(result.every(({ chainState }) => chainState === "unminted")).toBe(
      true,
    );
    expect(store.deployments.get(GENESIS_SEPOLIA_DEPLOYMENT_KEY)).toMatchObject(
      {
        contractAddress,
      },
    );
  });

  it("keeps draft slots visible with unavailable state during an RPC outage", async () => {
    const store = new MemoryAdminContentStore();
    const result = await listGenesisContent({
      contractAddress,
      readTokenStates: async () => {
        throw new Error("RPC unavailable");
      },
      store,
    });

    expect(result).toHaveLength(10);
    expect(result.every(({ chainState }) => chainState === "unavailable")).toBe(
      true,
    );
  });

  it("writes an audited draft only after an authoritative unminted read", async () => {
    const store = new MemoryAdminContentStore();
    const readTokenStates = vi.fn().mockResolvedValue(unminted());

    const result = await saveGenesisDraft(draft, {
      contractAddress,
      readTokenStates,
      store,
    });

    expect(result).toMatchObject({
      content: { revision: 1, tokenId: 2 },
      status: "updated",
    });
    expect(readTokenStates).toHaveBeenCalledOnce();
    expect(store.auditEvents).toHaveLength(1);
  });

  it("distinguishes minted, unavailable and stale failures without writes", async () => {
    const store = new MemoryAdminContentStore();
    const states = unminted();
    states.set(2, "minted");
    await expect(
      saveGenesisDraft(draft, {
        contractAddress,
        readTokenStates: async () => states,
        store,
      }),
    ).resolves.toEqual({ status: "minted-locked" });

    states.set(2, "unavailable");
    await expect(
      saveGenesisDraft(draft, {
        contractAddress,
        readTokenStates: async () => states,
        store,
      }),
    ).resolves.toEqual({ status: "chain-unavailable" });
    expect(store.revisions).toHaveLength(0);
    expect(store.auditEvents).toHaveLength(0);
  });

  it("rejects invalid token, revision, actor and correlation identity", async () => {
    const store = new MemoryAdminContentStore();
    const dependencies = {
      contractAddress,
      readTokenStates: async () => unminted(),
      store,
    };

    for (const invalid of [
      { ...draft, tokenId: 0 },
      { ...draft, tokenId: 11 },
      { ...draft, expectedRevision: -1 },
      { ...draft, actorWallet: "invalid" },
      { ...draft, correlationId: "short" },
    ])
      await expect(
        saveGenesisDraft(invalid, dependencies),
      ).rejects.toBeInstanceOf(AdminContentError);
    expect(store.revisions).toHaveLength(0);
  });
});
