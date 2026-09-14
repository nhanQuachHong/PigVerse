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

type IngestionRuntime = MintActivityDependencies & { appOrigin: string };

function getRuntime(): IngestionRuntime {
  return {
    ...getMintActivityRuntime(),
    appOrigin: getAdminAuthRuntime().appOrigin,
  };
}

function json(body: unknown, status = 200) {
  return Response.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

export function createMintActivityIngestionHandler(
  resolveRuntime: () => IngestionRuntime,
) {
  return async function POST(request: Request) {
    try {
      const runtime = resolveRuntime();
      if (!hasExpectedOrigin(request, runtime.appOrigin))
        return json({ code: "REQUEST_DENIED" }, 403);
      const contentLength = Number(request.headers.get("content-length") ?? 0);
      if (!Number.isFinite(contentLength) || contentLength > 256)
        return json({ code: "INVALID_INPUT" }, 413);
      const source = await request.text();
      if (source.length > 256) return json({ code: "INVALID_INPUT" }, 413);
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
      if (result.status === "recorded") return json(result);
      if (result.status === "not-visible") return json(result, 202);
      if (result.status === "unavailable")
        return json({ code: "CHAIN_STATE_UNAVAILABLE" }, 503);
      if (result.status === "conflict")
        return json({ code: "MINT_ACTIVITY_CONFLICT" }, 409);
      return json({ code: "TRANSACTION_INVALID" }, 400);
    } catch (error) {
      if (error instanceof MintActivityError)
        return json({ code: "INVALID_INPUT" }, 400);
      return json({ code: "MINT_ACTIVITY_UNAVAILABLE" }, 503);
    }
  };
}

export const POST = createMintActivityIngestionHandler(getRuntime);
