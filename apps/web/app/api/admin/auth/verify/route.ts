import { randomUUID } from "node:crypto";

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
import {
  type AdminAuthFailureCategory,
  logAdminAuthFailure,
} from "../../../../../src/server/operational-log";

type VerifyRuntime = AdminAuthDependencies & { appOrigin: string };

export function createVerifyHandler(
  getRuntime: () => VerifyRuntime,
  limiter: RateLimiter = new FixedWindowRateLimiter(5, 5 * 60 * 1000),
  observability: {
    createCorrelationId?: () => string;
    logFailure?: typeof logAdminAuthFailure;
  } = {},
) {
  return async function POST(request: Request) {
    const correlationId = observability.createCorrelationId?.() ?? randomUUID();
    const response = (body: unknown, init: ResponseInit = {}) =>
      adminAuthJson(body, init, correlationId);
    const report = (category: AdminAuthFailureCategory) => {
      try {
        (observability.logFailure ?? logAdminAuthFailure)({
          category,
          correlationId,
          stage: "verify",
        });
      } catch {
        // Authentication behavior must not depend on the logging sink.
      }
    };
    try {
      const runtime = getRuntime();
      if (!hasExpectedOrigin(request, runtime.appOrigin)) {
        report("cross_origin");
        return response({ message: "Authentication denied" }, { status: 403 });
      }
      const length = Number(request.headers.get("content-length") ?? "0");
      if (length > 4096) {
        report("invalid_input");
        return response({ message: "Invalid request" }, { status: 413 });
      }
      const source = await request.text();
      if (source.length > 4096) {
        report("invalid_input");
        return response({ message: "Invalid request" }, { status: 413 });
      }
      const body = JSON.parse(source) as Record<string, unknown>;
      if (
        typeof body.message !== "string" ||
        typeof body.nonce !== "string" ||
        typeof body.signature !== "string"
      )
        throw new AdminAuthError("AUTH_INVALID");
      if (!limiter.consume(hashCredential(body.nonce))) {
        report("rate_limited");
        return response({ message: "Too many requests" }, { status: 429 });
      }
      const result = await verifyAdminChallenge(
        {
          message: body.message,
          nonce: body.nonce,
          signature: body.signature,
        },
        runtime,
      );
      return response(
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
      if (error instanceof SyntaxError) {
        report("invalid_input");
        return response({ message: "Invalid request" }, { status: 400 });
      }
      if (error instanceof AdminAuthError) {
        report("authorization_denied");
        return response({ message: "Authentication denied" }, { status: 401 });
      }
      report("unavailable");
      return response(
        { message: "Admin authentication unavailable" },
        { status: 503 },
      );
    }
  };
}

export const POST = createVerifyHandler(getAdminAuthRuntime);
