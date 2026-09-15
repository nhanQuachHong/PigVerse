import { randomUUID } from "node:crypto";

import { getPublicCollection } from "../../../src/lib/public-collection";
import {
  logPublicReadFailure,
  type PublicReadFailureCategory,
} from "../../../src/server/operational-log";

export const dynamic = "force-dynamic";

export function createCollectionHandler(
  resolveCollection: typeof getPublicCollection = getPublicCollection,
  createCorrelationId: () => string = randomUUID,
  logFailure: typeof logPublicReadFailure = logPublicReadFailure,
) {
  return async function GET() {
    const correlationId = createCorrelationId();
    const reportFailure = (category: PublicReadFailureCategory) => {
      try {
        logFailure({ category, correlationId, surface: "collection" });
      } catch {
        // Observability must not change the API outcome.
      }
    };
    try {
      const collection = await resolveCollection();
      if (collection.degraded)
        reportFailure(
          collection.deployment
            ? "chain_unavailable"
            : "configuration_unavailable",
        );
      return Response.json(
        { ...collection, correlationId },
        {
          headers: {
            "Cache-Control": "no-store",
            "X-Correlation-ID": correlationId,
          },
        },
      );
    } catch {
      reportFailure("unavailable");
      return Response.json(
        { code: "COLLECTION_UNAVAILABLE", correlationId },
        {
          headers: {
            "Cache-Control": "no-store",
            "X-Correlation-ID": correlationId,
          },
          status: 503,
        },
      );
    }
  };
}

export const GET = createCollectionHandler();
