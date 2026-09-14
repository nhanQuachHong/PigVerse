import { describe, expect, it, vi } from "vitest";

import type { AdminSession } from "./admin-auth-store";
import type {
  AdminPublicationDependencies,
  PublicationCandidateStore,
} from "./admin-publication";
import type { logAdminOperationFailure } from "./operational-log";
import type { PublicationSnapshot } from "./publication-reader";

const session: AdminSession = {
  expiresAt: new Date("2026-09-14T01:00:00.000Z"),
  issuedAt: new Date("2026-09-14T00:30:00.000Z"),
  revokedAt: null,
  tokenHash: "a".repeat(64),
  walletAddress: "0x1111111111111111111111111111111111111111",
};

const prepared = {
  action: "publish" as const,
  block: "0xabc" as const,
  contentId: "7",
  contentRevision: 2,
  expectedPublicationRevision: "4",
  metadataIpfsUri: "ipfs://bafyfixture/metadata.json" as const,
  status: "prepared" as const,
  transaction: {
    chainId: 84532 as const,
    data: "0x1234" as const,
    to: "0x2222222222222222222222222222222222222222" as const,
    value: "0x0" as const,
  },
};

async function loadHandler() {
  return import("../../app/api/admin/content/[tokenId]/publication/route");
}

function runtime() {
  const readSnapshot =
    vi.fn<(tokenId: number) => Promise<PublicationSnapshot | null>>();
  const loadCurrent = vi.fn<PublicationCandidateStore["loadCurrent"]>();
  const authenticate = vi.fn<
    (request: Request) => Promise<AdminSession | null>
  >(async () => session);
  const prepareDependencies = {
    chainId: 84532,
    contractAddress: prepared.transaction.to,
    deploymentKey: "genesis:base-sepolia:84532",
    readSnapshot,
    store: { loadCurrent },
  } satisfies AdminPublicationDependencies;
  return {
    ...prepareDependencies,
    appOrigin: "https://pigverse.example",
    authenticate,
  };
}

function request(
  body: unknown = { action: "publish" },
  origin = "https://pigverse.example",
) {
  return new Request(
    "https://pigverse.example/api/admin/content/3/publication",
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json", Origin: origin },
      method: "POST",
    },
  );
}

const context = { params: Promise.resolve({ tokenId: "3" }) };

