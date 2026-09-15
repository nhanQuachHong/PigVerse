import { afterEach, expect, it, vi } from "vitest";
import { createCollectionHandler } from "../../app/api/collection/route";
import type { logPublicReadFailure } from "../server/operational-log";

afterEach(() => vi.unstubAllEnvs());

it("serves ten canonical identities without fabricated chain state when unconfigured", async () => {
  vi.stubEnv("PIGVERSE_ENV", "local");
  const logFailure = vi.fn<typeof logPublicReadFailure>();
  const response = await createCollectionHandler(
    undefined,
    () => "correlation_1",
    logFailure,
  )();
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.get("X-Correlation-ID")).toBe("correlation_1");
  const result = await response.json();
  expect(result.tokens).toHaveLength(10);
  expect(result.mintedCount).toBeNull();
  expect(result.degraded).toBe(true);
  expect(result.correlationId).toBe("correlation_1");
  expect(
    result.tokens.every(
      (token: { status: string; owner: unknown }) =>
        token.status === "unknown" && token.owner === null,
    ),
  ).toBe(true);
  expect(result.tokens[0].name).toBe("Captain Oink");
  expect(logFailure).toHaveBeenCalledWith({
    category: "configuration_unavailable",
    correlationId: "correlation_1",
    surface: "collection",
  });
});

it("returns a redacted 503 when collection resolution fails", async () => {
  const logFailure = vi.fn<typeof logPublicReadFailure>();
  const response = await createCollectionHandler(
    async () => {
      throw new Error("rpc-secret");
    },
    () => "correlation_1",
    logFailure,
  )();

  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({
    code: "COLLECTION_UNAVAILABLE",
    correlationId: "correlation_1",
  });
  expect(logFailure).toHaveBeenCalledWith({
    category: "unavailable",
    correlationId: "correlation_1",
    surface: "collection",
  });
  expect(JSON.stringify(logFailure.mock.calls)).not.toContain("rpc-secret");
});

it("keeps the degraded collection response stable when logging fails", async () => {
  vi.stubEnv("PIGVERSE_ENV", "local");
  const response = await createCollectionHandler(
    undefined,
    () => "correlation_1",
    () => {
      throw new Error("logging unavailable");
    },
  )();

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({
    correlationId: "correlation_1",
    degraded: true,
  });
});
