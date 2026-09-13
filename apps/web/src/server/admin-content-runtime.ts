import { PostgresAdminContentStore } from "./admin-content-store";
import type { TokenMutationState } from "./admin-content-store";
import { getDatabase } from "./database";
import { readGenesisOwnership } from "../lib/ownership-reader";
import { resolvePublicChainConfig } from "../lib/public-collection";
import { createRpcRead } from "../lib/rpc-transport";

export function getAdminContentRuntime() {
  const config = resolvePublicChainConfig();
  if (!config) throw new Error("Admin content is unavailable");
  return {
    contractAddress: config.contract,
    readTokenStates: async () => {
      const snapshot = await readGenesisOwnership(
        createRpcRead(config.rpcUrl),
        config.contract,
        config.chainId,
      );
      const states = new Map<number, TokenMutationState>();
      for (const [tokenId, ownership] of snapshot.ownership)
        states.set(
          tokenId,
          snapshot.block === null || ownership.state === "unknown"
            ? "unavailable"
            : ownership.state,
        );
      return states;
    },
    store: new PostgresAdminContentStore(getDatabase()),
  };
}
