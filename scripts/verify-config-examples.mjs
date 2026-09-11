import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const configurations = [
  {
    path: new URL("../config/base-sepolia.env.example", import.meta.url),
    environment: "base-sepolia",
    chainId: "84532",
    rpcKey: "BASE_SEPOLIA_RPC_URL",
    privateKey: "BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY",
  },
  {
    path: new URL("../config/base-mainnet.env.example", import.meta.url),
    environment: "base-mainnet",
    chainId: "8453",
    rpcKey: "BASE_MAINNET_RPC_URL",
    privateKey: "BASE_MAINNET_DEPLOYER_PRIVATE_KEY",
  },
];

function parseEnvironmentFile(source) {
  return Object.fromEntries(
    source
      .split(/\r?\n/u)
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        assert.notEqual(separator, -1, `Invalid environment line: ${line}`);
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

const parsed = [];

for (const configuration of configurations) {
  const values = parseEnvironmentFile(
    await readFile(configuration.path, "utf8"),
  );

  assert.equal(values.PIGVERSE_ENV, configuration.environment);
  assert.equal(values.NEXT_PUBLIC_CHAIN_ID, configuration.chainId);
  assert.ok(
    configuration.rpcKey in values,
    `${configuration.rpcKey} is required`,
  );
  assert.ok("NEXT_PUBLIC_CONTRACT_ADDRESS" in values);
  assert.ok("DATABASE_URL" in values);
  assert.equal(
    values[configuration.privateKey],
    "",
    "Example private keys must be blank",
  );

  parsed.push(values);
}

assert.notEqual(parsed[0].NEXT_PUBLIC_CHAIN_ID, parsed[1].NEXT_PUBLIC_CHAIN_ID);
assert.notEqual(parsed[0].PIGVERSE_ENV, parsed[1].PIGVERSE_ENV);

console.log("Verified isolated Base Sepolia and Base Mainnet examples.");
