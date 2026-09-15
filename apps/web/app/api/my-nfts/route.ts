import { randomUUID } from "node:crypto";

import { getMyNfts } from "../../../src/lib/my-nfts";
import {
  logPublicReadFailure,
  type PublicReadFailureCategory,
} from "../../../src/server/operational-log";

export const dynamic = "force-dynamic";

function response(
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

export function createMyNftsHandler(
  resolveMyNfts: typeof getMyNfts = getMyNfts,
  createCorrelationId: () => string = randomUUID,
  logFailure: typeof logPublicReadFailure = logPublicReadFailure,
) {
  return async function GET(request: Request) {
    const correlationId = createCorrelationId();
    const reportFailure = (category: PublicReadFailureCategory) => {
      try {
        logFailure({ category, correlationId, surface: "my_nfts" });
      } catch {
        // Observability must not change the API outcome.
      }
    };
    try {
      const address = new URL(request.url).searchParams.get("address") ?? "";
      const result = await resolveMyNfts(address);
      if (!result)
        return response(
          {
            code: "INVALID_WALLET_ADDRESS",
            message: "Invalid wallet address",
          },
          correlationId,
          400,
        );
      if (result.ownershipStatus === "unavailable")
        reportFailure("chain_unavailable");
      return response(result, correlationId);
    } catch {
      reportFailure("unavailable");
      return response(
        { code: "MY_NFTS_UNAVAILABLE", message: "My NFTs is unavailable" },
        correlationId,
        503,
      );
    }
  };
}

export const GET = createMyNftsHandler();
