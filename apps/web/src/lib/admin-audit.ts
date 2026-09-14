export type AdminAuditEvent = {
  action: string;
  actorWallet: `0x${string}`;
  auditEventId: string;
  correlationId: string;
  createdAt: string;
  safeContext: Record<string, unknown>;
  target: {
    id: string;
    tokenId: number | null;
    type: string;
  };
};

export type AdminAuditPage = {
  events: AdminAuditEvent[];
  nextCursor: string | null;
};

export const adminAuditQueryKey = ["admin-audit"] as const;

export class AdminAuditClientError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isEvent(value: unknown): value is AdminAuditEvent {
  if (!isRecord(value) || !isRecord(value.target)) return false;
  return (
    typeof value.auditEventId === "string" &&
    /^[1-9][0-9]*$/u.test(value.auditEventId) &&
    typeof value.actorWallet === "string" &&
    /^0x[0-9a-f]{40}$/iu.test(value.actorWallet) &&
    typeof value.action === "string" &&
    /^[A-Z][A-Z0-9_]{0,63}$/u.test(value.action) &&
    typeof value.correlationId === "string" &&
    /^[a-zA-Z0-9_-]{8,128}$/u.test(value.correlationId) &&
    typeof value.createdAt === "string" &&
    !Number.isNaN(Date.parse(value.createdAt)) &&
    isRecord(value.safeContext) &&
    typeof value.target.id === "string" &&
    value.target.id.length > 0 &&
    typeof value.target.type === "string" &&
    /^[A-Z][A-Z0-9_]{0,63}$/u.test(value.target.type) &&
    (value.target.tokenId === null ||
      (Number.isInteger(value.target.tokenId) &&
        Number(value.target.tokenId) >= 1 &&
        Number(value.target.tokenId) <= 10))
  );
}

function parsePage(value: unknown): AdminAuditPage {
  if (!isRecord(value) || !Array.isArray(value.events))
    throw new AdminAuditClientError("INVALID_RESPONSE");
  if (
    value.nextCursor !== null &&
    (typeof value.nextCursor !== "string" ||
      !/^[1-9][0-9]*$/u.test(value.nextCursor))
  )
    throw new AdminAuditClientError("INVALID_RESPONSE");
  if (!value.events.every(isEvent))
    throw new AdminAuditClientError("INVALID_RESPONSE");
  return value as AdminAuditPage;
}

export async function fetchAdminAudit(cursor: string | null) {
  const parameters = new URLSearchParams({ limit: "10" });
  if (cursor) parameters.set("cursor", cursor);
  const response = await fetch(`/api/admin/audit?${parameters}`, {
    cache: "no-store",
    credentials: "same-origin",
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const code =
      isRecord(body) && "code" in body
        ? String(body.code)
        : "AUDIT_UNAVAILABLE";
    throw new AdminAuditClientError(code);
  }
  return parsePage(body);
}
