import {
  decodeEventLog,
  decodeFunctionData,
  decodeFunctionResult,
  encodeFunctionData,
  isAddress,
  parseAbi,
} from "viem";

import { genesisAbi } from "../lib/genesis-contract";
import type { RpcRead } from "../lib/ownership-reader";

const evidenceAbi = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "function ownerOf(uint256 tokenId) view returns (address)",
]);
const zeroAddress = "0x0000000000000000000000000000000000000000";
const maxUint256 = (1n << 256n) - 1n;

export type MintTransactionCall = {
  expectedPublicationRevision: bigint;
  tokenId: number;
  value: bigint;
};

export type MintTransactionObservation =
  | {
      call: MintTransactionCall;
      senderWallet: `0x${string}`;
      status: "pending";
    }
  | {
      block: `0x${string}`;
      blockHash: `0x${string}`;
      call: MintTransactionCall;
      senderWallet: `0x${string}`;
      status: "reverted";
    }
  | {
      block: `0x${string}`;
      blockHash: `0x${string}`;
      call: MintTransactionCall;
      ownerWallet: `0x${string}`;
      senderWallet: `0x${string}`;
      status: "succeeded";
      transferLogIndex: number;
    }
  | { status: "unknown" }
  | { status: "invalid" }
  | { status: "unavailable" };

type RpcTransaction = {
  blockHash?: unknown;
  blockNumber?: unknown;
  from?: unknown;
  hash?: unknown;
  input?: unknown;
  to?: unknown;
  value?: unknown;
};

type RpcLog = {
  address?: unknown;
  blockHash?: unknown;
  data?: unknown;
  logIndex?: unknown;
  removed?: unknown;
  topics?: unknown;
  transactionHash?: unknown;
};

type RpcReceipt = {
  blockHash?: unknown;
  blockNumber?: unknown;
  from?: unknown;
  logs?: unknown;
  status?: unknown;
  to?: unknown;
  transactionHash?: unknown;
};

function isHash(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[0-9a-f]{64}$/iu.test(value);
}

function isBlock(value: unknown): value is `0x${string}` {
  return (
    typeof value === "string" && /^0x(?:0|[1-9a-f][0-9a-f]*)$/iu.test(value)
  );
}

function isData(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x(?:[0-9a-f]{2})*$/iu.test(value);
}

function sameAddress(left: unknown, right: `0x${string}`) {
  return (
    typeof left === "string" &&
    isAddress(left) &&
    left.toLowerCase() === right.toLowerCase()
  );
}

function checkedAddress(value: unknown): `0x${string}` | null {
  return typeof value === "string" &&
    isAddress(value) &&
    value.toLowerCase() !== zeroAddress
    ? (value.toLowerCase() as `0x${string}`)
    : null;
}

function decodeMintCall(
  data: unknown,
  value: unknown,
): MintTransactionCall | null {
  if (!isData(data) || !isBlock(value)) return null;
  try {
    const decoded = decodeFunctionData({ abi: genesisAbi, data });
    if (decoded.functionName !== "mint") return null;
    const [tokenId, expectedPublicationRevision] = decoded.args;
    if (
      typeof tokenId !== "bigint" ||
      tokenId < 1n ||
      tokenId > 10n ||
      typeof expectedPublicationRevision !== "bigint" ||
      expectedPublicationRevision < 0n ||
      expectedPublicationRevision > maxUint256
    )
      return null;
    return {
      expectedPublicationRevision,
      tokenId: Number(tokenId),
      value: BigInt(value),
    };
  } catch {
    return null;
  }
}

function transferLogIndex(
  logs: unknown,
  evidence: {
    blockHash: `0x${string}`;
    contract: `0x${string}`;
    senderWallet: `0x${string}`;
    tokenId: number;
    transactionHash: string;
  },
) {
  if (!Array.isArray(logs)) return null;
  const matches: number[] = [];
  for (const candidate of logs) {
    if (!candidate || typeof candidate !== "object") continue;
    const log = candidate as RpcLog;
    if (
      !sameAddress(log.address, evidence.contract) ||
      !isHash(log.blockHash) ||
      log.blockHash.toLowerCase() !== evidence.blockHash.toLowerCase() ||
      !isHash(log.transactionHash) ||
      log.transactionHash.toLowerCase() !==
        evidence.transactionHash.toLowerCase() ||
      (log.removed !== false && log.removed !== undefined) ||
      !isData(log.data) ||
      !Array.isArray(log.topics) ||
      !log.topics.every(isHash) ||
      !isBlock(log.logIndex)
    )
      continue;
    try {
      const decoded = decodeEventLog({
        abi: evidenceAbi,
        data: log.data,
        topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
      });
      if (
        decoded.eventName === "Transfer" &&
        decoded.args.from.toLowerCase() === zeroAddress &&
        decoded.args.to.toLowerCase() === evidence.senderWallet.toLowerCase() &&
        decoded.args.tokenId === BigInt(evidence.tokenId)
      )
        matches.push(Number(BigInt(log.logIndex)));
    } catch {
      // Unrelated or malformed receipt logs are not mint evidence.
    }
  }
  return matches.length === 1 && Number.isSafeInteger(matches[0])
    ? matches[0]!
    : null;
}

