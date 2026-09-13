import { getAddress, isAddress } from "viem";

import type { CollectionStatus } from "./collection-state";
import { CHARACTER_CATALOG } from "./character-catalog";
import { loadCollectionState } from "./load-collection-state";

export type PublicDeployment = {
  chainId: 84532;
  contract: `0x${string}`;
  explorerUrl: string;
  network: "Base Sepolia";
};

export type PublicCollection = {
  block: string | null;
  collection: "Pigverse Genesis";
  degraded: boolean;
  deployment: PublicDeployment | null;
  maxSupply: 10;
  mintedCount: number | null;
  publicationState: "known" | "unavailable";
  tokens: Array<{
    artwork: string;
    metadataUri: string | null;
    name: string;
    owner: string | null;
    status: CollectionStatus;
    tokenId: number;
  }>;
};

type ServerChainConfig = PublicDeployment & { rpcUrl: string };
type PublicChainEnvironment = {
  [key: string]: string | undefined;
  BASE_SEPOLIA_RPC_URL?: string;
  NEXT_PUBLIC_CHAIN_ID?: string;
  NEXT_PUBLIC_CONTRACT_ADDRESS?: string;
  PIGVERSE_ENV?: string;
};

export function resolvePublicChainConfig(
  environment: PublicChainEnvironment = process.env,
): ServerChainConfig | null {
  const contract = environment.NEXT_PUBLIC_CONTRACT_ADDRESS;
  const rpcUrl = environment.BASE_SEPOLIA_RPC_URL;
  if (
    environment.PIGVERSE_ENV !== "base-sepolia" ||
    environment.NEXT_PUBLIC_CHAIN_ID !== "84532" ||
    !contract ||
    !isAddress(contract) ||
    !rpcUrl
  )
    return null;
  try {
    const endpoint = new URL(rpcUrl);
    if (endpoint.protocol !== "https:" && endpoint.protocol !== "http:")
      return null;
  } catch {
    return null;
  }
  const checkedContract = getAddress(contract);
  return {
    chainId: 84532,
    contract: checkedContract,
    explorerUrl: `https://sepolia.basescan.org/address/${checkedContract}`,
    network: "Base Sepolia",
    rpcUrl,
  };
}

export async function getPublicCollection(
  environment: PublicChainEnvironment = process.env,
): Promise<PublicCollection> {
  const config = resolvePublicChainConfig(environment);
  let snapshot: Awaited<ReturnType<typeof loadCollectionState>> | null = null;
  if (config) {
    try {
      snapshot = await loadCollectionState(config, null);
    } catch {
      // Public state degrades without exposing provider/configuration details.
    }
  }
  const deployment = config
    ? {
        chainId: config.chainId,
        contract: config.contract,
        explorerUrl: config.explorerUrl,
        network: config.network,
      }
    : null;
  return {
    collection: "Pigverse Genesis",
    maxSupply: 10,
    block: snapshot?.block ?? null,
    mintedCount: snapshot?.mintedCount ?? null,
    degraded: snapshot?.degraded ?? true,
    deployment,
    publicationState:
      snapshot?.publicationState === "known" ? "known" : "unavailable",
    tokens: CHARACTER_CATALOG.map((character) => {
      const state = snapshot?.tokens.find(
        (token) => token.tokenId === character.tokenId,
      );
      return {
        ...character,
        metadataUri: snapshot?.metadataUris.get(character.tokenId) ?? null,
        status: state?.status ?? "unknown",
        owner: state?.owner ?? null,
      };
    }),
  };
}
