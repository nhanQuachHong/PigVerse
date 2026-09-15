import { describe, expect, it, vi } from "vitest";

import { createAdminAuditHandler } from "../../app/api/admin/audit/route";
import type {
  AdminAuditEvent,
  AdminAuditStore,
  AuditPageQuery,
} from "./admin-audit-store";
import type { logAdminOperationFailure } from "./operational-log";

const appOrigin = "https://pigverse.example";
const currentOwner = "0x1111111111111111111111111111111111111111" as const;
const formerOwner = "0x2222222222222222222222222222222222222222" as const;
const session = {
  expiresAt: new Date("2026-09-13T00:30:00.000Z"),
  issuedAt: new Date("2026-09-13T00:00:00.000Z"),
  revokedAt: null,
  tokenHash: "hash",
  walletAddress: currentOwner,
};

function event(
  id: number,
  actorWallet: `0x${string}` = currentOwner,
): AdminAuditEvent {
  return {
    action: "NFT_DRAFT_UPDATED",
    actorWallet,
    auditEventId: String(id),
    correlationId: `correlation_${id}`,
    createdAt: new Date(`2026-09-13T00:00:${String(id).padStart(2, "0")}.000Z`),
    safeContext: { fromRevision: id - 1, toRevision: id },
    targetId: String(id),
    targetType: "NFT_CONTENT",
    tokenId: 5,
  };
}

class MemoryAuditStore implements AdminAuditStore {
  readonly calls: AuditPageQuery[] = [];

  constructor(readonly events: AdminAuditEvent[]) {}

  async list(query: AuditPageQuery) {
    this.calls.push(query);
    return this.events
      .filter(
        (candidate) =>
          query.beforeEventId === null ||
          BigInt(candidate.auditEventId) < query.beforeEventId,
      )
      .slice(0, query.limit);
  }
}

function runtime(store: AdminAuditStore, authenticated = true) {
  return {
    authenticate: vi.fn().mockResolvedValue(authenticated ? session : null),
    store,
  };
}

describe("Admin audit route boundary", () => {
  it("denies unauthenticated reads before querying history", async () => {
    const store = new MemoryAuditStore([event(2)]);
    const logFailure = vi.fn<typeof logAdminOperationFailure>();
    const response = await createAdminAuditHandler(
      () => runtime(store, false),
      () => "correlation_1",
      logFailure,
    )(new Request(`${appOrigin}/api/admin/audit`));

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-correlation-id")).toBe("correlation_1");
    expect(store.calls).toHaveLength(0);
    expect(logFailure).toHaveBeenCalledWith({
      category: "authentication_required",
      correlationId: "correlation_1",
      operation: "admin_audit",
    });
  });

  it("paginates newest-first with a stable exclusive cursor", async () => {
    const store = new MemoryAuditStore([
      event(4),
      event(3),
      event(2),
      event(1),
    ]);
    const handler = createAdminAuditHandler(
      () => runtime(store),
      () => "correlation_1",
    );
    const first = await handler(
      new Request(`${appOrigin}/api/admin/audit?limit=2`),
    );
    const firstBody = await first.json();

    expect(first.status).toBe(200);
    expect(first.headers.get("x-correlation-id")).toBe("correlation_1");
    expect(firstBody.correlationId).toBe("correlation_1");
    expect(
      firstBody.events.map(
        (item: { auditEventId: string }) => item.auditEventId,
      ),
    ).toEqual(["4", "3"]);
    expect(firstBody.nextCursor).toBe("3");
    expect(store.calls[0]).toMatchObject({ beforeEventId: null, limit: 3 });

    const second = await handler(
      new Request(`${appOrigin}/api/admin/audit?limit=2&cursor=3`),
    );
    const secondBody = await second.json();
    expect(
      secondBody.events.map(
        (item: { auditEventId: string }) => item.auditEventId,
      ),
    ).toEqual(["2", "1"]);
    expect(secondBody.nextCursor).toBeNull();
    expect(store.calls[1]?.beforeEventId).toBe(3n);
  });

  it("retains the historical actor after ownership changes", async () => {
    const store = new MemoryAuditStore([
      event(2, currentOwner),
      event(1, formerOwner),
    ]);
    const response = await createAdminAuditHandler(() => runtime(store))(
      new Request(`${appOrigin}/api/admin/audit`),
    );
    const body = await response.json();

    expect(body.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ actorWallet: formerOwner }),
      ]),
    );
  });

  it.each(["0", "51", "abc", "1.5"])(
    "rejects invalid limit %s without querying history",
    async (limit) => {
      const store = new MemoryAuditStore([]);
      const logFailure = vi.fn<typeof logAdminOperationFailure>();
      const response = await createAdminAuditHandler(
        () => runtime(store),
        () => "correlation_1",
        logFailure,
      )(new Request(`${appOrigin}/api/admin/audit?limit=${limit}`));

      expect(response.status).toBe(400);
      expect(store.calls).toHaveLength(0);
      expect(logFailure).toHaveBeenCalledWith({
        category: "invalid_input",
        correlationId: "correlation_1",
        operation: "admin_audit",
      });
    },
  );

  it.each(["latest", "0", "9223372036854775808", "1".repeat(100)])(
    "rejects invalid cursor %s without querying history",
    async (cursor) => {
      const store = new MemoryAuditStore([]);
      const logFailure = vi.fn<typeof logAdminOperationFailure>();
      const response = await createAdminAuditHandler(
        () => runtime(store),
        () => "correlation_1",
        logFailure,
      )(new Request(`${appOrigin}/api/admin/audit?cursor=${cursor}`));

      expect(response.status).toBe(400);
      expect(store.calls).toHaveLength(0);
      expect(logFailure).toHaveBeenCalledWith({
        category: "invalid_input",
        correlationId: "correlation_1",
        operation: "admin_audit",
      });
    },
  );

  it("redacts store failures and isolates logging failures", async () => {
    const store: AdminAuditStore = {
      list: vi.fn().mockRejectedValue(new Error("database-secret")),
    };
    const logFailure = vi.fn<typeof logAdminOperationFailure>();
    const response = await createAdminAuditHandler(
      () => runtime(store),
      () => "correlation_1",
      logFailure,
    )(new Request(`${appOrigin}/api/admin/audit`));

    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain(
      "database-secret",
    );
    expect(logFailure).toHaveBeenCalledWith({
      category: "unavailable",
      correlationId: "correlation_1",
      operation: "admin_audit",
    });
    expect(JSON.stringify(logFailure.mock.calls)).not.toContain(currentOwner);

    const denied = await createAdminAuditHandler(
      () => runtime(new MemoryAuditStore([]), false),
      () => "correlation_2",
      () => {
        throw new Error("logging unavailable");
      },
    )(new Request(`${appOrigin}/api/admin/audit`));
    expect(denied.status).toBe(401);
  });
});
