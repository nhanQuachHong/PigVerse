import {
  encodeEventTopics,
  encodeFunctionData,
  encodeFunctionResult,
  parseAbi,
} from "viem";
import { describe, expect, it, vi } from "vitest";

import { genesisAbi } from "../lib/genesis-contract";
import type { RpcRead } from "../lib/ownership-reader";
import { readMintTransaction } from "./mint-transaction-reader";

const evidenceAbi = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "function ownerOf(uint256 tokenId) view returns (address)",
]);
const senderWallet = `0x${"a".repeat(40)}` as const;
const ownerWallet = `0x${"e".repeat(40)}` as const;
const contract = `0x${"b".repeat(40)}` as const;
const transactionHash = `0x${"c".repeat(64)}`;
const blockHash = `0x${"d".repeat(64)}`;
const mintData = encodeFunctionData({
  abi: genesisAbi,
  args: [3n, 4n],
  functionName: "mint",
});
const transferTopics = encodeEventTopics({
  abi: evidenceAbi,
  args: {
    from: "0x0000000000000000000000000000000000000000",
    to: senderWallet,
    tokenId: 3n,
  },
  eventName: "Transfer",
});
const ownerResult = encodeFunctionResult({
  abi: evidenceAbi,
  functionName: "ownerOf",
  result: ownerWallet,
});

function rpcFixture({
  receipt = true,
  status = "0x1",
}: {
  receipt?: boolean;
  status?: string;
} = {}) {
  return vi.fn<RpcRead>(async (method) => {
    if (method === "eth_chainId") return "0x14a34";
    if (method === "eth_getCode") return "0x6000";
    if (method === "eth_call") return ownerResult;
    if (method === "eth_getTransactionByHash")
      return {
        blockHash: receipt ? blockHash : null,
        blockNumber: receipt ? "0xabc" : null,
        from: senderWallet,
        hash: transactionHash,
        input: mintData,
        to: contract,
        value: "0x2a",
      };
    if (method === "eth_getTransactionReceipt")
      return receipt
        ? {
            blockHash,
            blockNumber: "0xabc",
            from: senderWallet,
            logs: [
              {
                address: contract,
                blockHash,
                data: "0x",
                logIndex: "0x7",
                removed: false,
                topics: transferTopics,
                transactionHash,
              },
            ],
            status,
            to: contract,
            transactionHash,
          }
        : null;
    throw new Error(`Unexpected RPC call: ${method}`);
  });
}

const config = { chainId: 84532, contract } as const;

describe("mint transaction reader", () => {
  it("accepts successful mint calldata only with exact receipt and Transfer evidence", async () => {
    const rpc = rpcFixture();

    await expect(
      readMintTransaction(rpc, config, transactionHash),
    ).resolves.toEqual({
      block: "0xabc",
      blockHash,
      call: {
        expectedPublicationRevision: 4n,
        tokenId: 3,
        value: 42n,
      },
      ownerWallet,
      senderWallet,
      status: "succeeded",
      transferLogIndex: 7,
    });
    expect(rpc).toHaveBeenCalledWith("eth_getCode", [contract, "0xabc"]);
    expect(rpc).toHaveBeenCalledWith("eth_call", [
      expect.objectContaining({ to: contract }),
      "0xabc",
    ]);
  });

  it("distinguishes a visible pending transaction from a reverted receipt", async () => {
    await expect(
      readMintTransaction(
        rpcFixture({ receipt: false }),
        config,
        transactionHash,
      ),
    ).resolves.toMatchObject({
      call: { tokenId: 3, value: 42n },
      senderWallet,
      status: "pending",
    });
    await expect(
      readMintTransaction(
        rpcFixture({ status: "0x0" }),
        config,
        transactionHash,
      ),
    ).resolves.toMatchObject({
      blockHash,
      senderWallet,
      status: "reverted",
    });
  });

  it("rejects a different target, non-mint calldata and mismatched Transfer evidence", async () => {
    for (const mutation of [
      { transaction: { to: `0x${"f".repeat(40)}` } },
      {
        transaction: {
          input: encodeFunctionData({
            abi: genesisAbi,
            functionName: "unpublish",
            args: [3n, 4n],
          }),
        },
      },
      { log: { address: `0x${"f".repeat(40)}` } },
      { log: { removed: true } },
    ]) {
      const rpc = rpcFixture();
      rpc.mockImplementation(async (method) => {
        if (method === "eth_chainId") return "0x14a34";
        if (method === "eth_getCode") return "0x6000";
        if (method === "eth_call") return ownerResult;
        if (method === "eth_getTransactionByHash")
          return {
            blockHash,
            blockNumber: "0xabc",
            from: senderWallet,
            hash: transactionHash,
            input: mintData,
            to: contract,
            value: "0x2a",
            ...mutation.transaction,
          };
        if (method === "eth_getTransactionReceipt")
          return {
            blockHash,
            blockNumber: "0xabc",
            from: senderWallet,
            logs: [
              {
                address: contract,
                blockHash,
                data: "0x",
                logIndex: "0x7",
                removed: false,
                topics: transferTopics,
                transactionHash,
                ...mutation.log,
              },
            ],
            status: "0x1",
            to: contract,
            transactionHash,
          };
        throw new Error(`Unexpected RPC call: ${method}`);
      });

      await expect(
        readMintTransaction(rpc, config, transactionHash),
      ).resolves.toEqual({ status: "invalid" });
    }
  });

  it("rejects successful receipts without one unique mint Transfer", async () => {
    for (const logs of [
      [],
      [
        {
          address: contract,
          blockHash,
          data: "0x",
          logIndex: "0x7",
          removed: false,
          topics: transferTopics,
          transactionHash,
        },
        {
          address: contract,
          blockHash,
          data: "0x",
          logIndex: "0x8",
          removed: false,
          topics: transferTopics,
          transactionHash,
        },
      ],
    ]) {
      const rpc = rpcFixture();
      const original = rpc.getMockImplementation()!;
      rpc.mockImplementation(async (method, params) => {
        const result = await original(method, params);
        return method === "eth_getTransactionReceipt"
          ? { ...(result as object), logs }
          : result;
      });
      await expect(
        readMintTransaction(rpc, config, transactionHash),
      ).resolves.toEqual({ status: "invalid" });
    }
  });

  it("does not confuse unknown hashes or provider failures with pending", async () => {
    const unknown = vi.fn<RpcRead>(async (method) =>
      method === "eth_chainId" ? "0x14a34" : null,
    );
    await expect(
      readMintTransaction(unknown, config, transactionHash),
    ).resolves.toEqual({ status: "unknown" });

    const unavailable = vi.fn<RpcRead>(async () => {
      throw new Error("provider unavailable");
    });
    await expect(
      readMintTransaction(unavailable, config, transactionHash),
    ).resolves.toEqual({ status: "unavailable" });
  });

  it("rejects wrong-chain observations and malformed hashes", async () => {
    const wrongChain = rpcFixture();
    wrongChain.mockResolvedValueOnce("0x1");
    await expect(
      readMintTransaction(wrongChain, config, transactionHash),
    ).resolves.toEqual({ status: "invalid" });

    const rpc = rpcFixture();
    await expect(readMintTransaction(rpc, config, "0x1234")).rejects.toThrow(
      "Invalid transaction hash",
    );
    expect(rpc).not.toHaveBeenCalled();
  });
});
