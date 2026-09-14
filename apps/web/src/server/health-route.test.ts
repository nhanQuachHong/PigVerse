import { describe, expect, it, vi } from "vitest";

import { createHealthHandler } from "../../app/api/health/route";

describe("health route", () => {
  it("returns a no-store 200 response for a ready deployment", async () => {
    const response = await createHealthHandler(
      () => ({
        checkChain: vi.fn().mockResolvedValue(true),
        checkDatabase: vi.fn().mockResolvedValue(true),
        configurationReady: true,
        correlationId: () => "health_route_ready",
        now: () => new Date("2026-09-14T15:30:00.000Z"),
      }),
      0,
    )();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-correlation-id")).toBe("health_route_ready");
    await expect(response.json()).resolves.toMatchObject({ status: "ok" });
  });

  it("returns a redacted 503 response when an integration is degraded", async () => {
    const response = await createHealthHandler(
      () => ({
        checkChain: vi
          .fn()
          .mockRejectedValue(new Error("https://rpc.example/private-token")),
        checkDatabase: vi.fn().mockResolvedValue(true),
        configurationReady: true,
        correlationId: () => "health_route_failure",
        now: () => new Date("2026-09-14T15:30:00.000Z"),
      }),
      0,
    )();
    const source = await response.text();

    expect(response.status).toBe(503);
    expect(source).toContain('"chain":"error"');
    expect(source).not.toContain("private-token");
  });

  it("coalesces concurrent probes and caches the safe report", async () => {
    const checkChain = vi.fn().mockResolvedValue(true);
    const checkDatabase = vi.fn().mockResolvedValue(true);
    const handler = createHealthHandler(
      () => ({
        checkChain,
        checkDatabase,
        configurationReady: true,
        correlationId: () => "health_route_cached",
      }),
      10_000,
    );

    await Promise.all([handler(), handler()]);
    await handler();

    expect(checkChain).toHaveBeenCalledOnce();
    expect(checkDatabase).toHaveBeenCalledOnce();
  });
});
