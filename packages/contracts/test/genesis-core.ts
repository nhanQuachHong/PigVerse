import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { getContract, parseAbi, zeroAddress } from "viem";

const abi = parseAbi([
  "function mint(address recipient, uint256 tokenId, string uri)",
  "function burn(uint256 tokenId)",
  "function rawMint(address recipient, uint256 tokenId)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function transferFrom(address from, address to, uint256 tokenId)",
  "function supportsInterface(bytes4 interfaceId) view returns (bool)",
  "error InvalidGenesisTokenId(uint256 tokenId)",
  "error GenesisAlreadyMinted(uint256 tokenId)",
  "error EmptyGenesisMetadata()",
  "error GenesisBurnForbidden()",
  "error GenesisMetadataNotPrepared(uint256 tokenId)",
  "error ERC721NonexistentToken(uint256 tokenId)",
  "error ERC721InvalidReceiver(address receiver)",
  "error ERC721InsufficientApproval(address operator, uint256 tokenId)",
]);

describe("Genesis ERC-721 core — BR-001..003,009,011,017", async () => {
  const { viem } = await network.create({ network: "hardhatOp" });
  const client = await viem.getPublicClient();
  const [alice, bob] = await viem.getWalletClients();
  assert.ok(alice && bob);
  const uri = "ipfs://bafy-test-fixture/metadata.json";
  const fresh = async () => {
    const deployed = await viem.deployContract("GenesisNFTCoreHarness");
    return getContract({
      address: deployed.address,
      abi,
      client: { public: client, wallet: alice },
    });
  };

  it("mints all ten exact identities once and rejects every duplicate", async () => {
    const core = await fresh();
    for (let id = 1n; id <= 10n; id++) {
      await core.write.mint([alice.account.address, id, `${uri}/${id}`]);
      assert.equal(
        (await core.read.ownerOf([id])).toLowerCase(),
        alice.account.address,
      );
      assert.equal(await core.read.tokenURI([id]), `${uri}/${id}`);
      await assert.rejects(
        core.write.mint([bob.account.address, id, "replacement"]),
        /GenesisAlreadyMinted/,
      );
    }
    assert.equal(await core.read.totalSupply(), 10n);
    for (const id of [0n, 11n, 2n ** 256n - 1n]) {
      await assert.rejects(
        core.write.mint([alice.account.address, id, uri]),
        /InvalidGenesisTokenId/,
      );
    }
    assert.equal(await core.read.totalSupply(), 10n);
  });

  it("preserves metadata through transfer and rejects unauthorized transfer and burn", async () => {
    const core = await fresh();
    await core.write.mint([alice.account.address, 4n, uri]);
    await assert.rejects(
      core.write.transferFrom(
        [alice.account.address, bob.account.address, 4n],
        { account: bob.account },
      ),
      /ERC721InsufficientApproval/,
    );
    await core.write.transferFrom([
      alice.account.address,
      bob.account.address,
      4n,
    ]);
    assert.equal(
      (await core.read.ownerOf([4n])).toLowerCase(),
      bob.account.address,
    );
    assert.equal(await core.read.tokenURI([4n]), uri);
    await assert.rejects(core.write.burn([4n]), /GenesisBurnForbidden/);
    await assert.rejects(
      core.write.mint([alice.account.address, 4n, "replacement"]),
      /GenesisAlreadyMinted/,
    );
    assert.equal(await core.read.totalSupply(), 1n);
  });

  it("rolls back invalid recipients and incomplete metadata without consuming a token", async () => {
    const core = await fresh();
    await assert.rejects(
      core.write.mint([alice.account.address, 2n, ""]),
      /EmptyGenesisMetadata/,
    );
    for (const recipient of [zeroAddress, core.address]) {
      await assert.rejects(
        core.write.mint([recipient, 2n, uri]),
        /ERC721InvalidReceiver/,
      );
      assert.equal(await core.read.totalSupply(), 0n);
      await assert.rejects(core.read.tokenURI([2n]), /ERC721NonexistentToken/);
    }
    await core.write.mint([alice.account.address, 2n, uri]);
    assert.equal(await core.read.totalSupply(), 1n);
  });

  it("exposes complete state inside receiver callbacks and rejects reentrant duplicate mint", async () => {
    const core = await fresh();
    const deployed = await viem.deployContract("GenesisReceiverProbe");
    const probe = getContract({
      address: deployed.address,
      client,
      abi: parseAbi([
        "function duplicateRejected() view returns (bool)",
        "function observedURI() view returns (string)",
        "function observedSupply() view returns (uint256)",
      ]),
    });
    await core.write.mint([probe.address, 7n, uri]);
    assert.equal(await probe.read.duplicateRejected(), true);
    assert.equal(await probe.read.observedURI(), uri);
    assert.equal(await probe.read.observedSupply(), 1n);
    assert.equal(await core.read.totalSupply(), 1n);
  });

  it("rejects inherited raw mint paths without consuming identity or supply", async () => {
    const core = await fresh();
    await assert.rejects(
      core.write.rawMint([alice.account.address, 5n]),
      /GenesisMetadataNotPrepared/,
    );
    await assert.rejects(core.read.ownerOf([5n]), /ERC721NonexistentToken/);
    assert.equal(await core.read.totalSupply(), 0n);
    await core.write.mint([alice.account.address, 5n, uri]);
    assert.equal(await core.read.totalSupply(), 1n);
    assert.equal(await core.read.tokenURI([5n]), uri);
  });

  it("supports standard ERC-165, ERC-721 and metadata interfaces", async () => {
    const core = await fresh();
    for (const id of ["0x01ffc9a7", "0x80ac58cd", "0x5b5e139f"] as const) {
      assert.equal(await core.read.supportsInterface([id]), true);
    }
    assert.equal(await core.read.supportsInterface(["0xffffffff"]), false);
  });
});
