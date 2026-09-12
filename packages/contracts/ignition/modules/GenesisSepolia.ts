import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/** Test deployment only. Mainnet requires a separate approved release module. */
export default buildModule("GenesisSepolia", (m) => {
  const owner = m.getParameter("owner");
  const genesis = m.contract("PigverseGenesis", [owner, 0n]);
  return { genesis };
});
