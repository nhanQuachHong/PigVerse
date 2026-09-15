import { randomUUID } from "node:crypto";

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
import {
  type AdminOperationFailureCategory,
  logAdminOperationFailure,
} from "../../../../src/server/operational-log";

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
          operation: "admin_mint_activity",
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
      const url = new URL(request.url);
      const result = await listMintActivity(
        {
          cursor: url.searchParams.get("cursor"),
          limit: url.searchParams.get("limit"),
        },
        runtime,
      );
      if (
        result.activities.some(
          (activity) => activity.reconciliation === "unavailable",
        )
      )
        reportFailure("chain_unavailable");
      else if (
        result.activities.some(
          (activity) => activity.reconciliation === "conflict",
        )
      )
        reportFailure("conflict");
      return adminAuthJson(
        { ...result, correlationId },
        undefined,
        correlationId,
      );
    } catch (error) {
      if (error instanceof MintActivityError) {
        reportFailure("invalid_input");
        return adminAuthJson(
          {
            code: "INVALID_INPUT",
            correlationId,
            message: "Invalid activity page",
          },
          { status: 400 },
          correlationId,
        );
      }
      reportFailure("unavailable");
      return adminAuthJson(
        {
          code: "MINT_ACTIVITY_UNAVAILABLE",
          correlationId,
          message: "Mint activity is unavailable",
        },
        { status: 503 },
        correlationId,
      );
    }
  };
}

export const GET = createAdminMintActivityHandler(getRuntime);
