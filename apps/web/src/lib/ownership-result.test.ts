import { describe, expect, it } from "vitest";
import { classifyOwnershipResult } from "./ownership-result";

describe("ownerOf result classification — BR-009", () => {
  it("accepts only a nonzero ABI-encoded owner address", () => {
    expect(
      classifyOwnershipResult(1, {
        kind: "success",
        data: `0x${"0".repeat(24)}${"aB".repeat(20)}`,
      }),
    ).toEqual({ state: "minted", owner: `0x${"ab".repeat(20)}` });
    for (const data of [
      "0x",
      `0x${"0".repeat(64)}`,
      `0x${"1".repeat(64)}`,
      null,
      "0x123",
      `0x${"0".repeat(24)}${"gg".repeat(20)}`,
    ]) {
      expect(classifyOwnershipResult(1, { kind: "success", data })).toEqual({
        state: "unknown",
      });
    }
  });
  it("recognizes only the exact nonexistent-token error for the requested ID", () => {
    const data = `0x7e273289${"4".padStart(64, "0")}`;
    expect(classifyOwnershipResult(4, { kind: "revert", data })).toEqual({
      state: "unminted",
    });
    expect(classifyOwnershipResult(3, { kind: "revert", data })).toEqual({
      state: "unknown",
    });
    expect(
      classifyOwnershipResult(4, {
        kind: "revert",
        data: "execution reverted",
      }),
    ).toEqual({ state: "unknown" });
    expect(classifyOwnershipResult(4, { kind: "unavailable" })).toEqual({
      state: "unknown",
    });
  });
  it("rejects invalid IDs before classifying provider output", () => {
    for (const id of [0, 11, 1.5, NaN])
      expect(() =>
        classifyOwnershipResult(id, { kind: "unavailable" }),
      ).toThrow("Invalid Genesis");
  });
});
