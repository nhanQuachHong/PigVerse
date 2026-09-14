import { describe, expect, it, vi } from "vitest";

import { inspectHealth } from "./health";

const now = new Date("2026-09-14T15:30:00.000Z");

describe("health inspection", () => {
  it("reports ready only when configuration, chain and database agree", async () => {
    await expect(
      inspectHealth({
        checkChain: vi.fn().mockResolvedValue(true),
        checkDatabase: vi.fn().mockResolvedValue(true),
        configurationReady: true,
        now: () => now,
      }),
    ).resolves.toEqual({
      checks: {
        application: "ok",
        chain: "ok",
        configuration: "ok",
        database: "ok",
      },
      status: "ok",
      timestamp: now.toISOString(),
    });
  });

  it("fails closed without configuration and does not contact chain", async () => {
    const checkChain = vi.fn().mockResolvedValue(true);
    const report = await inspectHealth({
      checkChain,
      checkDatabase: vi.fn().mockResolvedValue(true),
      configurationReady: false,
      now: () => now,
    });

    expect(report).toMatchObject({
      checks: { chain: "error", configuration: "error", database: "ok" },
      status: "degraded",
    });
    expect(checkChain).not.toHaveBeenCalled();
  });

  it.each(["rejection", "false", "timeout"])(
    "redacts a %s integration failure",
    async (failure) => {
      const checkDatabase =
        failure === "rejection"
          ? vi.fn().mockRejectedValue(new Error("postgres://secret"))
          : failure === "false"
            ? vi.fn().mockResolvedValue(false)
            : vi.fn(
                () =>
                  new Promise<boolean>((resolve) =>
                    setTimeout(() => resolve(true), 50),
                  ),
              );
      const report = await inspectHealth({
        checkChain: vi.fn().mockResolvedValue(true),
        checkDatabase,
        configurationReady: true,
        now: () => now,
        timeoutMs: failure === "timeout" ? 1 : 100,
      });

      expect(report.checks.database).toBe("error");
      expect(report.status).toBe("degraded");
      expect(JSON.stringify(report)).not.toContain("secret");
    },
  );
});
