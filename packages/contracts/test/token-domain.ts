import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { getContract, parseAbi } from "viem";

describe("Genesis token domain — BR-001 / SEC-CONTRACT-001", async () => {
  const { viem } = await network.create({ network: "hardhatOp" });
  const deployed = await viem.deployContract("GenesisTokenDomainHarness");
  const domain = getContract({
    address: deployed.address,
    abi: parseAbi([
      "function MAX_SUPPLY() view returns (uint256)",
      "function validate(uint256 tokenId) pure",
      "error InvalidGenesisTokenId(uint256 tokenId)",
    ]),
    client: await viem.getPublicClient(),
  });

  it("fixes the maximum supply at ten", async () => {
    assert.equal(await domain.read.MAX_SUPPLY(), 10n);
  });

  it("accepts every approved Genesis identity", async () => {
    for (let tokenId = 1n; tokenId <= 10n; tokenId++) {
      await domain.read.validate([tokenId]);
    }
  });

  for (const tokenId of [0n, 11n, 256n, 2n ** 256n - 1n]) {
    it(`rejects out-of-domain token ${tokenId}`, async () => {
      await assert.rejects(
        domain.read.validate([tokenId]),
        /InvalidGenesisTokenId/,
      );
    });
  }
});
