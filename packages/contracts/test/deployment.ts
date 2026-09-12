import assert from "node:assert/strict";
import { it } from "node:test";
import { network } from "hardhat";
import { getContract, parseAbi } from "viem";
import GenesisSepolia from "../ignition/modules/GenesisSepolia.js";

it("deploys the Sepolia module with explicit owner, zero price and no allocated NFTs", async () => {
  const { viem, ignition } = await network.create({ network: "hardhatOp" });
  const [deployer, owner] = await viem.getWalletClients();
  assert.ok(deployer && owner);
  const { genesis } = await ignition.deploy(GenesisSepolia, {
    parameters: { GenesisSepolia: { owner: owner.account.address } },
  });
  const core = getContract({
    address: genesis.address,
    client: await viem.getPublicClient(),
    abi: parseAbi([
      "function owner() view returns (address)",
      "function mintPrice() view returns (uint256)",
      "function totalSupply() view returns (uint256)",
      "function MAX_SUPPLY() view returns (uint256)",
      "function paused() view returns (bool)",
      "function publishedURI(uint256 id) view returns (string)",
    ]),
  });
  assert.equal((await core.read.owner()).toLowerCase(), owner.account.address);
  assert.equal(await core.read.mintPrice(), 0n);
  assert.equal(await core.read.totalSupply(), 0n);
  assert.equal(await core.read.MAX_SUPPLY(), 10n);
  assert.equal(await core.read.paused(), false);
  for (let id = 1n; id <= 10n; id++) {
    assert.equal(await core.read.publishedURI([id]), "");
  }
});
