export type AdminMintActivityStatus =
  "PENDING" | "SUCCEEDED" | "REVERTED" | "UNKNOWN";

export type AdminMintActivity = {
  blockHash: `0x${string}` | null;
  blockNumber: string | null;
  expectedPublicationRevision: string;
  finality: "included" | null;
  firstSeenAt: string;
  lastObservedAt: string;
  mintObservationId: string;
  observedOwnerWallet: `0x${string}` | null;
  reconciliation: "conflict" | "current" | "unavailable";
  safeErrorCategory: string | null;
  senderWallet: `0x${string}`;
  status: AdminMintActivityStatus;
  tokenId: number;
  transactionHash: `0x${string}`;
  transferLogIndex: number | null;
};

export type AdminMintActivityPage = {
  activities: AdminMintActivity[];
  nextCursor: string | null;
};

export const adminMintActivityQueryKey = ["admin-mint-activity"] as const;

export class AdminMintActivityClientError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isHash(value: unknown) {
  return typeof value === "string" && /^0x[0-9a-f]{64}$/u.test(value);
}

function isAddress(value: unknown) {
  return (
    typeof value === "string" &&
    /^0x[0-9a-f]{40}$/u.test(value) &&
    !/^0x0{40}$/u.test(value)
  );
}

function isTimestamp(value: unknown) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isActivity(value: unknown): value is AdminMintActivity {
  if (!isRecord(value)) return false;
  const status = String(value.status) as AdminMintActivityStatus;
  const included =
    typeof value.blockNumber === "string" &&
    /^[0-9]+$/u.test(value.blockNumber) &&
    isHash(value.blockHash);
  const success = status === "SUCCEEDED";
  const reverted = status === "REVERTED";
  const unsettled = status === "PENDING" || status === "UNKNOWN";
  return (
    /^[1-9][0-9]*$/u.test(String(value.mintObservationId)) &&
    Number.isInteger(value.tokenId) &&
    Number(value.tokenId) >= 1 &&
    Number(value.tokenId) <= 10 &&
    isHash(value.transactionHash) &&
    isAddress(value.senderWallet) &&
    /^[0-9]+$/u.test(String(value.expectedPublicationRevision)) &&
    isTimestamp(value.firstSeenAt) &&
    isTimestamp(value.lastObservedAt) &&
    ["current", "unavailable", "conflict"].includes(
      String(value.reconciliation),
    ) &&
    (value.safeErrorCategory === null ||
      (typeof value.safeErrorCategory === "string" &&
        /^[A-Z][A-Z0-9_]{0,63}$/u.test(value.safeErrorCategory))) &&
    (success
      ? included &&
        isAddress(value.observedOwnerWallet) &&
        Number.isSafeInteger(value.transferLogIndex) &&
        Number(value.transferLogIndex) >= 0 &&
        value.finality === "included"
      : reverted
        ? included &&
          value.observedOwnerWallet === null &&
          value.transferLogIndex === null &&
          value.finality === null
        : unsettled &&
          value.blockNumber === null &&
          value.blockHash === null &&
          value.observedOwnerWallet === null &&
          value.transferLogIndex === null &&
          value.finality === null)
  );
}

function parsePage(value: unknown): AdminMintActivityPage {
  if (!isRecord(value) || !Array.isArray(value.activities))
    throw new AdminMintActivityClientError("INVALID_RESPONSE");
  if (
    value.nextCursor !== null &&
    (typeof value.nextCursor !== "string" ||
      !/^[1-9][0-9]*$/u.test(value.nextCursor))
  )
    throw new AdminMintActivityClientError("INVALID_RESPONSE");
  if (!value.activities.every(isActivity))
    throw new AdminMintActivityClientError("INVALID_RESPONSE");
  return value as AdminMintActivityPage;
}

export async function fetchAdminMintActivity(cursor: string | null) {
  const parameters = new URLSearchParams({ limit: "10" });
  if (cursor) parameters.set("cursor", cursor);
  const response = await fetch(`/api/admin/mint-activity?${parameters}`, {
    cache: "no-store",
    credentials: "same-origin",
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const code =
      isRecord(body) && "code" in body
        ? String(body.code)
        : "MINT_ACTIVITY_UNAVAILABLE";
    throw new AdminMintActivityClientError(code);
  }
  return parsePage(body);
}
