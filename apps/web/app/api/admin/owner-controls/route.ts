import { randomUUID } from "node:crypto";

import type { AdminSession } from "../../../../src/server/admin-auth-store";
import {
  adminAuthJson,
  authenticateAdminRequest,
  getAdminAuthRuntime,
  hasExpectedOrigin,
} from "../../../../src/server/admin-auth-runtime";
import {
  type OwnerControlInclusionDependencies,
  OwnerControlInclusionError,
  recordOwnerControlInclusion,
} from "../../../../src/server/owner-control-inclusion";
import { getOwnerControlRuntime } from "../../../../src/server/owner-control-runtime";
import {
  type AdminOperationFailureCategory,
  logAdminOperationFailure,
} from "../../../../src/server/operational-log";

type OwnerControlRouteRuntime = OwnerControlInclusionDependencies & {
  appOrigin: string;
  authenticate: (request: Request) => Promise<AdminSession | null>;
};

function getRuntime(): OwnerControlRouteRuntime {
  const auth = getAdminAuthRuntime();
  return {
    ...getOwnerControlRuntime(),
    appOrigin: auth.appOrigin,
    authenticate: (request) => authenticateAdminRequest(request, auth),
  };
}

function response(
  body: Record<string, unknown>,
  correlationId: string,
  status = 200,
) {
  return adminAuthJson({ ...body, correlationId }, { status });
}

export function createOwnerControlInclusionHandler(
  resolveRuntime: () => OwnerControlRouteRuntime,
  createCorrelationId: () => string = randomUUID,
  logFailure: typeof logAdminOperationFailure = logAdminOperationFailure,
) {
  return async function PUT(request: Request) {
    const correlationId = createCorrelationId();
    const reportFailure = (category: AdminOperationFailureCategory) => {
      try {
        logFailure({ category, correlationId, operation: "owner_control" });
      } catch {
        // Observability must not change the API outcome.
      }
    };
    try {
      const runtime = resolveRuntime();
      if (!hasExpectedOrigin(request, runtime.appOrigin)) {
        reportFailure("request_denied");
        return response({ code: "REQUEST_DENIED" }, correlationId, 403);
      }
      const session = await runtime.authenticate(request);
      if (!session) {
        reportFailure("authentication_required");
        return response({ code: "ADMIN_AUTH_REQUIRED" }, correlationId, 401);
      }
      const contentLength = Number(request.headers.get("content-length") ?? 0);
      if (!Number.isFinite(contentLength) || contentLength > 1_024) {
        reportFailure("invalid_input");
        return response({ code: "INVALID_INPUT" }, correlationId, 413);
      }
      const source = await request.text();
      if (source.length > 1_024) {
        reportFailure("invalid_input");
        return response({ code: "INVALID_INPUT" }, correlationId, 413);
      }
      let body: unknown;
      try {
        body = JSON.parse(source);
      } catch {
        throw new OwnerControlInclusionError("INVALID_INPUT");
      }
      if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        Object.keys(body).length !== 1 ||
        !("transactionHash" in body) ||
        typeof body.transactionHash !== "string"
      )
        throw new OwnerControlInclusionError("INVALID_INPUT");

      const result = await recordOwnerControlInclusion(
        {
          actorWallet: session.walletAddress,
          correlationId,
          transactionHash: body.transactionHash,
        },
        runtime,
      );
      if (result.status === "recorded") return response(result, correlationId);
      const status =
        result.code === "TRANSACTION_PENDING"
          ? 202
          : result.code === "CHAIN_STATE_UNAVAILABLE"
            ? 503
            : result.code === "TRANSACTION_INVALID"
              ? 400
              : 409;
      if (result.code !== "TRANSACTION_PENDING") {
        const categoryByCode = {
          CHAIN_STATE_UNAVAILABLE: "chain_unavailable",
          OWNER_CONTROL_CONFLICT: "conflict",
          TRANSACTION_FAILED: "transaction_failed",
          TRANSACTION_INVALID: "transaction_invalid",
        } as const;
        reportFailure(categoryByCode[result.code]);
      }
      return response({ code: result.code }, correlationId, status);
    } catch (error) {
      if (error instanceof OwnerControlInclusionError) {
        reportFailure("invalid_input");
        return response({ code: "INVALID_INPUT" }, correlationId, 400);
      }
      reportFailure("unavailable");
      return response(
        { code: "OWNER_CONTROL_UNAVAILABLE" },
        correlationId,
        503,
      );
    }
  };
}

export const PUT = createOwnerControlInclusionHandler(getRuntime);