async function readOwnerAtBlock(
  rpc: RpcRead,
  contract: `0x${string}`,
  tokenId: number,
  block: `0x${string}`,
) {
  const data = encodeFunctionData({
    abi: evidenceAbi,
    args: [BigInt(tokenId)],
    functionName: "ownerOf",
  });
  const result = await rpc("eth_call", [{ data, to: contract }, block]);
  if (!isData(result)) return null;
  try {
    return checkedAddress(
      decodeFunctionResult({
        abi: evidenceAbi,
        data: result,
        functionName: "ownerOf",
      }),
    );
  } catch {
    return null;
  }
}

export async function readMintTransaction(
  rpc: RpcRead,
  config: { chainId: 84532; contract: `0x${string}` },
  transactionHash: string,
): Promise<MintTransactionObservation> {
  if (!isHash(transactionHash)) throw new Error("Invalid transaction hash");
  if (!checkedAddress(config.contract))
    throw new Error("Invalid mint transaction configuration");

  let chainId: unknown;
  let transaction: unknown;
  let receipt: unknown;
  try {
    [chainId, transaction, receipt] = await Promise.all([
      rpc("eth_chainId", []),
      rpc("eth_getTransactionByHash", [transactionHash]),
      rpc("eth_getTransactionReceipt", [transactionHash]),
    ]);
  } catch {
    return { status: "unavailable" };
  }
  if (!isBlock(chainId) || BigInt(chainId) !== BigInt(config.chainId))
    return { status: "invalid" };
  if (transaction === null && receipt === null) return { status: "unknown" };
  if (!transaction || typeof transaction !== "object")
    return { status: "invalid" };
  const tx = transaction as RpcTransaction;
  const senderWallet = checkedAddress(tx.from);
  const call = decodeMintCall(tx.input, tx.value);
  if (
    !senderWallet ||
    !call ||
    !isHash(tx.hash) ||
    tx.hash.toLowerCase() !== transactionHash.toLowerCase() ||
    !sameAddress(tx.to, config.contract)
  )
    return { status: "invalid" };
  if (receipt === null) return { call, senderWallet, status: "pending" };
  if (typeof receipt !== "object") return { status: "invalid" };
  const mined = receipt as RpcReceipt;
  if (
    !isHash(mined.transactionHash) ||
    mined.transactionHash.toLowerCase() !== transactionHash.toLowerCase() ||
    !sameAddress(mined.from, senderWallet) ||
    !sameAddress(mined.to, config.contract) ||
    !isHash(mined.blockHash) ||
    !isHash(tx.blockHash) ||
    tx.blockHash.toLowerCase() !== mined.blockHash.toLowerCase() ||
    !isBlock(mined.blockNumber) ||
    !isBlock(tx.blockNumber) ||
    BigInt(tx.blockNumber) !== BigInt(mined.blockNumber) ||
    (mined.status !== "0x0" && mined.status !== "0x1")
  )
    return { status: "invalid" };
  if (mined.status === "0x0")
    return {
      block: mined.blockNumber,
      blockHash: mined.blockHash,
      call,
      senderWallet,
      status: "reverted",
    };
  const logIndex = transferLogIndex(mined.logs, {
    blockHash: mined.blockHash,
    contract: config.contract,
    senderWallet,
    tokenId: call.tokenId,
    transactionHash,
  });
  if (logIndex === null) return { status: "invalid" };
  try {
    const [code, ownerWallet] = await Promise.all([
      rpc("eth_getCode", [config.contract, mined.blockNumber]),
      readOwnerAtBlock(rpc, config.contract, call.tokenId, mined.blockNumber),
    ]);
    if (!isData(code) || code === "0x" || !ownerWallet)
      return { status: "invalid" };
    return {
      block: mined.blockNumber,
      blockHash: mined.blockHash,
      call,
      ownerWallet,
      senderWallet,
      status: "succeeded",
      transferLogIndex: logIndex,
    };
  } catch {
    return { status: "unavailable" };
  }
}
