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

export function createPublicationPrepareHandler(
  resolveRuntime: () => PublicationRuntime,
  createCorrelationId: () => string = randomUUID,
) {
  return async function POST(request: Request, context: PublicationContext) {
    const correlationId = createCorrelationId();
    try {
      const runtime = resolveRuntime();
      if (!hasExpectedOrigin(request, runtime.appOrigin))
        return response({ code: "REQUEST_DENIED" }, correlationId, 403);
      const session = await runtime.authenticate(request);
      if (!session)
        return response({ code: "ADMIN_AUTH_REQUIRED" }, correlationId, 401);
      const contentLength = Number(request.headers.get("content-length") ?? 0);
      if (!Number.isFinite(contentLength) || contentLength > 1_024)
        return response({ code: "INVALID_INPUT" }, correlationId, 413);
      const source = await request.text();
      if (source.length > 1_024)
        return response({ code: "INVALID_INPUT" }, correlationId, 413);
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
      return response(
        { code: result.code },
        correlationId,
        result.code === "CHAIN_STATE_UNAVAILABLE" ? 503 : 409,
      );
    } catch (error) {
      if (error instanceof AdminPublicationError)
        return response({ code: "INVALID_INPUT" }, correlationId, 400);
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
) {
  return async function PUT(request: Request, context: PublicationContext) {
    const correlationId = createCorrelationId();
    try {
      const runtime = resolveRuntime();
      if (!hasExpectedOrigin(request, runtime.appOrigin))
        return response({ code: "REQUEST_DENIED" }, correlationId, 403);
      const session = await runtime.authenticate(request);
      if (!session)
        return response({ code: "ADMIN_AUTH_REQUIRED" }, correlationId, 401);
      const contentLength = Number(request.headers.get("content-length") ?? 0);
      if (!Number.isFinite(contentLength) || contentLength > 1_024)
        return response({ code: "INVALID_INPUT" }, correlationId, 413);
      const source = await request.text();
      if (source.length > 1_024)
        return response({ code: "INVALID_INPUT" }, correlationId, 413);
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
      return response({ code: result.code }, correlationId, status);
    } catch (error) {
      if (error instanceof PublicationInclusionError)
        return response({ code: "INVALID_INPUT" }, correlationId, 400);
      return response(
        { code: "ADMIN_PUBLICATION_UNAVAILABLE" },
        correlationId,
        503,
      );
    }
  };
}

export const PUT = createPublicationInclusionHandler(getInclusionRuntime);
