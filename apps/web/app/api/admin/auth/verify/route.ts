import {
  AdminAuthError,
  hashCredential,
  type AdminAuthDependencies,
  verifyAdminChallenge,
} from "../../../../../src/server/admin-auth";
import {
  adminAuthJson,
  adminSessionCookie,
  getAdminAuthRuntime,
  hasExpectedOrigin,
} from "../../../../../src/server/admin-auth-runtime";
import {
  FixedWindowRateLimiter,
  type RateLimiter,
} from "../../../../../src/server/rate-limit";

type VerifyRuntime = AdminAuthDependencies & { appOrigin: string };

export function createVerifyHandler(
  getRuntime: () => VerifyRuntime,
  limiter: RateLimiter = new FixedWindowRateLimiter(5, 5 * 60 * 1000),
) {
  return async function POST(request: Request) {
    try {
      const runtime = getRuntime();
      if (!hasExpectedOrigin(request, runtime.appOrigin))
        return adminAuthJson(
          { message: "Authentication denied" },
          { status: 403 },
        );
      const length = Number(request.headers.get("content-length") ?? "0");
      if (length > 4096)
        return adminAuthJson({ message: "Invalid request" }, { status: 413 });
      const source = await request.text();
      if (source.length > 4096)
        return adminAuthJson({ message: "Invalid request" }, { status: 413 });
      const body = JSON.parse(source) as Record<string, unknown>;
      if (
        typeof body.message !== "string" ||
        typeof body.nonce !== "string" ||
        typeof body.signature !== "string"
      )
        throw new AdminAuthError("AUTH_INVALID");
      if (!limiter.consume(hashCredential(body.nonce)))
        return adminAuthJson({ message: "Too many requests" }, { status: 429 });
      const result = await verifyAdminChallenge(
        {
          message: body.message,
          nonce: body.nonce,
          signature: body.signature,
        },
        runtime,
      );
      return adminAuthJson(
        {
          expiresAt: result.expiresAt.toISOString(),
          walletAddress: result.walletAddress,
        },
        {
          headers: {
            "Set-Cookie": adminSessionCookie(result.token, result.expiresAt),
          },
        },
      );
    } catch (error) {
      if (error instanceof AdminAuthError)
        return adminAuthJson(
          { message: "Authentication denied" },
          { status: 401 },
        );
      return adminAuthJson(
        { message: "Admin authentication unavailable" },
        { status: 503 },
      );
    }
  };
}

export const POST = createVerifyHandler(getAdminAuthRuntime);
