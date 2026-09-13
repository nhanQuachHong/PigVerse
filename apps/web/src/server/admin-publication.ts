import { encodeFunctionData } from "viem";

import { GENESIS_TOKEN_IDS } from "../lib/genesis";
import { genesisAbi } from "../lib/genesis-contract";
import type { ContentLifecycle } from "./admin-content-store";
import type { AssetPackageStatus } from "./asset-pipeline";
import type { PublicationSnapshot } from "./publication-reader";

export type PublicationAction = "publish" | "unpublish";

export type PublicationCandidate = {
  assetStatus: AssetPackageStatus | null;
  contentId: string;
  contentRevision: number;
  lifecycleState: ContentLifecycle;
  metadataIpfsUri: `ipfs://${string}` | null;
  tokenId: number;
};

export interface PublicationCandidateStore {
  loadCurrent(
    deploymentKey: string,
    tokenId: number,
  ): Promise<PublicationCandidate | null>;
}

export type AdminPublicationDependencies = {
  chainId: 84532;
  contractAddress: `0x${string}`;
  deploymentKey: string;
  readSnapshot: (tokenId: number) => Promise<PublicationSnapshot | null>;
  store: PublicationCandidateStore;
};

export type PreparePublicationResult =
  | {
      action: PublicationAction;
      block: `0x${string}`;
      contentId: string;
      contentRevision: number;
      expectedPublicationRevision: string;
      metadataIpfsUri: `ipfs://${string}` | null;
      status: "prepared";
      transaction: {
        chainId: 84532;
        data: `0x${string}`;
        to: `0x${string}`;
        value: "0x0";
      };
    }
  | {
      code:
        | "ASSET_NOT_READY"
        | "CHAIN_STATE_UNAVAILABLE"
        | "PUBLICATION_STATE_CONFLICT"
        | "TOKEN_ALREADY_MINTED";
      status: "error";
    };

export class AdminPublicationError extends Error {
  constructor(readonly code: "INVALID_INPUT") {
    super(code);
  }
}

function fail(
  code: Extract<PreparePublicationResult, { status: "error" }>["code"],
): PreparePublicationResult {
  return { code, status: "error" };
}

export async function preparePublicationTransaction(
  input: { action: PublicationAction; tokenId: number },
  dependencies: AdminPublicationDependencies,
): Promise<PreparePublicationResult> {
  if (
    !GENESIS_TOKEN_IDS.includes(
      input.tokenId as (typeof GENESIS_TOKEN_IDS)[number],
    ) ||
    (input.action !== "publish" && input.action !== "unpublish")
  )
    throw new AdminPublicationError("INVALID_INPUT");

  const candidate = await dependencies.store.loadCurrent(
    dependencies.deploymentKey,
    input.tokenId,
  );
  if (
    !candidate ||
    candidate.tokenId !== input.tokenId ||
    candidate.assetStatus !== "COMPLETE" ||
    !candidate.metadataIpfsUri ||
    !/^ipfs:\/\/[A-Za-z0-9][^\s]*$/u.test(candidate.metadataIpfsUri)
  )
    return fail("ASSET_NOT_READY");
  if (
    (input.action === "publish" && candidate.lifecycleState !== "READY") ||
    (input.action === "unpublish" && candidate.lifecycleState !== "PUBLISHED")
  )
    return fail("PUBLICATION_STATE_CONFLICT");

  const snapshot = await dependencies.readSnapshot(input.tokenId);
  if (!snapshot) return fail("CHAIN_STATE_UNAVAILABLE");
  if (snapshot.tokenState === "minted") return fail("TOKEN_ALREADY_MINTED");
  if (
    (input.action === "publish" &&
      snapshot.metadataUri === candidate.metadataIpfsUri) ||
    (input.action === "unpublish" && snapshot.metadataUri === null)
  )
    return fail("PUBLICATION_STATE_CONFLICT");

  const data =
    input.action === "publish"
      ? encodeFunctionData({
          abi: genesisAbi,
          args: [
            BigInt(input.tokenId),
            snapshot.publicationRevision,
            candidate.metadataIpfsUri,
          ],
          functionName: "publish",
        })
      : encodeFunctionData({
          abi: genesisAbi,
          args: [BigInt(input.tokenId), snapshot.publicationRevision],
          functionName: "unpublish",
        });
  return {
    action: input.action,
    block: snapshot.block,
    contentId: candidate.contentId,
    contentRevision: candidate.contentRevision,
    expectedPublicationRevision: snapshot.publicationRevision.toString(),
    metadataIpfsUri:
      input.action === "publish" ? candidate.metadataIpfsUri : null,
    status: "prepared",
    transaction: {
      chainId: dependencies.chainId,
      data,
      to: dependencies.contractAddress,
      value: "0x0",
    },
  };
}
