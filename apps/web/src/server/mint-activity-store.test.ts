import type { Sql } from "postgres";
import { describe, expect, it, vi } from "vitest";

import {
  type MintActivityEvidence,
  PostgresMintActivityStore,
} from "./mint-activity-store";

const evidence: MintActivityEvidence = {
  blockHash: `0x${"d".repeat(64)}`,
  blockNumber: 2748n,
  deploymentKey: "genesis:base-sepolia:84532",
  expectedPublicationRevision: 4n,
  observedOwnerWallet: `0x${"e".repeat(40)}`,
  safeErrorCategory: null,
  senderWallet: `0x${"a".repeat(40)}`,
  status: "SUCCEEDED",
  tokenId: 3,
  transactionHash: `0x${"c".repeat(64)}`,
  transferLogIndex: 7,
};
const row = {
  block_hash: evidence.blockHash,
  block_number: "2748",
  deployment_key: evidence.deploymentKey,
  expected_publication_revision: "4",
  first_seen_at: new Date("2026-09-13T00:00:00.000Z"),
  last_observed_at: new Date("2026-09-13T00:01:00.000Z"),
  mint_observation_id: "9",
  observed_owner_wallet: evidence.observedOwnerWallet,
  observed_status: "SUCCEEDED",
  safe_error_category: null,
  sender_wallet: evidence.senderWallet,
  token_id: 3,
  transaction_hash: evidence.transactionHash,
  transfer_log_index: 7,
};

function sqlHarness({
  existingRows = [] as unknown[],
  listRows = [] as unknown[],
  writtenRows = [row] as unknown[],
}: {
  existingRows?: unknown[];
  listRows?: unknown[];
  writtenRows?: unknown[];
} = {}) {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const query = vi.fn(
    async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const text = strings.join("?").replace(/\s+/gu, " ").trim();
      calls.push({ text, values });
      if (text.includes("FOR UPDATE")) return existingRows;
      if (
        text.startsWith("SELECT mint_observation_id") &&
        text.includes("ORDER BY")
      )
        return listRows;
      if (text.startsWith("SELECT mint_observation_id")) return existingRows;
      if (
        text.startsWith("INSERT INTO mint_activity_observations") ||
        text.startsWith("UPDATE mint_activity_observations")
      )
        return writtenRows;
      return [];
    },
  );
  const transaction = query as unknown as Sql;
  const sql = Object.assign(query, {
    begin: vi.fn(
      async (callback: (transactionClient: Sql) => Promise<unknown>) =>
        callback(transaction),
    ),
  }) as unknown as Sql;
  return { calls, sql };
}

