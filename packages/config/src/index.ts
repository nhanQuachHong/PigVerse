import { z } from "zod";

const addressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/u, "Invalid EVM contract address");

const networkDefinitions = {
  "base-mainnet": { chainId: 8453 },
  "base-sepolia": { chainId: 84532 },
  local: { chainId: 31337 },
} as const;

export type PigverseEnvironment = keyof typeof networkDefinitions;

export const deploymentConfigSchema = z
  .object({
    environment: z.enum(["local", "base-sepolia", "base-mainnet"]),
    chainId: z.number().int().positive(),
    contractAddress: addressSchema,
    explorerBaseUrl: z.url(),
    rpcUrl: z.url(),
  })
  .superRefine((configuration, context) => {
    const expectedChainId =
      networkDefinitions[configuration.environment].chainId;
    if (configuration.chainId !== expectedChainId) {
      context.addIssue({
        code: "custom",
        message: `${configuration.environment} requires chain ID ${expectedChainId}`,
        path: ["chainId"],
      });
    }
  });

export type DeploymentConfig = z.infer<typeof deploymentConfigSchema>;

export function parseDeploymentConfig(input: unknown): DeploymentConfig {
  return deploymentConfigSchema.parse(input);
}

export function assertDistinctDeployments(
  sepolia: DeploymentConfig,
  mainnet: DeploymentConfig,
): void {
  if (
    sepolia.environment !== "base-sepolia" ||
    mainnet.environment !== "base-mainnet"
  ) {
    throw new Error(
      "Deployment comparison requires Base Sepolia followed by Base Mainnet",
    );
  }

  if (sepolia.chainId === mainnet.chainId) {
    throw new Error("Base Sepolia and Base Mainnet chain IDs must differ");
  }

  if (
    sepolia.contractAddress.toLowerCase() ===
    mainnet.contractAddress.toLowerCase()
  ) {
    throw new Error(
      "Base Sepolia and Base Mainnet contract addresses must differ",
    );
  }
}
