import type { AdminSession } from "../../../../src/server/admin-auth-store";
import {
  adminAuthJson,
  authenticateAdminRequest,
} from "../../../../src/server/admin-auth-runtime";
import {
  listMintActivity,
  MintActivityError,
  type MintActivityDependencies,
} from "../../../../src/server/mint-activity";
import { getMintActivityRuntime } from "../../../../src/server/mint-activity-runtime";

type AdminMintActivityRuntime = MintActivityDependencies & {
  authenticate: (request: Request) => Promise<AdminSession | null>;
};

function getRuntime(): AdminMintActivityRuntime {
  return {
    ...getMintActivityRuntime(),
    authenticate: authenticateAdminRequest,
  };
}

export function createAdminMintActivityHandler(
  resolveRuntime: () => AdminMintActivityRuntime,
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
      const result = await listMintActivity(
        {
          cursor: url.searchParams.get("cursor"),
          limit: url.searchParams.get("limit"),
        },
        runtime,
      );
      return adminAuthJson(result);
    } catch (error) {
      if (error instanceof MintActivityError)
        return adminAuthJson(
          { code: "INVALID_INPUT", message: "Invalid activity page" },
          { status: 400 },
        );
      return adminAuthJson(
        {
          code: "MINT_ACTIVITY_UNAVAILABLE",
          message: "Mint activity is unavailable",
        },
        { status: 503 },
      );
    }
  };
}

export const GET = createAdminMintActivityHandler(getRuntime);
