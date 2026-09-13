import type { Sql } from "postgres";

import type {
  AssetPackage,
  AssetPackageStatus,
  AssetPackageStore,
  AssetPipelineErrorCode,
} from "./asset-pipeline";
import type { ContentLifecycle } from "./admin-content-store";

type AssetPackageRow = {
  artwork_backup_ref: string | null;
  artwork_ipfs_uri: string | null;
  artwork_sha256: string | null;
  checkpoint_version: number;
  content_id: string;
  content_revision: number;
  metadata_backup_ref: string | null;
  metadata_ipfs_uri: string | null;
  metadata_sha256: string | null;
  safe_error_code: string | null;
  status: string;
  token_id: number;
};

type ContentBindingRow = {
  lifecycle_state: ContentLifecycle;
  token_id: number;
};

const statuses = new Set<AssetPackageStatus>([
  "PENDING",
  "ARTWORK_STORED",
  "BACKUP_STORED",
  "METADATA_STORED",
  "COMPLETE",
  "ERROR",
]);
const errorCodes = new Set<AssetPipelineErrorCode>([
  "ARTWORK_BACKUP_FAILED",
  "ARTWORK_IPFS_FAILED",
  "CHAIN_STATE_UNAVAILABLE",
  "INCOMPLETE_CONTENT",
  "INVALID_CANONICAL_ARTWORK",
  "INVALID_CONTENT_BINDING",
  "INVALID_PROVIDER_RESULT",
  "METADATA_BACKUP_FAILED",
  "METADATA_BUILD_FAILED",
  "METADATA_INTEGRITY_MISMATCH",
  "METADATA_IPFS_FAILED",
  "TOKEN_ALREADY_MINTED",
]);
const ipfsPattern = /^ipfs:\/\/[A-Za-z0-9][^\s]*$/;
const sha256Pattern = /^[0-9a-f]{64}$/;
const statusRank: Record<Exclude<AssetPackageStatus, "ERROR">, number> = {
  PENDING: 0,
  ARTWORK_STORED: 1,
  BACKUP_STORED: 2,
  METADATA_STORED: 3,
  COMPLETE: 4,
};

function invalidCheckpoint(): never {
  throw new Error("Invalid asset package checkpoint");
}

function fromRow(row: AssetPackageRow): AssetPackage {
  if (!statuses.has(row.status as AssetPackageStatus)) invalidCheckpoint();
  if (
    row.safe_error_code !== null &&
    !errorCodes.has(row.safe_error_code as AssetPipelineErrorCode)
  )
    invalidCheckpoint();
  const assetPackage: AssetPackage = {
    artworkBackupRef: row.artwork_backup_ref,
    artworkIpfsUri: row.artwork_ipfs_uri as `ipfs://${string}` | null,
    artworkSha256: row.artwork_sha256,
    checkpointVersion: Number(row.checkpoint_version),
    contentId: String(row.content_id),
    contentRevision: Number(row.content_revision),
    metadataBackupRef: row.metadata_backup_ref,
    metadataIpfsUri: row.metadata_ipfs_uri as `ipfs://${string}` | null,
    metadataSha256: row.metadata_sha256,
    safeErrorCode: row.safe_error_code as AssetPipelineErrorCode | null,
    status: row.status as AssetPackageStatus,
    tokenId: Number(row.token_id),
  };
  validateCheckpoint(assetPackage);
  return assetPackage;
}

function validateReference(reference: string | null) {
  return reference === null || reference.trim().length > 0;
}

