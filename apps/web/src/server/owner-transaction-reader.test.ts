import {
  encodeEventTopics,
  encodeFunctionData,
  encodeAbiParameters,
} from "viem";
import { describe, expect, it } from "vitest";

import { genesisAbi } from "../lib/genesis-contract";
import type { RpcRead } from "../lib/ownership-reader";
import { readOwnerTransaction } from "./owner-transaction-reader";

const actorWallet = `0x${"2".repeat(40)}` as const;
const contract = `0x${"1".repeat(40)}` as const;
const transactionHash = `0x${"a".repeat(64)}` as const;
const blockHash = `0x${"b".repeat(64)}` as const;
const config = { actorWallet, chainId: 84532 as const, contract };

function rpcFixture({
  data = encodeFunctionData({ abi: genesisAbi, functionName: "pause" }),
  eventData = encodeAbiParameters([{ type: "address" }], [actorWallet]),
  eventTopics = encodeEventTopics({
    abi: genesisAbi,
    eventName: "Paused",
  }),
  from = actorWallet,
  receipt = true,
  status = "0x1",
  value = "0x0",
}: {
  data?: `0x${string}`;
  eventData?: `0x${string}`;
  eventTopics?: unknown;
  from?: `0x${string}`;
  receipt?: boolean;
  status?: "0x0" | "0x1";
  value?: `0x${string}`;
} = {}): RpcRead {
  return async (method) => {
    if (method === "eth_chainId") return "0x14a34";
    if (method === "eth_getTransactionByHash")
      return {
        blockHash: receipt ? blockHash : null,
        blockNumber: receipt ? "0xabc" : null,
        from,
        hash: transactionHash,
        input: data,
        to: contract,
        value,
      };
    if (method === "eth_getTransactionReceipt")
      return receipt
        ? {
            blockHash,
            blockNumber: "0xabc",
            from,
            logs: [
              {
                address: contract,
                data: eventData,
                removed: false,
                topics: eventTopics,
              },
            ],
            status,
            to: contract,
            transactionHash,
          }
        : null;
    if (method === "eth_getCode") return "0x6000";
    throw new Error(`Unexpected method: ${method}`);
  };
}

describe("Owner transaction reader", () => {
  it("accepts a successful zero-value pause call with its exact event", async () => {
    await expect(
      readOwnerTransaction(rpcFixture(), config, transactionHash),
    ).resolves.toEqual({
      block: "0xabc",
      blockHash,
      call: { action: "pause" },
      status: "included",
    });
  });

  it("requires the matching Unpaused event for an unpause call", async () => {
    const data = encodeFunctionData({
      abi: genesisAbi,
      functionName: "unpause",
    });
    const eventTopics = encodeEventTopics({
      abi: genesisAbi,
      eventName: "Unpaused",
    });
    const eventData = encodeAbiParameters([{ type: "address" }], [actorWallet]);

    await expect(
      readOwnerTransaction(
        rpcFixture({ data, eventData, eventTopics }),
        config,
        transactionHash,
      ),
    ).resolves.toMatchObject({
      call: { action: "unpause" },
      status: "included",
    });
  });

  it("derives the new mint price from calldata and checks the event", async () => {
    const data = encodeFunctionData({
      abi: genesisAbi,
      args: [125000000000000000n],
      functionName: "setMintPrice",
    });
    const eventTopics = encodeEventTopics({
      abi: genesisAbi,
      eventName: "MintPriceChanged",
    });
    const eventData = encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256" }],
      [0n, 125000000000000000n],
    );

    await expect(
      readOwnerTransaction(
        rpcFixture({ data, eventData, eventTopics }),
        config,
        transactionHash,
      ),
    ).resolves.toMatchObject({
      call: { action: "setMintPrice", newPrice: 125000000000000000n },
      status: "included",
    });
  });

  it("records the exact withdrawn amount only for the Owner recipient", async () => {
    const data = encodeFunctionData({
      abi: genesisAbi,
      functionName: "withdraw",
    });
    const eventTopics = encodeEventTopics({
      abi: genesisAbi,
      args: { recipient: actorWallet },
      eventName: "Withdrawn",
    });
    const eventData = encodeAbiParameters(
      [{ type: "uint256" }],
      [250000000000000000n],
    );

    await expect(
      readOwnerTransaction(
        rpcFixture({ data, eventData, eventTopics }),
        config,
        transactionHash,
      ),
    ).resolves.toMatchObject({
      call: { action: "withdraw" },
      eventAmount: 250000000000000000n,
      status: "included",
    });
  });

  it("fails closed when a Withdrawn event names another recipient", async () => {
    const data = encodeFunctionData({
      abi: genesisAbi,
      functionName: "withdraw",
    });
    const eventTopics = encodeEventTopics({
      abi: genesisAbi,
      args: { recipient: `0x${"3".repeat(40)}` },
      eventName: "Withdrawn",
    });
    const eventData = encodeAbiParameters([{ type: "uint256" }], [1n]);

    await expect(
      readOwnerTransaction(
        rpcFixture({ data, eventData, eventTopics }),
        config,
        transactionHash,
      ),
    ).resolves.toEqual({ status: "invalid" });
  });

  it("distinguishes pending and reverted transactions", async () => {
    await expect(
      readOwnerTransaction(
        rpcFixture({ receipt: false }),
        config,
        transactionHash,
      ),
    ).resolves.toEqual({ call: { action: "pause" }, status: "pending" });
    await expect(
      readOwnerTransaction(
        rpcFixture({ status: "0x0" }),
        config,
        transactionHash,
      ),
    ).resolves.toEqual({ call: { action: "pause" }, status: "failed" });
  });

  it("rejects a different sender, nonzero value and unrelated calldata", async () => {
    const other = `0x${"3".repeat(40)}` as const;
    await expect(
      readOwnerTransaction(
        rpcFixture({ from: other }),
        config,
        transactionHash,
      ),
    ).resolves.toEqual({ status: "invalid" });
    await expect(
      readOwnerTransaction(
        rpcFixture({ value: "0x1" }),
        config,
        transactionHash,
      ),
    ).resolves.toEqual({ status: "invalid" });
    await expect(
      readOwnerTransaction(
        rpcFixture({
          data: encodeFunctionData({
            abi: genesisAbi,
            args: [1n, 1n],
            functionName: "mint",
          }),
        }),
        config,
        transactionHash,
      ),
    ).resolves.toEqual({ status: "invalid" });
  });

  it("returns unavailable without leaking provider failures", async () => {
    const rpc: RpcRead = async () => {
      throw new Error("provider secret detail");
    };
    await expect(
      readOwnerTransaction(rpc, config, transactionHash),
    ).resolves.toEqual({ status: "unavailable" });
  });
});
