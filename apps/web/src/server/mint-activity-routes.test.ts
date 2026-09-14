import { describe, expect, it, vi } from "vitest";

import { createAdminMintActivityHandler } from "../../app/api/admin/mint-activity/route";
import { createMintActivityIngestionHandler } from "../../app/api/mint-activity/route";
import type {
  MintActivityRecord,
  MintActivityStore,
} from "./mint-activity-store";
import type { MintTransactionObservation } from "./mint-transaction-reader";

const appOrigin = "https://pigverse.example";
const transactionHash = `0x${"a".repeat(64)}` as const;
const senderWallet = `0x${"b".repeat(40)}` as const;
const ownerWallet = `0x${"c".repeat(40)}` as const;
const blockHash = `0x${"d".repeat(64)}` as const;
const session = {
  expiresAt: new Date("2026-09-13T00:30:00.000Z"),
  issuedAt: new Date("2026-09-13T00:00:00.000Z"),
  revokedAt: null,
  tokenHash: "hash",
  walletAddress: ownerWallet,
};

const pendingObservation: MintTransactionObservation = {
  call: { expectedPublicationRevision: 4n, tokenId: 3, value: 0n },
  senderWallet,
  status: "pending",
};

const record: MintActivityRecord = {
  blockHash: null,
  blockNumber: null,
  deploymentKey: "genesis:base-sepolia:84532",
  expectedPublicationRevision: 4n,
  firstSeenAt: new Date("2026-09-13T00:00:00.000Z"),
  lastObservedAt: new Date("2026-09-13T00:01:00.000Z"),
  mintObservationId: "1",
  observedOwnerWallet: null,
  safeErrorCategory: null,
  senderWallet,
  status: "PENDING",
  tokenId: 3,
  transactionHash,
  transferLogIndex: null,
};

function storeFixture({ records = [] as MintActivityRecord[] } = {}) {
  return {
    find: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue(records),
    upsert: vi.fn().mockResolvedValue({ record, status: "recorded" }),
  } satisfies MintActivityStore;
}

function postRequest(body: unknown = { transactionHash }, origin = appOrigin) {
  return new Request(`${appOrigin}/api/mint-activity`, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", Origin: origin },
    method: "POST",
  });
}

describe("mint activity route boundaries", () => {
  it("ingests only same-origin hashes after deriving transaction evidence", async () => {
    const store = storeFixture();
    const readTransaction = vi.fn().mockResolvedValue(pendingObservation);
    const response = await createMintActivityIngestionHandler(() => ({
      appOrigin,
      readTransaction,
      store,
    }))(postRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(readTransaction).toHaveBeenCalledWith(transactionHash);
    expect(store.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        senderWallet,
        status: "PENDING",
        tokenId: 3,
        transactionHash,
      }),
    );
    expect(body.activity).toMatchObject({ status: "PENDING", tokenId: 3 });
  });

  it("denies cross-origin ingestion before chain or database access", async () => {
    const store = storeFixture();
    const readTransaction = vi.fn();
    const response = await createMintActivityIngestionHandler(() => ({
      appOrigin,
      readTransaction,
      store,
    }))(postRequest(undefined, "https://evil.example"));

    expect(response.status).toBe(403);
    expect(readTransaction).not.toHaveBeenCalled();
    expect(store.find).not.toHaveBeenCalled();
  });

  it("does not accept client-supplied status, token or wallet fields", async () => {
    const store = storeFixture();
    const readTransaction = vi.fn();
    const response = await createMintActivityIngestionHandler(() => ({
      appOrigin,
      readTransaction,
      store,
    }))(
      postRequest({
        status: "SUCCEEDED",
        tokenId: 1,
        transactionHash,
        wallet: ownerWallet,
      }),
    );

    expect(response.status).toBe(400);
    expect(readTransaction).not.toHaveBeenCalled();
    expect(store.find).not.toHaveBeenCalled();
  });

  it("returns accepted without persisting a hash not yet visible to RPC", async () => {
    const store = storeFixture();
    const response = await createMintActivityIngestionHandler(() => ({
      appOrigin,
      readTransaction: vi.fn().mockResolvedValue({ status: "unknown" }),
      store,
    }))(postRequest());

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ status: "not-visible" });
    expect(store.upsert).not.toHaveBeenCalled();
  });

  it("denies unauthenticated Admin reads before listing or reconciling", async () => {
    const store = storeFixture({ records: [record] });
    const readTransaction = vi.fn();
    const response = await createAdminMintActivityHandler(() => ({
      authenticate: vi.fn().mockResolvedValue(null),
      readTransaction,
      store,
    }))(new Request(`${appOrigin}/api/admin/mint-activity`));

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(store.list).not.toHaveBeenCalled();
    expect(readTransaction).not.toHaveBeenCalled();
  });

  it("returns a paginated, chain-reconciled Admin activity page", async () => {
    const store = storeFixture({ records: [record] });
    store.find.mockResolvedValue(record);
    const readTransaction = vi.fn().mockResolvedValue({
      block: "0xabc",
      blockHash,
      call: { expectedPublicationRevision: 4n, tokenId: 3, value: 0n },
      ownerWallet,
      senderWallet,
      status: "succeeded",
      transferLogIndex: 7,
    } satisfies MintTransactionObservation);
    store.upsert.mockResolvedValue({
      record: {
        ...record,
        blockHash,
        blockNumber: 2748n,
        observedOwnerWallet: ownerWallet,
        status: "SUCCEEDED",
        transferLogIndex: 7,
      },
      status: "recorded",
    });
    const response = await createAdminMintActivityHandler(() => ({
      authenticate: vi.fn().mockResolvedValue(session),
      readTransaction,
      store,
    }))(new Request(`${appOrigin}/api/admin/mint-activity?limit=10`));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.activities).toEqual([
      expect.objectContaining({
        finality: "included",
        observedOwnerWallet: ownerWallet,
        status: "SUCCEEDED",
      }),
    ]);
    expect(store.list).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 11 }),
    );
  });
});
