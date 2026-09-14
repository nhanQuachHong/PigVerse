CREATE TABLE owner_control_inclusions (
  deployment_key text NOT NULL
    REFERENCES collection_deployments(deployment_key) ON DELETE RESTRICT,
  transaction_hash char(66) NOT NULL
    CHECK (transaction_hash ~ '^0x[0-9a-f]{64}$'),
  action text NOT NULL
    CHECK (action IN ('PAUSE', 'UNPAUSE', 'SET_MINT_PRICE', 'WITHDRAW')),
  actor_wallet varchar(42) NOT NULL
    CHECK (
      actor_wallet ~ '^0x[0-9a-fA-F]{40}$' AND
      lower(actor_wallet) <> '0x0000000000000000000000000000000000000000'
    ),
  new_mint_price numeric(78, 0) CHECK (new_mint_price >= 0),
  withdrawn_amount numeric(78, 0) CHECK (withdrawn_amount >= 0),
  block_number numeric(78, 0) NOT NULL CHECK (block_number >= 0),
  block_hash char(66) NOT NULL
    CHECK (block_hash ~ '^0x[0-9a-f]{64}$'),
  correlation_id text NOT NULL,
  observed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (deployment_key, transaction_hash),
  CHECK (
    (action = 'SET_MINT_PRICE' AND
      new_mint_price IS NOT NULL AND withdrawn_amount IS NULL) OR
    (action = 'WITHDRAW' AND
      new_mint_price IS NULL AND withdrawn_amount IS NOT NULL) OR
    (action IN ('PAUSE', 'UNPAUSE') AND
      new_mint_price IS NULL AND withdrawn_amount IS NULL)
  )
);

CREATE INDEX owner_control_inclusions_recent_idx
  ON owner_control_inclusions (deployment_key, observed_at DESC);

COMMENT ON TABLE owner_control_inclusions IS
  'Idempotent verified inclusions for Owner-signed controls. Block hashes support reorg reconciliation; inclusion does not imply product finality.';
