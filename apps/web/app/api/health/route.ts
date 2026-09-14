import {
  type HealthDependencies,
  type HealthReport,
  inspectHealth,
} from "../../../src/server/health";
import { getHealthRuntime } from "../../../src/server/health-runtime";

export const dynamic = "force-dynamic";

function healthResponse(report: HealthReport) {
  return Response.json(report, {
    headers: {
      "Cache-Control": "no-store",
      "X-Correlation-ID": report.correlationId,
    },
    status: report.status === "ok" ? 200 : 503,
  });
}

export function createHealthHandler(
  resolveDependencies: () => HealthDependencies,
  cacheMs = 10_000,
) {
  if (!Number.isInteger(cacheMs) || cacheMs < 0 || cacheMs > 60_000)
    throw new Error("Invalid health cache duration");
  let cached: { expiresAt: number; report: HealthReport } | undefined;
  let pending: Promise<HealthReport> | undefined;
  return async function GET() {
    const now = Date.now();
    if (cached && cached.expiresAt > now) return healthResponse(cached.report);
    pending ??= inspectHealth(resolveDependencies());
    try {
      const report = await pending;
      cached = { expiresAt: now + cacheMs, report };
      return healthResponse(report);
    } finally {
      pending = undefined;
    }
  };
}

export const GET = createHealthHandler(getHealthRuntime);
