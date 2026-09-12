import { projectCollectionState } from "./collection-state";
import { readGenesisOwnership } from "./ownership-reader";
import { createRpcRead } from "./rpc-transport";

/** Server caller supplies trusted deployment config and published content IDs.
 * This returns display state, not permission to submit a mint transaction. */
export async function loadCollectionState(
  config: { rpcUrl: string; contract: string; chainId: 84532 | 8453 },
  published: ReadonlySet<number>,
  fetcher: typeof fetch = fetch,
) {
  const rpc = createRpcRead(config.rpcUrl, fetcher);
  const snapshot = await readGenesisOwnership(
    rpc,
    config.contract,
    config.chainId,
  );
  let paused: boolean | null = null;
  if (snapshot.block !== null) {
    try {
      const data = await rpc("eth_call", [
        { to: config.contract, data: "0x5c975abb" },
        snapshot.block,
      ]);
      if (data === `0x${"0".repeat(64)}`) paused = false;
      if (data === `0x${"0".repeat(63)}1`) paused = true;
    } catch {
      // Ownership remains useful even if the availability read fails.
    }
  }
  return {
    block: snapshot.block,
    ...projectCollectionState(snapshot.ownership, published, paused),
  };
}
