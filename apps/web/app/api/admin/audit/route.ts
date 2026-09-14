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
) {
  return async function GET(request: Request) {
    try {
      const runtime = resolveRuntime();
      const session = await runtime.authenticate(request);
      if (!session)
        return adminAuthJson(
          { code: "ADMIN_AUTH_REQUIRED", message: "Admin access required" },
          { status: 401 },
        );
      const url = new URL(request.url);
      const result = await listAdminAudit(
        {
          cursor: url.searchParams.get("cursor"),
          limit: url.searchParams.get("limit"),
        },
        runtime,
      );
      return adminAuthJson(result);
    } catch (error) {
      if (error instanceof AdminAuditError)
        return adminAuthJson(
          { code: "INVALID_INPUT", message: "Invalid audit page" },
          { status: 400 },
        );
      return adminAuthJson(
        {
          code: "ADMIN_AUDIT_UNAVAILABLE",
          message: "Admin audit history is unavailable",
        },
        { status: 503 },
      );
    }
  };
}

export const GET = createAdminAuditHandler(getRuntime);
