import assert from "node:assert/strict";
import { it } from "node:test";
import { network } from "hardhat";
import { getContract, parseAbi } from "viem";

it("concrete mint rolls back rejected receivers and blocks cross-token reentry", async () => {
  const { viem } = await network.create({ network: "hardhatOp" });
  const publicClient = await viem.getPublicClient();
  const [wallet] = await viem.getWalletClients();
  assert.ok(wallet);
  const client = { public: publicClient, wallet };
  const deployed = await viem.deployContract("PigverseGenesis", [
    wallet.account.address,
    100n,
  ]);
  const core = getContract({
    address: deployed.address,
    client,
    abi: parseAbi([
      "function publish(uint256 id, string uri)",
      "function totalSupply() view returns (uint256)",
      "function ownerOf(uint256 id) view returns (address)",
      "error ERC721NonexistentToken(uint256 tokenId)",
    ]),
  });
  await core.write.publish([1n, "ipfs://fixture/1"]);
  await core.write.publish([2n, "ipfs://fixture/2"]);
  const receiver = await viem.deployContract("MintReceiverProbe", [
    core.address,
  ]);
  const probe = getContract({
    address: receiver.address,
    client,
    abi: parseAbi([
      "function attempt(bool reject) payable",
      "function reentryBlocked() view returns (bool)",
    ]),
  });
  await assert.rejects(
    probe.write.attempt([true], { value: 100n }),
    /receiver rejection/,
  );
  assert.equal(await core.read.totalSupply(), 0n);
  assert.equal(await publicClient.getBalance({ address: core.address }), 0n);
  await assert.rejects(core.read.ownerOf([1n]), /ERC721NonexistentToken/);
  await probe.write.attempt([false], { value: 100n });
  assert.equal(await probe.read.reentryBlocked(), true);
  assert.equal(await core.read.totalSupply(), 1n);
  assert.equal(
    (await core.read.ownerOf([1n])).toLowerCase(),
    probe.address.toLowerCase(),
  );
  await assert.rejects(core.read.ownerOf([2n]), /ERC721NonexistentToken/);
  assert.equal(await publicClient.getBalance({ address: core.address }), 100n);
});
