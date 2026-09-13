ALTER TABLE asset_packages
  ADD COLUMN artwork_sha256 char(64)
    CHECK (artwork_sha256 ~ '^[0-9a-f]{64}$'),
  ADD COLUMN metadata_sha256 char(64)
    CHECK (metadata_sha256 ~ '^[0-9a-f]{64}$');

ALTER TABLE asset_packages
  ADD CONSTRAINT asset_packages_complete_hashes
  CHECK (
    status <> 'COMPLETE' OR (
      artwork_sha256 IS NOT NULL AND metadata_sha256 IS NOT NULL
    )
  );

COMMENT ON COLUMN asset_packages.artwork_sha256 IS
  'Hash of the canonical artwork bytes used for both IPFS and backup storage.';

COMMENT ON COLUMN asset_packages.metadata_sha256 IS
  'Hash of deterministic metadata bytes used for both IPFS and backup storage.';
