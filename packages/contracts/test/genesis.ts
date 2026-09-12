import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { getContract, parseAbi } from "viem";

const abi = parseAbi([
  "function publish(uint256 id, string uri)",
  "function unpublish(uint256 id)",
  "function mint(uint256 id, uint256 revision) payable",
  "function withdraw()",
  "function pause()",
  "function setMintPrice(uint256 price)",
  "function tokenURI(uint256 id) view returns (string)",
  "function totalSupply() view returns (uint256)",
  "error TokenNotPublished(uint256 id)",
  "error PublicationChanged(uint256 expected, uint256 actual)",
  "error GenesisAlreadyMinted(uint256 id)",
  "error InvalidMetadataURI()",
  "error OwnableUnauthorizedAccount(address account)",
  "error EnforcedPause()",
  "error IncorrectMintPayment(uint256 expected, uint256 received)",
]);

describe("Pigverse concrete publication and mint integration", async () => {
  const { viem } = await network.create({ network: "hardhatOp" });
  const publicClient = await viem.getPublicClient();
  const [owner, user] = await viem.getWalletClients();
  assert.ok(owner && user);
  const uri = "ipfs://bafy-test-fixture/metadata.json";
  const fresh = async () => {
    const deployed = await viem.deployContract("PigverseGenesis", [
      owner.account.address,
      0n,
    ]);
    return getContract({
      address: deployed.address,
      abi,
      client: { public: publicClient, wallet: owner },
    });
  };

  it("requires publication and protects the revision selected by the collector", async () => {
    const core = await fresh();
    await assert.rejects(core.write.mint([1n, 0n]), /TokenNotPublished/);
    await core.write.publish([1n, uri]);
    await core.write.unpublish([1n]);
    await assert.rejects(core.write.mint([1n, 1n]), /PublicationChanged/);
    await assert.rejects(core.write.mint([1n, 2n]), /TokenNotPublished/);
    await core.write.publish([1n, `${uri}/new`]);
    await assert.rejects(core.write.mint([1n, 1n]), /PublicationChanged/);
    await core.write.mint([1n, 3n], { account: user.account });
    assert.equal(await core.read.tokenURI([1n]), `${uri}/new`);
    await assert.rejects(core.write.publish([1n, uri]), /GenesisAlreadyMinted/);
    await assert.rejects(core.write.unpublish([1n]), /GenesisAlreadyMinted/);
    await assert.rejects(core.write.mint([1n, 3n]), /GenesisAlreadyMinted/);
  });

  it("rejects unauthorized publication and withdrawal and non-IPFS references", async () => {
    const core = await fresh();
    await assert.rejects(
      core.write.publish([1n, uri], { account: user.account }),
      /OwnableUnauthorizedAccount/,
    );
    await assert.rejects(
      core.write.unpublish([1n], { account: user.account }),
      /OwnableUnauthorizedAccount/,
    );
    await assert.rejects(
      core.write.withdraw({ account: user.account }),
      /OwnableUnauthorizedAccount/,
    );
    for (const invalid of ["", "ipfs://", "https://example.com/mutable.json"]) {
      await assert.rejects(
        core.write.publish([1n, invalid]),
        /InvalidMetadataURI/,
      );
    }
  });

  it("applies payment and pause equally to owner and user and withdraws proceeds", async () => {
    const core = await fresh();
    await core.write.publish([2n, uri]);
    await core.write.setMintPrice([100n]);
    for (const account of [owner.account, user.account]) {
      await assert.rejects(
        core.write.mint([2n, 1n], { account }),
        /IncorrectMintPayment/,
      );
    }
    await core.write.mint([2n, 1n], { account: user.account, value: 100n });
    assert.equal(
      await publicClient.getBalance({ address: core.address }),
      100n,
    );
    const before = await publicClient.getBalance({
      address: owner.account.address,
    });
    const hash = await core.write.withdraw();
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const after = await publicClient.getBalance({
      address: owner.account.address,
    });
    assert.equal(
      after + receipt.gasUsed * receipt.effectiveGasPrice - before,
      100n,
    );
    assert.equal(await publicClient.getBalance({ address: core.address }), 0n);
    await core.write.publish([3n, uri]);
    await core.write.pause();
    for (const account of [owner.account, user.account]) {
      await assert.rejects(
        core.write.mint([3n, 1n], { account, value: 100n }),
        /EnforcedPause/,
      );
    }
  });
});
