ALTER TABLE asset_packages
  ADD COLUMN checkpoint_version integer NOT NULL DEFAULT 0
    CHECK (checkpoint_version >= 0);

COMMENT ON COLUMN asset_packages.checkpoint_version IS
  'Optimistic concurrency version preventing stale asset retries from overwriting newer checkpoints.';
