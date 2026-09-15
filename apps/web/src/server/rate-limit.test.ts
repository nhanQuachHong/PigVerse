import type { Sql } from "postgres";
import { describe, expect, it, vi } from "vitest";

import {
  FixedWindowRateLimiter,
  PostgresFixedWindowRateLimiter,
} from "./rate-limit";

describe("fixed-window auth abuse guard", () => {
  it("bounds attempts and reopens only after the configured window", () => {
    const limiter = new FixedWindowRateLimiter(2, 1_000);
    expect(limiter.consume("wallet", 0)).toBe(true);
    expect(limiter.consume("wallet", 1)).toBe(true);
    expect(limiter.consume("wallet", 999)).toBe(false);
    expect(limiter.consume("wallet", 1_000)).toBe(true);
  });

  it("uses one atomic PostgreSQL decision shared by every instance", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ allowed: true }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ allowed: false }]);
    const sql = query as unknown as Sql;
    const limiter = new PostgresFixedWindowRateLimiter(
      "admin_auth_verify",
      2,
      1_000,
      () => sql,
    );
    const key = "a".repeat(64);

    await expect(limiter.consume(key)).resolves.toBe(true);
    await expect(limiter.consume(key)).resolves.toBe(false);
    expect(query).toHaveBeenCalledTimes(4);
    expect(query.mock.calls[1]?.[0].join(" ")).toContain(
      "ON CONFLICT (scope, key_hash) DO UPDATE",
    );
    expect(query.mock.calls[0]?.[0].join(" ")).toContain(
      "DELETE FROM admin_auth_rate_limits",
    );
  });

  it("rejects unbounded scopes and unhashed keys", async () => {
    expect(
      () => new PostgresFixedWindowRateLimiter("BAD SCOPE", 2, 1_000),
    ).toThrow("Invalid rate-limit scope");
    await expect(
      new PostgresFixedWindowRateLimiter("admin_auth_verify", 2, 1_000).consume(
        "plaintext",
      ),
    ).rejects.toThrow("Invalid rate-limit key");
  });
});
