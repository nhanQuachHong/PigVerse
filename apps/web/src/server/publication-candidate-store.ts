import type { Sql } from "postgres";

import type {
  PublicationCandidate,
  PublicationCandidateStore,
} from "./admin-publication";
import type { ContentLifecycle } from "./admin-content-store";
import type { AssetPackageStatus } from "./asset-pipeline";

type CandidateRow = {
  asset_status: string | null;
  content_id: string;
  content_revision: number;
  lifecycle_state: string;
  metadata_ipfs_uri: string | null;
  token_id: number;
};

const assetStatuses = new Set<AssetPackageStatus>([
  "PENDING",
  "ARTWORK_STORED",
  "BACKUP_STORED",
  "METADATA_STORED",
  "COMPLETE",
  "ERROR",
]);
const contentLifecycles = new Set<ContentLifecycle>([
  "DRAFT",
  "PROCESSING_ASSETS",
  "ERROR",
  "READY",
  "PUBLISHED",
  "MINTED_LOCKED",
]);

function fromRow(row: CandidateRow): PublicationCandidate {
  if (
    !/^\d+$/u.test(String(row.content_id)) ||
    !Number.isSafeInteger(Number(row.content_revision)) ||
    Number(row.content_revision) < 1 ||
    !Number.isSafeInteger(Number(row.token_id)) ||
    Number(row.token_id) < 1 ||
    Number(row.token_id) > 10 ||
    !contentLifecycles.has(row.lifecycle_state as ContentLifecycle) ||
    (row.asset_status !== null &&
      !assetStatuses.has(row.asset_status as AssetPackageStatus)) ||
    (row.metadata_ipfs_uri !== null &&
      !/^ipfs:\/\/[A-Za-z0-9][^\s]*$/u.test(row.metadata_ipfs_uri))
  )
    throw new Error("Invalid publication candidate");
  return {
    assetStatus: row.asset_status as AssetPackageStatus | null,
    contentId: String(row.content_id),
    contentRevision: Number(row.content_revision),
    lifecycleState: row.lifecycle_state as ContentLifecycle,
    metadataIpfsUri: row.metadata_ipfs_uri as `ipfs://${string}` | null,
    tokenId: Number(row.token_id),
  };
}

export class PostgresPublicationCandidateStore implements PublicationCandidateStore {
  constructor(private readonly sql: Sql) {}

  async loadCurrent(deploymentKey: string, tokenId: number) {
    const rows = await this.sql<CandidateRow[]>`
      SELECT c.content_id, c.revision AS content_revision, c.token_id,
             c.lifecycle_state, ap.status AS asset_status,
             ap.metadata_ipfs_uri
      FROM nft_contents c
      LEFT JOIN asset_packages ap
        ON ap.content_id = c.content_id
       AND ap.content_revision = c.revision
      WHERE c.deployment_key = ${deploymentKey}
        AND c.token_id = ${tokenId}
        AND c.is_current
      LIMIT 1
    `;
    return rows[0] ? fromRow(rows[0]) : null;
  }
}
