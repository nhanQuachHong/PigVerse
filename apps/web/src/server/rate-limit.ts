import type { Sql } from "postgres";

import { getDatabase } from "./database";

export interface RateLimiter {
  consume(key: string, now?: number): boolean | Promise<boolean>;
}

export class FixedWindowRateLimiter implements RateLimiter {
  private readonly entries = new Map<
    string,
    { count: number; resetAt: number }
  >();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  consume(key: string, now = Date.now()) {
    const current = this.entries.get(key);
    if (!current || current.resetAt <= now) {
      if (!current && this.entries.size >= 10_000) {
        for (const [entryKey, entry] of this.entries)
          if (entry.resetAt <= now) this.entries.delete(entryKey);
        if (this.entries.size >= 10_000) return false;
      }
      this.entries.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (current.count >= this.limit) return false;
    current.count += 1;
    return true;
  }
}

type RateLimitRow = { allowed: boolean };

export class PostgresFixedWindowRateLimiter implements RateLimiter {
  constructor(
    private readonly scope: string,
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly getSql: () => Sql = getDatabase,
  ) {
    if (!/^[a-z][a-z0-9_]{0,63}$/u.test(scope))
      throw new Error("Invalid rate-limit scope");
    if (!Number.isSafeInteger(limit) || limit < 1)
      throw new Error("Invalid rate-limit limit");
    if (!Number.isSafeInteger(windowMs) || windowMs < 1)
      throw new Error("Invalid rate-limit window");
  }

  async consume(key: string) {
    if (!/^[0-9a-f]{64}$/u.test(key)) throw new Error("Invalid rate-limit key");

    const sql = this.getSql();
    await sql`
      DELETE FROM admin_auth_rate_limits
      WHERE reset_at <= clock_timestamp()
        AND NOT (scope = ${this.scope} AND key_hash = ${key})
    `;
    const rows = await sql<RateLimitRow[]>`
      WITH request_time AS (
        SELECT clock_timestamp() AS observed_at
      )
      INSERT INTO admin_auth_rate_limits (
        scope, key_hash, attempt_count, window_started_at, reset_at
      )
      SELECT
        ${this.scope}, ${key}, 1, observed_at,
        observed_at + (${this.windowMs} * interval '1 millisecond')
      FROM request_time
      ON CONFLICT (scope, key_hash) DO UPDATE SET
        attempt_count = CASE
          WHEN admin_auth_rate_limits.reset_at <= EXCLUDED.window_started_at
            THEN 1
          ELSE LEAST(admin_auth_rate_limits.attempt_count + 1, ${this.limit + 1})
        END,
        window_started_at = CASE
          WHEN admin_auth_rate_limits.reset_at <= EXCLUDED.window_started_at
            THEN EXCLUDED.window_started_at
          ELSE admin_auth_rate_limits.window_started_at
        END,
        reset_at = CASE
          WHEN admin_auth_rate_limits.reset_at <= EXCLUDED.window_started_at
            THEN EXCLUDED.reset_at
          ELSE admin_auth_rate_limits.reset_at
        END
      RETURNING attempt_count <= ${this.limit} AS allowed
    `;

    return rows[0]?.allowed === true;
  }
}
