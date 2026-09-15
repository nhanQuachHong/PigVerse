import { describe, expect, it } from "vitest";

import { resolveAuthoritativeReceiptState } from "./use-authoritative-receipt";

const hash = `0x${"a".repeat(64)}` as const;

describe("resolveAuthoritativeReceiptState", () => {
  it("separates idle, pending and unavailable observations", () => {
    expect(
      resolveAuthoritativeReceiptState(undefined, undefined, undefined, false),
    ).toBe("idle");
    expect(
      resolveAuthoritativeReceiptState(hash, undefined, undefined, false),
    ).toBe("pending");
    expect(
      resolveAuthoritativeReceiptState(hash, undefined, undefined, true),
    ).toBe("uncertain");
  });

  it("accepts an included success from either receipt path", () => {
    expect(
      resolveAuthoritativeReceiptState(hash, "success", undefined, false),
    ).toBe("success");
    expect(
      resolveAuthoritativeReceiptState(hash, undefined, "success", true),
    ).toBe("success");
  });

  it("preserves raw reverts and fails closed on contradictory receipts", () => {
    expect(
      resolveAuthoritativeReceiptState(hash, undefined, "reverted", true),
    ).toBe("reverted");
    expect(
      resolveAuthoritativeReceiptState(hash, "success", "reverted", false),
    ).toBe("uncertain");
  });
});
