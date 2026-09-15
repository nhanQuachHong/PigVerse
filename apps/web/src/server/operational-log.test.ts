import { describe, expect, it, vi } from "vitest";

import {
  logAdminAuthFailure,
  logAdminOperationFailure,
  logHealthIntegrationFailure,
  logMintActivityFailure,
  logPublicReadFailure,
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

  it("logs only allowlisted Owner-control failure context", () => {
    const sink = vi.fn();
    logAdminOperationFailure(
      {
        category: "chain_unavailable",
        correlationId: "owner_control_1234",
        operation: "owner_control",
      },
      {
        now: () => new Date("2026-09-14T15:30:00.000Z"),
        sink,
      },
    );

    expect(JSON.parse(sink.mock.calls[0]?.[0] ?? "")).toEqual({
      category: "chain_unavailable",
      correlationId: "owner_control_1234",
      event: "ADMIN_OPERATION_FAILED",
      level: "error",
      operation: "owner_control",
      timestamp: "2026-09-14T15:30:00.000Z",
    });
  });

  it("accepts only fixed publication operation names", () => {
    const sink = vi.fn();
    logAdminOperationFailure(
      {
        category: "asset_not_ready",
        correlationId: "publication_1234",
        operation: "publication_prepare",
      },
      { sink },
    );

    expect(JSON.parse(sink.mock.calls[0]?.[0] ?? "")).toMatchObject({
      category: "asset_not_ready",
      event: "ADMIN_OPERATION_FAILED",
      level: "warning",
      operation: "publication_prepare",
    });
  });

  it("logs mint ingestion failures under a distinct safe event", () => {
    const sink = vi.fn();
    logMintActivityFailure(
      {
        category: "transaction_invalid",
        correlationId: "mint_activity_1234",
        stage: "ingestion",
      },
      { sink },
    );

    expect(JSON.parse(sink.mock.calls[0]?.[0] ?? "")).toMatchObject({
      category: "transaction_invalid",
      event: "MINT_ACTIVITY_FAILED",
      stage: "ingestion",
    });
  });

  it("logs public read degradation without public response data", () => {
    const sink = vi.fn();
    logPublicReadFailure(
      {
        category: "chain_unavailable",
        correlationId: "public_read_1234",
        surface: "collection",
      },
      { sink },
    );

    expect(JSON.parse(sink.mock.calls[0]?.[0] ?? "")).toMatchObject({
      category: "chain_unavailable",
      event: "PUBLIC_READ_DEGRADED",
      level: "error",
      surface: "collection",
    });
  });

  it("rejects non-allowlisted Owner-control context", () => {
    const sink = vi.fn();

    expect(() =>
      logAdminOperationFailure(
        {
          category: "transaction_failed",
          correlationId: "https://rpc.invalid/credential",
          operation: "owner_control",
        },
        { sink },
      ),
    ).toThrow("Invalid operational log input");
    expect(sink).not.toHaveBeenCalled();
  });
});
