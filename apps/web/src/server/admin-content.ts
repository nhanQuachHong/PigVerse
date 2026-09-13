import { getAddress, isAddress } from "viem";

import {
  type AdminContentStore,
  type DraftWriteResult,
  type GenesisDeployment,
  type LocalizedDraft,
  type TokenMutationState,
} from "./admin-content-store";
import { GENESIS_TOKEN_IDS } from "../lib/genesis";

export const GENESIS_SEPOLIA_DEPLOYMENT_KEY = "genesis:base-sepolia:84532";

export type AdminContentDependencies = {
  contractAddress: `0x${string}`;
  readTokenStates: () => Promise<Map<number, TokenMutationState>>;
  store: AdminContentStore;
};

export class AdminContentError extends Error {
  constructor(readonly code: "INVALID_INPUT") {
    super(code);
  }
}

function deployment(contractAddress: `0x${string}`): GenesisDeployment {
  return {
    chainId: 84532,
    contractAddress,
    deploymentKey: GENESIS_SEPOLIA_DEPLOYMENT_KEY,
    environment: "base-sepolia",
  };
}

function validateDraft(draft: LocalizedDraft) {
  for (const value of [
    draft.nameVi,
    draft.nameEn,
    draft.descriptionVi,
    draft.descriptionEn,
    draft.storyVi,
    draft.storyEn,
  ])
    if (typeof value !== "string") throw new AdminContentError("INVALID_INPUT");
}

export async function listGenesisContent(
  dependencies: AdminContentDependencies,
) {
  await dependencies.store.ensureDeployment(
    deployment(dependencies.contractAddress),
  );
  const [contents, tokenStates] = await Promise.all([
    dependencies.store.listCurrent(GENESIS_SEPOLIA_DEPLOYMENT_KEY),
    dependencies
      .readTokenStates()
      .catch(() => new Map<number, TokenMutationState>()),
  ]);
  return GENESIS_TOKEN_IDS.map((tokenId) => ({
    chainState: tokenStates.get(tokenId) ?? "unavailable",
    content:
      contents.find((candidate) => candidate.tokenId === tokenId) ?? null,
    tokenId,
  }));
}

export async function saveGenesisDraft(
  input: LocalizedDraft & {
    actorWallet: string;
    correlationId: string;
    expectedRevision: number;
    tokenId: number;
  },
  dependencies: AdminContentDependencies,
): Promise<DraftWriteResult> {
  if (
    !GENESIS_TOKEN_IDS.includes(
      input.tokenId as (typeof GENESIS_TOKEN_IDS)[number],
    ) ||
    !Number.isInteger(input.expectedRevision) ||
    input.expectedRevision < 0 ||
    !isAddress(input.actorWallet) ||
    !/^[a-zA-Z0-9_-]{8,128}$/.test(input.correlationId)
  )
    throw new AdminContentError("INVALID_INPUT");
  validateDraft(input);
  const exactDeployment = deployment(dependencies.contractAddress);
  await dependencies.store.ensureDeployment(exactDeployment);
  return dependencies.store.replaceDraft(
    {
      actorWallet: getAddress(input.actorWallet),
      correlationId: input.correlationId,
      deploymentKey: exactDeployment.deploymentKey,
      descriptionEn: input.descriptionEn,
      descriptionVi: input.descriptionVi,
      expectedRevision: input.expectedRevision,
      nameEn: input.nameEn,
      nameVi: input.nameVi,
      storyEn: input.storyEn,
      storyVi: input.storyVi,
      tokenId: input.tokenId,
    },
    async () => {
      try {
        const states = await dependencies.readTokenStates();
        return states.get(input.tokenId) ?? "unavailable";
      } catch {
        return "unavailable";
      }
    },
  );
}
