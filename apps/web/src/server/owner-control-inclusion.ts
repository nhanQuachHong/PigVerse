import { getAddress, isAddress } from "viem";

import type {
  OwnerTransactionCall,
  OwnerTransactionObservation,
} from "./owner-transaction-reader";

export type OwnerControlInclusion = {
  action: OwnerTransactionCall["action"];
  actorWallet: `0x${string}`;
  blockHash: `0x${string}`;
  blockNumber: bigint;
  correlationId: string;
  deploymentKey: string;
  newMintPrice: bigint | null;
  transactionHash: `0x${string}`;
  withdrawnAmount: bigint | null;
};

export type OwnerControlInclusionStoreResult =
  { status: "applied" | "duplicate" } | { status: "conflict" };

export interface OwnerControlInclusionStore {
  recordInclusion(
    inclusion: OwnerControlInclusion,
  ): Promise<OwnerControlInclusionStoreResult>;
}

export type OwnerControlInclusionDependencies = {
  deploymentKey: string;
  readTransaction: (
    actorWallet: `0x${string}`,
    transactionHash: `0x${string}`,
  ) => Promise<OwnerTransactionObservation>;
  store: OwnerControlInclusionStore;
};

export type RecordOwnerControlResult =
  | {
      action: OwnerTransactionCall["action"];
      blockHash: `0x${string}`;
      blockNumber: string;
      finality: "included";
      newMintPrice: string | null;
      status: "recorded";
      transactionHash: `0x${string}`;
      withdrawnAmount: string | null;
    }
  | {
      code:
        | "CHAIN_STATE_UNAVAILABLE"
        | "OWNER_CONTROL_CONFLICT"
        | "TRANSACTION_FAILED"
        | "TRANSACTION_INVALID"
        | "TRANSACTION_PENDING";
      status: "error";
    };

export class OwnerControlInclusionError extends Error {
  constructor(readonly code: "INVALID_INPUT") {
    super(code);
  }
}

function fail(
  code: Extract<RecordOwnerControlResult, { status: "error" }>["code"],
): RecordOwnerControlResult {
  return { code, status: "error" };
}

export async function recordOwnerControlInclusion(
  input: {
    actorWallet: string;
    correlationId: string;
    transactionHash: string;
  },
  dependencies: OwnerControlInclusionDependencies,
): Promise<RecordOwnerControlResult> {
  if (
    !isAddress(input.actorWallet) ||
    /^0x0{40}$/iu.test(input.actorWallet) ||
    !/^0x[0-9a-f]{64}$/iu.test(input.transactionHash) ||
    !/^[a-zA-Z0-9_-]{8,128}$/u.test(input.correlationId) ||
    !/^[a-zA-Z0-9:_-]{8,160}$/u.test(dependencies.deploymentKey)
  )
    throw new OwnerControlInclusionError("INVALID_INPUT");
  const actorWallet = getAddress(input.actorWallet);
  const transactionHash = input.transactionHash.toLowerCase() as `0x${string}`;
  const observation = await dependencies.readTransaction(
    actorWallet,
    transactionHash,
  );
  if (observation.status === "unavailable")
    return fail("CHAIN_STATE_UNAVAILABLE");
  if (observation.status === "invalid") return fail("TRANSACTION_INVALID");
  if (observation.status === "pending") return fail("TRANSACTION_PENDING");
  if (observation.status === "failed") return fail("TRANSACTION_FAILED");

  const newMintPrice =
    observation.call.action === "setMintPrice"
      ? observation.call.newPrice
      : null;
  const withdrawnAmount =
    observation.call.action === "withdraw"
      ? (observation.eventAmount ?? null)
      : null;
  if (
    (observation.call.action === "withdraw" && withdrawnAmount === null) ||
    (observation.call.action !== "withdraw" &&
      observation.eventAmount !== undefined)
  )
    return fail("TRANSACTION_INVALID");

  const inclusion: OwnerControlInclusion = {
    action: observation.call.action,
    actorWallet,
    blockHash: observation.blockHash.toLowerCase() as `0x${string}`,
    blockNumber: BigInt(observation.block),
    correlationId: input.correlationId,
    deploymentKey: dependencies.deploymentKey,
    newMintPrice,
    transactionHash,
    withdrawnAmount,
  };
  const stored = await dependencies.store.recordInclusion(inclusion);
  if (stored.status === "conflict") return fail("OWNER_CONTROL_CONFLICT");
  return {
    action: inclusion.action,
    blockHash: inclusion.blockHash,
    blockNumber: inclusion.blockNumber.toString(),
    finality: "included",
    newMintPrice:
      inclusion.newMintPrice === null
        ? null
        : inclusion.newMintPrice.toString(),
    status: "recorded",
    transactionHash,
    withdrawnAmount:
      inclusion.withdrawnAmount === null
        ? null
        : inclusion.withdrawnAmount.toString(),
  };
}
