CREATE TABLE publication_inclusions (
  transaction_hash char(66) PRIMARY KEY
    CHECK (transaction_hash ~ '^0x[0-9a-f]{64}$'),
  deployment_key text NOT NULL
    REFERENCES collection_deployments(deployment_key) ON DELETE RESTRICT,
  content_id bigint NOT NULL,
  content_revision integer NOT NULL,
  token_id smallint NOT NULL CHECK (token_id BETWEEN 1 AND 10),
  action text NOT NULL CHECK (action IN ('PUBLISH', 'UNPUBLISH')),
  actor_wallet varchar(42) NOT NULL
    CHECK (actor_wallet ~ '^0x[0-9a-fA-F]{40}$'),
  expected_publication_revision numeric(78, 0) NOT NULL
    CHECK (expected_publication_revision >= 0),
  observed_publication_revision numeric(78, 0) NOT NULL
    CHECK (observed_publication_revision = expected_publication_revision + 1),
  observed_token_state text NOT NULL
    CHECK (observed_token_state IN ('MINTED', 'UNMINTED')),
  metadata_ipfs_uri text,
  block_number numeric(78, 0) NOT NULL CHECK (block_number >= 0),
  block_hash char(66) NOT NULL CHECK (block_hash ~ '^0x[0-9a-f]{64}$'),
  resulting_lifecycle text NOT NULL
    CHECK (resulting_lifecycle IN ('READY', 'PUBLISHED', 'MINTED_LOCKED')),
  correlation_id text NOT NULL,
  observed_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (content_id, content_revision)
    REFERENCES nft_contents(content_id, revision) ON DELETE RESTRICT,
  UNIQUE (deployment_key, token_id, observed_publication_revision),
  CHECK (
    (action = 'PUBLISH' AND metadata_ipfs_uri ~ '^ipfs://[^[:space:]]+$') OR
    (action = 'UNPUBLISH' AND metadata_ipfs_uri IS NULL)
  ),
  CHECK (action = 'PUBLISH' OR observed_token_state = 'UNMINTED'),
  CHECK (
    (observed_token_state = 'MINTED' AND resulting_lifecycle = 'MINTED_LOCKED') OR
    (observed_token_state = 'UNMINTED' AND action = 'PUBLISH' AND resulting_lifecycle = 'PUBLISHED') OR
    (observed_token_state = 'UNMINTED' AND action = 'UNPUBLISH' AND resulting_lifecycle = 'READY')
  )
);

COMMENT ON TABLE publication_inclusions IS
  'Idempotent included-chain observations for owner publication actions; block hashes support later reorg reconciliation and do not imply finality.';
