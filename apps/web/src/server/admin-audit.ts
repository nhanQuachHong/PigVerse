import type { AdminAuditStore } from "./admin-audit-store";
import { GENESIS_SEPOLIA_DEPLOYMENT_KEY } from "./admin-content";

const defaultPageSize = 20;
const maximumPageSize = 50;
const maximumEventId = 9_223_372_036_854_775_807n;

export class AdminAuditError extends Error {
  constructor(readonly code: "INVALID_INPUT") {
    super(code);
  }
}

export type AdminAuditDependencies = {
  store: AdminAuditStore;
};

function parsePositiveInteger(value: string | null, maximum?: number) {
  if (!value || !/^[1-9][0-9]*$/u.test(value))
    throw new AdminAuditError("INVALID_INPUT");
  const parsed = Number(value);
  if (
    !Number.isSafeInteger(parsed) ||
    (maximum !== undefined && parsed > maximum)
  )
    throw new AdminAuditError("INVALID_INPUT");
  return parsed;
}

function parseCursor(value: string | null) {
  if (value === null) return null;
  if (!/^[1-9][0-9]{0,18}$/u.test(value))
    throw new AdminAuditError("INVALID_INPUT");
  const parsed = BigInt(value);
  if (parsed > maximumEventId) throw new AdminAuditError("INVALID_INPUT");
  return parsed;
}

export async function listAdminAudit(
  input: { cursor: string | null; limit: string | null },
  dependencies: AdminAuditDependencies,
) {
  const limit =
    input.limit === null
      ? defaultPageSize
      : parsePositiveInteger(input.limit, maximumPageSize);
  const events = await dependencies.store.list({
    beforeEventId: parseCursor(input.cursor),
    deploymentKey: GENESIS_SEPOLIA_DEPLOYMENT_KEY,
    limit: limit + 1,
  });
  const page = events.slice(0, limit);
  return {
    events: page.map((event) => ({
      action: event.action,
      actorWallet: event.actorWallet,
      auditEventId: event.auditEventId,
      correlationId: event.correlationId,
      createdAt: event.createdAt.toISOString(),
      safeContext: event.safeContext,
      target: {
        id: event.targetId,
        tokenId: event.tokenId,
        type: event.targetType,
      },
    })),
    nextCursor:
      events.length > limit && page.length > 0
        ? page[page.length - 1]!.auditEventId
        : null,
  };
}
