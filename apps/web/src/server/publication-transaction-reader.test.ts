import { encodeFunctionData } from "viem";
import { describe, expect, it, vi } from "vitest";

import { genesisAbi } from "../lib/genesis-contract";
import type { RpcRead } from "../lib/ownership-reader";
import { readPublicationTransaction } from "./publication-transaction-reader";

const actorWallet = `0x${"a".repeat(40)}` as const;
const contract = `0x${"b".repeat(40)}` as const;
const transactionHash = `0x${"c".repeat(64)}`;
const blockHash = `0x${"d".repeat(64)}`;
const publishData = encodeFunctionData({
  abi: genesisAbi,
  args: [3n, 4n, "ipfs://bafyfixture/metadata.json"],
  functionName: "publish",
});

function rpcFixture({
  data = publishData,
  receipt = true,
  status = "0x1",
}: {
  data?: string;
  receipt?: boolean;
  status?: string;
} = {}) {
  return vi.fn<RpcRead>(async (method) => {
    if (method === "eth_chainId") return "0x14a34";
    if (method === "eth_getCode") return "0x6000";
    if (method === "eth_getTransactionByHash")
      return {
        blockHash: receipt ? blockHash : null,
        blockNumber: receipt ? "0xabc" : null,
        from: actorWallet,
        hash: transactionHash,
        input: data,
        to: contract,
        value: "0x0",
      };
    if (method === "eth_getTransactionReceipt")
      return receipt
        ? {
            blockHash,
            blockNumber: "0xabc",
            from: actorWallet,
            status,
            to: contract,
            transactionHash,
          }
        : null;
    throw new Error("Unexpected RPC call");
  });
}

const config = { actorWallet, chainId: 84532, contract } as const;

describe("publication transaction reader", () => {
  it("accepts only a successful zero-value owner publication call", async () => {
    const rpc = rpcFixture();
    await expect(
      readPublicationTransaction(rpc, config, transactionHash),
    ).resolves.toEqual({
      block: "0xabc",
      blockHash,
      call: {
        action: "publish",
        expectedPublicationRevision: 4n,
        metadataIpfsUri: "ipfs://bafyfixture/metadata.json",
        tokenId: 3,
      },
      status: "included",
    });
    expect(rpc).toHaveBeenCalledWith("eth_getCode", [contract, "0xabc"]);
  });

  it("decodes pending unpublish and keeps a failed receipt distinct", async () => {
    const unpublishData = encodeFunctionData({
      abi: genesisAbi,
      args: [3n, 7n],
      functionName: "unpublish",
    });
    await expect(
      readPublicationTransaction(
        rpcFixture({ data: unpublishData, receipt: false }),
        config,
        transactionHash,
      ),
    ).resolves.toEqual({
      call: {
        action: "unpublish",
        expectedPublicationRevision: 7n,
        metadataIpfsUri: null,
        tokenId: 3,
      },
      status: "pending",
    });
    await expect(
      readPublicationTransaction(
        rpcFixture({ status: "0x0" }),
        config,
        transactionHash,
      ),
    ).resolves.toMatchObject({ status: "failed" });
  });

  it("rejects a different sender, contract, value or non-publication calldata", async () => {
    for (const mutate of [
      { from: `0x${"d".repeat(40)}` },
      { to: `0x${"d".repeat(40)}` },
      { value: "0x1" },
      { input: "0x12345678" },
    ]) {
      const rpc = rpcFixture();
      rpc.mockImplementation(async (method) => {
        if (method === "eth_chainId") return "0x14a34";
        if (method === "eth_getTransactionReceipt")
          return {
            blockHash,
            blockNumber: "0xabc",
            from: actorWallet,
            status: "0x1",
            to: contract,
            transactionHash,
          };
        if (method === "eth_getTransactionByHash")
          return {
            blockHash,
            blockNumber: "0xabc",
            from: actorWallet,
            hash: transactionHash,
            input: publishData,
            to: contract,
            value: "0x0",
            ...mutate,
          };
        if (method === "eth_getCode") return "0x6000";
        throw new Error("Unexpected RPC call");
      });
      await expect(
        readPublicationTransaction(rpc, config, transactionHash),
      ).resolves.toEqual({ status: "invalid" });
    }
  });

  it("distinguishes unavailable RPC, unknown hashes and wrong-chain data", async () => {
    const unavailable = vi.fn<RpcRead>(async () => {
      throw new Error("provider unavailable");
    });
    await expect(
      readPublicationTransaction(unavailable, config, transactionHash),
    ).resolves.toEqual({ status: "unavailable" });

    const unknown = vi.fn<RpcRead>(async (method) =>
      method === "eth_chainId" ? "0x14a34" : null,
    );
    await expect(
      readPublicationTransaction(unknown, config, transactionHash),
    ).resolves.toEqual({ status: "pending" });

    const wrongChain = rpcFixture();
    wrongChain.mockResolvedValueOnce("0x1");
    await expect(
      readPublicationTransaction(wrongChain, config, transactionHash),
    ).resolves.toEqual({ status: "invalid" });
  });

  it("rejects malformed transaction hashes before RPC", async () => {
    const rpc = rpcFixture();
    await expect(
      readPublicationTransaction(rpc, config, "0x1234"),
    ).rejects.toThrow("Invalid transaction hash");
    expect(rpc).not.toHaveBeenCalled();
  });
});
