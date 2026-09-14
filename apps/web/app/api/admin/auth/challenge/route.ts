import { randomUUID } from "node:crypto";

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
import {
  type AdminAuthFailureCategory,
  logAdminAuthFailure,
} from "../../../../../src/server/operational-log";

type ChallengeRuntime = AdminAuthDependencies & {
  appOrigin: string;
  chainId: 84532;
};

export function createChallengeHandler(
  getRuntime: () => ChallengeRuntime,
  limiter: RateLimiter = new FixedWindowRateLimiter(10, 5 * 60 * 1000),
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
          stage: "challenge",
        });
      } catch {
        // Authentication behavior must not depend on the logging sink.
      }
    };
    try {
      const runtime = getRuntime();
      if (!hasExpectedOrigin(request, runtime.appOrigin)) {
        report("cross_origin");
        return response({ message: "Request denied" }, { status: 403 });
      }
      const length = Number(request.headers.get("content-length") ?? "0");
      if (length > 2048) {
        report("invalid_input");
        return response({ message: "Invalid request" }, { status: 413 });
      }
      const source = await request.text();
      if (source.length > 2048) {
        report("invalid_input");
        return response({ message: "Invalid request" }, { status: 413 });
      }
      const body = JSON.parse(source) as { address?: unknown };
      if (typeof body.address !== "string")
        throw new AdminAuthError("AUTH_INVALID");
      if (!limiter.consume(hashCredential(body.address.toLowerCase()))) {
        report("rate_limited");
        return response({ message: "Too many requests" }, { status: 429 });
      }
      const challenge = await issueAdminChallenge(
        {
          address: body.address,
          appOrigin: runtime.appOrigin,
          chainId: runtime.chainId,
        },
        runtime,
      );
      return response(challenge);
    } catch (error) {
      if (error instanceof AdminAuthError || error instanceof SyntaxError) {
        report("invalid_input");
        return response({ message: "Invalid request" }, { status: 400 });
      }
      report("unavailable");
      return response(
        { message: "Admin authentication unavailable" },
        { status: 503 },
      );
    }
  };
}

export const POST = createChallengeHandler(getAdminAuthRuntime);
