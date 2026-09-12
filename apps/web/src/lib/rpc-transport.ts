import type { RpcRead } from "./ownership-reader";

/** Endpoint is trusted application configuration, never user input. */
export function createRpcRead(
  endpoint: string,
  fetcher: typeof fetch = fetch,
): RpcRead {
  let nextId = 0;
  return async (method, params) => {
    const id = ++nextId;
    const response = await fetcher(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
    });
    if (!response.ok) throw new Error("RPC transport unavailable");
    const body: unknown = await response.json();
    if (
      !body ||
      typeof body !== "object" ||
      !("jsonrpc" in body) ||
      body.jsonrpc !== "2.0" ||
      !("id" in body) ||
      body.id !== id
    )
      throw new Error("Invalid RPC response");
    if ("error" in body) {
      const error = body.error;
      if (
        "result" in body ||
        !error ||
        typeof error !== "object" ||
        !("code" in error) ||
        !Number.isInteger(error.code)
      )
        throw new Error("Invalid RPC error");
      // Preserve only fields required to classify contract reverts. Provider
      // messages can contain endpoint credentials and must not reach the UI.
      throw Object.assign(new Error("RPC request failed"), {
        code: error.code,
        data: "data" in error ? error.data : undefined,
      });
    }
    if (!("result" in body)) throw new Error("Missing RPC result");
    return body.result;
  };
}
