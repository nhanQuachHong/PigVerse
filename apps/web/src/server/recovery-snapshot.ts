import { decodeFunctionResult, encodeFunctionData, parseAbi } from "viem";

const BASE_SEPOLIA_CHAIN_ID = 84532;
const GENESIS_TOKEN_IDS = Object.freeze(
  Array.from({ length: 10 }, (_, index) => index + 1),
);
const ZERO_ADDRESS = `0x${"0".repeat(40)}`;
const recoveryAbi = parseAbi([
  "function MAX_SUPPLY() view returns (uint256)",
  "function mintPrice() view returns (uint256)",
  "function name() view returns (string)",
  "function owner() view returns (address)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function paused() view returns (bool)",
  "function publicationRevision(uint256 tokenId) view returns (uint256)",
  "function publishedURI(uint256 tokenId) view returns (string)",
  "function symbol() view returns (string)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function totalSupply() view returns (uint256)",
]);

export type RecoveryRpc = (
  method: string,
  params: readonly unknown[],
) => Promise<unknown>;

export type GenesisRecoveryToken = {
  mintedUri: string | null;
  owner: `0x${string}` | null;
  publicationRevision: string;
  publishedUri: string | null;
  state: "minted" | "unminted";
  tokenId: number;
};

export type GenesisRecoverySnapshot = {
  blockHash: `0x${string}`;
  blockNumber: string;
  chainId: typeof BASE_SEPOLIA_CHAIN_ID;
  contract: `0x${string}`;
  contractOwner: `0x${string}`;
  mintPriceWei: string;
  paused: boolean;
  schemaVersion: 1;
  tokens: GenesisRecoveryToken[];
  totalSupply: number;
};

function isHex(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x(?:[0-9a-f]{2})*$/iu.test(value);
}

function isQuantity(value: unknown): value is `0x${string}` {
  return (
    typeof value === "string" && /^0x(?:0|[1-9a-f][0-9a-f]*)$/iu.test(value)
  );
}

function requireContract(value: string): `0x${string}` {
  if (!/^0x[0-9a-f]{40}$/iu.test(value) || value.toLowerCase() === ZERO_ADDRESS)
    throw new Error("Invalid Genesis contract address");
  return value as `0x${string}`;
}

function requireIpfsUri(value: string, label: string) {
  if (!value.startsWith("ipfs://") || value.length <= 7)
    throw new Error(`Invalid ${label}`);
  return value;
}

function isNonexistentTokenRevert(error: unknown, tokenId: number) {
  if (!error || typeof error !== "object") return false;
  const expected = `0x7e273289${tokenId.toString(16).padStart(64, "0")}`;
  return (
    "code" in error &&
    error.code === 3 &&
    "data" in error &&
    typeof error.data === "string" &&
    error.data.toLowerCase() === expected
  );
}

async function readContract<
  Name extends
    | "MAX_SUPPLY"
    | "mintPrice"
    | "name"
    | "owner"
    | "ownerOf"
    | "paused"
    | "publicationRevision"
    | "publishedURI"
    | "symbol"
    | "tokenURI"
    | "totalSupply",
>(
  rpc: RecoveryRpc,
  contract: `0x${string}`,
  blockNumber: `0x${string}`,
  functionName: Name,
  args?: readonly [bigint],
) {
  const data = await rpc("eth_call", [
    {
      data: encodeFunctionData({
        abi: recoveryAbi,
        functionName,
        args: args ?? [],
      } as never),
      to: contract,
    },
    blockNumber,
  ]);
  if (!isHex(data)) throw new Error(`Invalid ${functionName} response`);
  return decodeFunctionResult({
    abi: recoveryAbi,
    functionName,
    data,
  } as never) as unknown;
}

async function readToken(
  rpc: RecoveryRpc,
  contract: `0x${string}`,
  blockNumber: `0x${string}`,
  tokenId: number,
): Promise<GenesisRecoveryToken> {
  const id = BigInt(tokenId);
  const [publishedResult, revisionResult] = await Promise.all([
    readContract(rpc, contract, blockNumber, "publishedURI", [id]),
    readContract(rpc, contract, blockNumber, "publicationRevision", [id]),
  ]);
  if (typeof publishedResult !== "string")
    throw new Error("Invalid publishedURI response");
  if (typeof revisionResult !== "bigint")
    throw new Error("Invalid publicationRevision response");
  const publishedUri =
    publishedResult === ""
      ? null
      : requireIpfsUri(publishedResult, "published metadata URI");

  let ownerResult: unknown;
  try {
    ownerResult = await readContract(rpc, contract, blockNumber, "ownerOf", [
      id,
    ]);
  } catch (error) {
    if (!isNonexistentTokenRevert(error, tokenId)) throw error;
    return {
      mintedUri: null,
      owner: null,
      publicationRevision: revisionResult.toString(),
      publishedUri,
      state: "unminted",
      tokenId,
    };
  }

  if (
    typeof ownerResult !== "string" ||
    !/^0x[0-9a-f]{40}$/iu.test(ownerResult) ||
    ownerResult.toLowerCase() === ZERO_ADDRESS
  )
    throw new Error("Invalid token owner response");
  const mintedResult = await readContract(
    rpc,
    contract,
    blockNumber,
    "tokenURI",
    [id],
  );
  if (typeof mintedResult !== "string")
    throw new Error("Invalid tokenURI response");
  const mintedUri = requireIpfsUri(mintedResult, "minted metadata URI");
  if (publishedUri !== mintedUri)
    throw new Error("Minted metadata differs from published metadata");

  return {
    mintedUri,
    owner: ownerResult.toLowerCase() as `0x${string}`,
    publicationRevision: revisionResult.toString(),
    publishedUri,
    state: "minted",
    tokenId,
  };
}

