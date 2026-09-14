import type { Sql } from "postgres";

export type AdminAuditEvent = {
  action: string;
  actorWallet: `0x${string}`;
  auditEventId: string;
  correlationId: string;
  createdAt: Date;
  safeContext: Record<string, unknown>;
  targetId: string;
  targetType: string;
  tokenId: number | null;
};

export type AuditPageQuery = {
  beforeEventId: bigint | null;
  deploymentKey: string;
  limit: number;
};

export interface AdminAuditStore {
  list(query: AuditPageQuery): Promise<AdminAuditEvent[]>;
}

type AuditRow = {
  action: string;
  actor_wallet: `0x${string}`;
  audit_event_id: string;
  correlation_id: string;
  created_at: Date;
  safe_context: unknown;
  target_id: string;
  target_type: string;
  token_id: number | null;
};

function safeContext(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function fromRow(row: AuditRow): AdminAuditEvent {
  return {
    action: row.action,
    actorWallet: row.actor_wallet,
    auditEventId: String(row.audit_event_id),
    correlationId: row.correlation_id,
    createdAt: row.created_at,
    safeContext: safeContext(row.safe_context),
    targetId: row.target_id,
    targetType: row.target_type,
    tokenId: row.token_id === null ? null : Number(row.token_id),
  };
}

export class PostgresAdminAuditStore implements AdminAuditStore {
  constructor(private readonly sql: Sql) {}

  async list(query: AuditPageQuery) {
    const rows = query.beforeEventId
      ? await this.sql<AuditRow[]>`
          SELECT audit_event_id, actor_wallet, action, target_type, target_id,
                 token_id, correlation_id, safe_context, created_at
          FROM audit_events
          WHERE deployment_key = ${query.deploymentKey}
            AND audit_event_id < ${query.beforeEventId.toString()}
          ORDER BY audit_event_id DESC
          LIMIT ${query.limit}
        `
      : await this.sql<AuditRow[]>`
          SELECT audit_event_id, actor_wallet, action, target_type, target_id,
                 token_id, correlation_id, safe_context, created_at
          FROM audit_events
          WHERE deployment_key = ${query.deploymentKey}
          ORDER BY audit_event_id DESC
          LIMIT ${query.limit}
        `;
    return rows.map(fromRow);
  }
}
