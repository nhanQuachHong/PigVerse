import { describe, expect, it, vi } from "vitest";

import { createOwnerControlInclusionHandler } from "../../app/api/admin/owner-controls/route";
import type { AdminSession } from "./admin-auth-store";
import type {
  OwnerControlInclusionDependencies,
  OwnerControlInclusionStore,
} from "./owner-control-inclusion";
import type { OwnerTransactionObservation } from "./owner-transaction-reader";

const appOrigin = "https://pigverse.example";
const transactionHash = `0x${"a".repeat(64)}` as const;
const session: AdminSession = {
  expiresAt: new Date("2026-09-14T13:00:00.000Z"),
  issuedAt: new Date("2026-09-14T12:30:00.000Z"),
  revokedAt: null,
  tokenHash: "a".repeat(64),
  walletAddress: "0x1111111111111111111111111111111111111111",
};
const included: OwnerTransactionObservation = {
  block: "0xabc",
  blockHash: `0x${"b".repeat(64)}`,
  call: { action: "setMintPrice", newPrice: 5n },
  status: "included",
};

function runtime() {
  const readTransaction = vi.fn<
    OwnerControlInclusionDependencies["readTransaction"]
  >(async () => included);
  const recordInclusion = vi.fn<OwnerControlInclusionStore["recordInclusion"]>(
    async () => ({ status: "applied" }),
  );
  return {
    appOrigin,
    authenticate: vi.fn<(request: Request) => Promise<AdminSession | null>>(
      async () => session,
    ),
    deploymentKey: "genesis:base-sepolia:84532",
    readTransaction,
    store: { recordInclusion },
  };
}

function request(body: unknown = { transactionHash }, origin = appOrigin) {
  return new Request(`${appOrigin}/api/admin/owner-controls`, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", Origin: origin },
    method: "PUT",
  });
}

describe("Owner control inclusion route", () => {
  it("records chain-derived evidence for the current Owner session", async () => {
    const current = runtime();
    const response = await createOwnerControlInclusionHandler(
      () => current,
      () => "correlation-1",
    )(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      action: "setMintPrice",
      blockHash: included.blockHash,
      blockNumber: "2748",
      correlationId: "correlation-1",
      finality: "included",
      newMintPrice: "5",
      status: "recorded",
      transactionHash,
      withdrawnAmount: null,
    });
    expect(current.readTransaction).toHaveBeenCalledWith(
      session.walletAddress,
      transactionHash,
    );
  });

  it("returns 202 for pending transactions without an audit write", async () => {
    const current = runtime();
    current.readTransaction.mockResolvedValueOnce({ status: "pending" });
    const response = await createOwnerControlInclusionHandler(() => current)(
      request(),
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      code: "TRANSACTION_PENDING",
    });
    expect(current.store.recordInclusion).not.toHaveBeenCalled();
  });

  it("rejects client-supplied action or malformed hashes", async () => {
    const withAction = await createOwnerControlInclusionHandler(runtime)(
      request({ action: "pause", transactionHash }),
    );
    expect(withAction.status).toBe(400);
    await expect(withAction.json()).resolves.toMatchObject({
      code: "INVALID_INPUT",
    });

    const malformed = await createOwnerControlInclusionHandler(runtime)(
      request({ transactionHash: "0x1234" }),
    );
    expect(malformed.status).toBe(400);
    await expect(malformed.json()).resolves.toMatchObject({
      code: "INVALID_INPUT",
    });
  });

  it("checks Origin and current session before reading transaction data", async () => {
    const denied = runtime();
    const deniedResponse = await createOwnerControlInclusionHandler(
      () => denied,
    )(request(undefined, "https://evil.example"));
    expect(deniedResponse.status).toBe(403);
    expect(denied.authenticate).not.toHaveBeenCalled();

    const unauthenticated = runtime();
    unauthenticated.authenticate.mockResolvedValueOnce(null);
    const unauthenticatedResponse = await createOwnerControlInclusionHandler(
      () => unauthenticated,
    )(request());
    expect(unauthenticatedResponse.status).toBe(401);
    expect(unauthenticated.readTransaction).not.toHaveBeenCalled();
  });

  it("returns only a stable unavailable code for unexpected failures", async () => {
    const current = runtime();
    current.readTransaction.mockRejectedValueOnce(
      new Error("provider secret detail"),
    );
    const response = await createOwnerControlInclusionHandler(() => current)(
      request(),
    );

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toMatchObject({ code: "OWNER_CONTROL_UNAVAILABLE" });
    expect(JSON.stringify(body)).not.toContain("provider secret detail");
  });
});
