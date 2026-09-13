import { queryOptions } from "@tanstack/react-query";

export type AdminDraft = {
  contentId: string;
  descriptionEn: string;
  descriptionVi: string;
  lifecycleState:
    | "DRAFT"
    | "PROCESSING_ASSETS"
    | "ERROR"
    | "READY"
    | "PUBLISHED"
    | "MINTED_LOCKED";
  nameEn: string;
  nameVi: string;
  revision: number;
  storyEn: string;
  storyVi: string;
  tokenId: number;
  updatedAt: string;
};

export type AdminContentSlot = {
  chainState: "minted" | "unavailable" | "unminted";
  content: AdminDraft | null;
  tokenId: number;
};

export type AdminDraftInput = Omit<
  AdminDraft,
  "contentId" | "lifecycleState" | "revision" | "tokenId" | "updatedAt"
> & { expectedRevision: number };

export class AdminContentClientError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function isDraft(value: unknown, tokenId: number): value is AdminDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  return (
    typeof draft.contentId === "string" &&
    /^[1-9][0-9]*$/.test(draft.contentId) &&
    Number.isInteger(draft.revision) &&
    Number(draft.revision) > 0 &&
    draft.tokenId === tokenId &&
    [
      "DRAFT",
      "PROCESSING_ASSETS",
      "ERROR",
      "READY",
      "PUBLISHED",
      "MINTED_LOCKED",
    ].includes(String(draft.lifecycleState)) &&
    typeof draft.updatedAt === "string" &&
    !Number.isNaN(Date.parse(draft.updatedAt)) &&
    [
      draft.nameVi,
      draft.nameEn,
      draft.descriptionVi,
      draft.descriptionEn,
      draft.storyVi,
      draft.storyEn,
    ].every((field) => typeof field === "string")
  );
}

function parseSlots(value: unknown): AdminContentSlot[] {
  if (!value || typeof value !== "object" || !("slots" in value))
    throw new AdminContentClientError("INVALID_RESPONSE");
  const slots = (value as { slots: unknown }).slots;
  if (!Array.isArray(slots) || slots.length !== 10)
    throw new AdminContentClientError("INVALID_RESPONSE");
  return slots.map((slot, index) => {
    if (!slot || typeof slot !== "object")
      throw new AdminContentClientError("INVALID_RESPONSE");
    const candidate = slot as Record<string, unknown>;
    const tokenId = index + 1;
    if (
      candidate.tokenId !== tokenId ||
      !["minted", "unavailable", "unminted"].includes(
        String(candidate.chainState),
      ) ||
      (candidate.content !== null && !isDraft(candidate.content, tokenId))
    )
      throw new AdminContentClientError("INVALID_RESPONSE");
    return candidate as AdminContentSlot;
  });
}

export async function fetchAdminContent() {
  const response = await fetch("/api/admin/content", {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok) throw new AdminContentClientError("CONTENT_UNAVAILABLE");
  return parseSlots(await response.json());
}

export async function updateAdminDraft(
  tokenId: number,
  draft: AdminDraftInput,
) {
  const response = await fetch(`/api/admin/content/${tokenId}`, {
    body: JSON.stringify(draft),
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const code =
      body && typeof body === "object" && "code" in body
        ? String(body.code)
        : "CONTENT_UNAVAILABLE";
    throw new AdminContentClientError(code);
  }
  if (!body || typeof body !== "object" || !("content" in body))
    throw new AdminContentClientError("INVALID_RESPONSE");
  const content = (body as { content: unknown }).content;
  if (!isDraft(content, tokenId))
    throw new AdminContentClientError("INVALID_RESPONSE");
  return content;
}

export const adminContentQuery = queryOptions({
  queryFn: fetchAdminContent,
  queryKey: ["admin-content"] as const,
  refetchOnWindowFocus: true,
  retry: false,
  staleTime: 10_000,
});
