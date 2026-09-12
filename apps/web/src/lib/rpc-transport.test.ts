import { expect, it, vi } from "vitest";
import { createRpcRead } from "./rpc-transport";

it("uses unique request IDs and disables caching and credentials", async () => {
  const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
    const request = JSON.parse(String(init?.body));
    expect(init?.cache).toBe("no-store");
    expect(init?.credentials).toBe("omit");
    expect(init?.signal).toBeDefined();
    return Response.json({ jsonrpc: "2.0", id: request.id, result: "0x14a34" });
  });
  const rpc = createRpcRead("https://rpc.example", fetcher);
  expect(await rpc("eth_chainId", [])).toBe("0x14a34");
  await rpc("eth_chainId", []);
  expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body)).id).toBe(2);
});

it("rejects mismatched, malformed and ambiguous responses", async () => {
  for (const body of [
    { jsonrpc: "2.0", id: 9, result: "0x" },
    { jsonrpc: "2.0", id: 1 },
    { jsonrpc: "2.0", id: 1, result: "0x", error: { code: 3 } },
    null,
  ]) {
    const rpc = createRpcRead("https://rpc.example", async () =>
      Response.json(body),
    );
    await expect(rpc("eth_call", [])).rejects.toThrow();
  }
});

it("retains structured revert data without leaking provider messages", async () => {
  const rpc = createRpcRead("https://rpc.example", async () =>
    Response.json({
      jsonrpc: "2.0",
      id: 1,
      error: {
        code: 3,
        data: "0x1234",
        message: "sensitive provider diagnostic",
      },
    }),
  );
  await expect(rpc("eth_call", [])).rejects.toMatchObject({
    code: 3,
    data: "0x1234",
    message: "RPC request failed",
  });
});
