import { randomUUID } from "node:crypto";

import type { HealthIntegration } from "./operational-log";

export type HealthCheck = "error" | "ok";

export type HealthReport = {
  checks: {
    application: "ok";
    chain: HealthCheck;
    configuration: HealthCheck;
    database: HealthCheck;
  };
  correlationId: string;
  status: "degraded" | "ok";
  timestamp: string;
};

export type HealthDependencies = {
  checkChain: () => Promise<boolean>;
  checkDatabase: () => Promise<boolean>;
  configurationReady: boolean;
  correlationId?: () => string;
  now?: () => Date;
  onFailure?: (input: {
    correlationId: string;
    integration: HealthIntegration;
  }) => void;
  timeoutMs?: number;
};

async function boundedCheck(
  check: () => Promise<boolean>,
  timeoutMs: number,
): Promise<HealthCheck> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const success = await Promise.race([
      check(),
      new Promise<false>((resolve) => {
        timer = setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
    return success ? "ok" : "error";
  } catch {
    return "error";
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function inspectHealth(
  dependencies: HealthDependencies,
): Promise<HealthReport> {
  const timeoutMs = dependencies.timeoutMs ?? 3_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10_000)
    throw new Error("Invalid health-check timeout");
  const correlationId = dependencies.correlationId?.() ?? randomUUID();
  if (!/^[a-zA-Z0-9_-]{8,128}$/u.test(correlationId))
    throw new Error("Invalid health correlation ID");
  const [chain, database] = await Promise.all([
    dependencies.configurationReady
      ? boundedCheck(dependencies.checkChain, timeoutMs)
      : Promise.resolve<HealthCheck>("error"),
    boundedCheck(dependencies.checkDatabase, timeoutMs),
  ]);
  const configuration = dependencies.configurationReady ? "ok" : "error";
  const status =
    chain === "ok" && database === "ok" && configuration === "ok"
      ? "ok"
      : "degraded";
  const failures: HealthIntegration[] = [];
  if (configuration === "error") failures.push("configuration");
  if (chain === "error" && configuration === "ok") failures.push("chain");
  if (database === "error") failures.push("database");
  for (const integration of failures) {
    try {
      dependencies.onFailure?.({ correlationId, integration });
    } catch {
      // Health reporting must survive an unavailable logging sink.
    }
  }
  return {
    checks: { application: "ok", chain, configuration, database },
    correlationId,
    status,
    timestamp: (dependencies.now?.() ?? new Date()).toISOString(),
  };
}
