CREATE TABLE mint_activity_observations (
  mint_observation_id bigserial PRIMARY KEY,
  deployment_key text NOT NULL
    REFERENCES collection_deployments(deployment_key) ON DELETE RESTRICT,
  transaction_hash char(66) NOT NULL
    CHECK (transaction_hash ~ '^0x[0-9a-f]{64}$'),
  token_id smallint NOT NULL CHECK (token_id BETWEEN 1 AND 10),
  sender_wallet varchar(42) NOT NULL
    CHECK (
      sender_wallet ~ '^0x[0-9a-fA-F]{40}$' AND
      lower(sender_wallet) <> '0x0000000000000000000000000000000000000000'
    ),
  expected_publication_revision numeric(78, 0) NOT NULL
    CHECK (expected_publication_revision >= 0),
  observed_status text NOT NULL
    CHECK (observed_status IN ('PENDING', 'SUCCEEDED', 'REVERTED', 'UNKNOWN')),
  observed_owner_wallet varchar(42)
    CHECK (
      observed_owner_wallet IS NULL OR
      (observed_owner_wallet ~ '^0x[0-9a-fA-F]{40}$' AND
       lower(observed_owner_wallet) <> '0x0000000000000000000000000000000000000000')
    ),
  block_number numeric(78, 0) CHECK (block_number >= 0),
  block_hash char(66) CHECK (
    block_hash IS NULL OR block_hash ~ '^0x[0-9a-f]{64}$'
  ),
  transfer_log_index integer CHECK (transfer_log_index >= 0),
  safe_error_category text CHECK (
    safe_error_category IS NULL OR
    safe_error_category ~ '^[A-Z][A-Z0-9_]{0,63}$'
  ),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_observed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deployment_key, transaction_hash),
  CHECK (
    (observed_status = 'SUCCEEDED' AND
      observed_owner_wallet IS NOT NULL AND
      block_number IS NOT NULL AND block_hash IS NOT NULL AND
      transfer_log_index IS NOT NULL AND safe_error_category IS NULL) OR
    (observed_status = 'REVERTED' AND
      observed_owner_wallet IS NULL AND
      block_number IS NOT NULL AND block_hash IS NOT NULL AND
      transfer_log_index IS NULL) OR
    (observed_status IN ('PENDING', 'UNKNOWN') AND
      observed_owner_wallet IS NULL AND
      block_number IS NULL AND block_hash IS NULL AND
      transfer_log_index IS NULL)
  )
);

CREATE UNIQUE INDEX mint_activity_transfer_event_idx
  ON mint_activity_observations (
    deployment_key, block_hash, transfer_log_index
  )
  WHERE observed_status = 'SUCCEEDED';

CREATE INDEX mint_activity_recent_idx
  ON mint_activity_observations (
    deployment_key, last_observed_at DESC, mint_observation_id DESC
  );

COMMENT ON TABLE mint_activity_observations IS
  'Rebuildable, idempotent mint-attempt observations for Admin operations. Current chain ownership remains authoritative; this table never overrides it.';
