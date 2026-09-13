import { decodeFunctionResult, getAddress, parseAbi } from "viem";

import { createRpcRead } from "../lib/rpc-transport";

const ownerAbi = parseAbi(["function owner() view returns (address)"]);

export async function readCurrentOwner(
  config: { chainId: 84532; contract: `0x${string}`; rpcUrl: string },
  fetcher: typeof fetch = fetch,
): Promise<`0x${string}` | null> {
  const rpc = createRpcRead(config.rpcUrl, fetcher);
  try {
    const chainId = await rpc("eth_chainId", []);
    if (chainId !== "0x14a34") return null;
    const block = await rpc("eth_blockNumber", []);
    if (
      typeof block !== "string" ||
      !/^0x(?:0|[1-9a-f][0-9a-f]*)$/i.test(block)
    )
      return null;
    const code = await rpc("eth_getCode", [config.contract, block]);
    if (typeof code !== "string" || !/^0x(?:[0-9a-f]{2})+$/i.test(code))
      return null;
    const data = await rpc("eth_call", [
      { data: "0x8da5cb5b", to: config.contract },
      block,
    ]);
    if (typeof data !== "string" || !/^0x[0-9a-f]{64}$/i.test(data))
      return null;
    const owner = decodeFunctionResult({
      abi: ownerAbi,
      data: data as `0x${string}`,
      functionName: "owner",
    });
    if (/^0x0{40}$/i.test(owner)) return null;
    return getAddress(owner);
  } catch {
    return null;
  }
}
