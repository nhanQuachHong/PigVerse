import type { AdminPublicationDependencies } from "./admin-publication";
import { GENESIS_SEPOLIA_DEPLOYMENT_KEY } from "./admin-content";
import { getDatabase } from "./database";
import type { PublicationInclusionDependencies } from "./publication-inclusion";
import { PostgresPublicationInclusionStore } from "./publication-inclusion-store";
import { readPublicationSnapshot } from "./publication-reader";
import { PostgresPublicationCandidateStore } from "./publication-candidate-store";
import { readPublicationTransaction } from "./publication-transaction-reader";
import { createRpcRead } from "../lib/rpc-transport";
import { resolvePublicChainConfig } from "../lib/public-collection";

export function getAdminPublicationRuntime(): AdminPublicationDependencies {
  const config = resolvePublicChainConfig();
  if (!config) throw new Error("Admin publication is unavailable");
  const rpc = createRpcRead(config.rpcUrl);
  return {
    chainId: config.chainId,
    contractAddress: config.contract,
    deploymentKey: GENESIS_SEPOLIA_DEPLOYMENT_KEY,
    readSnapshot: (tokenId) => readPublicationSnapshot(rpc, config, tokenId),
    store: new PostgresPublicationCandidateStore(getDatabase()),
  };
}

export function getPublicationInclusionRuntime(): PublicationInclusionDependencies {
  const config = resolvePublicChainConfig();
  if (!config) throw new Error("Admin publication is unavailable");
  const rpc = createRpcRead(config.rpcUrl);
  return {
    deploymentKey: GENESIS_SEPOLIA_DEPLOYMENT_KEY,
    readSnapshot: (tokenId) => readPublicationSnapshot(rpc, config, tokenId),
    readTransaction: (actorWallet, transactionHash) =>
      readPublicationTransaction(
        rpc,
        {
          actorWallet,
          chainId: config.chainId,
          contract: config.contract,
        },
        transactionHash,
      ),
    store: new PostgresPublicationInclusionStore(getDatabase()),
  };
}
