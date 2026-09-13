import { describe, expect, it } from "vitest";

import {
  getPublicCollection,
  resolvePublicChainConfig,
} from "./public-collection";

describe("public collection service", () => {
  it("returns all canonical slots with honest unknown state when unconfigured", async () => {
    const result = await getPublicCollection({ PIGVERSE_ENV: "local" });
    expect(result.tokens).toHaveLength(10);
    expect(result.mintedCount).toBeNull();
    expect(result.degraded).toBe(true);
    expect(result.deployment).toBeNull();
    expect(result.tokens.every((token) => token.status === "unknown")).toBe(
      true,
    );
    expect(result.tokens.every((token) => token.metadataUri === null)).toBe(
      true,
    );
  });

  it("accepts only the explicit Base Sepolia environment tuple", () => {
    const valid = {
      PIGVERSE_ENV: "base-sepolia",
      NEXT_PUBLIC_CHAIN_ID: "84532",
      NEXT_PUBLIC_CONTRACT_ADDRESS:
        "0x1111111111111111111111111111111111111111",
      BASE_SEPOLIA_RPC_URL: "https://rpc.example.test/private-token",
    };
    const config = resolvePublicChainConfig(valid);
    expect(config?.chainId).toBe(84532);
    expect(config?.explorerUrl).toBe(
      "https://sepolia.basescan.org/address/0x1111111111111111111111111111111111111111",
    );
    expect(config?.rpcUrl).toBe(valid.BASE_SEPOLIA_RPC_URL);
    expect(
      resolvePublicChainConfig({ ...valid, NEXT_PUBLIC_CHAIN_ID: "8453" }),
    ).toBeNull();
    expect(
      resolvePublicChainConfig({
        ...valid,
        NEXT_PUBLIC_CONTRACT_ADDRESS: "not-an-address",
      }),
    ).toBeNull();
    expect(
      resolvePublicChainConfig({
        ...valid,
        BASE_SEPOLIA_RPC_URL: "file:///tmp/rpc",
      }),
    ).toBeNull();
  });
});
