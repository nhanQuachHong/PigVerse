import { readFileSync } from "node:fs";
import { createPublicClient, encodeDeployData, http, keccak256 } from "viem";

const artifact = JSON.parse(
  readFileSync(
    new URL(
      "../artifacts/contracts/PigverseGenesis.sol/PigverseGenesis.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const parameters = JSON.parse(
  readFileSync(
    new URL("./parameters/base-sepolia.json", import.meta.url),
    "utf8",
  ),
);
const client = createPublicClient({
  transport: http("https://sepolia.base.org", {
    timeout: 15000,
    retryCount: 0,
  }),
});
const chainId = await client.getChainId();
if (chainId !== 84532) throw new Error("Wrong simulation chain");
const blockNumber = await client.getBlockNumber();
const owner = parameters.GenesisSepolia.owner;
const data = encodeDeployData({
  abi: artifact.abi,
  bytecode: artifact.bytecode,
  args: [owner, 0n],
});
const result = await client.call({ account: owner, data, blockNumber });
if (!result.data || result.data === "0x")
  throw new Error("Missing deployment runtime");
console.log(
  JSON.stringify(
    {
      chainId,
      blockNumber: blockNumber.toString(),
      initCodeHash: keccak256(data),
      runtimeBytes: (result.data.length - 2) / 2,
      runtimeHash: keccak256(result.data),
    },
    null,
    2,
  ),
);
