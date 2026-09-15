import { randomUUID } from "node:crypto";

import type { AdminSession } from "../../../../../src/server/admin-auth-store";
import {
  adminAuthJson,
  authenticateAdminRequest,
  getAdminAuthRuntime,
  hasExpectedOrigin,
} from "../../../../../src/server/admin-auth-runtime";
import {
  AdminContentError,
  type AdminContentDependencies,
  saveGenesisDraft,
} from "../../../../../src/server/admin-content";
import { getAdminContentRuntime } from "../../../../../src/server/admin-content-runtime";
import {
  type AdminOperationFailureCategory,
  logAdminOperationFailure,
} from "../../../../../src/server/operational-log";

type UpdateRuntime = AdminContentDependencies & {
  appOrigin: string;
  authenticate: (request: Request) => Promise<AdminSession | null>;
};

type UpdateContext = { params: Promise<{ tokenId: string }> };

function getRuntime(): UpdateRuntime {
  const auth = getAdminAuthRuntime();
  return {
    ...getAdminContentRuntime(),
    appOrigin: auth.appOrigin,
    authenticate: (request) => authenticateAdminRequest(request, auth),
  };
}

function errorResponse(
  code: string,
  message: string,
  correlationId: string,
  status: number,
) {
  return adminAuthJson(
    { code, correlationId, message },
    { status },
    correlationId,
  );
}

export function createContentUpdateHandler(
  resolveRuntime: () => UpdateRuntime,
  createCorrelationId: () => string = randomUUID,
  logFailure: typeof logAdminOperationFailure = logAdminOperationFailure,
) {
  return async function PUT(request: Request, context: UpdateContext) {
    const correlationId = createCorrelationId();
    const reportFailure = (category: AdminOperationFailureCategory) => {
      try {
        logFailure({
          category,
          correlationId,
          operation: "admin_content_update",
        });
      } catch {
        // Observability must not change the API outcome.
      }
    };
    try {
      const runtime = resolveRuntime();
      if (!hasExpectedOrigin(request, runtime.appOrigin)) {
        reportFailure("request_denied");
        return errorResponse(
          "REQUEST_DENIED",
          "Request denied",
          correlationId,
          403,
        );
      }
      const session = await runtime.authenticate(request);
      if (!session) {
        reportFailure("authentication_required");
        return errorResponse(
          "ADMIN_AUTH_REQUIRED",
          "Admin access required",
          correlationId,
          401,
        );
      }
      const length = Number(request.headers.get("content-length") ?? "0");
      if (length > 131_072) {
        reportFailure("invalid_input");
        return errorResponse(
          "INVALID_CONTENT",
          "Invalid content",
          correlationId,
          413,
        );
      }
      const source = await request.text();
      if (source.length > 65_536) {
        reportFailure("invalid_input");
        return errorResponse(
          "INVALID_CONTENT",
          "Invalid content",
          correlationId,
          413,
        );
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(source);
      } catch {
        throw new AdminContentError("INVALID_INPUT");
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new AdminContentError("INVALID_INPUT");
      const body = parsed as Record<string, unknown>;
      const { tokenId: tokenIdParam } = await context.params;
      if (!/^(?:[1-9]|10)$/.test(tokenIdParam))
        throw new AdminContentError("INVALID_INPUT");
      const fields = [
        "nameVi",
        "nameEn",
        "descriptionVi",
        "descriptionEn",
        "storyVi",
        "storyEn",
      ] as const;
      if (
        !Number.isInteger(body.expectedRevision) ||
        fields.some((field) => typeof body[field] !== "string")
      )
        throw new AdminContentError("INVALID_INPUT");
      const result = await saveGenesisDraft(
        {
          actorWallet: session.walletAddress,
          correlationId,
          descriptionEn: body.descriptionEn as string,
          descriptionVi: body.descriptionVi as string,
          expectedRevision: body.expectedRevision as number,
          nameEn: body.nameEn as string,
          nameVi: body.nameVi as string,
          storyEn: body.storyEn as string,
          storyVi: body.storyVi as string,
          tokenId: Number(tokenIdParam),
        },
        runtime,
      );
      if (result.status === "conflict") {
        reportFailure("conflict");
        return errorResponse(
          "STALE_EDIT",
          "The draft has changed",
          correlationId,
          409,
        );
      }
      if (result.status === "minted-locked") {
        reportFailure("token_already_minted");
        return errorResponse(
          "TOKEN_ALREADY_MINTED",
          "Minted content cannot be changed",
          correlationId,
          409,
        );
      }
      if (result.status === "chain-unavailable") {
        reportFailure("chain_unavailable");
        return errorResponse(
          "CHAIN_STATE_UNAVAILABLE",
          "Chain state is unavailable",
          correlationId,
          503,
        );
      }
      return adminAuthJson(
        { content: result.content, correlationId },
        undefined,
        correlationId,
      );
    } catch (error) {
      if (error instanceof AdminContentError) {
        reportFailure("invalid_input");
        return errorResponse(
          "INVALID_CONTENT",
          "Invalid content",
          correlationId,
          400,
        );
      }
      reportFailure("unavailable");
      return errorResponse(
        "ADMIN_CONTENT_UNAVAILABLE",
        "Admin content is unavailable",
        correlationId,
        503,
      );
    }
  };
}

export const PUT = createContentUpdateHandler(getRuntime);
