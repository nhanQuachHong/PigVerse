import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

describe("Pigverse contract toolchain", async () => {
  const { viem } = await network.create({ network: "hardhatOp" });
  const publicClient = await viem.getPublicClient();

  it("starts an OP-compatible deterministic local network", async () => {
    assert.equal(await publicClient.getChainId(), 31337);
  });
});