function validateCheckpoint(assetPackage: AssetPackage) {
  if (
    !/^\d+$/u.test(assetPackage.contentId) ||
    !Number.isSafeInteger(assetPackage.contentRevision) ||
    assetPackage.contentRevision < 1 ||
    !Number.isSafeInteger(assetPackage.tokenId) ||
    assetPackage.tokenId < 1 ||
    assetPackage.tokenId > 10 ||
    !Number.isSafeInteger(assetPackage.checkpointVersion) ||
    assetPackage.checkpointVersion < 0 ||
    (assetPackage.artworkIpfsUri !== null &&
      !ipfsPattern.test(assetPackage.artworkIpfsUri)) ||
    (assetPackage.metadataIpfsUri !== null &&
      !ipfsPattern.test(assetPackage.metadataIpfsUri)) ||
    (assetPackage.artworkSha256 !== null &&
      !sha256Pattern.test(assetPackage.artworkSha256)) ||
    (assetPackage.metadataSha256 !== null &&
      !sha256Pattern.test(assetPackage.metadataSha256)) ||
    !validateReference(assetPackage.artworkBackupRef) ||
    !validateReference(assetPackage.metadataBackupRef) ||
    (assetPackage.status === "ERROR") !== (assetPackage.safeErrorCode !== null)
  )
    invalidCheckpoint();

  const hasArtwork =
    assetPackage.artworkIpfsUri !== null && assetPackage.artworkSha256 !== null;
  const hasArtworkBackup = assetPackage.artworkBackupRef !== null;
  const hasMetadata =
    assetPackage.metadataIpfsUri !== null &&
    assetPackage.metadataSha256 !== null;
  if (
    (assetPackage.status === "ARTWORK_STORED" && !hasArtwork) ||
    (assetPackage.status === "BACKUP_STORED" &&
      (!hasArtwork || !hasArtworkBackup)) ||
    (assetPackage.status === "METADATA_STORED" &&
      (!hasArtwork || !hasArtworkBackup || !hasMetadata)) ||
    (assetPackage.status === "COMPLETE" &&
      (!hasArtwork ||
        !hasArtworkBackup ||
        !hasMetadata ||
        assetPackage.metadataBackupRef === null))
  )
    invalidCheckpoint();
}

function assertTransition(current: AssetPackage, next: AssetPackage) {
  validateCheckpoint(next);
  if (
    current.contentId !== next.contentId ||
    current.contentRevision !== next.contentRevision ||
    current.tokenId !== next.tokenId ||
    current.checkpointVersion !== next.checkpointVersion
  )
    throw new Error("Asset package checkpoint conflict");
  for (const key of [
    "artworkBackupRef",
    "artworkIpfsUri",
    "artworkSha256",
    "metadataBackupRef",
    "metadataIpfsUri",
    "metadataSha256",
  ] as const) {
    if (current[key] !== null && current[key] !== next[key])
      throw new Error("Asset package checkpoint conflict");
  }
  if (current.status === "COMPLETE" && next.status !== "COMPLETE")
    throw new Error("Asset package checkpoint conflict");
  if (
    current.status !== "ERROR" &&
    next.status !== "ERROR" &&
    statusRank[next.status] < statusRank[current.status]
  )
    throw new Error("Asset package checkpoint conflict");
}

function processableLifecycle(status: AssetPackageStatus) {
  return status === "COMPLETE"
    ? new Set<ContentLifecycle>(["READY", "PUBLISHED", "MINTED_LOCKED"])
    : new Set<ContentLifecycle>(["DRAFT", "ERROR", "PROCESSING_ASSETS"]);
}

export class PostgresAssetPackageStore implements AssetPackageStore {
  constructor(private readonly sql: Sql) {}

  async loadOrCreate(input: {
    contentId: string;
    contentRevision: number;
    tokenId: number;
  }) {
    return this.sql.begin(async (transaction) => {
      const contentRows = await transaction<ContentBindingRow[]>`
        SELECT token_id, lifecycle_state
        FROM nft_contents
        WHERE content_id = ${input.contentId}
          AND revision = ${input.contentRevision}
          AND token_id = ${input.tokenId}
          AND is_current
        FOR UPDATE
      `;
      const content = contentRows[0];
      if (!content)
        throw new Error("Asset package content binding is unavailable");

      await transaction`
        INSERT INTO asset_packages (content_id, content_revision)
        VALUES (${input.contentId}, ${input.contentRevision})
        ON CONFLICT (content_id, content_revision) DO NOTHING
      `;
      const rows = await transaction<AssetPackageRow[]>`
        SELECT ap.content_id, ap.content_revision, ap.status,
               ap.artwork_ipfs_uri, ap.artwork_backup_ref,
               ap.metadata_ipfs_uri, ap.metadata_backup_ref,
               ap.artwork_sha256, ap.metadata_sha256,
               ap.safe_error_code, ap.checkpoint_version, c.token_id
        FROM asset_packages ap
        JOIN nft_contents c
          ON c.content_id = ap.content_id
         AND c.revision = ap.content_revision
        WHERE ap.content_id = ${input.contentId}
          AND ap.content_revision = ${input.contentRevision}
          AND c.token_id = ${input.tokenId}
          AND c.is_current
        LIMIT 1
      `;
      const row = rows[0];
      if (!row) throw new Error("Asset package content binding is unavailable");
      const assetPackage = fromRow(row);
      if (
        !processableLifecycle(assetPackage.status).has(content.lifecycle_state)
      )
        throw new Error("Asset package content is not processable");
      if (assetPackage.status !== "COMPLETE")
        await transaction`
          UPDATE nft_contents
          SET lifecycle_state = 'PROCESSING_ASSETS', updated_at = now()
          WHERE content_id = ${input.contentId}
            AND revision = ${input.contentRevision}
            AND is_current
        `;
      return assetPackage;
    });
  }