describe("Postgres mint activity store", () => {
  it("inserts one validated observation and maps numeric evidence", async () => {
    const harness = sqlHarness();
    const store = new PostgresMintActivityStore(harness.sql);

    await expect(store.upsert(evidence)).resolves.toMatchObject({
      record: {
        blockNumber: 2748n,
        expectedPublicationRevision: 4n,
        mintObservationId: "9",
        status: "SUCCEEDED",
      },
      status: "recorded",
    });
    expect(harness.calls[0]?.text).toContain("pg_advisory_xact_lock");
    expect(
      harness.calls.some(
        ({ text, values }) =>
          text.startsWith("INSERT INTO mint_activity_observations") &&
          values.includes(evidence.transactionHash),
      ),
    ).toBe(true);
    expect(
      harness.calls.some(
        ({ text, values }) =>
          text.startsWith("UPDATE nft_contents") &&
          values.includes(evidence.deploymentKey) &&
          values.includes(evidence.tokenId),
      ),
    ).toBe(true);
  });

  it("updates evidence without creating a duplicate logical observation", async () => {
    const pendingRow = {
      ...row,
      block_hash: null,
      block_number: null,
      observed_owner_wallet: null,
      observed_status: "PENDING",
      transfer_log_index: null,
    };
    const harness = sqlHarness({ existingRows: [pendingRow] });
    const store = new PostgresMintActivityStore(harness.sql);

    await expect(store.upsert(evidence)).resolves.toMatchObject({
      record: { mintObservationId: "9", status: "SUCCEEDED" },
      status: "recorded",
    });
    expect(
      harness.calls.filter(({ text }) =>
        text.startsWith("INSERT INTO mint_activity_observations"),
      ),
    ).toHaveLength(0);
    expect(
      harness.calls.filter(({ text }) =>
        text.startsWith("UPDATE mint_activity_observations"),
      ),
    ).toHaveLength(1);
  });

  it.each(["PENDING", "REVERTED", "UNKNOWN"] as const)(
    "does not lock content for a %s observation",
    async (status) => {
      const harness = sqlHarness({
        writtenRows: [
          {
            ...row,
            block_hash: status === "REVERTED" ? evidence.blockHash : null,
            block_number: status === "REVERTED" ? "2748" : null,
            observed_owner_wallet: null,
            observed_status: status,
            safe_error_category: status === "REVERTED" ? "EVM_REVERT" : null,
            transfer_log_index: null,
          },
        ],
      });
      const store = new PostgresMintActivityStore(harness.sql);
      await store.upsert({
        ...evidence,
        blockHash: status === "REVERTED" ? evidence.blockHash : null,
        blockNumber: status === "REVERTED" ? evidence.blockNumber : null,
        observedOwnerWallet: null,
        safeErrorCategory: status === "REVERTED" ? "EVM_REVERT" : null,
        status,
        transferLogIndex: null,
      });

      expect(
        harness.calls.some(({ text }) =>
          text.startsWith("UPDATE nft_contents"),
        ),
      ).toBe(false);
    },
  );

  it("rejects a reused transaction identity with a different token", async () => {
    const harness = sqlHarness({ existingRows: [row] });
    const store = new PostgresMintActivityStore(harness.sql);

    await expect(store.upsert({ ...evidence, tokenId: 4 })).resolves.toEqual({
      status: "conflict",
    });
    expect(
      harness.calls.some(
        ({ text }) =>
          text.startsWith("INSERT INTO mint_activity_observations") ||
          text.startsWith("UPDATE mint_activity_observations"),
      ),
    ).toBe(false);
  });

  it("rejects internally inconsistent success before opening a transaction", async () => {
    const harness = sqlHarness();
    const store = new PostgresMintActivityStore(harness.sql);

    await expect(
      store.upsert({ ...evidence, observedOwnerWallet: null }),
    ).rejects.toThrow("Invalid mint activity evidence");
    expect(harness.sql.begin).not.toHaveBeenCalled();
  });

  it("rejects an unknown runtime status before opening a transaction", async () => {
    const harness = sqlHarness();
    const store = new PostgresMintActivityStore(harness.sql);

    await expect(
      store.upsert({ ...evidence, status: "CONFIRMED" as "SUCCEEDED" }),
    ).rejects.toThrow("Invalid mint activity evidence");
    expect(harness.sql.begin).not.toHaveBeenCalled();
  });

  it("finds by stable identity and pages with an exclusive observation cursor", async () => {
    const findHarness = sqlHarness({ existingRows: [row] });
    await expect(
      new PostgresMintActivityStore(findHarness.sql).find(
        evidence.deploymentKey,
        evidence.transactionHash,
      ),
    ).resolves.toMatchObject({ mintObservationId: "9" });

    const listHarness = sqlHarness({ listRows: [row] });
    await expect(
      new PostgresMintActivityStore(listHarness.sql).list({
        beforeObservationId: 10n,
        deploymentKey: evidence.deploymentKey,
        limit: 6,
      }),
    ).resolves.toHaveLength(1);
    expect(listHarness.calls[0]?.text).toContain("AND mint_observation_id < ?");
    expect(listHarness.calls[0]?.values).toEqual([
      evidence.deploymentKey,
      "10",
      6,
    ]);
  });
});
