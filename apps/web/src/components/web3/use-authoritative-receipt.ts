"use client";

import type { Hash } from "viem";
import { useTransactionReceipt, useWaitForTransactionReceipt } from "wagmi";

import { targetChain } from "../../lib/web3-config";

export type AuthoritativeReceiptState =
  "idle" | "pending" | "reverted" | "success" | "uncertain";

type IncludedStatus = "reverted" | "success";

export function resolveAuthoritativeReceiptState(
  hash: Hash | undefined,
  waitedStatus: IncludedStatus | undefined,
  rawStatus: IncludedStatus | undefined,
  waitFailed: boolean,
): AuthoritativeReceiptState {
  if (!hash) return "idle";
  if (waitedStatus && rawStatus && waitedStatus !== rawStatus)
    return "uncertain";
  if (rawStatus) return rawStatus;
  if (waitedStatus) return waitedStatus;
  if (waitFailed) return "uncertain";
  return "pending";
}

/**
 * Wagmi's wait action throws after observing a reverted receipt while trying to
 * derive its reason. The raw query preserves that authoritative status; the
 * wait query retains pending/replacement handling and provider error state.
 */
export function useAuthoritativeReceipt(hash: Hash | undefined) {
  const waited = useWaitForTransactionReceipt({
    chainId: targetChain.id,
    confirmations: 1,
    hash,
    query: { enabled: Boolean(hash) },
  });
  const raw = useTransactionReceipt({
    chainId: targetChain.id,
    hash,
    query: {
      enabled: Boolean(hash),
      refetchInterval: (query) => (query.state.data ? false : 4_000),
      retry: false,
    },
  });

  return resolveAuthoritativeReceiptState(
    hash,
    waited.data?.status,
    raw.data?.status,
    waited.isError,
  );
}
