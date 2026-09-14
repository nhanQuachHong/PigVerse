export type HealthCheck = "error" | "ok";

export type HealthReport = {
  checks: {
    application: "ok";
    chain: HealthCheck;
    configuration: HealthCheck;
    database: HealthCheck;
  };
  status: "degraded" | "ok";
  timestamp: string;
};

export type HealthDependencies = {
  checkChain: () => Promise<boolean>;
  checkDatabase: () => Promise<boolean>;
  configurationReady: boolean;
  now?: () => Date;
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
  return {
    checks: { application: "ok", chain, configuration, database },
    status,
    timestamp: (dependencies.now?.() ?? new Date()).toISOString(),
  };
}
