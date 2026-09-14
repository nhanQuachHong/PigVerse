import type { Sql } from "postgres";
import { describe, expect, it, vi } from "vitest";

import type { OwnerControlInclusion } from "./owner-control-inclusion";
import { PostgresOwnerControlInclusionStore } from "./owner-control-inclusion-store";

const inclusion: OwnerControlInclusion = {
  action: "setMintPrice",
  actorWallet: "0x1111111111111111111111111111111111111111",
  blockHash: `0x${"b".repeat(64)}`,
  blockNumber: 2748n,
  correlationId: "correlation-1",
  deploymentKey: "genesis:base-sepolia:84532",
  newMintPrice: 125000000000000000n,
  transactionHash: `0x${"a".repeat(64)}`,
  withdrawnAmount: null,
};

const existing = {
  action: "SET_MINT_PRICE",
  actor_wallet: inclusion.actorWallet,
  block_hash: inclusion.blockHash,
  block_number: inclusion.blockNumber.toString(),
  deployment_key: inclusion.deploymentKey,
  new_mint_price: inclusion.newMintPrice?.toString() ?? null,
  transaction_hash: inclusion.transactionHash,
  withdrawn_amount: null,
};

function sqlHarness({
  existingRows = [] as unknown[],
  insertedRows = [{ transaction_hash: inclusion.transactionHash }],
}: {
  existingRows?: unknown[];
  insertedRows?: unknown[];
} = {}) {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const query = vi.fn(
    async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const text = strings.join("?").replace(/\s+/gu, " ").trim();
      calls.push({ text, values });
      if (text.includes("FROM owner_control_inclusions")) return existingRows;
      if (text.startsWith("INSERT INTO owner_control_inclusions"))
        return insertedRows;
      return [];
    },
  );
  const transaction = Object.assign(query, {
    json: vi.fn((value: unknown) => value),
  }) as unknown as Sql;
  const sql = Object.assign(query, {
    begin: vi.fn(
      async (callback: (transactionClient: Sql) => Promise<unknown>) =>
        callback(transaction),
    ),
  }) as unknown as Sql;
  return { calls, json: transaction.json, sql };
}

describe("Postgres Owner control inclusion store", () => {
  it("atomically records price evidence and one append-only audit event", async () => {
    const harness = sqlHarness();
    const store = new PostgresOwnerControlInclusionStore(harness.sql);

    await expect(store.recordInclusion(inclusion)).resolves.toEqual({
      status: "applied",
    });
    expect(harness.calls[0]?.text).toContain("pg_advisory_xact_lock");
    expect(
      harness.calls.some(
        ({ text, values }) =>
          text.startsWith("INSERT INTO owner_control_inclusions") &&
          values.includes("SET_MINT_PRICE") &&
          values.includes(inclusion.newMintPrice?.toString()),
      ),
    ).toBe(true);
    expect(
      harness.calls.some(
        ({ text, values }) =>
          text.startsWith("INSERT INTO audit_events") &&
          values.includes("OWNER_MINT_PRICE_CHANGED"),
      ),
    ).toBe(true);
    expect(harness.json).toHaveBeenCalledWith(
      expect.objectContaining({
        finality: "included",
        newMintPrice: inclusion.newMintPrice?.toString(),
        transactionHash: inclusion.transactionHash,
      }),
    );
  });

  it("records withdrawal amount under the withdrawal audit action", async () => {
    const withdrawal: OwnerControlInclusion = {
      ...inclusion,
      action: "withdraw",
      newMintPrice: null,
      withdrawnAmount: 9n,
    };
    const harness = sqlHarness();

    await expect(
      new PostgresOwnerControlInclusionStore(harness.sql).recordInclusion(
        withdrawal,
      ),
    ).resolves.toEqual({ status: "applied" });
    expect(
      harness.calls.some(
        ({ text, values }) =>
          text.startsWith("INSERT INTO audit_events") &&
          values.includes("OWNER_FUNDS_WITHDRAWN"),
      ),
    ).toBe(true);
    expect(harness.json).toHaveBeenCalledWith(
      expect.objectContaining({ withdrawnAmount: "9" }),
    );
  });

  it.each([
    ["pause", "OWNER_MINT_PAUSED"],
    ["unpause", "OWNER_MINT_UNPAUSED"],
  ] as const)("maps %s to its explicit audit action", async (action, audit) => {
    const harness = sqlHarness();

    await expect(
      new PostgresOwnerControlInclusionStore(harness.sql).recordInclusion({
        ...inclusion,
        action,
        newMintPrice: null,
      }),
    ).resolves.toEqual({ status: "applied" });
    expect(
      harness.calls.some(
        ({ text, values }) =>
          text.startsWith("INSERT INTO audit_events") && values.includes(audit),
      ),
    ).toBe(true);
  });

  it("returns an exact duplicate without repeating the audit write", async () => {
    const harness = sqlHarness({ existingRows: [existing] });

    await expect(
      new PostgresOwnerControlInclusionStore(harness.sql).recordInclusion(
        inclusion,
      ),
    ).resolves.toEqual({ status: "duplicate" });
    expect(
      harness.calls.some(({ text }) =>
        text.startsWith("INSERT INTO audit_events"),
      ),
    ).toBe(false);
  });

  it("rejects reused identity with different evidence", async () => {
    const harness = sqlHarness({
      existingRows: [{ ...existing, block_hash: `0x${"c".repeat(64)}` }],
    });

    await expect(
      new PostgresOwnerControlInclusionStore(harness.sql).recordInclusion(
        inclusion,
      ),
    ).resolves.toEqual({ status: "conflict" });
  });

  it("rejects a concurrent insert conflict without creating audit", async () => {
    const harness = sqlHarness({ insertedRows: [] });

    await expect(
      new PostgresOwnerControlInclusionStore(harness.sql).recordInclusion(
        inclusion,
      ),
    ).resolves.toEqual({ status: "conflict" });
    expect(
      harness.calls.some(({ text }) =>
        text.startsWith("INSERT INTO audit_events"),
      ),
    ).toBe(false);
  });

  it("rejects malformed action payloads before opening a transaction", async () => {
    const harness = sqlHarness();
    const store = new PostgresOwnerControlInclusionStore(harness.sql);

    await expect(
      store.recordInclusion({ ...inclusion, newMintPrice: null }),
    ).rejects.toThrow("Invalid owner control inclusion");
    await expect(
      store.recordInclusion({
        ...inclusion,
        action: "pause",
        withdrawnAmount: 1n,
      }),
    ).rejects.toThrow("Invalid owner control inclusion");
    expect(harness.sql.begin).not.toHaveBeenCalled();
  });
});
