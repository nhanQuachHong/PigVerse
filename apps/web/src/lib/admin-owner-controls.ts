import type { Hash } from "viem";

export type RecordedOwnerControl = {
  action: "pause" | "setMintPrice" | "unpause" | "withdraw";
  blockHash: Hash;
  blockNumber: string;
  finality: "included";
  newMintPrice: string | null;
  transactionHash: Hash;
  withdrawnAmount: string | null;
};

export class AdminOwnerControlClientError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

export async function recordAdminOwnerControl(
  transactionHash: Hash,
): Promise<RecordedOwnerControl> {
  if (!/^0x[0-9a-f]{64}$/iu.test(transactionHash))
    throw new AdminOwnerControlClientError("INVALID_INPUT");
  const normalizedHash = transactionHash.toLowerCase() as Hash;
  const response = await fetch("/api/admin/owner-controls", {
    body: JSON.stringify({ transactionHash: normalizedHash }),
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AdminOwnerControlClientError("INVALID_RESPONSE");
  }
  if (
    !response.ok ||
    (payload && typeof payload === "object" && "code" in payload)
  ) {
    const code =
      payload && typeof payload === "object" && "code" in payload
        ? String(payload.code)
        : "OWNER_CONTROL_UNAVAILABLE";
    throw new AdminOwnerControlClientError(code);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    throw new AdminOwnerControlClientError("INVALID_RESPONSE");
  const value = payload as Record<string, unknown>;
  const action = value.action;
  const newMintPrice = value.newMintPrice;
  const withdrawnAmount = value.withdrawnAmount;
  if (
    value.status !== "recorded" ||
    !["pause", "unpause", "setMintPrice", "withdraw"].includes(
      String(action),
    ) ||
    typeof value.blockHash !== "string" ||
    !/^0x[0-9a-f]{64}$/iu.test(value.blockHash) ||
    typeof value.blockNumber !== "string" ||
    !/^\d+$/u.test(value.blockNumber) ||
    value.finality !== "included" ||
    typeof value.transactionHash !== "string" ||
    value.transactionHash.toLowerCase() !== normalizedHash ||
    (action === "setMintPrice"
      ? typeof newMintPrice !== "string" ||
        !/^\d+$/u.test(newMintPrice) ||
        withdrawnAmount !== null
      : action === "withdraw"
        ? newMintPrice !== null ||
          typeof withdrawnAmount !== "string" ||
          !/^\d+$/u.test(withdrawnAmount)
        : newMintPrice !== null || withdrawnAmount !== null)
  )
    throw new AdminOwnerControlClientError("INVALID_RESPONSE");
  return {
    action: action as RecordedOwnerControl["action"],
    blockHash: value.blockHash.toLowerCase() as Hash,
    blockNumber: value.blockNumber,
    finality: "included",
    newMintPrice: newMintPrice as string | null,
    transactionHash: normalizedHash,
    withdrawnAmount: withdrawnAmount as string | null,
  };
}
