import { projectCollectionState } from "./collection-state";
import { readGenesisOwnership } from "./ownership-reader";
import { createRpcRead } from "./rpc-transport";
import { decodeFunctionResult, encodeFunctionData, parseAbi } from "viem";
import { GENESIS_TOKEN_IDS } from "./genesis";

const publicationAbi = parseAbi([
  "function publishedURI(uint256 tokenId) view returns (string)",
]);

/** Server caller supplies trusted deployment config and published content IDs.
 * This returns display state, not permission to submit a mint transaction. */
export async function loadCollectionState(
  config: { rpcUrl: string; contract: string; chainId: 84532 | 8453 },
  published: ReadonlySet<number> | null,
  fetcher: typeof fetch = fetch,
) {
  const rpc = createRpcRead(config.rpcUrl, fetcher);
  const snapshot = await readGenesisOwnership(
    rpc,
    config.contract,
    config.chainId,
  );
  let paused: boolean | null = null;
  const confirmedPublished = new Set(published ?? []);
  const unavailablePublication = new Set<number>();
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
    if (published === null) {
      await Promise.all(
        GENESIS_TOKEN_IDS.map(async (tokenId) => {
          try {
            const data = await rpc("eth_call", [
              {
                to: config.contract,
                data: encodeFunctionData({
                  abi: publicationAbi,
                  functionName: "publishedURI",
                  args: [BigInt(tokenId)],
                }),
              },
              snapshot.block,
            ]);
            if (typeof data !== "string" || !/^0x[0-9a-f]*$/i.test(data))
              throw new Error("Invalid publication response");
            const uri = decodeFunctionResult({
              abi: publicationAbi,
              functionName: "publishedURI",
              data: data as `0x${string}`,
            });
            if (uri.startsWith("ipfs://") && uri.length > 7)
              confirmedPublished.add(tokenId);
            else if (uri !== "") throw new Error("Invalid published URI");
          } catch {
            unavailablePublication.add(tokenId);
          }
        }),
      );
    }
  }
  const projection = projectCollectionState(
    snapshot.ownership,
    confirmedPublished,
    paused,
  );
  for (const token of projection.tokens) {
    if (token.status !== "minted" && unavailablePublication.has(token.tokenId))
      token.status = "unknown";
  }
  return {
    block: snapshot.block,
    ...projection,
    degraded:
      snapshot.block === null ||
      paused === null ||
      unavailablePublication.size > 0 ||
      projection.tokens.some((token) => token.status === "unknown"),
    publicationState:
      snapshot.block !== null && unavailablePublication.size === 0
        ? "known"
        : "unavailable",
  };
}
