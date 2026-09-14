import { randomUUID } from "node:crypto";

import type { AdminSession } from "../../../../../../src/server/admin-auth-store";
import {
  adminAuthJson,
  authenticateAdminRequest,
  getAdminAuthRuntime,
  hasExpectedOrigin,
} from "../../../../../../src/server/admin-auth-runtime";
import {
  AdminPublicationError,
  type AdminPublicationDependencies,
  preparePublicationTransaction,
  type PublicationAction,
} from "../../../../../../src/server/admin-publication";
import {
  getAdminPublicationRuntime,
  getPublicationInclusionRuntime,
} from "../../../../../../src/server/admin-publication-runtime";
import {
  PublicationInclusionError,
  type PublicationInclusionDependencies,
  recordPublicationInclusion,
} from "../../../../../../src/server/publication-inclusion";
import {
  type AdminOperation,
  type AdminOperationFailureCategory,
  logAdminOperationFailure,
} from "../../../../../../src/server/operational-log";

type PublicationRuntime = AdminPublicationDependencies & {
  appOrigin: string;
  authenticate: (request: Request) => Promise<AdminSession | null>;
};

type PublicationContext = { params: Promise<{ tokenId: string }> };
type InclusionRuntime = PublicationInclusionDependencies & {
  appOrigin: string;
  authenticate: (request: Request) => Promise<AdminSession | null>;
};

function getRuntime(): PublicationRuntime {
  const auth = getAdminAuthRuntime();
  return {
    ...getAdminPublicationRuntime(),
    appOrigin: auth.appOrigin,
    authenticate: (request) => authenticateAdminRequest(request, auth),
  };
}

function getInclusionRuntime(): InclusionRuntime {
  const auth = getAdminAuthRuntime();
  return {
    ...getPublicationInclusionRuntime(),
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

function failureReporter(
  correlationId: string,
  operation: AdminOperation,
  logFailure: typeof logAdminOperationFailure,
) {
  return (category: AdminOperationFailureCategory) => {
    try {
      logFailure({ category, correlationId, operation });
    } catch {
      // Observability must not change the API outcome.
    }
  };
}

export function createPublicationPrepareHandler(
  resolveRuntime: () => PublicationRuntime,
  createCorrelationId: () => string = randomUUID,
  logFailure: typeof logAdminOperationFailure = logAdminOperationFailure,
) {
  return async function POST(request: Request, context: PublicationContext) {
    const correlationId = createCorrelationId();
    const reportFailure = failureReporter(
      correlationId,
      "publication_prepare",
      logFailure,
    );
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
        throw new AdminPublicationError("INVALID_INPUT");
      }
      const { tokenId: tokenIdParam } = await context.params;
      if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        !("action" in body) ||
        (body.action !== "publish" && body.action !== "unpublish") ||
        !/^(?:[1-9]|10)$/u.test(tokenIdParam)
      )
        throw new AdminPublicationError("INVALID_INPUT");
      const result = await preparePublicationTransaction(
        {
          action: body.action as PublicationAction,
          tokenId: Number(tokenIdParam),
        },
        runtime,
      );
      if (result.status === "prepared") return response(result, correlationId);
      const categoryByCode = {
        ASSET_NOT_READY: "asset_not_ready",
        CHAIN_STATE_UNAVAILABLE: "chain_unavailable",
        PUBLICATION_STATE_CONFLICT: "conflict",
        TOKEN_ALREADY_MINTED: "token_already_minted",
      } as const;
      reportFailure(categoryByCode[result.code]);
      return response(
        { code: result.code },
        correlationId,
        result.code === "CHAIN_STATE_UNAVAILABLE" ? 503 : 409,
      );
    } catch (error) {
      if (error instanceof AdminPublicationError) {
        reportFailure("invalid_input");
        return response({ code: "INVALID_INPUT" }, correlationId, 400);
      }
      reportFailure("unavailable");
      return response(
        { code: "ADMIN_PUBLICATION_UNAVAILABLE" },
        correlationId,
        503,
      );
    }
  };
}

export const POST = createPublicationPrepareHandler(getRuntime);

export function createPublicationInclusionHandler(
  resolveRuntime: () => InclusionRuntime,
  createCorrelationId: () => string = randomUUID,
  logFailure: typeof logAdminOperationFailure = logAdminOperationFailure,
) {
  return async function PUT(request: Request, context: PublicationContext) {
    const correlationId = createCorrelationId();
    const reportFailure = failureReporter(
      correlationId,
      "publication_inclusion",
      logFailure,
    );
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
        throw new PublicationInclusionError("INVALID_INPUT");
      }
      const { tokenId: tokenIdParam } = await context.params;
      if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        !("transactionHash" in body) ||
        typeof body.transactionHash !== "string" ||
        !/^(?:[1-9]|10)$/u.test(tokenIdParam)
      )
        throw new PublicationInclusionError("INVALID_INPUT");
      const result = await recordPublicationInclusion(
        {
          actorWallet: session.walletAddress,
          correlationId,
          tokenId: Number(tokenIdParam),
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
          PUBLICATION_STATE_CONFLICT: "conflict",
          TOKEN_ALREADY_MINTED: "token_already_minted",
          TRANSACTION_FAILED: "transaction_failed",
          TRANSACTION_INVALID: "transaction_invalid",
        } as const;
        reportFailure(categoryByCode[result.code]);
      }
      return response({ code: result.code }, correlationId, status);
    } catch (error) {
      if (error instanceof PublicationInclusionError) {
        reportFailure("invalid_input");
        return response({ code: "INVALID_INPUT" }, correlationId, 400);
      }
      reportFailure("unavailable");
      return response(
        { code: "ADMIN_PUBLICATION_UNAVAILABLE" },
        correlationId,
        503,
      );
    }
  };
}

export const PUT = createPublicationInclusionHandler(getInclusionRuntime);
