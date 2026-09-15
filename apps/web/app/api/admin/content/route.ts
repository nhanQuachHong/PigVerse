import { randomUUID } from "node:crypto";

import type { AdminSession } from "../../../../src/server/admin-auth-store";
import {
  adminAuthJson,
  authenticateAdminRequest,
} from "../../../../src/server/admin-auth-runtime";
import type { AdminContentDependencies } from "../../../../src/server/admin-content";
import { listGenesisContent } from "../../../../src/server/admin-content";
import { getAdminContentRuntime } from "../../../../src/server/admin-content-runtime";
import {
  type AdminOperationFailureCategory,
  logAdminOperationFailure,
} from "../../../../src/server/operational-log";

type ContentRouteRuntime = AdminContentDependencies & {
  authenticate: (request: Request) => Promise<AdminSession | null>;
};

function getRuntime(): ContentRouteRuntime {
  return {
    ...getAdminContentRuntime(),
    authenticate: authenticateAdminRequest,
  };
}

export function createContentListHandler(
  resolveRuntime: () => ContentRouteRuntime,
  createCorrelationId: () => string = randomUUID,
  logFailure: typeof logAdminOperationFailure = logAdminOperationFailure,
) {
  return async function GET(request: Request) {
    const correlationId = createCorrelationId();
    const reportFailure = (category: AdminOperationFailureCategory) => {
      try {
        logFailure({
          category,
          correlationId,
          operation: "admin_content_list",
        });
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
      const slots = await listGenesisContent(runtime);
      return adminAuthJson({ correlationId, slots }, undefined, correlationId);
    } catch {
      reportFailure("unavailable");
      return adminAuthJson(
        {
          code: "ADMIN_CONTENT_UNAVAILABLE",
          correlationId,
          message: "Admin content is unavailable",
        },
        { status: 503 },
        correlationId,
      );
    }
  };
}

export const GET = createContentListHandler(getRuntime);
