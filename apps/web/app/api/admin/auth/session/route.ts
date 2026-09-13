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

export function createSessionHandlers(getRuntime: typeof getAdminAuthRuntime) {
  return {
    GET: async (request: Request) => {
      try {
        const runtime = getRuntime();
        const token = readCookie(request, adminSessionCookieName);
        const session = token
          ? await authenticateAdminSession(token, runtime)
          : null;
        if (!session)
          return adminAuthJson({ authenticated: false }, { status: 401 });
        return adminAuthJson({
          authenticated: true,
          expiresAt: session.expiresAt.toISOString(),
          walletAddress: session.walletAddress,
        });
      } catch {
        return adminAuthJson({ authenticated: false }, { status: 503 });
      }
    },
    DELETE: async (request: Request) => {
      try {
        const runtime = getRuntime();
        if (!hasExpectedOrigin(request, runtime.appOrigin))
          return adminAuthJson({ message: "Request denied" }, { status: 403 });
        const token = readCookie(request, adminSessionCookieName);
        if (token)
          await runtime.store.revokeSession(hashCredential(token), new Date());
        return adminAuthJson(
          { authenticated: false },
          {
            headers: {
              "Set-Cookie": expiredAdminSessionCookie(),
            },
          },
        );
      } catch {
        return adminAuthJson(
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
