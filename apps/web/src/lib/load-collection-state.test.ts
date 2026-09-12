import { expect, it } from "vitest";
import { loadCollectionState } from "./load-collection-state";

const config = {
  rpcUrl: "https://rpc.example",
  contract: `0x${"1".repeat(40)}`,
  chainId: 84532,
} as const;

it("integrates HTTP reads into ten-slot collection state at one block", async () => {
  const fetcher: typeof fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body));
    const respond = (result: unknown) =>
      Response.json({ jsonrpc: "2.0", id: request.id, result });
    if (request.method === "eth_chainId") return respond("0x14a34");
    if (request.method === "eth_blockNumber") return respond("0x123");
    expect(request.params[1]).toBe("0x123");
    if (request.method === "eth_getCode") return respond("0x6000");
    const data: string = request.params[0].data;
    if (data === "0x5c975abb") return respond(`0x${"0".repeat(64)}`);
    const id = BigInt(`0x${data.slice(10)}`);
    if (id === 1n) return respond(`0x${"0".repeat(24)}${"a".repeat(40)}`);
    return Response.json({
      jsonrpc: "2.0",
      id: request.id,
      error: {
        code: 3,
        data: `0x7e273289${id.toString(16).padStart(64, "0")}`,
      },
    });
  };
  const result = await loadCollectionState(config, new Set([2]), fetcher);
  expect(result.block).toBe("0x123");
  expect(result.tokens).toHaveLength(10);
  expect(result.mintedCount).toBe(1);
  expect(result.tokens[0]?.status).toBe("minted");
  expect(result.tokens[1]?.status).toBe("available");
  expect(result.tokens[2]?.status).toBe("coming-soon");
});

it("preserves all slots without inventing mint progress during HTTP failure", async () => {
  const result = await loadCollectionState(
    config,
    new Set([1, 2]),
    async () => new Response("unavailable", { status: 503 }),
  );
  expect(result.tokens).toHaveLength(10);
  expect(result.tokens.every((token) => token.status === "unknown")).toBe(true);
  expect(result.mintedCount).toBeNull();
});
