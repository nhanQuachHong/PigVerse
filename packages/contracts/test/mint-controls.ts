import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { getContract, parseAbi, zeroAddress } from "viem";

const abi = parseAbi([
  "function mint(uint256 tokenId, string uri) payable",
  "function mintPrice() view returns (uint256)",
  "function paused() view returns (bool)",
  "function pause()",
  "function unpause()",
  "function setMintPrice(uint256 price)",
  "function owner() view returns (address)",
  "function transferOwnership(address nextOwner)",
  "function acceptOwnership()",
  "function renounceOwnership()",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function transferFrom(address from, address to, uint256 tokenId)",
  "error OwnableUnauthorizedAccount(address account)",
  "error IncorrectMintPayment(uint256 expected, uint256 received)",
  "error EnforcedPause()",
  "error OwnershipRenunciationDisabled()",
  "event MintPriceChanged(uint256 previousPrice, uint256 newPrice)",
]);

describe("Genesis mint controls — FR-CONTRACT-001/002", async () => {
  const { viem } = await network.create({ network: "hardhatOp" });
  const publicClient = await viem.getPublicClient();
  const [owner, collector, other] = await viem.getWalletClients();
  assert.ok(owner && collector && other);
  const uri = "ipfs://fixture/metadata.json";
  const fresh = async () => {
    const deployed = await viem.deployContract("GenesisMintControlsHarness", [
      owner.account.address,
      0n,
    ]);
    return getContract({
      address: deployed.address,
      abi,
      client: { public: publicClient, wallet: owner },
    });
  };

  it("rejects non-owner controls without changing state", async () => {
    const core = await fresh();
    const account = collector.account;
    await assert.rejects(
      core.write.pause({ account }),
      /OwnableUnauthorizedAccount/,
    );
    await assert.rejects(
      core.write.setMintPrice([1n], { account }),
      /OwnableUnauthorizedAccount/,
    );
    await core.write.pause();
    await assert.rejects(
      core.write.unpause({ account }),
      /OwnableUnauthorizedAccount/,
    );
    assert.equal(await core.read.paused(), true);
    assert.equal(await core.read.mintPrice(), 0n);
  });

  it("pauses mint while preserving metadata, ownership and transfers", async () => {
    const core = await fresh();
    await core.write.mint([1n, uri], { account: collector.account });
    await core.write.pause();
    await assert.rejects(
      core.write.mint([2n, uri], { account: collector.account }),
      /EnforcedPause/,
    );
    assert.equal(await core.read.tokenURI([1n]), uri);
    await core.write.transferFrom(
      [collector.account.address, other.account.address, 1n],
      { account: collector.account },
    );
    assert.equal(
      (await core.read.ownerOf([1n])).toLowerCase(),
      other.account.address,
    );
    await core.write.unpause();
    await core.write.mint([2n, uri], { account: collector.account });
    assert.equal(
      (await core.read.ownerOf([2n])).toLowerCase(),
      collector.account.address,
    );
  });

  it("enforces current exact payment including free mint and price changes", async () => {
    const core = await fresh();
    await assert.rejects(
      core.write.mint([1n, uri], { value: 1n }),
      /IncorrectMintPayment/,
    );
    await core.write.mint([1n, uri]);
    const hash = await core.write.setMintPrice([100n]);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const events = await core.getEvents.MintPriceChanged({
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });
    assert.equal(events.length, 1);
    assert.deepEqual(events[0]?.args, { previousPrice: 0n, newPrice: 100n });
    for (const value of [0n, 99n, 101n]) {
      await assert.rejects(
        core.write.mint([2n, uri], { value }),
        /IncorrectMintPayment/,
      );
    }
    await core.write.mint([2n, uri], { value: 100n });
    await core.write.setMintPrice([200n]);
    await assert.rejects(
      core.write.mint([3n, uri], { value: 100n }),
      /IncorrectMintPayment/,
    );
    await core.write.mint([3n, uri], { value: 200n });
    await core.write.setMintPrice([0n]);
    await core.write.mint([4n, uri]);
  });

  it("requires acceptance to hand over owner rights and prevents renunciation", async () => {
    const core = await fresh();
    await assert.rejects(
      core.write.transferOwnership([other.account.address], {
        account: collector.account,
      }),
      /OwnableUnauthorizedAccount/,
    );
    await core.write.transferOwnership([collector.account.address]);
    await assert.rejects(
      core.write.pause({ account: collector.account }),
      /OwnableUnauthorizedAccount/,
    );
    await assert.rejects(
      core.write.acceptOwnership({ account: other.account }),
      /OwnableUnauthorizedAccount/,
    );
    await core.write.acceptOwnership({ account: collector.account });
    assert.equal(
      (await core.read.owner()).toLowerCase(),
      collector.account.address,
    );
    await assert.rejects(core.write.pause(), /OwnableUnauthorizedAccount/);
    await core.write.pause({ account: collector.account });
    await assert.rejects(
      core.write.renounceOwnership({ account: collector.account }),
      /OwnershipRenunciationDisabled/,
    );
    await core.write.transferOwnership([zeroAddress], {
      account: collector.account,
    });
    assert.equal(
      (await core.read.owner()).toLowerCase(),
      collector.account.address,
    );
  });
});
