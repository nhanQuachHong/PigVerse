import {
  AdminAuthError,
  hashCredential,
  issueAdminChallenge,
  type AdminAuthDependencies,
} from "../../../../../src/server/admin-auth";
import {
  adminAuthJson,
  getAdminAuthRuntime,
  hasExpectedOrigin,
} from "../../../../../src/server/admin-auth-runtime";
import {
  FixedWindowRateLimiter,
  type RateLimiter,
} from "../../../../../src/server/rate-limit";

type ChallengeRuntime = AdminAuthDependencies & {
  appOrigin: string;
  chainId: 84532;
};

export function createChallengeHandler(
  getRuntime: () => ChallengeRuntime,
  limiter: RateLimiter = new FixedWindowRateLimiter(10, 5 * 60 * 1000),
) {
  return async function POST(request: Request) {
    try {
      const runtime = getRuntime();
      if (!hasExpectedOrigin(request, runtime.appOrigin))
        return adminAuthJson({ message: "Request denied" }, { status: 403 });
      const length = Number(request.headers.get("content-length") ?? "0");
      if (length > 2048)
        return adminAuthJson({ message: "Invalid request" }, { status: 413 });
      const source = await request.text();
      if (source.length > 2048)
        return adminAuthJson({ message: "Invalid request" }, { status: 413 });
      const body = JSON.parse(source) as { address?: unknown };
      if (typeof body.address !== "string")
        throw new AdminAuthError("AUTH_INVALID");
      if (!limiter.consume(hashCredential(body.address.toLowerCase())))
        return adminAuthJson({ message: "Too many requests" }, { status: 429 });
      const challenge = await issueAdminChallenge(
        {
          address: body.address,
          appOrigin: runtime.appOrigin,
          chainId: runtime.chainId,
        },
        runtime,
      );
      return adminAuthJson(challenge);
    } catch (error) {
      if (error instanceof AdminAuthError)
        return adminAuthJson({ message: "Invalid request" }, { status: 400 });
      return adminAuthJson(
        { message: "Admin authentication unavailable" },
        { status: 503 },
      );
    }
  };
}

export const POST = createChallengeHandler(getAdminAuthRuntime);
