import { createHash } from "node:crypto";

import type { LocalizedDraft, TokenMutationState } from "./admin-content-store";
import {
  getCanonicalArtwork,
  verifyCanonicalArtwork,
} from "./canonical-artwork";
import { logAssetPipelineFailure } from "./operational-log";

export type AssetPackageStatus =
  | "PENDING"
  | "ARTWORK_STORED"
  | "BACKUP_STORED"
  | "METADATA_STORED"
  | "COMPLETE"
  | "ERROR";

export type AssetPackage = {
  artworkBackupRef: string | null;
  artworkIpfsUri: `ipfs://${string}` | null;
  artworkSha256: string | null;
  checkpointVersion: number;
  contentId: string;
  contentRevision: number;
  metadataBackupRef: string | null;
  metadataIpfsUri: `ipfs://${string}` | null;
  metadataSha256: string | null;
  safeErrorCode: AssetPipelineErrorCode | null;
  status: AssetPackageStatus;
  tokenId: number;
};

export type AssetPipelineErrorCode =
  | "ARTWORK_BACKUP_FAILED"
  | "ARTWORK_IPFS_FAILED"
  | "CHAIN_STATE_UNAVAILABLE"
  | "INCOMPLETE_CONTENT"
  | "INVALID_CANONICAL_ARTWORK"
  | "INVALID_CONTENT_BINDING"
  | "INVALID_PROVIDER_RESULT"
  | "METADATA_BACKUP_FAILED"
  | "METADATA_BUILD_FAILED"
  | "METADATA_INTEGRITY_MISMATCH"
  | "METADATA_IPFS_FAILED"
  | "TOKEN_ALREADY_MINTED";

export interface AssetPackageStore {
  loadOrCreate(input: {
    contentId: string;
    contentRevision: number;
    tokenId: number;
  }): Promise<AssetPackage>;
  save(assetPackage: AssetPackage): Promise<AssetPackage>;
}

export interface ContentAddressedStorage {
  put(input: {
    bytes: Uint8Array;
    contentType: string;
    idempotencyKey: string;
    name: string;
  }): Promise<{ uri: string }>;
}

export interface BackupStorage {
  put(input: {
    bytes: Uint8Array;
    contentType: string;
    idempotencyKey: string;
    name: string;
  }): Promise<{ reference: string }>;
}

export type AssetPipelineDependencies = {
  backup: BackupStorage;
  buildMetadata: (
    content: LocalizedDraft,
    artworkUri: `ipfs://${string}`,
  ) => Promise<Uint8Array>;
  ipfs: ContentAddressedStorage;
  readTokenState: () => Promise<TokenMutationState>;
  store: AssetPackageStore;
};

export type AssetPipelineInput = {
  artworkBytes: Uint8Array;
  content: LocalizedDraft;
  contentId: string;
  contentRevision: number;
  tokenId: number;
};

export type AssetPipelineResult =
  | { assetPackage: AssetPackage; status: "complete" }
  | {
      assetPackage: AssetPackage | null;
      errorCode: AssetPipelineErrorCode;
      status: "error";
    };

const ipfsPattern = /^ipfs:\/\/[A-Za-z0-9][^\s]*$/;

