import type { Address, Hash } from "viem";

export const PENDING_OWNER_CONTROL_EVENT = "pigverse:pending-owner-control";

export function pendingOwnerControlKey({
  account,
  chainId,
  contract,
}: {
  account: Address;
  chainId: number;
  contract: Address;
}) {
  return `pigverse:owner-control:${chainId}:${contract.toLowerCase()}:${account.toLowerCase()}`;
}

export function readPendingOwnerControl(key: string): Hash | undefined {
  if (typeof window === "undefined") return undefined;
  const value = window.localStorage.getItem(key);
  return value && /^0x[0-9a-f]{64}$/iu.test(value)
    ? (value.toLowerCase() as Hash)
    : undefined;
}

export function writePendingOwnerControl(key: string, hash: Hash | undefined) {
  if (hash) window.localStorage.setItem(key, hash.toLowerCase());
  else window.localStorage.removeItem(key);
  window.dispatchEvent(new Event(PENDING_OWNER_CONTROL_EVENT));
}
