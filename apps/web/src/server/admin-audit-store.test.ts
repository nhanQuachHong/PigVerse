import type { Sql } from "postgres";
import { describe, expect, it, vi } from "vitest";

import { PostgresAdminAuditStore } from "./admin-audit-store";

function sqlHarness(rows: unknown[]) {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const sql = vi.fn(
    async (strings: TemplateStringsArray, ...values: unknown[]) => {
      calls.push({
        text: strings.join("?").replace(/\s+/gu, " ").trim(),
        values,
      });
      return rows;
    },
  ) as unknown as Sql;
  return { calls, sql };
}

const row = {
  action: "NFT_DRAFT_UPDATED",
  actor_wallet: "0x2222222222222222222222222222222222222222",
  audit_event_id: "42",
  correlation_id: "correlation_42",
  created_at: new Date("2026-09-13T00:00:42.000Z"),
  safe_context: { fromRevision: 1, toRevision: 2 },
  target_id: "7",
  target_type: "NFT_CONTENT",
  token_id: 5,
};

describe("Postgres Admin audit store", () => {
  it("scopes newest-first reads to one deployment and maps historical actors", async () => {
    const harness = sqlHarness([row]);
    const store = new PostgresAdminAuditStore(harness.sql);

    await expect(
      store.list({
        beforeEventId: null,
        deploymentKey: "genesis:base-sepolia:84532",
        limit: 21,
      }),
    ).resolves.toEqual([
      {
        action: row.action,
        actorWallet: row.actor_wallet,
        auditEventId: "42",
        correlationId: row.correlation_id,
        createdAt: row.created_at,
        safeContext: row.safe_context,
        targetId: "7",
        targetType: row.target_type,
        tokenId: 5,
      },
    ]);
    expect(harness.calls[0]?.text).toContain(
      "WHERE deployment_key = ? ORDER BY audit_event_id DESC LIMIT ?",
    );
    expect(harness.calls[0]?.values).toEqual([
      "genesis:base-sepolia:84532",
      21,
    ]);
  });

  it("uses an exclusive event-id cursor without time-based ambiguity", async () => {
    const harness = sqlHarness([]);
    const store = new PostgresAdminAuditStore(harness.sql);

    await store.list({
      beforeEventId: 42n,
      deploymentKey: "genesis:base-sepolia:84532",
      limit: 11,
    });

    expect(harness.calls[0]?.text).toContain("AND audit_event_id < ?");
    expect(harness.calls[0]?.values).toEqual([
      "genesis:base-sepolia:84532",
      "42",
      11,
    ]);
  });
});
