import { network } from "hardhat";
import { getContract, isAddress, parseAbi } from "viem";
import GenesisSepolia from "./modules/GenesisSepolia.js";
import { validateSepoliaDeployment } from "./sepolia-preflight.js";
import approvedParameters from "./parameters/base-sepolia.json" with { type: "json" };

const connection = await network.create({ network: "baseSepolia" });
const publicClient = await connection.viem.getPublicClient();
const [deployer] = await connection.viem.getWalletClients();
if (!deployer) throw new Error("A Base Sepolia deployment signer is required");
const parameters = validateSepoliaDeployment(
  await publicClient.getChainId(),
  process.env.GENESIS_OWNER_ADDRESS ?? approvedParameters.GenesisSepolia.owner,
);
const deployerBalance = await publicClient.getBalance({
  address: deployer.account.address,
});
if (deployerBalance === 0n)
  throw new Error("The Base Sepolia deployment signer has no ETH for gas");

const { genesis } = await connection.ignition.deploy(GenesisSepolia, {
  parameters: { GenesisSepolia: { owner: parameters.owner } },
});
const deployed: unknown = genesis;
if (
  !deployed ||
  typeof deployed !== "object" ||
  !("address" in deployed) ||
  typeof deployed.address !== "string" ||
  !isAddress(deployed.address)
)
  throw new Error("Ignition returned an invalid address");
const address = deployed.address;
const contract = getContract({
  abi: parseAbi([
    "function MAX_SUPPLY() view returns (uint256)",
    "function mintPrice() view returns (uint256)",
    "function owner() view returns (address)",
    "function paused() view returns (bool)",
    "function totalSupply() view returns (uint256)",
  ]),
  address,
  client: publicClient,
});
const [owner, mintPrice, maximumSupply, totalSupply, paused] =
  await Promise.all([
    contract.read.owner(),
    contract.read.mintPrice(),
    contract.read.MAX_SUPPLY(),
    contract.read.totalSupply(),
    contract.read.paused(),
  ]);
if (
  owner.toLowerCase() !== parameters.owner.toLowerCase() ||
  mintPrice !== 0n ||
  maximumSupply !== 10n ||
  totalSupply !== 0n ||
  paused
)
  throw new Error("Deployed Genesis state failed post-deployment verification");

console.log(
  JSON.stringify(
    {
      chainId: 84532,
      contractAddress: address,
      deployer: deployer.account.address,
      maximumSupply: maximumSupply.toString(),
      mintPrice: mintPrice.toString(),
      owner,
      paused,
      totalSupply: totalSupply.toString(),
    },
    null,
    2,
  ),
);