export async function captureGenesisRecoverySnapshot(
  input: { contract: string; expectedChainId?: number },
  rpc: RecoveryRpc,
): Promise<GenesisRecoverySnapshot> {
  if (
    (input.expectedChainId ?? BASE_SEPOLIA_CHAIN_ID) !== BASE_SEPOLIA_CHAIN_ID
  )
    throw new Error("Recovery snapshot supports Base Sepolia only");
  const contract = requireContract(input.contract);
  const chainResult = await rpc("eth_chainId", []);
  if (
    !isQuantity(chainResult) ||
    BigInt(chainResult) !== BigInt(BASE_SEPOLIA_CHAIN_ID)
  )
    throw new Error("Unexpected recovery chain");
  const blockResult = await rpc("eth_blockNumber", []);
  if (!isQuantity(blockResult)) throw new Error("Invalid recovery block");
  const block = await rpc("eth_getBlockByNumber", [blockResult, false]);
  if (
    !block ||
    typeof block !== "object" ||
    !("hash" in block) ||
    typeof block.hash !== "string" ||
    !/^0x[0-9a-f]{64}$/iu.test(block.hash) ||
    !("number" in block) ||
    block.number !== blockResult
  )
    throw new Error("Invalid recovery block identity");
  const code = await rpc("eth_getCode", [contract, blockResult]);
  if (!isHex(code) || code === "0x")
    throw new Error("Genesis contract is not deployed at recovery block");

  const [
    name,
    symbol,
    maxSupply,
    contractOwner,
    paused,
    mintPrice,
    totalSupply,
    tokens,
  ] = await Promise.all([
    readContract(rpc, contract, blockResult, "name"),
    readContract(rpc, contract, blockResult, "symbol"),
    readContract(rpc, contract, blockResult, "MAX_SUPPLY"),
    readContract(rpc, contract, blockResult, "owner"),
    readContract(rpc, contract, blockResult, "paused"),
    readContract(rpc, contract, blockResult, "mintPrice"),
    readContract(rpc, contract, blockResult, "totalSupply"),
    Promise.all(
      GENESIS_TOKEN_IDS.map((tokenId) =>
        readToken(rpc, contract, blockResult, tokenId),
      ),
    ),
  ]);
  if (name !== "Pigverse Genesis" || symbol !== "PIGVERSE" || maxSupply !== 10n)
    throw new Error("Unexpected Genesis contract identity");
  if (
    typeof contractOwner !== "string" ||
    !/^0x[0-9a-f]{40}$/iu.test(contractOwner) ||
    contractOwner.toLowerCase() === ZERO_ADDRESS
  )
    throw new Error("Invalid contract owner response");
  if (typeof paused !== "boolean") throw new Error("Invalid pause response");
  if (typeof mintPrice !== "bigint")
    throw new Error("Invalid mint price response");
  if (typeof totalSupply !== "bigint" || totalSupply < 0n || totalSupply > 10n)
    throw new Error("Invalid total supply response");
  const mintedCount = tokens.filter(({ state }) => state === "minted").length;
  if (BigInt(mintedCount) !== totalSupply)
    throw new Error("Total supply does not match recovered ownership");

  return {
    blockHash: block.hash as `0x${string}`,
    blockNumber: BigInt(blockResult).toString(),
    chainId: BASE_SEPOLIA_CHAIN_ID,
    contract,
    contractOwner: contractOwner.toLowerCase() as `0x${string}`,
    mintPriceWei: mintPrice.toString(),
    paused,
    schemaVersion: 1,
    tokens,
    totalSupply: Number(totalSupply),
  };
}

export function createRecoveryRpc(
  endpoint: string,
  fetcher: typeof fetch = fetch,
): RecoveryRpc {
  if (!/^https?:\/\//u.test(endpoint))
    throw new Error("Invalid Base Sepolia RPC URL");
  let requestId = 0;
  return async (method, params) => {
    const id = ++requestId;
    const response = await fetcher(endpoint, {
      body: JSON.stringify({ id, jsonrpc: "2.0", method, params }),
      cache: "no-store",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error("Recovery RPC unavailable");
    const body: unknown = await response.json();
    if (
      !body ||
      typeof body !== "object" ||
      !("jsonrpc" in body) ||
      body.jsonrpc !== "2.0" ||
      !("id" in body) ||
      body.id !== id
    )
      throw new Error("Invalid recovery RPC response");
    if ("error" in body) {
      const error = body.error;
      if (
        "result" in body ||
        !error ||
        typeof error !== "object" ||
        !("code" in error) ||
        !Number.isInteger(error.code)
      )
        throw new Error("Invalid recovery RPC error");
      throw Object.assign(new Error("Recovery RPC request failed"), {
        code: error.code,
        data: "data" in error ? error.data : undefined,
      });
    }
    if (!("result" in body)) throw new Error("Missing recovery RPC result");
    return body.result;
  };
}
