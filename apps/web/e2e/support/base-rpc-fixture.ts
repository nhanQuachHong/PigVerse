import {
  decodeFunctionData,
  encodeErrorResult,
  encodeFunctionResult,
  parseAbi,
} from "viem";

const abi = parseAbi([
  "error ERC721NonexistentToken(uint256 tokenId)",
  "function mint(uint256 tokenId, uint256 expectedRevision) payable",
  "function mintPrice() view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function paused() view returns (bool)",
  "function publicationRevision(uint256 tokenId) view returns (uint256)",
  "function publishedURI(uint256 tokenId) view returns (string)",
]);
const multicallAbi = parseAbi([
  "function aggregate3((address target, bool allowFailure, bytes callData)[] calls) payable returns ((bool success, bytes returnData)[] returnData)",
]);

export type RpcFixtureOutcome =
  | { error: { code: number; data?: `0x${string}`; message: string } }
  | { result: unknown };

function resolveContractCall(data: `0x${string}`): RpcFixtureOutcome {
  if (data.startsWith("0x82ad56cb")) {
    const decoded = decodeFunctionData({ abi: multicallAbi, data });
    const calls = decoded.args[0];
    const results = calls.map(({ allowFailure, callData }) => {
      const outcome = resolveContractCall(callData);
      if ("result" in outcome)
        return { returnData: outcome.result as `0x${string}`, success: true };
      if (!allowFailure) throw new Error("Required fixture multicall failed");
      return {
        returnData: outcome.error.data ?? "0x",
        success: false,
      };
    });
    return {
      result: encodeFunctionResult({
        abi: multicallAbi,
        functionName: "aggregate3",
        result: results,
      }),
    };
  }

  const decoded = decodeFunctionData({ abi, data });
  const tokenId = Number(decoded.args?.[0] ?? 0n);
  if (decoded.functionName === "ownerOf")
    return {
      error: {
        code: 3,
        data: encodeErrorResult({
          abi,
          errorName: "ERC721NonexistentToken",
          args: [BigInt(tokenId)],
        }),
        message: "execution reverted",
      },
    };
  const result = (() => {
    switch (decoded.functionName) {
      case "paused":
        return false;
      case "mintPrice":
        return 100n;
      case "publicationRevision":
        return tokenId === 4 ? 3n : 0n;
      case "publishedURI":
        return tokenId === 4 ? "ipfs://fixture/4" : "";
      case "mint":
        return undefined;
    }
  })();
  return {
    result:
      decoded.functionName === "mint"
        ? "0x"
        : encodeFunctionResult({
            abi,
            functionName: decoded.functionName,
            result,
          } as never),
  };
}

export function resolveBaseRpcFixture(
  method: string,
  params: readonly unknown[],
): RpcFixtureOutcome {
  if (method === "eth_chainId") return { result: "0x14a34" };
  if (method === "eth_blockNumber") return { result: "0x100" };
  if (method === "eth_getCode") return { result: "0x60006000" };
  if (method === "eth_getTransactionReceipt") return { result: null };
  if (method === "eth_estimateGas") return { result: "0x30d40" };
  if (method !== "eth_call")
    return { error: { code: -32_601, message: "Method not found" } };

  const request = params[0] as { data?: unknown } | undefined;
  if (typeof request?.data !== "string")
    return { error: { code: -32_602, message: "Invalid params" } };
  return resolveContractCall(request.data as `0x${string}`);
}
