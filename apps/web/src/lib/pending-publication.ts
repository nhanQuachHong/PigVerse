import type { Address, Hash } from "viem";

export const PENDING_PUBLICATION_EVENT = "pigverse:pending-publication";

export function pendingPublicationKey({
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
  return `pigverse:publication:${chainId}:${contract.toLowerCase()}:${tokenId}:${account.toLowerCase()}`;
}

export function readPendingPublication(key: string): Hash | undefined {
  if (typeof window === "undefined") return undefined;
  const value = window.localStorage.getItem(key);
  return value && /^0x[0-9a-f]{64}$/iu.test(value)
    ? (value as Hash)
    : undefined;
}

export function writePendingPublication(key: string, hash: Hash | undefined) {
  if (hash) window.localStorage.setItem(key, hash.toLowerCase());
  else window.localStorage.removeItem(key);
  window.dispatchEvent(new Event(PENDING_PUBLICATION_EVENT));
}
