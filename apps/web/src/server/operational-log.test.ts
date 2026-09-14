import { describe, expect, it, vi } from "vitest";

import {
  logAdminAuthFailure,
  logHealthIntegrationFailure,
} from "./operational-log";

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

  it("logs only allowlisted Admin authentication context", () => {
    const sink = vi.fn();
    logAdminAuthFailure(
      {
        category: "authorization_denied",
        correlationId: "admin_auth_1234",
        stage: "verify",
      },
      {
        now: () => new Date("2026-09-14T15:30:00.000Z"),
        sink,
      },
    );

    expect(JSON.parse(sink.mock.calls[0]?.[0] ?? "")).toEqual({
      category: "authorization_denied",
      correlationId: "admin_auth_1234",
      event: "ADMIN_AUTH_FAILED",
      level: "warning",
      stage: "verify",
      timestamp: "2026-09-14T15:30:00.000Z",
    });
  });
});
