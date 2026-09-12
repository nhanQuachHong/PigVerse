import assert from "node:assert/strict";
import { it } from "node:test";
import { validateSepoliaDeployment } from "../ignition/sepolia-preflight.js";

const owner = "0x1111111111111111111111111111111111111111";

it("rejects Mainnet and every non-Sepolia chain before deployment", () => {
  for (const chainId of [8453, 1, 31337, 0, NaN]) {
    assert.throws(() => validateSepoliaDeployment(chainId, owner), /84532/);
  }
});

it("requires an explicit valid nonzero owner and fixes the test price at zero", () => {
  for (const invalid of [
    "",
    "0x123",
    "0x0000000000000000000000000000000000000000",
  ]) {
    assert.throws(
      () => validateSepoliaDeployment(84532, invalid),
      /owner address/,
    );
  }
  assert.deepEqual(validateSepoliaDeployment(84532, owner), {
    owner,
    initialPrice: 0n,
  });
});
