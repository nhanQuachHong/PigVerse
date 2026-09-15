import { randomUUID } from "node:crypto";

import type { AdminSession } from "../../../../src/server/admin-auth-store";
import {
  adminAuthJson,
  authenticateAdminRequest,
} from "../../../../src/server/admin-auth-runtime";
import {
  AdminAuditError,
  type AdminAuditDependencies,
  listAdminAudit,
} from "../../../../src/server/admin-audit";
import { getAdminAuditRuntime } from "../../../../src/server/admin-audit-runtime";
import {
  type AdminOperationFailureCategory,
  logAdminOperationFailure,
} from "../../../../src/server/operational-log";

type AuditRouteRuntime = AdminAuditDependencies & {
  authenticate: (request: Request) => Promise<AdminSession | null>;
};

function getRuntime(): AuditRouteRuntime {
  return {
    ...getAdminAuditRuntime(),
    authenticate: authenticateAdminRequest,
  };
}

export function createAdminAuditHandler(
  resolveRuntime: () => AuditRouteRuntime,
  createCorrelationId: () => string = randomUUID,
  logFailure: typeof logAdminOperationFailure = logAdminOperationFailure,
) {
  return async function GET(request: Request) {
    const correlationId = createCorrelationId();
    const reportFailure = (category: AdminOperationFailureCategory) => {
      try {
        logFailure({ category, correlationId, operation: "admin_audit" });
      } catch {
        // Observability must not change the API outcome.
      }
    };
    try {
      const runtime = resolveRuntime();
      const session = await runtime.authenticate(request);
      if (!session) {
        reportFailure("authentication_required");
        return adminAuthJson(
          {
            code: "ADMIN_AUTH_REQUIRED",
            correlationId,
            message: "Admin access required",
          },
          { status: 401 },
          correlationId,
        );
      }
      const url = new URL(request.url);
      const result = await listAdminAudit(
        {
          cursor: url.searchParams.get("cursor"),
          limit: url.searchParams.get("limit"),
        },
        runtime,
      );
      return adminAuthJson(
        { ...result, correlationId },
        undefined,
        correlationId,
      );
    } catch (error) {
      if (error instanceof AdminAuditError) {
        reportFailure("invalid_input");
        return adminAuthJson(
          {
            code: "INVALID_INPUT",
            correlationId,
            message: "Invalid audit page",
          },
          { status: 400 },
          correlationId,
        );
      }
      reportFailure("unavailable");
      return adminAuthJson(
        {
          code: "ADMIN_AUDIT_UNAVAILABLE",
          correlationId,
          message: "Admin audit history is unavailable",
        },
        { status: 503 },
        correlationId,
      );
    }
  };
}

export const GET = createAdminAuditHandler(getRuntime);
