import { describe, expect, it, vi } from "vitest";

import { logHealthIntegrationFailure } from "./operational-log";

describe("operational logging", () => {
  it("writes a bounded machine-readable health event", () => {
    const sink = vi.fn();
    logHealthIntegrationFailure(
      { correlationId: "health_probe_1234", integration: "chain" },
      {
        now: () => new Date("2026-09-14T15:30:00.000Z"),
        sink,
      },
    );

    expect(sink).toHaveBeenCalledOnce();
    expect(JSON.parse(sink.mock.calls[0]?.[0] ?? "")).toEqual({
      correlationId: "health_probe_1234",
      event: "INTEGRATION_HEALTH_FAILED",
      integration: "chain",
      level: "error",
      timestamp: "2026-09-14T15:30:00.000Z",
    });
  });

  it("rejects unsafe correlation data before logging", () => {
    const sink = vi.fn();

    expect(() =>
      logHealthIntegrationFailure(
        {
          correlationId: "https://rpc.invalid/credential",
          integration: "database",
        },
        { sink },
      ),
    ).toThrow("Invalid operational log input");
    expect(() =>
      logHealthIntegrationFailure(
        {
          correlationId: "health_probe_1234",
          integration: "https://rpc.invalid" as "chain",
        },
        { sink },
      ),
    ).toThrow("Invalid operational log input");
    expect(sink).not.toHaveBeenCalled();
  });
});
