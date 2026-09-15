CREATE TABLE admin_auth_rate_limits (
  scope varchar(64) NOT NULL CHECK (scope ~ '^[a-z][a-z0-9_]{0,63}$'),
  key_hash char(64) NOT NULL CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  attempt_count integer NOT NULL CHECK (attempt_count > 0),
  window_started_at timestamptz NOT NULL,
  reset_at timestamptz NOT NULL CHECK (reset_at > window_started_at),
  PRIMARY KEY (scope, key_hash)
);

CREATE INDEX admin_auth_rate_limits_expiry_idx
  ON admin_auth_rate_limits (reset_at);

COMMENT ON TABLE admin_auth_rate_limits IS
  'Shared fixed-window Admin authentication abuse limits; keys are one-way hashes.';