function contentIsComplete(content: LocalizedDraft) {
  return Object.values(content).every(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
}

function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function isUint8Array(value: unknown): value is Uint8Array {
  return Object.prototype.toString.call(value) === "[object Uint8Array]";
}

function errorResult(
  errorCode: AssetPipelineErrorCode,
  assetPackage: AssetPackage | null,
): AssetPipelineResult {
  return { assetPackage, errorCode, status: "error" };
}

async function recordError(
  assetPackage: AssetPackage,
  errorCode: AssetPipelineErrorCode,
  store: AssetPackageStore,
) {
  assetPackage.safeErrorCode = errorCode;
  assetPackage.status = "ERROR";
  const saved = await store.save(assetPackage);
  return errorResult(errorCode, saved);
}

async function safeTokenState(
  readTokenState: () => Promise<TokenMutationState>,
) {
  try {
    return await readTokenState();
  } catch {
    return "unavailable" as const;
  }
}

async function processAssetPackageCore(
  input: AssetPipelineInput,
  dependencies: AssetPipelineDependencies,
): Promise<AssetPipelineResult> {
  if (!contentIsComplete(input.content))
    return errorResult("INCOMPLETE_CONTENT", null);
  if (!verifyCanonicalArtwork(input.tokenId, input.artworkBytes))
    return errorResult("INVALID_CANONICAL_ARTWORK", null);
  const canonicalArtwork = getCanonicalArtwork(input.tokenId);
  if (!canonicalArtwork) return errorResult("INVALID_CANONICAL_ARTWORK", null);
  const initialChainState = await safeTokenState(dependencies.readTokenState);
  if (initialChainState === "minted")
    return errorResult("TOKEN_ALREADY_MINTED", null);
  if (initialChainState !== "unminted")
    return errorResult("CHAIN_STATE_UNAVAILABLE", null);

  let assetPackage = await dependencies.store.loadOrCreate({
    contentId: input.contentId,
    contentRevision: input.contentRevision,
    tokenId: input.tokenId,
  });
  if (
    assetPackage.contentId !== input.contentId ||
    assetPackage.contentRevision !== input.contentRevision ||
    assetPackage.tokenId !== input.tokenId
  )
    return recordError(
      assetPackage,
      "INVALID_CONTENT_BINDING",
      dependencies.store,
    );
  if (assetPackage.status === "COMPLETE")
    return { assetPackage, status: "complete" };
  assetPackage.safeErrorCode = null;
  if (
    assetPackage.artworkSha256 &&
    assetPackage.artworkSha256 !== canonicalArtwork.sha256
  )
    return recordError(
      assetPackage,
      "INVALID_CANONICAL_ARTWORK",
      dependencies.store,
    );
  assetPackage.artworkSha256 = canonicalArtwork.sha256;
  const prefix = `genesis-${input.tokenId}-r${input.contentRevision}`;

  if (!assetPackage.artworkIpfsUri) {
    let uploaded: { uri: string };
    try {
      uploaded = await dependencies.ipfs.put({
        bytes: input.artworkBytes,
        contentType: "image/png",
        idempotencyKey: `${prefix}-artwork-ipfs`,
        name: canonicalArtwork.filename,
      });
    } catch {
      return recordError(
        assetPackage,
        "ARTWORK_IPFS_FAILED",
        dependencies.store,
      );
    }
    if (!ipfsPattern.test(uploaded.uri))
      return recordError(
        assetPackage,
        "INVALID_PROVIDER_RESULT",
        dependencies.store,
      );
    assetPackage.artworkIpfsUri = uploaded.uri as `ipfs://${string}`;
    assetPackage.status = "ARTWORK_STORED";
    assetPackage = await dependencies.store.save(assetPackage);
  }

  if (!assetPackage.artworkBackupRef) {
    let stored: { reference: string };
    try {
      stored = await dependencies.backup.put({
        bytes: input.artworkBytes,
        contentType: "image/png",
        idempotencyKey: `${prefix}-artwork-backup`,
        name: canonicalArtwork.filename,
      });
    } catch {
      return recordError(
        assetPackage,
        "ARTWORK_BACKUP_FAILED",
        dependencies.store,
      );
    }
    if (!stored.reference.trim())
      return recordError(
        assetPackage,
        "INVALID_PROVIDER_RESULT",
        dependencies.store,
      );
    assetPackage.artworkBackupRef = stored.reference;
    assetPackage.status = "BACKUP_STORED";
    assetPackage = await dependencies.store.save(assetPackage);
  }

  const artworkIpfsUri = assetPackage.artworkIpfsUri;
  if (!artworkIpfsUri)
    throw new Error("Asset package checkpoint was not persisted");

  let metadataBytes: Uint8Array;
  try {
    metadataBytes = await dependencies.buildMetadata(
      input.content,
      artworkIpfsUri,
    );
    if (!isUint8Array(metadataBytes) || metadataBytes.length === 0)
      return recordError(
        assetPackage,
        "METADATA_BUILD_FAILED",
        dependencies.store,
      );
  } catch {
    return recordError(
      assetPackage,
      "METADATA_BUILD_FAILED",
      dependencies.store,
    );
  }
  const metadataSha256 = sha256(metadataBytes);
  if (
    assetPackage.metadataSha256 &&
    assetPackage.metadataSha256 !== metadataSha256
  )
    return recordError(
      assetPackage,
      "METADATA_INTEGRITY_MISMATCH",
      dependencies.store,
    );
  assetPackage.metadataSha256 = metadataSha256;

  if (!assetPackage.metadataIpfsUri) {
    let uploaded: { uri: string };
    try {
      uploaded = await dependencies.ipfs.put({
        bytes: metadataBytes,
        contentType: "application/json",
        idempotencyKey: `${prefix}-metadata-ipfs`,
        name: `${prefix}.json`,
      });
    } catch {
      return recordError(
        assetPackage,
        "METADATA_IPFS_FAILED",
        dependencies.store,
      );
    }
    if (!ipfsPattern.test(uploaded.uri))
      return recordError(
        assetPackage,
        "INVALID_PROVIDER_RESULT",
        dependencies.store,
      );
    assetPackage.metadataIpfsUri = uploaded.uri as `ipfs://${string}`;
    assetPackage.status = "METADATA_STORED";
    assetPackage = await dependencies.store.save(assetPackage);
  }

  if (!assetPackage.metadataBackupRef) {
    let stored: { reference: string };
    try {
      stored = await dependencies.backup.put({
        bytes: metadataBytes,
        contentType: "application/json",
        idempotencyKey: `${prefix}-metadata-backup`,
        name: `${prefix}.json`,
      });
    } catch {
      return recordError(
        assetPackage,
        "METADATA_BACKUP_FAILED",
        dependencies.store,
      );
    }
    if (!stored.reference.trim())
      return recordError(
        assetPackage,
        "INVALID_PROVIDER_RESULT",
        dependencies.store,
      );
    assetPackage.metadataBackupRef = stored.reference;
    assetPackage = await dependencies.store.save(assetPackage);
  }

  const finalChainState = await safeTokenState(dependencies.readTokenState);
  if (finalChainState === "minted")
    return recordError(
      assetPackage,
      "TOKEN_ALREADY_MINTED",
      dependencies.store,
    );
  if (finalChainState !== "unminted")
    return recordError(
      assetPackage,
      "CHAIN_STATE_UNAVAILABLE",
      dependencies.store,
    );
  assetPackage.safeErrorCode = null;
  assetPackage.status = "COMPLETE";
  assetPackage = await dependencies.store.save(assetPackage);
  return { assetPackage, status: "complete" };
}

export async function processAssetPackage(
  input: AssetPipelineInput,
  dependencies: AssetPipelineDependencies,
  observability: {
    correlationId: string;
    logFailure?: typeof logAssetPipelineFailure;
  },
): Promise<AssetPipelineResult> {
  const reportFailure = (
    errorCode: Parameters<typeof logAssetPipelineFailure>[0]["errorCode"],
  ) => {
    try {
      (observability.logFailure ?? logAssetPipelineFailure)({
        correlationId: observability.correlationId,
        errorCode,
      });
    } catch {
      // Observability must not change or mask the pipeline outcome.
    }
  };
  try {
    const result = await processAssetPackageCore(input, dependencies);
    if (result.status === "error") reportFailure(result.errorCode);
    return result;
  } catch (error) {
    reportFailure("UNEXPECTED_FAILURE");
    throw error;
  }
}

export class MemoryAssetPackageStore implements AssetPackageStore {
  readonly packages = new Map<string, AssetPackage>();
  readonly writes: AssetPackage[] = [];

  async loadOrCreate({
    contentId,
    contentRevision,
    tokenId,
  }: {
    contentId: string;
    contentRevision: number;
    tokenId: number;
  }) {
    const key = `${contentId}:${contentRevision}`;
    const existing = this.packages.get(key);
    if (existing) return structuredClone(existing);
    const created: AssetPackage = {
      artworkBackupRef: null,
      artworkIpfsUri: null,
      artworkSha256: null,
      checkpointVersion: 0,
      contentId,
      contentRevision,
      metadataBackupRef: null,
      metadataIpfsUri: null,
      metadataSha256: null,
      safeErrorCode: null,
      status: "PENDING",
      tokenId,
    };
    this.packages.set(key, structuredClone(created));
    return created;
  }

  async save(assetPackage: AssetPackage) {
    const key = `${assetPackage.contentId}:${assetPackage.contentRevision}`;
    const current = this.packages.get(key);
    if (
      !current ||
      current.checkpointVersion !== assetPackage.checkpointVersion
    )
      throw new Error("Asset package checkpoint conflict");
    const copy = structuredClone({
      ...assetPackage,
      checkpointVersion: assetPackage.checkpointVersion + 1,
    });
    this.packages.set(key, copy);
    this.writes.push(copy);
    return structuredClone(copy);
  }
}
