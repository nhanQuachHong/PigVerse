import { getAddress } from "viem";
import { describe, expect, it, vi } from "vitest";

import {
  type OwnerControlInclusion,
  type OwnerControlInclusionStoreResult,
  OwnerControlInclusionError,
  recordOwnerControlInclusion,
} from "./owner-control-inclusion";
import type { OwnerTransactionObservation } from "./owner-transaction-reader";

const actorWallet = `0x${"a".repeat(40)}` as const;
const transactionHash = `0x${"b".repeat(64)}` as const;
const blockHash = `0x${"c".repeat(64)}` as const;

function fixture(observation: OwnerTransactionObservation) {
  const recordInclusion = vi.fn<
    (
      inclusion: OwnerControlInclusion,
    ) => Promise<OwnerControlInclusionStoreResult>
  >(async () => ({ status: "applied" }));
  return {
    dependencies: {
      deploymentKey: "genesis:base-sepolia:84532",
      readTransaction: vi.fn(async () => observation),
      store: { recordInclusion },
    },
    recordInclusion,
  };
}

describe("Owner control inclusion", () => {
  it("persists only normalized included pause evidence", async () => {
    const { dependencies, recordInclusion } = fixture({
      block: "0xabc",
      blockHash,
      call: { action: "pause" },
      status: "included",
    });

    await expect(
      recordOwnerControlInclusion(
        {
          actorWallet,
          correlationId: "correlation-1",
          transactionHash: transactionHash.toUpperCase().replace("0X", "0x"),
        },
        dependencies,
      ),
    ).resolves.toEqual({
      action: "pause",
      blockHash,
      blockNumber: "2748",
      finality: "included",
      newMintPrice: null,
      status: "recorded",
      transactionHash,
      withdrawnAmount: null,
    });
    expect(recordInclusion).toHaveBeenCalledWith(
      expect.objectContaining({
        actorWallet: getAddress(actorWallet),
        blockNumber: 2748n,
        transactionHash,
      }),
    );
  });

  it("derives price and withdrawal values from verified chain evidence", async () => {
    const price = fixture({
      block: "0xabc",
      blockHash,
      call: { action: "setMintPrice", newPrice: 5n },
      status: "included",
    });
    await expect(
      recordOwnerControlInclusion(
        { actorWallet, correlationId: "correlation-1", transactionHash },
        price.dependencies,
      ),
    ).resolves.toMatchObject({ newMintPrice: "5", withdrawnAmount: null });

    const withdrawal = fixture({
      block: "0xabc",
      blockHash,
      call: { action: "withdraw" },
      eventAmount: 9n,
      status: "included",
    });
    await expect(
      recordOwnerControlInclusion(
        { actorWallet, correlationId: "correlation-2", transactionHash },
        withdrawal.dependencies,
      ),
    ).resolves.toMatchObject({ newMintPrice: null, withdrawnAmount: "9" });
  });

  it.each([
    ["unavailable", "CHAIN_STATE_UNAVAILABLE"],
    ["invalid", "TRANSACTION_INVALID"],
    ["pending", "TRANSACTION_PENDING"],
    ["failed", "TRANSACTION_FAILED"],
  ] as const)("maps %s evidence without writing", async (status, code) => {
    const observation: OwnerTransactionObservation =
      status === "pending"
        ? { status }
        : status === "failed"
          ? { call: { action: "pause" }, status }
          : { status };
    const { dependencies, recordInclusion } = fixture(observation);

    await expect(
      recordOwnerControlInclusion(
        { actorWallet, correlationId: "correlation-1", transactionHash },
        dependencies,
      ),
    ).resolves.toEqual({ code, status: "error" });
    expect(recordInclusion).not.toHaveBeenCalled();
  });

  it("rejects missing withdrawal event evidence", async () => {
    const { dependencies, recordInclusion } = fixture({
      block: "0xabc",
      blockHash,
      call: { action: "withdraw" },
      status: "included",
    });

    await expect(
      recordOwnerControlInclusion(
        { actorWallet, correlationId: "correlation-1", transactionHash },
        dependencies,
      ),
    ).resolves.toEqual({ code: "TRANSACTION_INVALID", status: "error" });
    expect(recordInclusion).not.toHaveBeenCalled();
  });

  it("surfaces idempotency conflicts without reporting success", async () => {
    const { dependencies } = fixture({
      block: "0xabc",
      blockHash,
      call: { action: "unpause" },
      status: "included",
    });
    dependencies.store.recordInclusion = vi.fn(async () => ({
      status: "conflict" as const,
    }));

    await expect(
      recordOwnerControlInclusion(
        { actorWallet, correlationId: "correlation-1", transactionHash },
        dependencies,
      ),
    ).resolves.toEqual({ code: "OWNER_CONTROL_CONFLICT", status: "error" });
  });

  it("rejects malformed input before reading chain", async () => {
    const { dependencies } = fixture({ status: "pending" });

    await expect(
      recordOwnerControlInclusion(
        {
          actorWallet,
          correlationId: "short",
          transactionHash,
        },
        dependencies,
      ),
    ).rejects.toBeInstanceOf(OwnerControlInclusionError);
    expect(dependencies.readTransaction).not.toHaveBeenCalled();
  });
});
