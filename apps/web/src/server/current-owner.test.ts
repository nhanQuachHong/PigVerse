import { encodeAbiParameters } from "viem";
import { describe, expect, it } from "vitest";

import { readCurrentOwner } from "./current-owner";

const config = {
  chainId: 84532,
  contract: "0x1111111111111111111111111111111111111111" as const,
  rpcUrl: "https://rpc.example",
} as const;
const owner = "0x2222222222222222222222222222222222222222";

describe("current owner authorization read", () => {
  it("pins and returns the current checksummed contract owner", async () => {
    const fetcher: typeof fetch = async (_input, init) => {
      const request = JSON.parse(String(init?.body));
      const result =
        request.method === "eth_chainId"
          ? "0x14a34"
          : request.method === "eth_blockNumber"
            ? "0x123"
            : request.method === "eth_getCode"
              ? "0x6000"
              : encodeAbiParameters([{ type: "address" }], [owner]);
      return Response.json({ id: request.id, jsonrpc: "2.0", result });
    };
    await expect(readCurrentOwner(config, fetcher)).resolves.toBe(owner);
  });

  it("fails closed on wrong-chain and transport responses", async () => {
    const wrongChain: typeof fetch = async (_input, init) => {
      const request = JSON.parse(String(init?.body));
      return Response.json({ id: request.id, jsonrpc: "2.0", result: "0x1" });
    };
    await expect(readCurrentOwner(config, wrongChain)).resolves.toBeNull();
    await expect(
      readCurrentOwner(
        config,
        async () => new Response("down", { status: 503 }),
      ),
    ).resolves.toBeNull();
  });
});
