import { getAddress, isAddress, zeroAddress } from "viem";

/** Must run against the connected provider before signing a deployment. */
export function validateSepoliaDeployment(chainId: number, owner: string) {
  if (chainId !== 84532) {
    throw new Error("Genesis Sepolia deployment requires chain ID 84532");
  }
  if (!isAddress(owner) || owner.toLowerCase() === zeroAddress) {
    throw new Error("An explicit nonzero owner address is required");
  }
  return { owner: getAddress(owner), initialPrice: 0n } as const;
}
