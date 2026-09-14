import { getAddress, isAddress } from "viem";

import type { ContentLifecycle } from "./admin-content-store";
import type { PublicationAction } from "./admin-publication";
import type { PublicationSnapshot } from "./publication-reader";
import type { PublicationTransactionObservation } from "./publication-transaction-reader";

export type PublicationInclusion = {
  action: PublicationAction;
  actorWallet: `0x${string}`;
  blockHash: `0x${string}`;
  blockNumber: bigint;
  correlationId: string;
  deploymentKey: string;
  expectedPublicationRevision: bigint;
  metadataIpfsUri: `ipfs://${string}` | null;
  observedPublicationRevision: bigint;
  observedTokenState: "minted" | "unminted";
  tokenId: number;
  transactionHash: `0x${string}`;
};

export type PublicationInclusionStoreResult =
  | {
      contentId: string;
      contentRevision: number;
      lifecycleState: ContentLifecycle;
      status: "applied" | "duplicate";
    }
  | { status: "conflict" };

export interface PublicationInclusionStore {
  recordInclusion(
    inclusion: PublicationInclusion,
  ): Promise<PublicationInclusionStoreResult>;
}

export type PublicationInclusionDependencies = {
  deploymentKey: string;
  readSnapshot: (tokenId: number) => Promise<PublicationSnapshot | null>;
  readTransaction: (
    actorWallet: `0x${string}`,
    transactionHash: `0x${string}`,
  ) => Promise<PublicationTransactionObservation>;
  store: PublicationInclusionStore;
};

export type RecordPublicationResult =
  | {
      action: PublicationAction;
      contentId: string;
      contentRevision: number;
      finality: "included";
      lifecycleState: ContentLifecycle;
      publicationRevision: string;
      status: "recorded";
      tokenId: number;
      transactionHash: `0x${string}`;
    }
  | {
      code:
        | "CHAIN_STATE_UNAVAILABLE"
        | "PUBLICATION_STATE_CONFLICT"
        | "TOKEN_ALREADY_MINTED"
        | "TRANSACTION_FAILED"
        | "TRANSACTION_INVALID"
        | "TRANSACTION_PENDING";
      status: "error";
    };

export class PublicationInclusionError extends Error {
  constructor(readonly code: "INVALID_INPUT") {
    super(code);
  }
}

function fail(
  code: Extract<RecordPublicationResult, { status: "error" }>["code"],
): RecordPublicationResult {
  return { code, status: "error" };
}

export async function recordPublicationInclusion(
  input: {
    actorWallet: string;
    correlationId: string;
    tokenId: number;
    transactionHash: string;
  },
  dependencies: PublicationInclusionDependencies,
): Promise<RecordPublicationResult> {
  if (
    !isAddress(input.actorWallet) ||
    /^0x0{40}$/iu.test(input.actorWallet) ||
    !Number.isInteger(input.tokenId) ||
    input.tokenId < 1 ||
    input.tokenId > 10 ||
    !/^0x[0-9a-f]{64}$/iu.test(input.transactionHash) ||
    !/^[a-zA-Z0-9_-]{8,128}$/u.test(input.correlationId)
  )
    throw new PublicationInclusionError("INVALID_INPUT");
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
  if (observation.call.tokenId !== input.tokenId)
    return fail("TRANSACTION_INVALID");

  const snapshot = await dependencies.readSnapshot(observation.call.tokenId);
  if (!snapshot) return fail("CHAIN_STATE_UNAVAILABLE");
  const observedRevision = observation.call.expectedPublicationRevision + 1n;
  const targetUri = observation.call.metadataIpfsUri;
  if (
    BigInt(snapshot.block) < BigInt(observation.block) ||
    snapshot.publicationRevision !== observedRevision ||
    snapshot.metadataUri !== targetUri
  )
    return fail("PUBLICATION_STATE_CONFLICT");
  if (
    observation.call.action === "unpublish" &&
    snapshot.tokenState === "minted"
  )
    return fail("TOKEN_ALREADY_MINTED");

  const stored = await dependencies.store.recordInclusion({
    action: observation.call.action,
    actorWallet,
    blockHash: observation.blockHash.toLowerCase() as `0x${string}`,
    blockNumber: BigInt(observation.block),
    correlationId: input.correlationId,
    deploymentKey: dependencies.deploymentKey,
    expectedPublicationRevision: observation.call.expectedPublicationRevision,
    metadataIpfsUri: targetUri,
    observedPublicationRevision: observedRevision,
    observedTokenState: snapshot.tokenState,
    tokenId: observation.call.tokenId,
    transactionHash,
  });
  if (stored.status === "conflict") return fail("PUBLICATION_STATE_CONFLICT");
  return {
    action: observation.call.action,
    contentId: stored.contentId,
    contentRevision: stored.contentRevision,
    finality: "included",
    lifecycleState: stored.lifecycleState,
    publicationRevision: observedRevision.toString(),
    status: "recorded",
    tokenId: observation.call.tokenId,
    transactionHash,
  };
}
