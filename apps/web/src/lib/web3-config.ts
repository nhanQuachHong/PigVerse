import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { getAddress, isAddress } from "viem";

export const targetChain = baseSepolia;

export function resolveClientContractAddress(value: string | undefined) {
  if (!value || !isAddress(value) || /^0x0{40}$/iu.test(value)) return null;
  return getAddress(value);
}

export const targetContractAddress = resolveClientContractAddress(
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
);

export const wagmiConfig = createConfig({
  chains: [targetChain],
  connectors: [injected()],
  multiInjectedProviderDiscovery: true,
  ssr: true,
  transports: {
    [targetChain.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
