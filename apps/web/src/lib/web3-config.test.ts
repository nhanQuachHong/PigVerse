import { describe, expect, it } from "vitest";

import { resolveClientContractAddress } from "./web3-config";

describe("client contract configuration", () => {
  it("accepts a public nonzero EVM contract address", () => {
    expect(
      resolveClientContractAddress(
        "0x1111111111111111111111111111111111111111",
      ),
    ).toBe("0x1111111111111111111111111111111111111111");
  });

  it("fails closed for missing, malformed and zero addresses", () => {
    for (const value of [
      undefined,
      "not-an-address",
      "0x0000000000000000000000000000000000000000",
    ])
      expect(resolveClientContractAddress(value)).toBeNull();
  });
});
