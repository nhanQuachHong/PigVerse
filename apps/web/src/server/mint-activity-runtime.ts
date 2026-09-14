import { getDatabase } from "./database";
import { PostgresMintActivityStore } from "./mint-activity-store";
import { readMintTransaction } from "./mint-transaction-reader";
import { createRpcRead } from "../lib/rpc-transport";
import { resolvePublicChainConfig } from "../lib/public-collection";

export function getMintActivityRuntime() {
  const config = resolvePublicChainConfig();
  if (!config) throw new Error("Mint activity is unavailable");
  const rpc = createRpcRead(config.rpcUrl);
  return {
    readTransaction: (transactionHash: `0x${string}`) =>
      readMintTransaction(
        rpc,
        { chainId: config.chainId, contract: config.contract },
        transactionHash,
      ),
    store: new PostgresMintActivityStore(getDatabase()),
  };
}
