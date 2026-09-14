import { getAddress, isAddress } from "viem";
import type { Sql } from "postgres";

export type MintActivityStatus =
  "PENDING" | "SUCCEEDED" | "REVERTED" | "UNKNOWN";

export type MintActivityEvidence = {
  blockHash: `0x${string}` | null;
  blockNumber: bigint | null;
  deploymentKey: string;
  expectedPublicationRevision: bigint;
  observedOwnerWallet: `0x${string}` | null;
  safeErrorCategory: string | null;
  senderWallet: `0x${string}`;
  status: MintActivityStatus;
  tokenId: number;
  transactionHash: `0x${string}`;
  transferLogIndex: number | null;
};

export type MintActivityRecord = MintActivityEvidence & {
  firstSeenAt: Date;
  lastObservedAt: Date;
  mintObservationId: string;
};

export type MintActivityPageQuery = {
  beforeObservationId: bigint | null;
  deploymentKey: string;
  limit: number;
};

export type MintActivityUpsertResult =
  { record: MintActivityRecord; status: "recorded" } | { status: "conflict" };

export interface MintActivityStore {
  find(
    deploymentKey: string,
    transactionHash: `0x${string}`,
  ): Promise<MintActivityRecord | null>;
  list(query: MintActivityPageQuery): Promise<MintActivityRecord[]>;
  upsert(evidence: MintActivityEvidence): Promise<MintActivityUpsertResult>;
}

type ActivityRow = {
  block_hash: `0x${string}` | null;
  block_number: string | null;
  deployment_key: string;
  expected_publication_revision: string;
  first_seen_at: Date;
  last_observed_at: Date;
  mint_observation_id: string;
  observed_owner_wallet: `0x${string}` | null;
  observed_status: MintActivityStatus;
  safe_error_category: string | null;
  sender_wallet: `0x${string}`;
  token_id: number;
  transaction_hash: `0x${string}`;
  transfer_log_index: number | null;
};

const maxUint256 = (1n << 256n) - 1n;
function normalizeAddress(value: `0x${string}`) {
  return getAddress(value).toLowerCase() as `0x${string}`;
}

function fromRow(row: ActivityRow): MintActivityRecord {
  return {
    blockHash: row.block_hash,
    blockNumber: row.block_number === null ? null : BigInt(row.block_number),
    deploymentKey: row.deployment_key,
    expectedPublicationRevision: BigInt(row.expected_publication_revision),
    firstSeenAt: row.first_seen_at,
    lastObservedAt: row.last_observed_at,
    mintObservationId: String(row.mint_observation_id),
    observedOwnerWallet: row.observed_owner_wallet,
    safeErrorCategory: row.safe_error_category,
    senderWallet: row.sender_wallet,
    status: row.observed_status,
    tokenId: Number(row.token_id),
    transactionHash: row.transaction_hash,
    transferLogIndex:
      row.transfer_log_index === null ? null : Number(row.transfer_log_index),
  };
}

function validAddress(value: unknown) {
  return (
    typeof value === "string" && isAddress(value) && !/^0x0{40}$/iu.test(value)
  );
}

function validateEvidence(evidence: MintActivityEvidence) {
  const included = evidence.blockNumber !== null && evidence.blockHash !== null;
  const succeeded = evidence.status === "SUCCEEDED";
  const reverted = evidence.status === "REVERTED";
  const unsettled =
    evidence.status === "PENDING" || evidence.status === "UNKNOWN";
  if (
    !/^[a-zA-Z0-9:_-]{8,160}$/u.test(evidence.deploymentKey) ||
    !/^0x[0-9a-f]{64}$/u.test(evidence.transactionHash) ||
    !Number.isInteger(evidence.tokenId) ||
    evidence.tokenId < 1 ||
    evidence.tokenId > 10 ||
    !validAddress(evidence.senderWallet) ||
    evidence.expectedPublicationRevision < 0n ||
    evidence.expectedPublicationRevision > maxUint256 ||
    !["PENDING", "SUCCEEDED", "REVERTED", "UNKNOWN"].includes(
      evidence.status,
    ) ||
    (evidence.blockNumber !== null && evidence.blockNumber < 0n) ||
    (evidence.blockHash !== null &&
      !/^0x[0-9a-f]{64}$/u.test(evidence.blockHash)) ||
    (evidence.transferLogIndex !== null &&
      (!Number.isSafeInteger(evidence.transferLogIndex) ||
        evidence.transferLogIndex < 0)) ||
    (evidence.safeErrorCategory !== null &&
      !/^[A-Z][A-Z0-9_]{0,63}$/u.test(evidence.safeErrorCategory)) ||
    (succeeded &&
      (!included ||
        !validAddress(evidence.observedOwnerWallet) ||
        evidence.transferLogIndex === null ||
        evidence.safeErrorCategory !== null)) ||
    (reverted &&
      (!included ||
        evidence.observedOwnerWallet !== null ||
        evidence.transferLogIndex !== null)) ||
    (unsettled &&
      (included ||
        evidence.observedOwnerWallet !== null ||
        evidence.transferLogIndex !== null))
  )
    throw new Error("Invalid mint activity evidence");
}