  async save(assetPackage: AssetPackage) {
    validateCheckpoint(assetPackage);
    return this.sql.begin(async (transaction) => {
      const rows = await transaction<AssetPackageRow[]>`
        SELECT ap.content_id, ap.content_revision, ap.status,
               ap.artwork_ipfs_uri, ap.artwork_backup_ref,
               ap.metadata_ipfs_uri, ap.metadata_backup_ref,
               ap.artwork_sha256, ap.metadata_sha256,
               ap.safe_error_code, ap.checkpoint_version, c.token_id
        FROM asset_packages ap
        JOIN nft_contents c
          ON c.content_id = ap.content_id
         AND c.revision = ap.content_revision
        WHERE ap.content_id = ${assetPackage.contentId}
          AND ap.content_revision = ${assetPackage.contentRevision}
          AND c.token_id = ${assetPackage.tokenId}
          AND c.is_current
        FOR UPDATE OF ap, c
      `;
      const row = rows[0];
      if (!row) throw new Error("Asset package content binding is unavailable");
      assertTransition(fromRow(row), assetPackage);

      const updatedRows = await transaction<AssetPackageRow[]>`
        UPDATE asset_packages
        SET status = ${assetPackage.status},
            artwork_ipfs_uri = ${assetPackage.artworkIpfsUri},
            artwork_backup_ref = ${assetPackage.artworkBackupRef},
            metadata_ipfs_uri = ${assetPackage.metadataIpfsUri},
            metadata_backup_ref = ${assetPackage.metadataBackupRef},
            artwork_sha256 = ${assetPackage.artworkSha256},
            metadata_sha256 = ${assetPackage.metadataSha256},
            safe_error_code = ${assetPackage.safeErrorCode},
            checkpoint_version = checkpoint_version + 1,
            completed_at = CASE
              WHEN ${assetPackage.status} = 'COMPLETE'
                THEN COALESCE(completed_at, now())
              ELSE completed_at
            END,
            updated_at = now()
        WHERE content_id = ${assetPackage.contentId}
          AND content_revision = ${assetPackage.contentRevision}
          AND checkpoint_version = ${assetPackage.checkpointVersion}
        RETURNING content_id, content_revision, status, artwork_ipfs_uri,
                  artwork_backup_ref, metadata_ipfs_uri, metadata_backup_ref,
                  artwork_sha256, metadata_sha256, safe_error_code,
                  checkpoint_version, ${assetPackage.tokenId}::smallint AS token_id
      `;
      const updatedRow = updatedRows[0];
      if (!updatedRow) throw new Error("Asset package checkpoint conflict");
      const saved = fromRow(updatedRow);
      const lifecycle: ContentLifecycle =
        saved.status === "COMPLETE"
          ? "READY"
          : saved.safeErrorCode === "TOKEN_ALREADY_MINTED"
            ? "MINTED_LOCKED"
            : saved.status === "ERROR"
              ? "ERROR"
              : "PROCESSING_ASSETS";
      await transaction`
        UPDATE nft_contents
        SET lifecycle_state = CASE
              WHEN lifecycle_state IN ('PUBLISHED', 'MINTED_LOCKED')
                THEN lifecycle_state
              ELSE ${lifecycle}
            END,
            updated_at = now()
        WHERE content_id = ${assetPackage.contentId}
          AND revision = ${assetPackage.contentRevision}
          AND token_id = ${assetPackage.tokenId}
          AND is_current
      `;
      return saved;
    });
  }
}
