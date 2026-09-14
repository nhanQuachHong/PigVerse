import { isAddress } from "viem";
import type { Sql } from "postgres";

import type { ContentLifecycle } from "./admin-content-store";
import type {
  PublicationInclusion,
  PublicationInclusionStore,
  PublicationInclusionStoreResult,
} from "./publication-inclusion";

type InclusionRow = {
  action: "PUBLISH" | "UNPUBLISH";
  actor_wallet: string;
  block_hash: string;
  block_number: string;
  content_id: string;
  content_revision: number;
  deployment_key: string;
  expected_publication_revision: string;
  metadata_ipfs_uri: string | null;
  observed_publication_revision: string;
  observed_token_state: "MINTED" | "UNMINTED";
  resulting_lifecycle: "READY" | "PUBLISHED" | "MINTED_LOCKED";
  token_id: number;
  transaction_hash: string;
};

type CandidateRow = {
  asset_status: string;
  content_id: string;
  content_revision: number;
  lifecycle_state: ContentLifecycle;
  metadata_ipfs_uri: string | null;
};

const maxUint256 = (1n << 256n) - 1n;

function invalidInclusion(): never {
  throw new Error("Invalid publication inclusion");
}

function validateInclusion(inclusion: PublicationInclusion) {
  if (
    !/^0x[0-9a-f]{64}$/u.test(inclusion.transactionHash) ||
    !/^0x[0-9a-f]{64}$/u.test(inclusion.blockHash) ||
    !isAddress(inclusion.actorWallet) ||
    /^0x0{40}$/iu.test(inclusion.actorWallet) ||
    !Number.isInteger(inclusion.tokenId) ||
    inclusion.tokenId < 1 ||
    inclusion.tokenId > 10 ||
    inclusion.blockNumber < 0n ||
    inclusion.expectedPublicationRevision < 0n ||
    inclusion.expectedPublicationRevision >= maxUint256 ||
    inclusion.observedPublicationRevision !==
      inclusion.expectedPublicationRevision + 1n ||
    inclusion.observedPublicationRevision > maxUint256 ||
    !/^[a-zA-Z0-9:_-]{8,160}$/u.test(inclusion.deploymentKey) ||
    !/^[a-zA-Z0-9_-]{8,128}$/u.test(inclusion.correlationId) ||
    (inclusion.action === "publish" &&
      (!inclusion.metadataIpfsUri ||
        !/^ipfs:\/\/[A-Za-z0-9][^\s]*$/u.test(inclusion.metadataIpfsUri))) ||
    (inclusion.action === "unpublish" &&
      (inclusion.metadataIpfsUri !== null ||
        inclusion.observedTokenState !== "unminted"))
  )
    invalidInclusion();
}

function sameInclusion(row: InclusionRow, inclusion: PublicationInclusion) {
  return (
    row.transaction_hash === inclusion.transactionHash &&
    row.deployment_key === inclusion.deploymentKey &&
    row.token_id === inclusion.tokenId &&
    row.action === inclusion.action.toUpperCase() &&
    row.actor_wallet.toLowerCase() === inclusion.actorWallet.toLowerCase() &&
    BigInt(row.expected_publication_revision) ===
      inclusion.expectedPublicationRevision &&
    BigInt(row.observed_publication_revision) ===
      inclusion.observedPublicationRevision &&
    row.observed_token_state === inclusion.observedTokenState.toUpperCase() &&
    row.metadata_ipfs_uri === inclusion.metadataIpfsUri &&
    BigInt(row.block_number) === inclusion.blockNumber &&
    row.block_hash === inclusion.blockHash
  );
}

function duplicateResult(row: InclusionRow): PublicationInclusionStoreResult {
  return {
    contentId: String(row.content_id),
    contentRevision: Number(row.content_revision),
    lifecycleState: row.resulting_lifecycle,
    status: "duplicate",
  };
}

export class PostgresPublicationInclusionStore implements PublicationInclusionStore {
  constructor(private readonly sql: Sql) {}

