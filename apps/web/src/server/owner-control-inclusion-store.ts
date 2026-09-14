import { isAddress } from "viem";
import type { Sql } from "postgres";

import type {
  OwnerControlInclusion,
  OwnerControlInclusionStore,
  OwnerControlInclusionStoreResult,
} from "./owner-control-inclusion";

type OwnerActionRow = "PAUSE" | "SET_MINT_PRICE" | "UNPAUSE" | "WITHDRAW";

type InclusionRow = {
  action: OwnerActionRow;
  actor_wallet: string;
  block_hash: string;
  block_number: string;
  deployment_key: string;
  new_mint_price: string | null;
  transaction_hash: string;
  withdrawn_amount: string | null;
};

const maxUint256 = (1n << 256n) - 1n;

function databaseAction(
  action: OwnerControlInclusion["action"],
): OwnerActionRow {
  if (action === "setMintPrice") return "SET_MINT_PRICE";
  return action.toUpperCase() as "PAUSE" | "UNPAUSE" | "WITHDRAW";
}

function auditAction(action: OwnerControlInclusion["action"]) {
  if (action === "pause") return "OWNER_MINT_PAUSED";
  if (action === "unpause") return "OWNER_MINT_UNPAUSED";
  if (action === "setMintPrice") return "OWNER_MINT_PRICE_CHANGED";
  return "OWNER_FUNDS_WITHDRAWN";
}

function invalidInclusion(): never {
  throw new Error("Invalid owner control inclusion");
}

function validateInclusion(inclusion: OwnerControlInclusion) {
  const valueValid = (value: bigint | null) =>
    value === null || (value >= 0n && value <= maxUint256);
  if (
    !["pause", "unpause", "setMintPrice", "withdraw"].includes(
      inclusion.action,
    ) ||
    !isAddress(inclusion.actorWallet) ||
    /^0x0{40}$/iu.test(inclusion.actorWallet) ||
    !/^0x[0-9a-f]{64}$/u.test(inclusion.transactionHash) ||
    !/^0x[0-9a-f]{64}$/u.test(inclusion.blockHash) ||
    inclusion.blockNumber < 0n ||
    inclusion.blockNumber > maxUint256 ||
    !valueValid(inclusion.newMintPrice) ||
    !valueValid(inclusion.withdrawnAmount) ||
    !/^[a-zA-Z0-9:_-]{8,160}$/u.test(inclusion.deploymentKey) ||
    !/^[a-zA-Z0-9_-]{8,128}$/u.test(inclusion.correlationId) ||
    (inclusion.action === "setMintPrice"
      ? inclusion.newMintPrice === null || inclusion.withdrawnAmount !== null
      : inclusion.action === "withdraw"
        ? inclusion.newMintPrice !== null || inclusion.withdrawnAmount === null
        : inclusion.newMintPrice !== null || inclusion.withdrawnAmount !== null)
  )
    invalidInclusion();
}

function sameInclusion(row: InclusionRow, inclusion: OwnerControlInclusion) {
  return (
    row.deployment_key === inclusion.deploymentKey &&
    row.transaction_hash === inclusion.transactionHash &&
    row.action === databaseAction(inclusion.action) &&
    row.actor_wallet.toLowerCase() === inclusion.actorWallet.toLowerCase() &&
    BigInt(row.block_number) === inclusion.blockNumber &&
    row.block_hash === inclusion.blockHash &&
    (row.new_mint_price === null
      ? inclusion.newMintPrice === null
      : inclusion.newMintPrice === BigInt(row.new_mint_price)) &&
    (row.withdrawn_amount === null
      ? inclusion.withdrawnAmount === null
      : inclusion.withdrawnAmount === BigInt(row.withdrawn_amount))
  );
}

export class PostgresOwnerControlInclusionStore implements OwnerControlInclusionStore {
  constructor(private readonly sql: Sql) {}

  async recordInclusion(
    inclusion: OwnerControlInclusion,
  ): Promise<OwnerControlInclusionStoreResult> {
    validateInclusion(inclusion);
    return this.sql.begin(async (transaction) => {
      await transaction`
        SELECT pg_advisory_xact_lock(
          hashtextextended(${`${inclusion.deploymentKey}:${inclusion.transactionHash}`}, 0)
        )
      `;
      const existingRows = await transaction<InclusionRow[]>`
        SELECT deployment_key, transaction_hash, action, actor_wallet,
               new_mint_price, withdrawn_amount, block_number, block_hash
        FROM owner_control_inclusions
        WHERE deployment_key = ${inclusion.deploymentKey}
          AND transaction_hash = ${inclusion.transactionHash}
        LIMIT 1
      `;
      const existing = existingRows[0];
      if (existing)
        return {
          status: sameInclusion(existing, inclusion) ? "duplicate" : "conflict",
        } as const;

      const insertedRows = await transaction<
        Array<{ transaction_hash: string }>
      >`
        INSERT INTO owner_control_inclusions (
          deployment_key, transaction_hash, action, actor_wallet,
          new_mint_price, withdrawn_amount, block_number, block_hash,
          correlation_id
        ) VALUES (
          ${inclusion.deploymentKey}, ${inclusion.transactionHash},
          ${databaseAction(inclusion.action)}, ${inclusion.actorWallet},
          ${inclusion.newMintPrice?.toString() ?? null},
          ${inclusion.withdrawnAmount?.toString() ?? null},
          ${inclusion.blockNumber.toString()}, ${inclusion.blockHash},
          ${inclusion.correlationId}
        )
        ON CONFLICT DO NOTHING
        RETURNING transaction_hash
      `;
      if (!insertedRows[0]) return { status: "conflict" } as const;

      await transaction`
        INSERT INTO audit_events (
          deployment_key, actor_wallet, action, target_type, target_id,
          token_id, correlation_id, safe_context
        ) VALUES (
          ${inclusion.deploymentKey}, ${inclusion.actorWallet},
          ${auditAction(inclusion.action)}, 'GENESIS_CONTRACT',
          ${inclusion.deploymentKey}, NULL, ${inclusion.correlationId},
          ${transaction.json({
            blockHash: inclusion.blockHash,
            blockNumber: inclusion.blockNumber.toString(),
            finality: "included",
            ...(inclusion.newMintPrice === null
              ? {}
              : { newMintPrice: inclusion.newMintPrice.toString() }),
            transactionHash: inclusion.transactionHash,
            ...(inclusion.withdrawnAmount === null
              ? {}
              : { withdrawnAmount: inclusion.withdrawnAmount.toString() }),
          })}
        )
      `;
      return { status: "applied" } as const;
    });
  }
}
