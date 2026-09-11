import { describe, expect, it } from "vitest";

import { assertDistinctDeployments, parseDeploymentConfig } from "../src/index";

const sepolia = {
  environment: "base-sepolia",
  chainId: 84532,
  contractAddress: "0x1111111111111111111111111111111111111111",
  explorerBaseUrl: "https://sepolia.basescan.org",
  rpcUrl: "https://sepolia.example.invalid",
} as const;

const mainnet = {
  environment: "base-mainnet",
  chainId: 8453,
  contractAddress: "0x2222222222222222222222222222222222222222",
  explorerBaseUrl: "https://basescan.org",
  rpcUrl: "https://mainnet.example.invalid",
} as const;

describe("deployment configuration", () => {
  it("accepts explicit, correctly-bound Base deployments", () => {
    const parsedSepolia = parseDeploymentConfig(sepolia);
    const parsedMainnet = parseDeploymentConfig(mainnet);

    expect(() =>
      assertDistinctDeployments(parsedSepolia, parsedMainnet),
    ).not.toThrow();
  });

  it("rejects a network and chain ID mismatch", () => {
    expect(() => parseDeploymentConfig({ ...sepolia, chainId: 8453 })).toThrow(
      "base-sepolia requires chain ID 84532",
    );
  });

  it("rejects reuse of one contract address across environments", () => {
    const parsedSepolia = parseDeploymentConfig(sepolia);
    const parsedMainnet = parseDeploymentConfig({
      ...mainnet,
      contractAddress: sepolia.contractAddress,
    });

    expect(() =>
      assertDistinctDeployments(parsedSepolia, parsedMainnet),
    ).toThrow("contract addresses must differ");
  });
});
