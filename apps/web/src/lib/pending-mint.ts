import type { Address, Hash } from "viem";

export const PENDING_MINT_EVENT = "pigverse:pending-mint";

export function pendingMintKey({
  account,
  chainId,
  contract,
  tokenId,
}: {
  account: Address;
  chainId: number;
  contract: Address;
  tokenId: number;
}) {
  return `pigverse:mint:${chainId}:${contract.toLowerCase()}:${tokenId}:${account.toLowerCase()}`;
}

export function readPendingMint(key: string): Hash | undefined {
  if (typeof window === "undefined") return undefined;
  const value = window.localStorage.getItem(key);
  return value && /^0x[0-9a-f]{64}$/i.test(value) ? (value as Hash) : undefined;
}

export function writePendingMint(key: string, hash: Hash | undefined) {
  if (hash) window.localStorage.setItem(key, hash);
  else window.localStorage.removeItem(key);
  window.dispatchEvent(new Event(PENDING_MINT_EVENT));
}
