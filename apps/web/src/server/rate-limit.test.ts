import { describe, expect, it } from "vitest";

import { FixedWindowRateLimiter } from "./rate-limit";

describe("fixed-window auth abuse guard", () => {
  it("bounds attempts and reopens only after the configured window", () => {
    const limiter = new FixedWindowRateLimiter(2, 1_000);
    expect(limiter.consume("wallet", 0)).toBe(true);
    expect(limiter.consume("wallet", 1)).toBe(true);
    expect(limiter.consume("wallet", 999)).toBe(false);
    expect(limiter.consume("wallet", 1_000)).toBe(true);
  });
});
