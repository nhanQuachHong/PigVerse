import { randomUUID } from "node:crypto";

import {
  MintActivityError,
  type MintActivityDependencies,
  observeMintActivity,
} from "../../../src/server/mint-activity";
import {
  getAdminAuthRuntime,
  hasExpectedOrigin,
} from "../../../src/server/admin-auth-runtime";
import { getMintActivityRuntime } from "../../../src/server/mint-activity-runtime";
import {
  logMintActivityFailure,
  type MintActivityFailureCategory,
} from "../../../src/server/operational-log";

type IngestionRuntime = MintActivityDependencies & { appOrigin: string };

function getRuntime(): IngestionRuntime {
  return {
    ...getMintActivityRuntime(),
    appOrigin: getAdminAuthRuntime().appOrigin,
  };
}

function json(
  body: Record<string, unknown>,
  correlationId: string,
  status = 200,
) {
  return Response.json(
    { ...body, correlationId },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Correlation-ID": correlationId,
      },
      status,
    },
  );
}

export function createMintActivityIngestionHandler(
  resolveRuntime: () => IngestionRuntime,
  createCorrelationId: () => string = randomUUID,
  logFailure: typeof logMintActivityFailure = logMintActivityFailure,
) {
  return async function POST(request: Request) {
    const correlationId = createCorrelationId();
    const reportFailure = (category: MintActivityFailureCategory) => {
      try {
        logFailure({
          category,
          correlationId,
          stage: "ingestion",
        });
      } catch {
        // Observability must not change the API outcome.
      }
    };
    try {
      const runtime = resolveRuntime();
      if (!hasExpectedOrigin(request, runtime.appOrigin)) {
        reportFailure("request_denied");
        return json({ code: "REQUEST_DENIED" }, correlationId, 403);
      }
      const contentLength = Number(request.headers.get("content-length") ?? 0);
      if (!Number.isFinite(contentLength) || contentLength > 256) {
        reportFailure("invalid_input");
        return json({ code: "INVALID_INPUT" }, correlationId, 413);
      }
      const source = await request.text();
      if (source.length > 256) {
        reportFailure("invalid_input");
        return json({ code: "INVALID_INPUT" }, correlationId, 413);
      }
      let body: unknown;
      try {
        body = JSON.parse(source);
      } catch {
        throw new MintActivityError("INVALID_INPUT");
      }
      if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        !("transactionHash" in body) ||
        Object.keys(body).length !== 1
      )
        throw new MintActivityError("INVALID_INPUT");
      const result = await observeMintActivity(body.transactionHash, runtime);
      if (result.status === "recorded") return json(result, correlationId);
      if (result.status === "not-visible")
        return json(result, correlationId, 202);
      if (result.status === "unavailable") {
        reportFailure("chain_unavailable");
        return json({ code: "CHAIN_STATE_UNAVAILABLE" }, correlationId, 503);
      }
      if (result.status === "conflict") {
        reportFailure("conflict");
        return json({ code: "MINT_ACTIVITY_CONFLICT" }, correlationId, 409);
      }
      reportFailure("transaction_invalid");
      return json({ code: "TRANSACTION_INVALID" }, correlationId, 400);
    } catch (error) {
      if (error instanceof MintActivityError) {
        reportFailure("invalid_input");
        return json({ code: "INVALID_INPUT" }, correlationId, 400);
      }
      reportFailure("unavailable");
      return json({ code: "MINT_ACTIVITY_UNAVAILABLE" }, correlationId, 503);
    }
  };
}

export const POST = createMintActivityIngestionHandler(getRuntime);
