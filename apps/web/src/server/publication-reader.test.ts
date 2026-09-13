import { encodeAbiParameters, toFunctionSelector } from "viem";
import { describe, expect, it, vi } from "vitest";

import type { RpcRead } from "../lib/ownership-reader";
import { readPublicationSnapshot } from "./publication-reader";

const contract = `0x${"1".repeat(40)}` as const;
const config = { chainId: 84532, contract } as const;

function unmintedRevert(tokenId: number) {
  return Object.assign(new Error("reverted"), {
    code: 3,
    data: `0x7e273289${tokenId.toString(16).padStart(64, "0")}`,
  });
}

function rpcFixture({
  metadataUri = "ipfs://bafyfixture/metadata.json",
  minted = false,
  revision = 4n,
}: {
  metadataUri?: string;
  minted?: boolean;
  revision?: bigint;
} = {}) {
  const rpc = vi.fn<RpcRead>(async (method, params) => {
    if (method === "eth_chainId") return "0x14a34";
    if (method === "eth_blockNumber") return "0xabc";
    if (method === "eth_getCode") return "0x6000";
    const request = params[0] as { data: string };
    if (request.data.startsWith("0x6352211e")) {
      if (!minted) throw unmintedRevert(3);
      return `0x${"0".repeat(24)}${"a".repeat(40)}`;
    }
    if (
      request.data.startsWith(
        toFunctionSelector("publicationRevision(uint256)"),
      )
    )
      return `0x${revision.toString(16).padStart(64, "0")}`;
    if (request.data.startsWith(toFunctionSelector("publishedURI(uint256)")))
      return encodeAbiParameters([{ type: "string" }], [metadataUri]);
    throw new Error("Unexpected RPC call");
  });
  return rpc;
}

describe("publication snapshot reader", () => {
  it("binds unminted publication state to one verified block", async () => {
    const rpc = rpcFixture();

    await expect(readPublicationSnapshot(rpc, config, 3)).resolves.toEqual({
      block: "0xabc",
      metadataUri: "ipfs://bafyfixture/metadata.json",
      publicationRevision: 4n,
      tokenState: "unminted",
    });
    for (const [method, params] of rpc.mock.calls) {
      if (method === "eth_call" || method === "eth_getCode")
        expect(params.at(-1)).toBe("0xabc");
    }
  });

  it("retains authoritative minted state", async () => {
    await expect(
      readPublicationSnapshot(
        rpcFixture({ metadataUri: "", minted: true, revision: 0n }),
        config,
        3,
      ),
    ).resolves.toEqual({
      block: "0xabc",
      metadataUri: null,
      publicationRevision: 0n,
      tokenState: "minted",
    });
  });

  it("fails closed on the wrong chain, unknown ownership or invalid URI", async () => {
    const wrongChain = rpcFixture();
    wrongChain.mockResolvedValueOnce("0x1");
    await expect(
      readPublicationSnapshot(wrongChain, config, 3),
    ).resolves.toBeNull();

    const unknownOwnership = rpcFixture();
    unknownOwnership.mockImplementationOnce(async () => "0x14a34");
    unknownOwnership.mockImplementationOnce(async () => "0xabc");
    unknownOwnership.mockImplementationOnce(async () => "0x6000");
    unknownOwnership.mockImplementationOnce(async () => {
      throw new Error("transport unavailable");
    });
    await expect(
      readPublicationSnapshot(unknownOwnership, config, 3),
    ).resolves.toBeNull();

    await expect(
      readPublicationSnapshot(
        rpcFixture({ metadataUri: "https://mutable.example/3.json" }),
        config,
        3,
      ),
    ).resolves.toBeNull();
  });

  it("rejects invalid token and contract inputs before RPC", async () => {
    const rpc = rpcFixture();
    await expect(readPublicationSnapshot(rpc, config, 0)).rejects.toThrow(
      "Invalid Genesis token ID",
    );
    await expect(
      readPublicationSnapshot(
        rpc,
        { ...config, contract: `0x${"0".repeat(40)}` },
        1,
      ),
    ).rejects.toThrow("Invalid Genesis contract address");
    expect(rpc).not.toHaveBeenCalled();
  });
});
