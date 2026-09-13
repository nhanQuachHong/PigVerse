import { describe, expect, it, vi } from "vitest";

import { createContentUpdateHandler } from "../../app/api/admin/content/[tokenId]/route";
import { createContentListHandler } from "../../app/api/admin/content/route";
import { MemoryAdminContentStore } from "./admin-content-store";
import type { TokenMutationState } from "./admin-content-store";

const appOrigin = "https://pigverse.example";
const contractAddress = "0x3333333333333333333333333333333333333333" as const;
const walletAddress = "0x1111111111111111111111111111111111111111" as const;
const session = {
  expiresAt: new Date("2026-09-13T00:30:00.000Z"),
  issuedAt: new Date("2026-09-13T00:00:00.000Z"),
  revokedAt: null,
  tokenHash: "hash",
  walletAddress,
};
const draftBody = {
  descriptionEn: "English description",
  descriptionVi: "Mô tả tiếng Việt",
  expectedRevision: 0,
  nameEn: "Mochi",
  nameVi: "Mochi",
  storyEn: "English story",
  storyVi: "Câu chuyện tiếng Việt",
};

function tokenStates(
  tokenTwo: TokenMutationState = "unminted",
): Map<number, TokenMutationState> {
  return new Map(
    Array.from({ length: 10 }, (_, index) => [
      index + 1,
      index === 1 ? tokenTwo : "unminted",
    ]),
  );
}

function createRuntime(
  store: MemoryAdminContentStore,
  state: TokenMutationState = "unminted",
  authenticated = true,
) {
  return {
    appOrigin,
    authenticate: vi.fn().mockResolvedValue(authenticated ? session : null),
    contractAddress,
    readTokenStates: vi.fn().mockResolvedValue(tokenStates(state)),
    store,
  };
}

function updateRequest(body: unknown = draftBody, origin = appOrigin) {
  return new Request(`${appOrigin}/api/admin/content/2`, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", Origin: origin },
    method: "PUT",
  });
}

const context = { params: Promise.resolve({ tokenId: "2" }) };

describe("Admin content route boundary", () => {
  it("denies unauthenticated reads before accessing content", async () => {
    const store = new MemoryAdminContentStore();
    const runtime = createRuntime(store, "unminted", false);
    const response = await createContentListHandler(() => runtime)(
      new Request(`${appOrigin}/api/admin/content`),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(store.deployments.size).toBe(0);
    expect(runtime.readTokenStates).not.toHaveBeenCalled();
  });

  it("returns exactly ten protected slots with chain status", async () => {
    const store = new MemoryAdminContentStore();
    const response = await createContentListHandler(() => createRuntime(store))(
      new Request(`${appOrigin}/api/admin/content`),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.slots).toHaveLength(10);
    expect(body.slots[1]).toMatchObject({
      chainState: "unminted",
      content: null,
      tokenId: 2,
    });
  });

  it("denies cross-origin writes before session or content access", async () => {
    const store = new MemoryAdminContentStore();
    const runtime = createRuntime(store);
    const response = await createContentUpdateHandler(
      () => runtime,
      () => "correlation_1",
    )(updateRequest(draftBody, "https://evil.example"), context);

    expect(response.status).toBe(403);
    expect(runtime.authenticate).not.toHaveBeenCalled();
    expect(store.revisions).toHaveLength(0);
  });

  it("writes an authorized revision and audit record", async () => {
    const store = new MemoryAdminContentStore();
    const response = await createContentUpdateHandler(
      () => createRuntime(store),
      () => "correlation_1",
    )(updateRequest(), context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      content: { revision: 1, tokenId: 2 },
      correlationId: "correlation_1",
    });
    expect(store.auditEvents).toMatchObject([
      { actorWallet: walletAddress, correlationId: "correlation_1" },
    ]);
  });

  it("returns stable conflict, minted and unavailable codes without extra writes", async () => {
    const store = new MemoryAdminContentStore();
    const handler = createContentUpdateHandler(
      () => createRuntime(store),
      () => "correlation_1",
    );
    expect((await handler(updateRequest(), context)).status).toBe(200);
    const stale = await handler(updateRequest(), context);
    expect(stale.status).toBe(409);
    await expect(stale.json()).resolves.toMatchObject({ code: "STALE_EDIT" });
    expect(store.revisions).toHaveLength(1);

    for (const [state, expectedCode, expectedStatus] of [
      ["minted", "TOKEN_ALREADY_MINTED", 409],
      ["unavailable", "CHAIN_STATE_UNAVAILABLE", 503],
    ] as const) {
      const isolatedStore = new MemoryAdminContentStore();
      const response = await createContentUpdateHandler(
        () => createRuntime(isolatedStore, state),
        () => "correlation_2",
      )(updateRequest(), context);
      expect(response.status).toBe(expectedStatus);
      await expect(response.json()).resolves.toMatchObject({
        code: expectedCode,
      });
      expect(isolatedStore.revisions).toHaveLength(0);
      expect(isolatedStore.auditEvents).toHaveLength(0);
    }
  });

  it("rejects malformed bodies with a safe validation contract", async () => {
    const store = new MemoryAdminContentStore();
    const response = await createContentUpdateHandler(
      () => createRuntime(store),
      () => "correlation_1",
    )(updateRequest({ expectedRevision: 0 }), context);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: "INVALID_CONTENT",
      correlationId: "correlation_1",
      message: "Invalid content",
    });
    expect(store.revisions).toHaveLength(0);
  });
});
