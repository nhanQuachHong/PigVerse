import type { RpcRead } from "./ownership-reader";

type RpcTransportOptions = {
  retryCount?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  wait?: (delayMs: number) => Promise<void>;
};

const retryableStatus = (status: number) =>
  status === 408 || status === 425 || status === 429 || status >= 500;

const defaultWait = (delayMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, delayMs));

/** Endpoint is trusted application configuration, never user input. */
export function createRpcRead(
  endpoint: string,
  fetcher: typeof fetch = fetch,
  options: RpcTransportOptions = {},
): RpcRead {
  const retryCount = options.retryCount ?? 1;
  const retryDelayMs = options.retryDelayMs ?? 100;
  const timeoutMs = options.timeoutMs ?? 10_000;
  if (!Number.isInteger(retryCount) || retryCount < 0 || retryCount > 3)
    throw new Error("Invalid RPC retry count");
  if (
    !Number.isInteger(retryDelayMs) ||
    retryDelayMs < 0 ||
    retryDelayMs > 5_000
  )
    throw new Error("Invalid RPC retry delay");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000)
    throw new Error("Invalid RPC timeout");
  const wait = options.wait ?? defaultWait;
  let nextId = 0;
  return async (method, params) => {
    let response: Response | undefined;
    let responseId = 0;
    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      const id = ++nextId;
      responseId = id;
      try {
        response = await fetcher(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
          signal: AbortSignal.timeout(timeoutMs),
          cache: "no-store",
          credentials: "omit",
          redirect: "error",
        });
      } catch {
        if (attempt === retryCount)
          throw new Error("RPC transport unavailable");
        await wait(retryDelayMs * (attempt + 1));
        continue;
      }
      if (response.ok || !retryableStatus(response.status)) break;
      if (attempt === retryCount) break;
      await wait(retryDelayMs * (attempt + 1));
    }
    if (!response) throw new Error("RPC transport unavailable");
    if (!response.ok) throw new Error("RPC transport unavailable");
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error("Invalid RPC response");
    }
    if (
      !body ||
      typeof body !== "object" ||
      !("jsonrpc" in body) ||
      body.jsonrpc !== "2.0" ||
      !("id" in body) ||
      body.id !== responseId
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