  async recordInclusion(inclusion: PublicationInclusion) {
    validateInclusion(inclusion);
    return this.sql.begin(async (transaction) => {
      await transaction`
        SELECT pg_advisory_xact_lock(hashtextextended(${inclusion.transactionHash}, 0))
      `;
      const existingRows = await transaction<InclusionRow[]>`
        SELECT transaction_hash, deployment_key, content_id,
               content_revision, token_id, action, actor_wallet,
               expected_publication_revision, observed_publication_revision,
               observed_token_state, metadata_ipfs_uri, block_number,
               block_hash, resulting_lifecycle
        FROM publication_inclusions
        WHERE transaction_hash = ${inclusion.transactionHash}
        LIMIT 1
      `;
      const existing = existingRows[0];
      if (existing)
        return sameInclusion(existing, inclusion)
          ? duplicateResult(existing)
          : ({ status: "conflict" } as const);

      const candidateRows = await transaction<CandidateRow[]>`
        SELECT c.content_id, c.revision AS content_revision,
               c.lifecycle_state, ap.status AS asset_status,
               ap.metadata_ipfs_uri
        FROM nft_contents c
        JOIN asset_packages ap
          ON ap.content_id = c.content_id
         AND ap.content_revision = c.revision
        WHERE c.deployment_key = ${inclusion.deploymentKey}
          AND c.token_id = ${inclusion.tokenId}
          AND c.is_current
        FOR UPDATE OF c, ap
      `;
      const candidate = candidateRows[0];
      const publishLifecycleValid =
        inclusion.action === "publish" &&
        (inclusion.observedTokenState === "minted"
          ? candidate?.lifecycle_state === "READY" ||
            candidate?.lifecycle_state === "PUBLISHED" ||
            candidate?.lifecycle_state === "MINTED_LOCKED"
          : candidate?.lifecycle_state === "READY");
      const unpublishLifecycleValid =
        inclusion.action === "unpublish" &&
        candidate?.lifecycle_state === "PUBLISHED";
      if (
        !candidate ||
        candidate.asset_status !== "COMPLETE" ||
        !candidate.metadata_ipfs_uri ||
        (inclusion.action === "publish" &&
          candidate.metadata_ipfs_uri !== inclusion.metadataIpfsUri) ||
        (!publishLifecycleValid && !unpublishLifecycleValid)
      )
        return { status: "conflict" } as const;

      const lifecycle: "READY" | "PUBLISHED" | "MINTED_LOCKED" =
        inclusion.observedTokenState === "minted"
          ? "MINTED_LOCKED"
          : inclusion.action === "publish"
            ? "PUBLISHED"
            : "READY";
      const insertedRows = await transaction<
        Array<{ transaction_hash: string }>
      >`
        INSERT INTO publication_inclusions (
          transaction_hash, deployment_key, content_id, content_revision,
          token_id, action, actor_wallet, expected_publication_revision,
          observed_publication_revision, observed_token_state,
          metadata_ipfs_uri, block_number, block_hash, resulting_lifecycle,
          correlation_id
        ) VALUES (
          ${inclusion.transactionHash}, ${inclusion.deploymentKey},
          ${candidate.content_id}, ${candidate.content_revision},
          ${inclusion.tokenId}, ${inclusion.action.toUpperCase()},
          ${inclusion.actorWallet},
          ${inclusion.expectedPublicationRevision.toString()},
          ${inclusion.observedPublicationRevision.toString()},
          ${inclusion.observedTokenState.toUpperCase()},
          ${inclusion.metadataIpfsUri}, ${inclusion.blockNumber.toString()},
          ${inclusion.blockHash}, ${lifecycle}, ${inclusion.correlationId}
        )
        ON CONFLICT DO NOTHING
        RETURNING transaction_hash
      `;
      if (!insertedRows[0]) return { status: "conflict" } as const;

      await transaction`
        UPDATE nft_contents
        SET lifecycle_state = ${lifecycle}, updated_at = now()
        WHERE content_id = ${candidate.content_id}
          AND revision = ${candidate.content_revision}
          AND is_current
      `;
      await transaction`
        INSERT INTO audit_events (
          deployment_key, actor_wallet, action, target_type, target_id,
          token_id, correlation_id, safe_context
        ) VALUES (
          ${inclusion.deploymentKey}, ${inclusion.actorWallet},
          ${inclusion.action === "publish" ? "NFT_PUBLISHED" : "NFT_UNPUBLISHED"},
          'NFT_CONTENT', ${String(candidate.content_id)},
          ${inclusion.tokenId}, ${inclusion.correlationId},
          ${transaction.json({
            blockHash: inclusion.blockHash,
            blockNumber: inclusion.blockNumber.toString(),
            finality: "included",
            observedPublicationRevision:
              inclusion.observedPublicationRevision.toString(),
            transactionHash: inclusion.transactionHash,
          })}
        )
      `;
      return {
        contentId: String(candidate.content_id),
        contentRevision: Number(candidate.content_revision),
        lifecycleState: lifecycle,
        status: "applied",
      } as const;
    });
  }
}
