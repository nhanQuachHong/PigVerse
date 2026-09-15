export type HealthIntegration = "chain" | "configuration" | "database";
export type AdminAuthStage = "challenge" | "session" | "verify";
export type AdminAuthFailureCategory =
  | "authorization_denied"
  | "cross_origin"
  | "invalid_input"
  | "rate_limited"
  | "unavailable";
export type AdminOperation =
  | "admin_audit"
  | "admin_content_list"
  | "admin_content_update"
  | "admin_mint_activity"
  | "owner_control"
  | "publication_inclusion"
  | "publication_prepare";
export type AdminOperationFailureCategory =
  | "asset_not_ready"
  | "authentication_required"
  | "chain_unavailable"
  | "conflict"
  | "invalid_input"
  | "request_denied"
  | "token_already_minted"
  | "transaction_failed"
  | "transaction_invalid"
  | "unavailable";
export type MintActivityFailureCategory =
  | "chain_unavailable"
  | "conflict"
  | "invalid_input"
  | "request_denied"
  | "transaction_invalid"
  | "unavailable";
export type PublicReadFailureCategory =
  "chain_unavailable" | "configuration_unavailable" | "unavailable";
export type PublicReadSurface = "collection" | "nft_detail";

export type OperationalLogSink = (line: string) => void;

const safeCorrelationId = /^[a-zA-Z0-9_-]{8,128}$/u;

function writeLog(
  record: Record<string, string>,
  options: { now?: () => Date; sink?: OperationalLogSink },
) {
  const line = JSON.stringify({
    ...record,
    timestamp: (options.now?.() ?? new Date()).toISOString(),
  });
  (options.sink ?? console.error)(line);
}

export function logAdminAuthFailure(
  input: {
    category: AdminAuthFailureCategory;
    correlationId: string;
    stage: AdminAuthStage;
  },
  options: {
    now?: () => Date;
    sink?: OperationalLogSink;
  } = {},
) {
  if (
    !safeCorrelationId.test(input.correlationId) ||
    ![
      "authorization_denied",
      "cross_origin",
      "invalid_input",
      "rate_limited",
      "unavailable",
    ].includes(input.category) ||
    !["challenge", "session", "verify"].includes(input.stage)
  )
    throw new Error("Invalid operational log input");
  writeLog(
    {
      category: input.category,
      correlationId: input.correlationId,
      event: "ADMIN_AUTH_FAILED",
      level: "warning",
      stage: input.stage,
    },
    options,
  );
}

export function logAdminOperationFailure(
  input: {
    category: AdminOperationFailureCategory;
    correlationId: string;
    operation: AdminOperation;
  },
  options: {
    now?: () => Date;
    sink?: OperationalLogSink;
  } = {},
) {
  if (
    !safeCorrelationId.test(input.correlationId) ||
    ![
      "asset_not_ready",
      "authentication_required",
      "chain_unavailable",
      "conflict",
      "invalid_input",
      "request_denied",
      "token_already_minted",
      "transaction_failed",
      "transaction_invalid",
      "unavailable",
    ].includes(input.category) ||
    ![
      "admin_audit",
      "admin_content_list",
      "admin_content_update",
      "admin_mint_activity",
      "owner_control",
      "publication_inclusion",
      "publication_prepare",
    ].includes(input.operation)
  )
    throw new Error("Invalid operational log input");
  writeLog(
    {
      category: input.category,
      correlationId: input.correlationId,
      event: "ADMIN_OPERATION_FAILED",
      level:
        input.category === "chain_unavailable" ||
        input.category === "unavailable"
          ? "error"
          : "warning",
      operation: input.operation,
    },
    options,
  );
}

export function logMintActivityFailure(
  input: {
    category: MintActivityFailureCategory;
    correlationId: string;
    stage: "ingestion";
  },
  options: {
    now?: () => Date;
    sink?: OperationalLogSink;
  } = {},
) {
  if (
    !safeCorrelationId.test(input.correlationId) ||
    ![
      "chain_unavailable",
      "conflict",
      "invalid_input",
      "request_denied",
      "transaction_invalid",
      "unavailable",
    ].includes(input.category) ||
    input.stage !== "ingestion"
  )
    throw new Error("Invalid operational log input");
  writeLog(
    {
      category: input.category,
      correlationId: input.correlationId,
      event: "MINT_ACTIVITY_FAILED",
      level:
        input.category === "chain_unavailable" ||
        input.category === "unavailable"
          ? "error"
          : "warning",
      stage: input.stage,
    },
    options,
  );
}

export function logPublicReadFailure(
  input: {
    category: PublicReadFailureCategory;
    correlationId: string;
    surface: PublicReadSurface;
  },
  options: {
    now?: () => Date;
    sink?: OperationalLogSink;
  } = {},
) {
  if (
    !safeCorrelationId.test(input.correlationId) ||
    !["chain_unavailable", "configuration_unavailable", "unavailable"].includes(
      input.category,
    ) ||
    !["collection", "nft_detail"].includes(input.surface)
  )
    throw new Error("Invalid operational log input");
  writeLog(
    {
      category: input.category,
      correlationId: input.correlationId,
      event: "PUBLIC_READ_DEGRADED",
      level: "error",
      surface: input.surface,
    },
    options,
  );
}

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
  writeLog(
    {
      correlationId: input.correlationId,
      event: "INTEGRATION_HEALTH_FAILED",
      integration: input.integration,
      level: "error",
    },
    options,
  );
}
