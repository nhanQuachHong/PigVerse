import { decodeFunctionResult, encodeFunctionData, isAddress } from "viem";

import { genesisAbi } from "../lib/genesis-contract";
import { classifyOwnershipResult } from "../lib/ownership-result";
import type { RpcRead } from "../lib/ownership-reader";

export type PublicationSnapshot = {
  block: `0x${string}`;
  metadataUri: `ipfs://${string}` | null;
  publicationRevision: bigint;
  tokenState: "minted" | "unminted";
};

function validHexData(value: unknown): value is `0x${string}` {
  return (
    typeof value === "string" &&
    /^0x(?:[0-9a-f]{2})*$/iu.test(value) &&
    value.length > 2
  );
}

export async function readPublicationSnapshot(
  rpc: RpcRead,
  config: { chainId: 84532; contract: `0x${string}` },
  tokenId: number,
): Promise<PublicationSnapshot | null> {
  if (!Number.isInteger(tokenId) || tokenId < 1 || tokenId > 10)
    throw new Error("Invalid Genesis token ID");
  if (!isAddress(config.contract) || /^0x0{40}$/iu.test(config.contract))
    throw new Error("Invalid Genesis contract address");
  try {
    const chainId = await rpc("eth_chainId", []);
    if (
      typeof chainId !== "string" ||
      !/^0x[0-9a-f]+$/iu.test(chainId) ||
      BigInt(chainId) !== BigInt(config.chainId)
    )
      return null;
    const block = await rpc("eth_blockNumber", []);
    if (
      typeof block !== "string" ||
      !/^0x(?:0|[1-9a-f][0-9a-f]*)$/iu.test(block)
    )
      return null;
    const code = await rpc("eth_getCode", [config.contract, block]);
    if (!validHexData(code)) return null;

    let ownership;
    try {
      const data = await rpc("eth_call", [
        {
          data: `0x6352211e${tokenId.toString(16).padStart(64, "0")}`,
          to: config.contract,
        },
        block,
      ]);
      ownership = classifyOwnershipResult(tokenId, { kind: "success", data });
    } catch (error) {
      ownership =
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 3 &&
        "data" in error
          ? classifyOwnershipResult(tokenId, {
              data: error.data,
              kind: "revert",
            })
          : classifyOwnershipResult(tokenId, { kind: "unavailable" });
    }
    if (ownership.state === "unknown") return null;

    const [revisionData, uriData] = await Promise.all([
      rpc("eth_call", [
        {
          data: encodeFunctionData({
            abi: genesisAbi,
            args: [BigInt(tokenId)],
            functionName: "publicationRevision",
          }),
          to: config.contract,
        },
        block,
      ]),
      rpc("eth_call", [
        {
          data: encodeFunctionData({
            abi: genesisAbi,
            args: [BigInt(tokenId)],
            functionName: "publishedURI",
          }),
          to: config.contract,
        },
        block,
      ]),
    ]);
    if (!validHexData(revisionData) || !validHexData(uriData)) return null;
    const publicationRevision = decodeFunctionResult({
      abi: genesisAbi,
      data: revisionData,
      functionName: "publicationRevision",
    });
    const uri = decodeFunctionResult({
      abi: genesisAbi,
      data: uriData,
      functionName: "publishedURI",
    });
    if (uri !== "" && (!uri.startsWith("ipfs://") || uri.length <= 7))
      return null;
    return {
      block: block as `0x${string}`,
      metadataUri: uri === "" ? null : (uri as `ipfs://${string}`),
      publicationRevision,
      tokenState: ownership.state,
    };
  } catch {
    return null;
  }
}
