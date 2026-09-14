import { decodeEventLog, decodeFunctionData, isAddress } from "viem";

import { genesisAbi } from "../lib/genesis-contract";
import type { RpcRead } from "../lib/ownership-reader";

export type OwnerTransactionCall =
  | { action: "pause" | "unpause" | "withdraw" }
  | { action: "setMintPrice"; newPrice: bigint };

export type OwnerTransactionObservation =
  | { call?: OwnerTransactionCall; status: "pending" }
  | { call: OwnerTransactionCall; status: "failed" }
  | {
      block: `0x${string}`;
      blockHash: `0x${string}`;
      call: OwnerTransactionCall;
      eventAmount?: bigint;
      status: "included";
    }
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
  data?: unknown;
  removed?: unknown;
  topics?: unknown;
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

function sameAddress(left: unknown, right: `0x${string}`) {
  return (
    typeof left === "string" &&
    isAddress(left) &&
    left.toLowerCase() === right.toLowerCase()
  );
}

function decodeOwnerCall(data: unknown): OwnerTransactionCall | null {
  if (typeof data !== "string" || !/^0x(?:[0-9a-f]{2})+$/iu.test(data))
    return null;
  try {
    const decoded = decodeFunctionData({
      abi: genesisAbi,
      data: data as `0x${string}`,
    });
    if (
      decoded.functionName === "pause" ||
      decoded.functionName === "unpause" ||
      decoded.functionName === "withdraw"
    )
      return { action: decoded.functionName };
    if (decoded.functionName === "setMintPrice") {
      const [newPrice] = decoded.args;
      return typeof newPrice === "bigint"
        ? { action: "setMintPrice", newPrice }
        : null;
    }
    return null;
  } catch {
    return null;
  }
}

function matchingEvent(
  logs: unknown,
  contract: `0x${string}`,
  actorWallet: `0x${string}`,
  call: OwnerTransactionCall,
): { amount?: bigint } | null {
  if (!Array.isArray(logs)) return null;
  const matches: Array<{ amount?: bigint }> = [];
  for (const source of logs) {
    if (!source || typeof source !== "object") continue;
    const log = source as RpcLog;
    if (
      !sameAddress(log.address, contract) ||
      log.removed === true ||
      typeof log.data !== "string" ||
      !/^0x(?:[0-9a-f]{2})*$/iu.test(log.data) ||
      !Array.isArray(log.topics) ||
      !log.topics.every(isHash)
    )
      continue;
    try {
      const decoded = decodeEventLog({
        abi: genesisAbi,
        data: log.data as `0x${string}`,
        topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
      });
      if (
        call.action === "pause" &&
        decoded.eventName === "Paused" &&
        sameAddress(decoded.args.account, actorWallet)
      )
        matches.push({});
      if (
        call.action === "unpause" &&
        decoded.eventName === "Unpaused" &&
        sameAddress(decoded.args.account, actorWallet)
      )
        matches.push({});
      if (
        call.action === "setMintPrice" &&
        decoded.eventName === "MintPriceChanged" &&
        decoded.args.newPrice === call.newPrice
      )
        matches.push({});
      if (
        call.action === "withdraw" &&
        decoded.eventName === "Withdrawn" &&
        sameAddress(decoded.args.recipient, actorWallet) &&
        typeof decoded.args.amount === "bigint"
      )
        matches.push({ amount: decoded.args.amount });
    } catch {
      // Ignore unrelated contract logs and fail closed unless one exact event remains.
    }
  }
  return matches.length === 1 ? matches[0]! : null;
}

export async function readOwnerTransaction(
  rpc: RpcRead,
  config: {
    actorWallet: `0x${string}`;
    chainId: 84532;
    contract: `0x${string}`;
  },
  transactionHash: string,
): Promise<OwnerTransactionObservation> {
  if (!isHash(transactionHash)) throw new Error("Invalid transaction hash");
  if (
    !isAddress(config.actorWallet) ||
    /^0x0{40}$/iu.test(config.actorWallet) ||
    !isAddress(config.contract) ||
    /^0x0{40}$/iu.test(config.contract)
  )
    throw new Error("Invalid owner transaction configuration");

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
  if (
    typeof chainId !== "string" ||
    !/^0x[0-9a-f]+$/iu.test(chainId) ||
    BigInt(chainId) !== BigInt(config.chainId)
  )
    return { status: "invalid" };
  if (transaction === null && receipt === null) return { status: "pending" };
  if (!transaction || typeof transaction !== "object")
    return { status: "invalid" };
  const tx = transaction as RpcTransaction;
  if (
    !isHash(tx.hash) ||
    tx.hash.toLowerCase() !== transactionHash.toLowerCase() ||
    !sameAddress(tx.from, config.actorWallet) ||
    !sameAddress(tx.to, config.contract) ||
    typeof tx.value !== "string" ||
    !/^0x(?:0|[1-9a-f][0-9a-f]*)$/iu.test(tx.value) ||
    BigInt(tx.value) !== 0n
  )
    return { status: "invalid" };
  const call = decodeOwnerCall(tx.input);
  if (!call) return { status: "invalid" };
  if (receipt === null) return { call, status: "pending" };
  if (typeof receipt !== "object") return { status: "invalid" };
  const mined = receipt as RpcReceipt;
  if (
    !isHash(mined.transactionHash) ||
    mined.transactionHash.toLowerCase() !== transactionHash.toLowerCase() ||
    !sameAddress(mined.from, config.actorWallet) ||
    !sameAddress(mined.to, config.contract) ||
    !isHash(mined.blockHash) ||
    !isHash(tx.blockHash) ||
    tx.blockHash.toLowerCase() !== mined.blockHash.toLowerCase() ||
    !isBlock(mined.blockNumber) ||
    !isBlock(tx.blockNumber) ||
    tx.blockNumber.toLowerCase() !== mined.blockNumber.toLowerCase() ||
    (mined.status !== "0x0" && mined.status !== "0x1")
  )
    return { status: "invalid" };
  if (mined.status === "0x0") return { call, status: "failed" };

  let code: unknown;
  try {
    code = await rpc("eth_getCode", [config.contract, mined.blockNumber]);
  } catch {
    return { status: "unavailable" };
  }
  if (typeof code !== "string" || !/^0x(?:[0-9a-f]{2})+$/iu.test(code))
    return { status: "invalid" };
  const event = matchingEvent(
    mined.logs,
    config.contract,
    config.actorWallet,
    call,
  );
  if (!event) return { status: "invalid" };
  return {
    block: mined.blockNumber,
    blockHash: mined.blockHash,
    call,
    ...(event.amount === undefined ? {} : { eventAmount: event.amount }),
    status: "included",
  };
}
