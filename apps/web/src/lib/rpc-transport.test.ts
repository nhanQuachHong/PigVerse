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

it("retries one transient transport failure with a new request ID", async () => {
  const wait = vi.fn(async () => undefined);
  const requestIds: number[] = [];
  const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
    const request = JSON.parse(String(init?.body));
    requestIds.push(request.id);
    if (requestIds.length === 1) throw new Error("private provider detail");
    return Response.json({
      jsonrpc: "2.0",
      id: request.id,
      result: "0x14a34",
    });
  });
  const rpc = createRpcRead("https://rpc.example", fetcher, { wait });

  await expect(rpc("eth_chainId", [])).resolves.toBe("0x14a34");
  expect(requestIds).toEqual([1, 2]);
  expect(wait).toHaveBeenCalledWith(100);

  const unavailableFetcher = vi.fn(async () => {
    throw new Error("provider credential in upstream error");
  });
  await expect(
    createRpcRead("https://rpc.example", unavailableFetcher, { wait })(
      "eth_chainId",
      [],
    ),
  ).rejects.toThrow("RPC transport unavailable");
  expect(unavailableFetcher).toHaveBeenCalledTimes(2);
});

it("retries only transient HTTP statuses", async () => {
  const wait = vi.fn(async () => undefined);
  const transientFetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
    const request = JSON.parse(String(init?.body));
    if (transientFetcher.mock.calls.length === 1)
      return new Response(null, { status: 503 });
    return Response.json({
      jsonrpc: "2.0",
      id: request.id,
      result: "0x100",
    });
  });
  const transientRpc = createRpcRead("https://rpc.example", transientFetcher, {
    wait,
  });
  await expect(transientRpc("eth_blockNumber", [])).resolves.toBe("0x100");
  expect(transientFetcher).toHaveBeenCalledTimes(2);

  const permanentFetcher = vi.fn(async () =>
    Response.json({}, { status: 401 }),
  );
  const permanentRpc = createRpcRead("https://rpc.example", permanentFetcher, {
    wait,
  });
  await expect(permanentRpc("eth_blockNumber", [])).rejects.toThrow(
    "RPC transport unavailable",
  );
  expect(permanentFetcher).toHaveBeenCalledTimes(1);
});

it("does not retry JSON-RPC errors or invalid successful responses", async () => {
  const errorFetcher = vi.fn(async () =>
    Response.json({
      jsonrpc: "2.0",
      id: 1,
      error: { code: 3, data: "0x1234" },
    }),
  );
  await expect(
    createRpcRead("https://rpc.example", errorFetcher)("eth_call", []),
  ).rejects.toMatchObject({ code: 3 });
  expect(errorFetcher).toHaveBeenCalledTimes(1);

  const invalidFetcher = vi.fn(
    async () =>
      new Response("not-json", {
        headers: { "Content-Type": "application/json" },
      }),
  );
  await expect(
    createRpcRead("https://rpc.example", invalidFetcher)("eth_call", []),
  ).rejects.toThrow("Invalid RPC response");
  expect(invalidFetcher).toHaveBeenCalledTimes(1);
});

it("rejects retry settings outside bounded transport limits", () => {
  expect(() =>
    createRpcRead("https://rpc.example", fetch, { retryCount: 4 }),
  ).toThrow("Invalid RPC retry count");
  expect(() =>
    createRpcRead("https://rpc.example", fetch, { retryDelayMs: -1 }),
  ).toThrow("Invalid RPC retry delay");
  expect(() =>
    createRpcRead("https://rpc.example", fetch, { timeoutMs: 0 }),
  ).toThrow("Invalid RPC timeout");
});
