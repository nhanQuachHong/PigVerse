import type { AdminSession } from "../../../../src/server/admin-auth-store";
import {
  adminAuthJson,
  authenticateAdminRequest,
} from "../../../../src/server/admin-auth-runtime";
import type { AdminContentDependencies } from "../../../../src/server/admin-content";
import { listGenesisContent } from "../../../../src/server/admin-content";
import { getAdminContentRuntime } from "../../../../src/server/admin-content-runtime";

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
      const slots = await listGenesisContent(runtime);
      return adminAuthJson({ slots });
    } catch {
      return adminAuthJson(
        {
          code: "ADMIN_CONTENT_UNAVAILABLE",
          message: "Admin content is unavailable",
        },
        { status: 503 },
      );
    }
  };
}

export const GET = createContentListHandler(getRuntime);
