import { describe, expect, it, vi } from "vitest";

import type { AdminSession } from "./admin-auth-store";
import type {
  PublicationInclusionDependencies,
  PublicationInclusionStore,
} from "./publication-inclusion";
import type { logAdminOperationFailure } from "./operational-log";
import type { PublicationSnapshot } from "./publication-reader";
import type { PublicationTransactionObservation } from "./publication-transaction-reader";

const session: AdminSession = {
  expiresAt: new Date("2026-09-14T13:00:00.000Z"),
  issuedAt: new Date("2026-09-14T12:30:00.000Z"),
  revokedAt: null,
  tokenHash: "a".repeat(64),
  walletAddress: "0x1111111111111111111111111111111111111111",
};
const transactionHash = `0x${"a".repeat(64)}`;
const included: Extract<
  PublicationTransactionObservation,
  { status: "included" }
> = {
  block: "0xabc",
  blockHash: `0x${"b".repeat(64)}`,
  call: {
    action: "publish",
    expectedPublicationRevision: 4n,
    metadataIpfsUri: "ipfs://bafyfixture/metadata.json",
    tokenId: 3,
  },
  status: "included",
};

async function loadHandler() {
  return import("../../app/api/admin/content/[tokenId]/publication/route");
}

function runtime() {
  const readTransaction = vi.fn<
    PublicationInclusionDependencies["readTransaction"]
  >(async () => included);
  const readSnapshot = vi.fn<
    (tokenId: number) => Promise<PublicationSnapshot | null>
  >(async () => ({
    block: "0xabd",
    metadataUri: included.call.metadataIpfsUri,
    publicationRevision: 5n,
    tokenState: "unminted",
  }));
  const recordInclusion = vi.fn<PublicationInclusionStore["recordInclusion"]>(
    async () => ({
      contentId: "7",
      contentRevision: 2,
      lifecycleState: "PUBLISHED",
      status: "applied",
    }),
  );
  const dependencies = {
    deploymentKey: "genesis:base-sepolia:84532",
    readSnapshot,
    readTransaction,
    store: { recordInclusion },
  } satisfies PublicationInclusionDependencies;
  return {
    ...dependencies,
    appOrigin: "https://pigverse.example",
    authenticate: vi.fn<(request: Request) => Promise<AdminSession | null>>(
      async () => session,
    ),
  };
}

function request(
  body: unknown = { transactionHash },
  origin = "https://pigverse.example",
) {
  return new Request(
    "https://pigverse.example/api/admin/content/3/publication",
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json", Origin: origin },
      method: "PUT",
    },
  );
}

const context = { params: Promise.resolve({ tokenId: "3" }) };

describe("Admin publication inclusion route", () => {
  it("records an included transaction for the current Owner/Admin session", async () => {
    const { createPublicationInclusionHandler } = await loadHandler();
    const current = runtime();
    const response = await createPublicationInclusionHandler(
      () => current,
      () => "correlation-1",
    )(request(), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      action: "publish",
      correlationId: "correlation-1",
      finality: "included",
      lifecycleState: "PUBLISHED",
      publicationRevision: "5",
      status: "recorded",
      tokenId: 3,
      transactionHash,
    });
    expect(current.readTransaction).toHaveBeenCalledWith(
      session.walletAddress,
      transactionHash,
    );
  });

  it("returns 202 for pending transactions without writing a projection", async () => {
    const { createPublicationInclusionHandler } = await loadHandler();
    const current = runtime();
    const logFailure = vi.fn<typeof logAdminOperationFailure>();
    current.readTransaction.mockResolvedValueOnce({ status: "pending" });
    const response = await createPublicationInclusionHandler(
      () => current,
      () => "correlation-1",
      logFailure,
    )(request(), context);

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      code: "TRANSACTION_PENDING",
    });
    expect(current.store.recordInclusion).not.toHaveBeenCalled();
    expect(logFailure).not.toHaveBeenCalled();
  });

  it("rejects calldata for a different token and malformed hashes", async () => {
    const { createPublicationInclusionHandler } = await loadHandler();
    const wrongToken = runtime();
    const logFailure = vi.fn<typeof logAdminOperationFailure>();
    wrongToken.readTransaction.mockResolvedValueOnce({
      ...included,
      call: { ...included.call, tokenId: 4 },
    });
    const wrongTokenResponse = await createPublicationInclusionHandler(
      () => wrongToken,
      () => "correlation-1",
      logFailure,
    )(request(), context);
    expect(wrongTokenResponse.status).toBe(400);
    await expect(wrongTokenResponse.json()).resolves.toMatchObject({
      code: "TRANSACTION_INVALID",
    });
    expect(logFailure).toHaveBeenLastCalledWith({
      category: "transaction_invalid",
      correlationId: "correlation-1",
      operation: "publication_inclusion",
    });

    const malformedResponse = await createPublicationInclusionHandler(
      runtime,
      () => "correlation-2",
      logFailure,
    )(request({ transactionHash: "0x1234" }), context);
    expect(malformedResponse.status).toBe(400);
    await expect(malformedResponse.json()).resolves.toMatchObject({
      code: "INVALID_INPUT",
    });
    expect(logFailure).toHaveBeenLastCalledWith({
      category: "invalid_input",
      correlationId: "correlation-2",
      operation: "publication_inclusion",
    });
  });

  it("checks Origin and current session before transaction reads", async () => {
    const { createPublicationInclusionHandler } = await loadHandler();
    const denied = runtime();
    const logFailure = vi.fn<typeof logAdminOperationFailure>();
    const deniedResponse = await createPublicationInclusionHandler(
      () => denied,
      () => "correlation-1",
      logFailure,
    )(request(undefined, "https://evil.example"), context);
    expect(deniedResponse.status).toBe(403);
    expect(denied.authenticate).not.toHaveBeenCalled();
    expect(logFailure).toHaveBeenLastCalledWith({
      category: "request_denied",
      correlationId: "correlation-1",
      operation: "publication_inclusion",
    });

    const unauthenticated = runtime();
    unauthenticated.authenticate.mockResolvedValueOnce(null);
    const unauthenticatedResponse = await createPublicationInclusionHandler(
      () => unauthenticated,
      () => "correlation-2",
      logFailure,
    )(request(), context);
    expect(unauthenticatedResponse.status).toBe(401);
    expect(unauthenticated.readTransaction).not.toHaveBeenCalled();
    expect(logFailure).toHaveBeenLastCalledWith({
      category: "authentication_required",
      correlationId: "correlation-2",
      operation: "publication_inclusion",
    });
  });

  it("classifies chain outages without logging publication evidence", async () => {
    const { createPublicationInclusionHandler } = await loadHandler();
    const current = runtime();
    const logFailure = vi.fn<typeof logAdminOperationFailure>();
    current.readTransaction.mockResolvedValueOnce({ status: "unavailable" });
    const response = await createPublicationInclusionHandler(
      () => current,
      () => "correlation-1",
      logFailure,
    )(request(), context);

    expect(response.status).toBe(503);
    expect(logFailure).toHaveBeenCalledWith({
      category: "chain_unavailable",
      correlationId: "correlation-1",
      operation: "publication_inclusion",
    });
    expect(JSON.stringify(logFailure.mock.calls)).not.toContain(
      transactionHash,
    );
    expect(JSON.stringify(logFailure.mock.calls)).not.toContain(
      included.call.metadataIpfsUri,
    );
    expect(JSON.stringify(logFailure.mock.calls)).not.toContain(
      session.walletAddress,
    );
  });
});
