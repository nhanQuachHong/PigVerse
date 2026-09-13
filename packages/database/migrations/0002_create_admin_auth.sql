CREATE TABLE admin_auth_challenges (
  nonce_hash char(64) PRIMARY KEY CHECK (nonce_hash ~ '^[0-9a-f]{64}$'),
  message_hash char(64) NOT NULL CHECK (message_hash ~ '^[0-9a-f]{64}$'),
  wallet_address varchar(42) NOT NULL CHECK (wallet_address ~ '^0x[0-9a-fA-F]{40}$'),
  domain text NOT NULL,
  uri text NOT NULL,
  chain_id bigint NOT NULL CHECK (chain_id > 0),
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL CHECK (expires_at > issued_at),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_auth_challenges_expiry_idx
  ON admin_auth_challenges (expires_at)
  WHERE consumed_at IS NULL;

CREATE TABLE admin_sessions (
  token_hash char(64) PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  wallet_address varchar(42) NOT NULL CHECK (wallet_address ~ '^0x[0-9a-fA-F]{40}$'),
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL CHECK (expires_at > issued_at),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_sessions_active_idx
  ON admin_sessions (token_hash, expires_at)
  WHERE revoked_at IS NULL;

COMMENT ON TABLE admin_auth_challenges IS
  'Hashed, origin-bound, single-use SIWE-compatible Admin challenges.';

COMMENT ON TABLE admin_sessions IS
  'Hashed opaque Admin sessions; every privileged request still rechecks current on-chain owner.';
