import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { getContract, parseAbi } from "viem";

describe("withdrawal callback safety", async () => {
  const { viem } = await network.create({ network: "hardhatOp" });
  const publicClient = await viem.getPublicClient();
  const [user] = await viem.getWalletClients();
  assert.ok(user);
  it("retains funds after rejection, permits further mint, and blocks nested withdrawal", async () => {
    const deployed = await viem.deployContract("WithdrawalOwnerProbe");
    const client = { public: publicClient, wallet: user };
    const probe = getContract({
      address: deployed.address,
      client,
      abi: parseAbi([
        "function genesis() view returns (address)",
        "function configure(bool reject)",
        "function withdraw()",
        "function received() view returns (uint256)",
        "function reentryBlocked() view returns (bool)",
        "error WithdrawalFailed()",
      ]),
    });
    const address = await probe.read.genesis();
    const core = getContract({
      address,
      client,
      abi: parseAbi([
        "function mint(uint256 tokenId, uint256 revision) payable",
        "function totalSupply() view returns (uint256)",
      ]),
    });
    await core.write.mint([1n, 1n], { value: 100n });
    await probe.write.configure([true]);
    await assert.rejects(probe.write.withdraw(), /WithdrawalFailed/);
    assert.equal(await publicClient.getBalance({ address }), 100n);
    assert.equal(await probe.read.received(), 0n);
    await core.write.mint([2n, 1n], { value: 100n });
    assert.equal(await core.read.totalSupply(), 2n);
    await probe.write.configure([false]);
    await probe.write.withdraw();
    assert.equal(await probe.read.received(), 200n);
    assert.equal(await probe.read.reentryBlocked(), true);
    assert.equal(await publicClient.getBalance({ address }), 0n);
  });
});
