import { isAddress } from "viem";

export type PublicationAction = "publish" | "unpublish";

export type PreparedPublication = {
  action: PublicationAction;
  block: `0x${string}`;
  contentId: string;
  contentRevision: number;
  expectedPublicationRevision: string;
  metadataIpfsUri: `ipfs://${string}` | null;
  transaction: {
    chainId: 84532;
    data: `0x${string}`;
    to: `0x${string}`;
    value: "0x0";
  };
};

export type RecordedPublication = {
  action: PublicationAction;
  contentId: string;
  contentRevision: number;
  finality: "included";
  lifecycleState: "MINTED_LOCKED" | "PUBLISHED" | "READY";
  publicationRevision: string;
  tokenId: number;
  transactionHash: `0x${string}`;
};

export class AdminPublicationClientError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

async function publicationRequest(
  tokenId: number,
  method: "POST" | "PUT",
  body: unknown,
) {
  const response = await fetch(`/api/admin/content/${tokenId}/publication`, {
    body: JSON.stringify(body),
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    method,
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AdminPublicationClientError("INVALID_RESPONSE");
  }
  if (!response.ok) {
    const code =
      payload && typeof payload === "object" && "code" in payload
        ? String(payload.code)
        : "ADMIN_PUBLICATION_UNAVAILABLE";
    throw new AdminPublicationClientError(code);
  }
  return payload;
}

function validTokenId(value: unknown, expected: number) {
  return Number.isInteger(value) && value === expected;
}

export async function prepareAdminPublication(
  tokenId: number,
  action: PublicationAction,
): Promise<PreparedPublication> {
  if (
    !Number.isInteger(tokenId) ||
    tokenId < 1 ||
    tokenId > 10 ||
    (action !== "publish" && action !== "unpublish")
  )
    throw new AdminPublicationClientError("INVALID_INPUT");
  const payload = await publicationRequest(tokenId, "POST", { action });
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    throw new AdminPublicationClientError("INVALID_RESPONSE");
  const value = payload as Record<string, unknown>;
  const transaction = value.transaction;
  if (
    value.status !== "prepared" ||
    value.action !== action ||
    typeof value.block !== "string" ||
    !/^0x(?:0|[1-9a-f][0-9a-f]*)$/iu.test(value.block) ||
    typeof value.contentId !== "string" ||
    !/^\d+$/u.test(value.contentId) ||
    !Number.isInteger(value.contentRevision) ||
    Number(value.contentRevision) < 1 ||
    typeof value.expectedPublicationRevision !== "string" ||
    !/^\d+$/u.test(value.expectedPublicationRevision) ||
    (action === "publish" &&
      (typeof value.metadataIpfsUri !== "string" ||
        !/^ipfs:\/\/[A-Za-z0-9][^\s]*$/u.test(value.metadataIpfsUri))) ||
    (action === "unpublish" && value.metadataIpfsUri !== null) ||
    !transaction ||
    typeof transaction !== "object" ||
    Array.isArray(transaction)
  )
    throw new AdminPublicationClientError("INVALID_RESPONSE");
  const request = transaction as Record<string, unknown>;
  if (
    request.chainId !== 84532 ||
    typeof request.to !== "string" ||
    !isAddress(request.to) ||
    /^0x0{40}$/iu.test(request.to) ||
    typeof request.data !== "string" ||
    !/^0x(?:[0-9a-f]{2})+$/iu.test(request.data) ||
    request.value !== "0x0"
  )
    throw new AdminPublicationClientError("INVALID_RESPONSE");
  return {
    action,
    block: value.block as `0x${string}`,
    contentId: value.contentId,
    contentRevision: Number(value.contentRevision),
    expectedPublicationRevision: value.expectedPublicationRevision,
    metadataIpfsUri: value.metadataIpfsUri as `ipfs://${string}` | null,
    transaction: {
      chainId: 84532,
      data: request.data as `0x${string}`,
      to: request.to as `0x${string}`,
      value: "0x0",
    },
  };
}

export async function recordAdminPublication(
  tokenId: number,
  transactionHash: `0x${string}`,
): Promise<RecordedPublication> {
  if (
    !Number.isInteger(tokenId) ||
    tokenId < 1 ||
    tokenId > 10 ||
    !/^0x[0-9a-f]{64}$/iu.test(transactionHash)
  )
    throw new AdminPublicationClientError("INVALID_INPUT");
  const payload = await publicationRequest(tokenId, "PUT", {
    transactionHash,
  });
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    throw new AdminPublicationClientError("INVALID_RESPONSE");
  const value = payload as Record<string, unknown>;
  if (
    value.status !== "recorded" ||
    (value.action !== "publish" && value.action !== "unpublish") ||
    typeof value.contentId !== "string" ||
    !/^\d+$/u.test(value.contentId) ||
    !Number.isInteger(value.contentRevision) ||
    Number(value.contentRevision) < 1 ||
    value.finality !== "included" ||
    !["MINTED_LOCKED", "PUBLISHED", "READY"].includes(
      String(value.lifecycleState),
    ) ||
    typeof value.publicationRevision !== "string" ||
    !/^\d+$/u.test(value.publicationRevision) ||
    !validTokenId(value.tokenId, tokenId) ||
    typeof value.transactionHash !== "string" ||
    value.transactionHash.toLowerCase() !== transactionHash.toLowerCase()
  )
    throw new AdminPublicationClientError("INVALID_RESPONSE");
  return {
    action: value.action as PublicationAction,
    contentId: value.contentId,
    contentRevision: Number(value.contentRevision),
    finality: "included",
    lifecycleState:
      value.lifecycleState as RecordedPublication["lifecycleState"],
    publicationRevision: value.publicationRevision,
    tokenId,
    transactionHash: value.transactionHash.toLowerCase() as `0x${string}`,
  };
}
