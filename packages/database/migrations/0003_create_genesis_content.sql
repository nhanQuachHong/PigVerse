CREATE TABLE nft_contents (
  content_id bigserial PRIMARY KEY,
  deployment_key text NOT NULL REFERENCES collection_deployments(deployment_key) ON DELETE RESTRICT,
  token_id smallint NOT NULL CHECK (token_id BETWEEN 1 AND 10),
  revision integer NOT NULL CHECK (revision > 0),
  is_current boolean NOT NULL DEFAULT true,
  lifecycle_state text NOT NULL DEFAULT 'DRAFT'
    CHECK (lifecycle_state IN (
      'DRAFT', 'PROCESSING_ASSETS', 'ERROR', 'READY', 'PUBLISHED', 'MINTED_LOCKED'
    )),
  name_vi text NOT NULL DEFAULT '',
  name_en text NOT NULL DEFAULT '',
  description_vi text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  story_vi text NOT NULL DEFAULT '',
  story_en text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_id, revision),
  UNIQUE (deployment_key, token_id, revision)
);

CREATE UNIQUE INDEX nft_contents_current_slot_idx
  ON nft_contents (deployment_key, token_id)
  WHERE is_current;

CREATE TABLE asset_packages (
  asset_package_id bigserial PRIMARY KEY,
  content_id bigint NOT NULL,
  content_revision integer NOT NULL,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN (
      'PENDING', 'ARTWORK_STORED', 'BACKUP_STORED', 'METADATA_STORED',
      'COMPLETE', 'ERROR'
    )),
  artwork_ipfs_uri text,
  artwork_backup_ref text,
  metadata_ipfs_uri text,
  metadata_backup_ref text,
  safe_error_code text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (content_id, content_revision)
    REFERENCES nft_contents(content_id, revision) ON DELETE RESTRICT,
  UNIQUE (content_id, content_revision),
  CHECK (artwork_ipfs_uri IS NULL OR artwork_ipfs_uri ~ '^ipfs://[^[:space:]]+$'),
  CHECK (metadata_ipfs_uri IS NULL OR metadata_ipfs_uri ~ '^ipfs://[^[:space:]]+$'),
  CHECK (
    status <> 'COMPLETE' OR (
      artwork_ipfs_uri IS NOT NULL AND
      artwork_backup_ref IS NOT NULL AND artwork_backup_ref <> '' AND
      metadata_ipfs_uri IS NOT NULL AND
      metadata_backup_ref IS NOT NULL AND metadata_backup_ref <> '' AND
      completed_at IS NOT NULL
    )
  )
);

CREATE TABLE audit_events (
  audit_event_id bigserial PRIMARY KEY,
  deployment_key text NOT NULL REFERENCES collection_deployments(deployment_key) ON DELETE RESTRICT,
  actor_wallet varchar(42) NOT NULL CHECK (actor_wallet ~ '^0x[0-9a-fA-F]{40}$'),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  token_id smallint CHECK (token_id BETWEEN 1 AND 10),
  correlation_id text NOT NULL,
  safe_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_target_idx
  ON audit_events (deployment_key, target_type, target_id, created_at DESC);

CREATE INDEX audit_events_actor_idx
  ON audit_events (actor_wallet, created_at DESC);

CREATE INDEX audit_events_token_idx
  ON audit_events (deployment_key, token_id, created_at DESC)
  WHERE token_id IS NOT NULL;

COMMENT ON TABLE nft_contents IS
  'Immutable application-content revisions for fixed Genesis token IDs 1..10; one partial-indexed current revision per deployment/token and chain ownership remains authoritative.';

COMMENT ON TABLE asset_packages IS
  'Durable asset-processing outputs bound to one exact content version; COMPLETE requires all IPFS and backup references.';

COMMENT ON TABLE audit_events IS
  'Append-only product audit records. Application roles receive INSERT/SELECT only; retention remains an operator policy.';