function sameIdentity(row: ActivityRow, evidence: MintActivityEvidence) {
  return (
    row.deployment_key === evidence.deploymentKey &&
    row.transaction_hash === evidence.transactionHash &&
    Number(row.token_id) === evidence.tokenId &&
    row.sender_wallet.toLowerCase() === evidence.senderWallet.toLowerCase() &&
    BigInt(row.expected_publication_revision) ===
      evidence.expectedPublicationRevision
  );
}

export class PostgresMintActivityStore implements MintActivityStore {
  constructor(private readonly sql: Sql) {}

  async find(deploymentKey: string, transactionHash: `0x${string}`) {
    const rows = await this.sql<ActivityRow[]>`
      SELECT mint_observation_id, deployment_key, transaction_hash, token_id,
             sender_wallet, expected_publication_revision, observed_status,
             observed_owner_wallet, block_number, block_hash,
             transfer_log_index, safe_error_category, first_seen_at,
             last_observed_at
      FROM mint_activity_observations
      WHERE deployment_key = ${deploymentKey}
        AND transaction_hash = ${transactionHash}
      LIMIT 1
    `;
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async list(query: MintActivityPageQuery) {
    const rows = query.beforeObservationId
      ? await this.sql<ActivityRow[]>`
          SELECT mint_observation_id, deployment_key, transaction_hash,
                 token_id, sender_wallet, expected_publication_revision,
                 observed_status, observed_owner_wallet, block_number,
                 block_hash, transfer_log_index, safe_error_category,
                 first_seen_at, last_observed_at
          FROM mint_activity_observations
          WHERE deployment_key = ${query.deploymentKey}
            AND mint_observation_id < ${query.beforeObservationId.toString()}
          ORDER BY mint_observation_id DESC
          LIMIT ${query.limit}
        `
      : await this.sql<ActivityRow[]>`
          SELECT mint_observation_id, deployment_key, transaction_hash,
                 token_id, sender_wallet, expected_publication_revision,
                 observed_status, observed_owner_wallet, block_number,
                 block_hash, transfer_log_index, safe_error_category,
                 first_seen_at, last_observed_at
          FROM mint_activity_observations
          WHERE deployment_key = ${query.deploymentKey}
          ORDER BY mint_observation_id DESC
          LIMIT ${query.limit}
        `;
    return rows.map(fromRow);
  }

  async upsert(evidence: MintActivityEvidence) {
    validateEvidence(evidence);
    const normalized = {
      ...evidence,
      observedOwnerWallet: evidence.observedOwnerWallet
        ? normalizeAddress(evidence.observedOwnerWallet)
        : null,
      senderWallet: normalizeAddress(evidence.senderWallet),
    };
    return this.sql.begin(async (transaction) => {
      await transaction`
        SELECT pg_advisory_xact_lock(
          hashtextextended(${`${normalized.deploymentKey}:${normalized.transactionHash}`}, 0)
        )
      `;
      const existingRows = await transaction<ActivityRow[]>`
        SELECT mint_observation_id, deployment_key, transaction_hash,
               token_id, sender_wallet, expected_publication_revision,
               observed_status, observed_owner_wallet, block_number,
               block_hash, transfer_log_index, safe_error_category,
               first_seen_at, last_observed_at
        FROM mint_activity_observations
        WHERE deployment_key = ${normalized.deploymentKey}
          AND transaction_hash = ${normalized.transactionHash}
        FOR UPDATE
      `;
      const existing = existingRows[0];
      if (existing && !sameIdentity(existing, normalized))
        return { status: "conflict" } as const;
      const rows = existing
        ? await transaction<ActivityRow[]>`
            UPDATE mint_activity_observations
            SET observed_status = ${normalized.status},
                observed_owner_wallet = ${normalized.observedOwnerWallet},
                block_number = ${normalized.blockNumber?.toString() ?? null},
                block_hash = ${normalized.blockHash},
                transfer_log_index = ${normalized.transferLogIndex},
                safe_error_category = ${normalized.safeErrorCategory},
                last_observed_at = now()
            WHERE mint_observation_id = ${existing.mint_observation_id}
            RETURNING mint_observation_id, deployment_key, transaction_hash,
                      token_id, sender_wallet,
                      expected_publication_revision, observed_status,
                      observed_owner_wallet, block_number, block_hash,
                      transfer_log_index, safe_error_category, first_seen_at,
                      last_observed_at
          `
        : await transaction<ActivityRow[]>`
            INSERT INTO mint_activity_observations (
              deployment_key, transaction_hash, token_id, sender_wallet,
              expected_publication_revision, observed_status,
              observed_owner_wallet, block_number, block_hash,
              transfer_log_index, safe_error_category
            ) VALUES (
              ${normalized.deploymentKey}, ${normalized.transactionHash},
              ${normalized.tokenId}, ${normalized.senderWallet},
              ${normalized.expectedPublicationRevision.toString()},
              ${normalized.status}, ${normalized.observedOwnerWallet},
              ${normalized.blockNumber?.toString() ?? null},
              ${normalized.blockHash}, ${normalized.transferLogIndex},
              ${normalized.safeErrorCategory}
            )
            RETURNING mint_observation_id, deployment_key, transaction_hash,
                      token_id, sender_wallet,
                      expected_publication_revision, observed_status,
                      observed_owner_wallet, block_number, block_hash,
                      transfer_log_index, safe_error_category, first_seen_at,
                      last_observed_at
          `;
      const row = rows[0];
      if (!row) throw new Error("Mint activity write returned no record");
      return { record: fromRow(row), status: "recorded" } as const;
    });
  }
}
