import { randomUUID } from "node:crypto";

import {
  getPublicNftDetail,
  parseGenesisTokenId,
} from "../../../../src/lib/public-nft-detail";
import {
  logPublicReadFailure,
  type PublicReadFailureCategory,
} from "../../../../src/server/operational-log";

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

export function createNftDetailHandler(
  resolveDetail: typeof getPublicNftDetail = getPublicNftDetail,
  createCorrelationId: () => string = randomUUID,
  logFailure: typeof logPublicReadFailure = logPublicReadFailure,
) {
  return async function GET(
    _request: Request,
    { params }: { params: Promise<{ tokenId: string }> },
  ) {
    const correlationId = createCorrelationId();
    const reportFailure = (category: PublicReadFailureCategory) => {
      try {
        logFailure({ category, correlationId, surface: "nft_detail" });
      } catch {
        // Observability must not change the API outcome.
      }
    };
    try {
      const tokenId = parseGenesisTokenId((await params).tokenId);
      const detail = tokenId === null ? null : await resolveDetail(tokenId);
      if (!detail)
        return response(
          { code: "GENESIS_TOKEN_NOT_FOUND", message: "NFT not found" },
          correlationId,
          404,
        );
      if (detail.degraded)
        reportFailure(
          detail.deployment ? "chain_unavailable" : "configuration_unavailable",
        );
      return response(detail, correlationId);
    } catch {
      reportFailure("unavailable");
      return response(
        { code: "NFT_DETAIL_UNAVAILABLE", message: "NFT is unavailable" },
        correlationId,
        503,
      );
    }
  };
}

export const GET = createNftDetailHandler();
