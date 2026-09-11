CREATE TABLE collection_deployments (
  deployment_key text PRIMARY KEY,
  collection_code text NOT NULL CHECK (collection_code = 'GENESIS'),
  environment text NOT NULL CHECK (environment IN ('local', 'base-sepolia', 'base-mainnet')),
  chain_id bigint NOT NULL CHECK (chain_id > 0),
  contract_address varchar(42) NOT NULL CHECK (contract_address ~ '^0x[0-9a-fA-F]{40}$'),
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_code, environment, chain_id)
);

COMMENT ON TABLE collection_deployments IS
  'Environment-bound contract identity; ownership remains authoritative on Base.';
