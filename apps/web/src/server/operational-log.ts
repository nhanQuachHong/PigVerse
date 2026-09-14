export type HealthIntegration = "chain" | "configuration" | "database";

export type OperationalLogSink = (line: string) => void;

const safeCorrelationId = /^[a-zA-Z0-9_-]{8,128}$/u;

export function logHealthIntegrationFailure(
  input: { correlationId: string; integration: HealthIntegration },
  options: {
    now?: () => Date;
    sink?: OperationalLogSink;
  } = {},
) {
  if (
    !safeCorrelationId.test(input.correlationId) ||
    !["chain", "configuration", "database"].includes(input.integration)
  )
    throw new Error("Invalid operational log input");
  const line = JSON.stringify({
    correlationId: input.correlationId,
    event: "INTEGRATION_HEALTH_FAILED",
    integration: input.integration,
    level: "error",
    timestamp: (options.now?.() ?? new Date()).toISOString(),
  });
  (options.sink ?? console.error)(line);
}
