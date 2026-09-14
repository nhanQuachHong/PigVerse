import { randomUUID } from "node:crypto";

import {
  authenticateAdminSession,
  hashCredential,
} from "../../../../../src/server/admin-auth";
import {
  adminAuthJson,
  adminSessionCookieName,
  expiredAdminSessionCookie,
  getAdminAuthRuntime,
  hasExpectedOrigin,
  readCookie,
} from "../../../../../src/server/admin-auth-runtime";
import {
  type AdminAuthFailureCategory,
  logAdminAuthFailure,
} from "../../../../../src/server/operational-log";

export function createSessionHandlers(
  getRuntime: typeof getAdminAuthRuntime,
  observability: {
    createCorrelationId?: () => string;
    logFailure?: typeof logAdminAuthFailure;
  } = {},
) {
  const requestContext = () => {
    const correlationId = observability.createCorrelationId?.() ?? randomUUID();
    return {
      report(category: AdminAuthFailureCategory) {
        try {
          (observability.logFailure ?? logAdminAuthFailure)({
            category,
            correlationId,
            stage: "session",
          });
        } catch {
          // Authentication behavior must not depend on the logging sink.
        }
      },
      response: (body: unknown, init: ResponseInit = {}) =>
        adminAuthJson(body, init, correlationId),
    };
  };
  return {
    GET: async (request: Request) => {
      const context = requestContext();
      try {
        const runtime = getRuntime();
        const token = readCookie(request, adminSessionCookieName);
        const session = token
          ? await authenticateAdminSession(token, runtime)
          : null;
        if (!session)
          return context.response({ authenticated: false }, { status: 401 });
        return context.response({
          authenticated: true,
          expiresAt: session.expiresAt.toISOString(),
          walletAddress: session.walletAddress,
        });
      } catch {
        context.report("unavailable");
        return context.response({ authenticated: false }, { status: 503 });
      }
    },
    DELETE: async (request: Request) => {
      const context = requestContext();
      try {
        const runtime = getRuntime();
        if (!hasExpectedOrigin(request, runtime.appOrigin)) {
          context.report("cross_origin");
          return context.response(
            { message: "Request denied" },
            { status: 403 },
          );
        }
        const token = readCookie(request, adminSessionCookieName);
        if (token)
          await runtime.store.revokeSession(hashCredential(token), new Date());
        return context.response(
          { authenticated: false },
          {
            headers: {
              "Set-Cookie": expiredAdminSessionCookie(),
            },
          },
        );
      } catch {
        context.report("unavailable");
        return context.response(
          { message: "Admin authentication unavailable" },
          { status: 503 },
        );
      }
    },
  };
}

const handlers = createSessionHandlers(getAdminAuthRuntime);
export const GET = handlers.GET;
export const DELETE = handlers.DELETE;
