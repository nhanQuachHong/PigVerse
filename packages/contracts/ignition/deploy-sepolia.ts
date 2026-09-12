import { network } from "hardhat";
import GenesisSepolia from "./modules/GenesisSepolia.js";
import { validateSepoliaDeployment } from "./sepolia-preflight.js";

const connection = await network.create({ network: "baseSepolia" });
const publicClient = await connection.viem.getPublicClient();
const parameters = validateSepoliaDeployment(
  await publicClient.getChainId(),
  process.env.GENESIS_OWNER_ADDRESS ?? "",
);

await connection.ignition.deploy(GenesisSepolia, {
  parameters: { GenesisSepolia: { owner: parameters.owner } },
});
