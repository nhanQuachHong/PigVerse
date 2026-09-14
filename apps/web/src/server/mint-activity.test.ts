import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  type MintActivityEvidence,
  type MintActivityPageQuery,
  type MintActivityRecord,
  type MintActivityStore,
} from "./mint-activity-store";
import type { MintTransactionObservation } from "./mint-transaction-reader";
import { listMintActivity, observeMintActivity } from "./mint-activity";

const senderWallet = `0x${"a".repeat(40)}` as const;
const ownerWallet = `0x${"e".repeat(40)}` as const;
const blockHash = `0x${"d".repeat(64)}` as const;
const hashes = ["a", "b", "c"].map(
  (character) => `0x${character.repeat(64)}` as `0x${string}`,
);

class MemoryMintActivityStore implements MintActivityStore {
  readonly records = new Map<string, MintActivityRecord>();
  private nextId = 1;

  async find(deployment: string, transactionHash: `0x${string}`) {
    return this.records.get(`${deployment}:${transactionHash}`) ?? null;
  }

  async list(query: MintActivityPageQuery) {
    return [...this.records.values()]
      .filter(
        (record) =>
          record.deploymentKey === query.deploymentKey &&
          (query.beforeObservationId === null ||
            BigInt(record.mintObservationId) < query.beforeObservationId),
      )
      .sort(
        (left, right) =>
          Number(right.mintObservationId) - Number(left.mintObservationId),
      )
      .slice(0, query.limit);
  }

  async upsert(evidence: MintActivityEvidence) {
    const key = `${evidence.deploymentKey}:${evidence.transactionHash}`;
    const current = this.records.get(key);
    if (
      current &&
      (current.tokenId !== evidence.tokenId ||
        current.senderWallet !== evidence.senderWallet ||
        current.expectedPublicationRevision !==
          evidence.expectedPublicationRevision)
    )
      return { status: "conflict" as const };
    const record: MintActivityRecord = {
      ...structuredClone(evidence),
      firstSeenAt: current?.firstSeenAt ?? new Date("2026-09-13T00:00:00.000Z"),
      lastObservedAt: new Date("2026-09-13T00:01:00.000Z"),
      mintObservationId: current?.mintObservationId ?? String(this.nextId++),
    };
    this.records.set(key, record);
    return { record, status: "recorded" as const };
  }
}

function observation(
  status: "pending" | "reverted" | "succeeded",
  tokenId = 3,
): Extract<
  MintTransactionObservation,
  { status: "pending" | "reverted" | "succeeded" }
> {
  const common = {
    call: { expectedPublicationRevision: 4n, tokenId, value: 42n },
    senderWallet,
  };
  if (status === "pending") return { ...common, status };
  if (status === "reverted")
    return { ...common, block: "0xabc", blockHash, status };
  return {
    ...common,
    block: "0xabc",
    blockHash,
    ownerWallet,
    status,
    transferLogIndex: 7,
  };
}

describe("mint activity reconciliation", () => {
  let store: MemoryMintActivityStore;
  let readTransaction: ReturnType<
    typeof vi.fn<(hash: `0x${string}`) => Promise<MintTransactionObservation>>
  >;

  beforeEach(() => {
    store = new MemoryMintActivityStore();
    readTransaction = vi.fn();
  });

  it("updates one logical attempt from pending to succeeded without duplication", async () => {
    readTransaction
      .mockResolvedValueOnce(observation("pending"))
      .mockResolvedValueOnce(observation("succeeded"));
    const dependencies = { readTransaction, store };

    await expect(
      observeMintActivity(hashes[0], dependencies),
    ).resolves.toMatchObject({
      activity: { finality: null, status: "PENDING" },
      status: "recorded",
    });
    await expect(
      observeMintActivity(hashes[0], dependencies),
    ).resolves.toMatchObject({
      activity: {
        finality: "included",
        observedOwnerWallet: ownerWallet,
        status: "SUCCEEDED",
      },
      status: "recorded",
    });
    expect(store.records).toHaveLength(1);
    expect([...store.records.values()][0]?.mintObservationId).toBe("1");
  });

  it("does not persist an unknown new hash", async () => {
    readTransaction.mockResolvedValue({ status: "unknown" });

    await expect(
      observeMintActivity(hashes[0], { readTransaction, store }),
    ).resolves.toEqual({ status: "not-visible" });
    expect(store.records).toHaveLength(0);
  });

  it("downgrades a dropped included transaction to explicit UNKNOWN", async () => {
    readTransaction
      .mockResolvedValueOnce(observation("succeeded"))
      .mockResolvedValueOnce({ status: "unknown" });
    const dependencies = { readTransaction, store };
    await observeMintActivity(hashes[0], dependencies);

    await expect(
      observeMintActivity(hashes[0], dependencies),
    ).resolves.toMatchObject({
      activity: {
        blockHash: null,
        finality: null,
        safeErrorCategory: "TRANSACTION_NOT_FOUND",
        status: "UNKNOWN",
      },
    });
  });

  it("preserves stored evidence during an RPC outage", async () => {
    readTransaction
      .mockResolvedValueOnce(observation("succeeded"))
      .mockResolvedValueOnce({ status: "unavailable" });
    const dependencies = { readTransaction, store };
    await observeMintActivity(hashes[0], dependencies);

    await expect(
      observeMintActivity(hashes[0], dependencies),
    ).resolves.toMatchObject({
      activity: { reconciliation: "unavailable", status: "SUCCEEDED" },
    });
  });

  it("returns success, reverted and pending outcomes distinctly on one page", async () => {
    for (const [index, status] of [
      "succeeded",
      "reverted",
      "pending",
    ].entries()) {
      readTransaction.mockResolvedValueOnce(
        observation(status as "pending" | "reverted" | "succeeded", index + 1),
      );
      await observeMintActivity(hashes[index], { readTransaction, store });
    }
    readTransaction.mockImplementation(async (hash) => {
      const index = hashes.indexOf(hash);
      return observation(
        (["succeeded", "reverted", "pending"] as const)[index]!,
        index + 1,
      );
    });

    const result = await listMintActivity(
      { cursor: null, limit: "3" },
      { readTransaction, store },
    );
    expect(result.activities.map((activity) => activity.status).sort()).toEqual(
      ["PENDING", "REVERTED", "SUCCEEDED"],
    );
    expect(result.nextCursor).toBeNull();
    expect(store.records).toHaveLength(3);
  });

  it("rejects malformed input before reading chain or storage", async () => {
    await expect(
      observeMintActivity("0x1234", { readTransaction, store }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(readTransaction).not.toHaveBeenCalled();
    expect(store.records).toHaveLength(0);
  });

  it.each([
    { cursor: null, limit: "0" },
    { cursor: null, limit: "51" },
    { cursor: "latest", limit: null },
    { cursor: "9223372036854775808", limit: "10" },
  ])("rejects an invalid activity page %#", async (input) => {
    await expect(
      listMintActivity(input, { readTransaction, store }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(readTransaction).not.toHaveBeenCalled();
  });
});
