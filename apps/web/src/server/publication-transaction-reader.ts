import { decodeFunctionData, isAddress } from "viem";

import { genesisAbi } from "../lib/genesis-contract";
import type { RpcRead } from "../lib/ownership-reader";
import type { PublicationAction } from "./admin-publication";

export type PublicationTransactionCall = {
  action: PublicationAction;
  expectedPublicationRevision: bigint;
  metadataIpfsUri: `ipfs://${string}` | null;
  tokenId: number;
};

export type PublicationTransactionObservation =
  | { call?: PublicationTransactionCall; status: "pending" }
  | { call: PublicationTransactionCall; status: "failed" }
  | {
      block: `0x${string}`;
      blockHash: `0x${string}`;
      call: PublicationTransactionCall;
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

type RpcReceipt = {
  blockHash?: unknown;
  blockNumber?: unknown;
  from?: unknown;
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

function decodePublicationCall(
  data: unknown,
): PublicationTransactionCall | null {
  if (typeof data !== "string" || !/^0x(?:[0-9a-f]{2})+$/iu.test(data))
    return null;
  try {
    const decoded = decodeFunctionData({
      abi: genesisAbi,
      data: data as `0x${string}`,
    });
    if (decoded.functionName === "publish") {
      const [tokenId, expectedRevision, uri] = decoded.args;
      if (
        typeof tokenId !== "bigint" ||
        tokenId < 1n ||
        tokenId > 10n ||
        typeof expectedRevision !== "bigint" ||
        expectedRevision < 0n ||
        typeof uri !== "string" ||
        !/^ipfs:\/\/[A-Za-z0-9][^\s]*$/u.test(uri)
      )
        return null;
      return {
        action: "publish",
        expectedPublicationRevision: expectedRevision,
        metadataIpfsUri: uri as `ipfs://${string}`,
        tokenId: Number(tokenId),
      };
    }
    if (decoded.functionName === "unpublish") {
      const [tokenId, expectedRevision] = decoded.args;
      if (
        typeof tokenId !== "bigint" ||
        tokenId < 1n ||
        tokenId > 10n ||
        typeof expectedRevision !== "bigint" ||
        expectedRevision < 0n
      )
        return null;
      return {
        action: "unpublish",
        expectedPublicationRevision: expectedRevision,
        metadataIpfsUri: null,
        tokenId: Number(tokenId),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function readPublicationTransaction(
  rpc: RpcRead,
  config: {
    actorWallet: `0x${string}`;
    chainId: 84532;
    contract: `0x${string}`;
  },
  transactionHash: string,
): Promise<PublicationTransactionObservation> {
  if (!isHash(transactionHash)) throw new Error("Invalid transaction hash");
  if (
    !isAddress(config.actorWallet) ||
    /^0x0{40}$/iu.test(config.actorWallet) ||
    !isAddress(config.contract) ||
    /^0x0{40}$/iu.test(config.contract)
  )
    throw new Error("Invalid publication transaction configuration");

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
  const call = decodePublicationCall(tx.input);
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
  try {
    const code = await rpc("eth_getCode", [config.contract, mined.blockNumber]);
    if (typeof code !== "string" || !/^0x(?:[0-9a-f]{2})+$/iu.test(code))
      return { status: "invalid" };
  } catch {
    return { status: "unavailable" };
  }
  return {
    block: mined.blockNumber,
    blockHash: mined.blockHash,
    call,
    status: "included",
  };
}