describe("Admin publication prepare route", () => {
  it("returns a safe wallet transaction for an authenticated Owner/Admin", async () => {
    const { createPublicationPrepareHandler } = await loadHandler();
    const current = runtime();
    const handler = createPublicationPrepareHandler(() => current);

    current.store.loadCurrent.mockResolvedValueOnce({
      assetStatus: "COMPLETE",
      contentId: "7",
      contentRevision: 2,
      lifecycleState: "READY",
      metadataIpfsUri: prepared.metadataIpfsUri,
      tokenId: 3,
    });
    current.readSnapshot.mockResolvedValueOnce({
      block: "0xabc",
      metadataUri: null,
      publicationRevision: 4n,
      tokenState: "unminted",
    });

    const response = await handler(request(), context);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      action: "publish",
      correlationId: expect.any(String),
      expectedPublicationRevision: "4",
      status: "prepared",
      transaction: { chainId: 84532, value: "0x0" },
    });
  });

  it("checks Origin and current session before publication state", async () => {
    const { createPublicationPrepareHandler } = await loadHandler();
    const denied = runtime();
    const deniedHandler = createPublicationPrepareHandler(
      () => denied,
      () => "correlation-1",
    );
    const deniedResponse = await deniedHandler(
      request(undefined, "https://evil.example"),
      context,
    );
    expect(deniedResponse.status).toBe(403);
    expect(denied.authenticate).not.toHaveBeenCalled();

    const unauthenticated = runtime();
    unauthenticated.authenticate.mockResolvedValueOnce(null);
    const unauthenticatedResponse = await createPublicationPrepareHandler(
      () => unauthenticated,
    )(request(), context);
    expect(unauthenticatedResponse.status).toBe(401);
    expect(unauthenticated.store.loadCurrent).not.toHaveBeenCalled();
  });

  it("maps readiness, chain and input failures without provider details", async () => {
    const { createPublicationPrepareHandler } = await loadHandler();
    const logFailure = vi.fn<typeof logAdminOperationFailure>();
    const notReady = runtime();
    notReady.store.loadCurrent.mockResolvedValueOnce(null);
    const notReadyResponse = await createPublicationPrepareHandler(
      () => notReady,
      () => "correlation-1",
      logFailure,
    )(request(), context);
    expect(notReadyResponse.status).toBe(409);
    await expect(notReadyResponse.json()).resolves.toMatchObject({
      code: "ASSET_NOT_READY",
    });
    expect(logFailure).toHaveBeenLastCalledWith({
      category: "asset_not_ready",
      correlationId: "correlation-1",
      operation: "publication_prepare",
    });

    const unavailable = runtime();
    unavailable.store.loadCurrent.mockResolvedValueOnce({
      assetStatus: "COMPLETE",
      contentId: "7",
      contentRevision: 2,
      lifecycleState: "READY",
      metadataIpfsUri: prepared.metadataIpfsUri,
      tokenId: 3,
    });
    unavailable.readSnapshot.mockResolvedValueOnce(null);
    const unavailableResponse = await createPublicationPrepareHandler(
      () => unavailable,
      () => "correlation-2",
      logFailure,
    )(request(), context);
    expect(unavailableResponse.status).toBe(503);
    await expect(unavailableResponse.json()).resolves.toMatchObject({
      code: "CHAIN_STATE_UNAVAILABLE",
    });
    expect(logFailure).toHaveBeenLastCalledWith({
      category: "chain_unavailable",
      correlationId: "correlation-2",
      operation: "publication_prepare",
    });

    const invalidResponse = await createPublicationPrepareHandler(
      runtime,
      () => "correlation-3",
      logFailure,
    )(request({ action: "delete" }), context);
    expect(invalidResponse.status).toBe(400);
    await expect(invalidResponse.json()).resolves.toMatchObject({
      code: "INVALID_INPUT",
    });
    expect(logFailure).toHaveBeenLastCalledWith({
      category: "invalid_input",
      correlationId: "correlation-3",
      operation: "publication_prepare",
    });
  });

  it("caps request bodies and masks infrastructure failures", async () => {
    const { createPublicationPrepareHandler } = await loadHandler();
    const logFailure = vi.fn<typeof logAdminOperationFailure>();
    const oversized = request({
      action: "publish",
      padding: "x".repeat(2_000),
    });
    const oversizedResponse = await createPublicationPrepareHandler(
      runtime,
      () => "correlation-1",
      logFailure,
    )(oversized, context);
    expect(oversizedResponse.status).toBe(413);

    const failedResponse = await createPublicationPrepareHandler(
      () => {
        throw new Error("rpc-token=secret");
      },
      () => "correlation-2",
      logFailure,
    )(request(), context);
    expect(failedResponse.status).toBe(503);
    expect(JSON.stringify(await failedResponse.json())).not.toContain("secret");
    expect(logFailure).toHaveBeenLastCalledWith({
      category: "unavailable",
      correlationId: "correlation-2",
      operation: "publication_prepare",
    });
    expect(JSON.stringify(logFailure.mock.calls)).not.toContain("secret");
    expect(JSON.stringify(logFailure.mock.calls)).not.toContain(
      prepared.metadataIpfsUri,
    );
  });

  it("keeps the publication response stable when logging fails", async () => {
    const { createPublicationPrepareHandler } = await loadHandler();
    const current = runtime();
    current.store.loadCurrent.mockResolvedValueOnce(null);
    const response = await createPublicationPrepareHandler(
      () => current,
      () => "correlation-1",
      () => {
        throw new Error("logging unavailable");
      },
    )(request(), context);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "ASSET_NOT_READY",
      correlationId: "correlation-1",
    });
  });
});
