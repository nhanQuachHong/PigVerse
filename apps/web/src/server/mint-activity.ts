import type {
  MintActivityEvidence,
  MintActivityRecord,
  MintActivityStore,
} from "./mint-activity-store";
import { GENESIS_SEPOLIA_DEPLOYMENT_KEY } from "./admin-content";
import type { MintTransactionObservation } from "./mint-transaction-reader";

const defaultPageSize = 20;
const maximumPageSize = 50;
const maximumObservationId = 9_223_372_036_854_775_807n;

export type MintActivityDependencies = {
  readTransaction: (
    transactionHash: `0x${string}`,
  ) => Promise<MintTransactionObservation>;
  store: MintActivityStore;
};

export class MintActivityError extends Error {
  constructor(readonly code: "INVALID_INPUT") {
    super(code);
  }
}

function isHash(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[0-9a-f]{64}$/iu.test(value);
}

function parseLimit(value: string | null) {
  if (value === null) return defaultPageSize;
  if (!/^[1-9][0-9]*$/u.test(value))
    throw new MintActivityError("INVALID_INPUT");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > maximumPageSize)
    throw new MintActivityError("INVALID_INPUT");
  return parsed;
}

function parseCursor(value: string | null) {
  if (value === null) return null;
  if (!/^[1-9][0-9]{0,18}$/u.test(value))
    throw new MintActivityError("INVALID_INPUT");
  const parsed = BigInt(value);
  if (parsed > maximumObservationId)
    throw new MintActivityError("INVALID_INPUT");
  return parsed;
}

function evidenceFromObservation(
  transactionHash: `0x${string}`,
  observation: Extract<
    MintTransactionObservation,
    { status: "pending" | "reverted" | "succeeded" }
  >,
): MintActivityEvidence {
  const included = observation.status !== "pending";
  return {
    blockHash: included
      ? (observation.blockHash.toLowerCase() as `0x${string}`)
      : null,
    blockNumber: included ? BigInt(observation.block) : null,
    deploymentKey: GENESIS_SEPOLIA_DEPLOYMENT_KEY,
    expectedPublicationRevision: observation.call.expectedPublicationRevision,
    observedOwnerWallet:
      observation.status === "succeeded" ? observation.ownerWallet : null,
    safeErrorCategory: observation.status === "reverted" ? "EVM_REVERT" : null,
    senderWallet: observation.senderWallet,
    status:
      observation.status === "succeeded"
        ? "SUCCEEDED"
        : observation.status === "reverted"
          ? "REVERTED"
          : "PENDING",
    tokenId: observation.call.tokenId,
    transactionHash,
    transferLogIndex:
      observation.status === "succeeded" ? observation.transferLogIndex : null,
  };
}

function unknownEvidence(
  existing: MintActivityRecord,
  safeErrorCategory: "CHAIN_EVIDENCE_INVALID" | "TRANSACTION_NOT_FOUND",
): MintActivityEvidence {
  return {
    blockHash: null,
    blockNumber: null,
    deploymentKey: existing.deploymentKey,
    expectedPublicationRevision: existing.expectedPublicationRevision,
    observedOwnerWallet: null,
    safeErrorCategory,
    senderWallet: existing.senderWallet,
    status: "UNKNOWN",
    tokenId: existing.tokenId,
    transactionHash: existing.transactionHash,
    transferLogIndex: null,
  };
}

async function reconcile(
  transactionHash: `0x${string}`,
  existing: MintActivityRecord | null,
  dependencies: MintActivityDependencies,
) {
  const observation = await dependencies.readTransaction(transactionHash);
  if (observation.status === "unavailable")
    return existing
      ? { record: existing, reconciliation: "unavailable" as const }
      : { status: "unavailable" as const };
  if (observation.status === "unknown" || observation.status === "invalid") {
    if (!existing)
      return {
        status:
          observation.status === "unknown"
            ? ("not-visible" as const)
            : ("invalid" as const),
      };
    const result = await dependencies.store.upsert(
      unknownEvidence(
        existing,
        observation.status === "unknown"
          ? "TRANSACTION_NOT_FOUND"
          : "CHAIN_EVIDENCE_INVALID",
      ),
    );
    return result.status === "conflict"
      ? { status: "conflict" as const }
      : { record: result.record, reconciliation: "current" as const };
  }
  const result = await dependencies.store.upsert(
    evidenceFromObservation(transactionHash, observation),
  );
  return result.status === "conflict"
    ? { status: "conflict" as const }
    : { record: result.record, reconciliation: "current" as const };
}

function serialize(record: MintActivityRecord, reconciliation: string) {
  return {
    blockHash: record.blockHash,
    blockNumber: record.blockNumber?.toString() ?? null,
    expectedPublicationRevision: record.expectedPublicationRevision.toString(),
    finality: record.status === "SUCCEEDED" ? "included" : null,
    firstSeenAt: record.firstSeenAt.toISOString(),
    lastObservedAt: record.lastObservedAt.toISOString(),
    mintObservationId: record.mintObservationId,
    observedOwnerWallet: record.observedOwnerWallet,
    reconciliation,
    safeErrorCategory: record.safeErrorCategory,
    senderWallet: record.senderWallet,
    status: record.status,
    tokenId: record.tokenId,
    transactionHash: record.transactionHash,
    transferLogIndex: record.transferLogIndex,
  };
}

export async function observeMintActivity(
  transactionHashInput: unknown,
  dependencies: MintActivityDependencies,
) {
  if (!isHash(transactionHashInput))
    throw new MintActivityError("INVALID_INPUT");
  const transactionHash = transactionHashInput.toLowerCase() as `0x${string}`;
  const existing = await dependencies.store.find(
    GENESIS_SEPOLIA_DEPLOYMENT_KEY,
    transactionHash,
  );
  const result = await reconcile(transactionHash, existing, dependencies);
  return "record" in result && result.record
    ? {
        activity: serialize(result.record, result.reconciliation),
        status: "recorded" as const,
      }
    : result;
}

export async function listMintActivity(
  input: { cursor: string | null; limit: string | null },
  dependencies: MintActivityDependencies,
) {
  const limit = parseLimit(input.limit);
  const records = await dependencies.store.list({
    beforeObservationId: parseCursor(input.cursor),
    deploymentKey: GENESIS_SEPOLIA_DEPLOYMENT_KEY,
    limit: limit + 1,
  });
  const page = records.slice(0, limit);
  const reconciled = await Promise.all(
    page.map(async (record) => {
      const result = await reconcile(
        record.transactionHash,
        record,
        dependencies,
      );
      return "record" in result && result.record
        ? serialize(result.record, result.reconciliation)
        : serialize(record, result.status);
    }),
  );
  return {
    activities: reconciled,
    nextCursor:
      records.length > limit && page.length > 0
        ? page[page.length - 1]!.mintObservationId
        : null,
  };
}
