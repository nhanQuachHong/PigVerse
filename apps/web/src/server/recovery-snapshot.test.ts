import {
  decodeFunctionData,
  encodeErrorResult,
  encodeFunctionResult,
  parseAbi,
} from "viem";
import { describe, expect, it, vi } from "vitest";

import {
  captureGenesisRecoverySnapshot,
  createRecoveryRpc,
  type RecoveryRpc,
} from "./recovery-snapshot";

const contract = "0x1111111111111111111111111111111111111111";
const contractOwner = "0x2222222222222222222222222222222222222222";
const tokenOwner = "0x3333333333333333333333333333333333333333";
const blockHash = `0x${"a".repeat(64)}` as const;
const abi = parseAbi([
  "error ERC721NonexistentToken(uint256 tokenId)",
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

function fixtureRpc(
  options: {
    maxSupply?: bigint;
    publishedUri?: string;
    totalSupply?: bigint;
  } = {},
): RecoveryRpc {
  return vi.fn(async (method, params) => {
    if (method === "eth_chainId") return "0x14a34";
    if (method === "eth_blockNumber") return "0x10";
    if (method === "eth_getBlockByNumber")
      return { hash: blockHash, number: "0x10" };
    if (method === "eth_getCode") return "0x60006000";
    if (method !== "eth_call") throw new Error("Unexpected RPC method");
    const request = params[0] as { data: `0x${string}` };
    const decoded = decodeFunctionData({ abi, data: request.data });
    const tokenId = Number(decoded.args?.[0] ?? 0n);
    const result = (() => {
      switch (decoded.functionName) {
        case "name":
          return "Pigverse Genesis";
        case "symbol":
          return "PIGVERSE";
        case "MAX_SUPPLY":
          return options.maxSupply ?? 10n;
        case "owner":
          return contractOwner;
        case "paused":
          return false;
        case "mintPrice":
          return 0n;
        case "totalSupply":
          return options.totalSupply ?? 1n;
        case "publishedURI":
          return tokenId === 1
            ? (options.publishedUri ?? "ipfs://metadata-one")
            : "";
        case "publicationRevision":
          return tokenId === 1 ? 1n : 0n;
        case "ownerOf":
          if (tokenId === 1) return tokenOwner;
          throw Object.assign(new Error("execution reverted"), {
            code: 3,
            data: encodeErrorResult({
              abi,
              errorName: "ERC721NonexistentToken",
              args: [BigInt(tokenId)],
            }),
          });
        case "tokenURI":
          return "ipfs://metadata-one";
      }
    })();
    return encodeFunctionResult({
      abi,
      functionName: decoded.functionName,
      result,
    } as never);
  });
}

describe("Base Sepolia Genesis recovery snapshot", () => {
  it("reconstructs all ten identities from one chain block", async () => {
    const rpc = fixtureRpc();

    await expect(
      captureGenesisRecoverySnapshot({ contract }, rpc),
    ).resolves.toEqual({
      blockHash,
      blockNumber: "16",
      chainId: 84532,
      contract,
      contractOwner,
      mintPriceWei: "0",
      paused: false,
      schemaVersion: 1,
      tokens: [
        {
          mintedUri: "ipfs://metadata-one",
          owner: tokenOwner,
          publicationRevision: "1",
          publishedUri: "ipfs://metadata-one",
          state: "minted",
          tokenId: 1,
        },
        ...Array.from({ length: 9 }, (_, index) => ({
          mintedUri: null,
          owner: null,
          publicationRevision: "0",
          publishedUri: null,
          state: "unminted" as const,
          tokenId: index + 2,
        })),
      ],
      totalSupply: 1,
    });
    const calls = vi.mocked(rpc).mock.calls;
    expect(
      calls
        .filter(([method]) => method === "eth_call")
        .every(([, params]) => params[1] === "0x10"),
    ).toBe(true);
  });

  it("fails closed when supply and recovered owners disagree", async () => {
    await expect(
      captureGenesisRecoverySnapshot(
        { contract },
        fixtureRpc({ totalSupply: 2n }),
      ),
    ).rejects.toThrow("Total supply does not match recovered ownership");
  });

  it("rejects the wrong contract identity at the configured address", async () => {
    await expect(
      captureGenesisRecoverySnapshot(
        { contract },
        fixtureRpc({ maxSupply: 11n }),
      ),
    ).rejects.toThrow("Unexpected Genesis contract identity");
  });

  it("rejects mutable publication evidence for a minted identity", async () => {
    await expect(
      captureGenesisRecoverySnapshot(
        { contract },
        fixtureRpc({ publishedUri: "ipfs://different-metadata" }),
      ),
    ).rejects.toThrow("Minted metadata differs from published metadata");
  });

  it("does not interpret a generic provider failure as an unminted token", async () => {
    const base = fixtureRpc();
    const rpc: RecoveryRpc = async (method, params) => {
      if (method === "eth_call") {
        const request = params[0] as { data: `0x${string}` };
        const decoded = decodeFunctionData({ abi, data: request.data });
        if (decoded.functionName === "ownerOf" && decoded.args?.[0] === 2n)
          throw new Error("provider unavailable");
      }
      return base(method, params);
    };

    await expect(
      captureGenesisRecoverySnapshot({ contract }, rpc),
    ).rejects.toThrow("provider unavailable");
  });

  it("redacts provider error messages at the RPC boundary", async () => {
    const rpc = createRecoveryRpc(
      "https://rpc.example",
      vi.fn(async () =>
        Response.json({
          error: { code: -32_000, message: "secret provider detail" },
          id: 1,
          jsonrpc: "2.0",
        }),
      ),
    );

    const error = await rpc("eth_chainId", []).catch((caught) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Recovery RPC request failed");
    expect((error as Error).message).not.toContain("secret provider detail");
  });
});
