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
  return adminAuthJson({ code, correlationId, message }, { status });
}

export function createContentUpdateHandler(
  resolveRuntime: () => UpdateRuntime,
  createCorrelationId: () => string = randomUUID,
) {
  return async function PUT(request: Request, context: UpdateContext) {
    const correlationId = createCorrelationId();
    try {
      const runtime = resolveRuntime();
      if (!hasExpectedOrigin(request, runtime.appOrigin))
        return errorResponse(
          "REQUEST_DENIED",
          "Request denied",
          correlationId,
          403,
        );
      const session = await runtime.authenticate(request);
      if (!session)
        return errorResponse(
          "ADMIN_AUTH_REQUIRED",
          "Admin access required",
          correlationId,
          401,
        );
      const length = Number(request.headers.get("content-length") ?? "0");
      if (length > 131_072)
        return errorResponse(
          "INVALID_CONTENT",
          "Invalid content",
          correlationId,
          413,
        );
      const source = await request.text();
      if (source.length > 65_536)
        return errorResponse(
          "INVALID_CONTENT",
          "Invalid content",
          correlationId,
          413,
        );
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
      if (result.status === "conflict")
        return errorResponse(
          "STALE_EDIT",
          "The draft has changed",
          correlationId,
          409,
        );
      if (result.status === "minted-locked")
        return errorResponse(
          "TOKEN_ALREADY_MINTED",
          "Minted content cannot be changed",
          correlationId,
          409,
        );
      if (result.status === "chain-unavailable")
        return errorResponse(
          "CHAIN_STATE_UNAVAILABLE",
          "Chain state is unavailable",
          correlationId,
          503,
        );
      return adminAuthJson({ content: result.content, correlationId });
    } catch (error) {
      if (error instanceof AdminContentError)
        return errorResponse(
          "INVALID_CONTENT",
          "Invalid content",
          correlationId,
          400,
        );
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
