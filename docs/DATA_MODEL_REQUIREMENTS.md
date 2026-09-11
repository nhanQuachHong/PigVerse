# Pigverse Data Model Requirements

The database stores operational/application state. It is **not** the authoritative NFT ownership ledger.

## General Rules

- Use migrations for all schema changes.
- Preserve auditability.
- Model fixed Genesis token IDs 1..10 with uniqueness constraints.
- Prevent accidental overwrite from concurrent Admin edits.
- Separate chain-derived projections from authoritative application content.
- Use explicit environment/deployment keys where records are network-specific.

## Entity: CollectionDeployment

- Identity: deployment ID.
- Required: collection code (`GENESIS`), environment, chain ID, contract address.
- Unique: collection + environment/chain.
- Purpose: prevent Sepolia/Mainnet confusion.
- Delete behavior: restrict in production if referenced.
- Query patterns: resolve active deployment/config.

## Entity: NftContent

- Identity: internal content/revision ID plus token ID.
- Required: token ID 1..10, localized name/description/story, revision/version, lifecycle state.
- Uniqueness: active token slot unique per Genesis deployment/content model.
- Ownership: Pigverse operational data.
- Concurrency: optimistic versioning or equivalent required to detect stale Admin writes.
- Delete behavior: archive/soft-delete recommendation for drafts; minted protected content cannot be deleted through normal operations.
- Query patterns: public token detail, Admin edit/list, recovery.

## Entity: AssetPackage

- Identity: asset package ID.
- Relationship: belongs to exact NftContent revision/token.
- Required: processing status; artwork IPFS ref; metadata IPFS ref; backup refs when complete.
- Constraint: READY/complete status only if required refs exist.
- Mutable: operational status until complete; active minted refs protected thereafter.
- Query patterns: publish eligibility, retry, recovery.

## Entity: AdminAuthorization

- Identity: normalized wallet address.
- Required: authorization status.
- Unique: wallet address.
- Audit: changes must create audit events.
- Delete behavior: prefer revoke rather than hard-delete to preserve history.
- Query patterns: auth verification, Admin management/ops.

## Entity: AuthChallenge

- Identity: random challenge ID/nonce.
- Required: wallet address, message/hash, issuedAt, expiresAt, usedAt/status.
- Unique: challenge/nonce.
- Constraint: single-use; verification/consume must be atomic to stop replay races.
- Retention: short-lived; purge policy TBD.
- Index: wallet/status/expiry as justified by auth flow.

## Entity: AdminSession

If server-side session storage is used:

- Identity: opaque session ID/hash.
- Required: admin wallet, issuedAt, expiresAt, revocation state.
- Sensitive: do not persist raw bearer tokens unnecessarily; never log them.
- Retention: expiry/revocation policy per `OD-003`.

If stateless sessions are selected, equivalent revocation/security requirements still apply where needed.

## Entity: AuditEvent

- Identity: event ID.
- Required: actor wallet, action, target type/id, timestamp, correlation ID.
- Optional: safe before/after diff or metadata.
- Append-only in normal operations.
- Indexes: token/target, actor, timestamp, action as justified by query screens.
- Retention: `OD-018` must be decided before production.

## Entity: MintActivityProjection

- Identity: chain-stable key such as chainId + txHash + logIndex/event identity where applicable.
- Required: deployment, token ID, tx hash, observed status, wallet/owner when known, timestamps/block refs.
- Unique: stable chain event/observation identifier to deduplicate duplicate ingestion.
- Authority: projection only; chain wins.
- Query patterns: Admin activity, transaction restoration/reconciliation.

## Entity: ProcessingAttempt

May be part of AssetPackage or separate.

- Required: operation type, revision, status, started/completed timestamps, retry count, safe error category, correlation ID.
- Purpose: diagnose/retry partial external integration failures.

## Data Integrity Requirements

1. Token ID range check 1..10.
2. Unique active slot per token.
3. No Admin content mutation can silently succeed if chain has become minted.
4. Asset READY cannot exist with missing required durability references.
5. Replayed auth challenge cannot create a second valid login.
6. Duplicate chain event observation cannot duplicate logical mint activity.
7. Ownership projections can be rebuilt and are never used to override chain.

## Likely Transaction Boundaries

- Auth challenge consume + session creation.
- Admin content update + audit event.
- Publish/unpublish + audit event after chain precondition check.
- Admin authorization change + audit event.
- Mint event ingestion/projection upsert/deduplication.

## Backup / Restore

- DB backup/restore policy remains TBD before Mainnet.
- Restore must be followed by chain reconciliation.
- A stale restored owner/mint projection must be corrected from Base.
