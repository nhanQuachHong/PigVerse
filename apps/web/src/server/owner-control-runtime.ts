import { createRpcRead } from "../lib/rpc-transport";
import { resolvePublicChainConfig } from "../lib/public-collection";
import { GENESIS_SEPOLIA_DEPLOYMENT_KEY } from "./admin-content";
import { getDatabase } from "./database";
import type { OwnerControlInclusionDependencies } from "./owner-control-inclusion";
import { PostgresOwnerControlInclusionStore } from "./owner-control-inclusion-store";
import { readOwnerTransaction } from "./owner-transaction-reader";

export function getOwnerControlRuntime(): OwnerControlInclusionDependencies {
  const config = resolvePublicChainConfig();
  if (!config) throw new Error("Owner controls are unavailable");
  const rpc = createRpcRead(config.rpcUrl);
  return {
    deploymentKey: GENESIS_SEPOLIA_DEPLOYMENT_KEY,
    readTransaction: (actorWallet, transactionHash) =>
      readOwnerTransaction(
        rpc,
        {
          actorWallet,
          chainId: config.chainId,
          contract: config.contract,
        },
        transactionHash,
      ),
    store: new PostgresOwnerControlInclusionStore(getDatabase()),
  };
}
