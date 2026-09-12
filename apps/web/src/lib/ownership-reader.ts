import { GENESIS_TOKEN_IDS } from "./genesis";
import type { OwnershipRead } from "./collection-state";
import { classifyOwnershipResult } from "./ownership-result";

export type RpcRead = (method: string, params: unknown[]) => Promise<unknown>;

/** Read-only transport returns JSON-RPC results and throws structured errors.
 * The caller supplies a trusted endpoint and the configured Genesis contract. */
export async function readGenesisOwnership(
  rpc: RpcRead,
  contract: string,
  expectedChainId: 84532 | 8453,
): Promise<{ block: string | null; ownership: Map<number, OwnershipRead> }> {
  if (!/^0x[0-9a-fA-F]{40}$/.test(contract) || /^0x0{40}$/.test(contract)) {
    throw new Error("Invalid Genesis contract address");
  }
  const unknown = () => ({
    block: null,
    ownership: new Map<number, OwnershipRead>(
      GENESIS_TOKEN_IDS.map((id) => [id, { state: "unknown" }]),
    ),
  });
  try {
    const chain = await rpc("eth_chainId", []);
    if (
      typeof chain !== "string" ||
      !/^0x[0-9a-f]+$/i.test(chain) ||
      BigInt(chain) !== BigInt(expectedChainId)
    )
      return unknown();
    const block = await rpc("eth_blockNumber", []);
    if (
      typeof block !== "string" ||
      !/^0x(?:0|[1-9a-f][0-9a-f]*)$/i.test(block)
    )
      return unknown();
    const code = await rpc("eth_getCode", [contract, block]);
    if (typeof code !== "string" || !/^0x(?:[0-9a-f]{2})+$/i.test(code))
      return unknown();
    const entries = await Promise.all(
      GENESIS_TOKEN_IDS.map(async (id): Promise<[number, OwnershipRead]> => {
        try {
          const data = await rpc("eth_call", [
            {
              to: contract,
              data: `0x6352211e${id.toString(16).padStart(64, "0")}`,
            },
            block,
          ]);
          return [id, classifyOwnershipResult(id, { kind: "success", data })];
        } catch (error) {
          // Code 3 is an explicit execution revert. Other provider/transport
          // errors are not proof of a missing token, even if they contain data.
          if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === 3 &&
            "data" in error
          ) {
            return [
              id,
              classifyOwnershipResult(id, { kind: "revert", data: error.data }),
            ];
          }
          return [id, { state: "unknown" }];
        }
      }),
    );
    return { block, ownership: new Map(entries) };
  } catch {
    return unknown();
  }
}
