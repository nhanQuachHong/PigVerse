# Pigverse API Requirements

These are logical API operations. Exact paths, framework and serialization details are engineering decisions. All write APIs require consistent validation/error contracts and correlation IDs where useful.

## Public / Read APIs

### API-PUBLIC-001 — Get public collection summary
- Linked FRs: `FR-PUBLIC-001`, `FR-PUBLIC-002`
- Actor: Public
- Purpose: Return Genesis public content summary and chain-derived/projection mint progress.
- Data: collection identity, 10 token summaries, featured flags, minted count, degradation markers if authoritative chain read unavailable.
- Authorization: None.
- Rule: Never return a DB-only owner as authoritative.
- Cache: Allowed for non-critical display; freshness must be explicit enough not to mislead mint actions.

### API-PUBLIC-002 — Get NFT detail content
- Linked FRs: `FR-PUBLIC-003`, `FR-I18N-001`, `FR-LICENSE-001`
- Actor: Public
- Input: token ID 1..10, locale.
- Response: localized name/description/story, active artwork/metadata refs, public state, owner/contract/network/explorer data where available, license link/disclosure.
- Validation: Reject IDs outside 1..10.

### API-PUBLIC-003 — Get authoritative mint preflight
- Linked FRs: `FR-MINT-001`, `FR-MINT-003`
- Actor: Connected user/public read
- Input: token ID, deployment/network.
- Response: current mintability, pause state, current price, token minted/owner state, contract/network identity.
- Rule: Prefer fresh chain read for correctness-sensitive preflight.

### API-PUBLIC-004 — Get My Genesis NFTs
- Linked FRs: `FR-WALLET-002`
- Actor: Connected user/public chain query
- Input: wallet address.
- Response: Genesis token IDs currently owned by address plus public content.
- Rule: Ownership derived/reconciled from chain.

### API-PUBLIC-005 — Resolve transaction status
- Linked FRs: `FR-MINT-002`
- Input: tx hash + expected deployment.
- Response: pending/success/failure/unknown with safe receipt context and token state when resolvable.
- Idempotency: Repeated reads safe.

## Admin Authentication APIs

### API-AUTH-001 — Issue signature challenge
- Linked FR: `FR-ADMIN-001`
- Input: wallet address.
- Behavior: Create high-entropy, time-bounded, single-use challenge bound to intended login context.
- Abuse controls: Rate limit; do not reveal privileged secrets.

### API-AUTH-002 — Verify signature / create session
- Linked FR: `FR-ADMIN-001`
- Input: challenge ID/message, signature, wallet address.
- Behavior: Verify message integrity, signature, freshness, single-use status and current Admin authorization; atomically consume challenge; create secure session.
- Failure: invalid, expired, replayed, unauthorized -> deny.

### API-AUTH-003 — Get current admin identity
- Linked FR: `FR-ADMIN-001`
- Authorization: active Admin session.
- Behavior: Return wallet + current authorization capabilities.

### API-AUTH-004 — Logout/revoke current session
- Linked FR: `FR-ADMIN-001`
- Behavior: Invalidate current session according to chosen session mechanism.

## Admin Content APIs

### API-ADMIN-001 — List/manage Genesis token drafts
- Linked FRs: `FR-ADMIN-002`, `FR-ADMIN-003`
- Authorization: Application Admin.
- Behavior: Read all 10 token slots with content revision, asset state, publication state and chain mint state.

### API-ADMIN-002 — Update unminted NFT draft
- Linked FR: `FR-ADMIN-002`
- Input: localized fields and allowed metadata fields; concurrency version/ETag if chosen.
- Preconditions: current on-chain token still unminted.
- Behavior: Validate, persist new revision, append audit event.
- Failure: minted, stale edit conflict, invalid/missing data.

### API-ASSET-001 — Upload/process artwork and metadata
- Linked FR: `FR-ASSET-001`
- Authorization: Application Admin.
- Input: token/content revision, validated media.
- Behavior: Start or execute durable asset pipeline; bind outputs to exact content revision.
- Idempotency: Duplicate/retry must be safe.
- Failure: partial failure leaves token non-publishable and returns operational status.

### API-ASSET-002 — Retry failed asset processing
- Linked FR: `FR-ASSET-001`
- Authorization: Application Admin.
- Behavior: Safely retry incomplete required steps without corrupting valid results.

### API-ADMIN-003 — Publish NFT
- Linked FR: `FR-ADMIN-003`
- Preconditions: Admin authorized, asset package READY, token chain state unminted.
- Behavior: Set public publication state and audit action.
- Failure: minted concurrently, incomplete assets, stale revision.

### API-ADMIN-004 — Unpublish NFT
- Linked FR: `FR-ADMIN-003`
- Preconditions: token remains unminted.
- Behavior: Return publication to non-public/READY state; audit.
- Failure: minted token -> reject.

### API-ADMIN-005 — Query audit history
- Linked FR: `FR-ADMIN-004`
- Authorization: Application Admin.
- Supports: pagination; filters may include actor/action/token/time once specified.

### API-ADMIN-006 — Query mint activity
- Linked FR: `FR-ADMIN-005`
- Authorization: Application Admin.
- Behavior: Return operational observations reconciled with chain where relevant; distinguish pending/success/failure/unknown.

## Operations / Recovery APIs or Commands

### API-OPS-001 — Reconcile Genesis state
- Linked FR: `FR-RECOVERY-001`
- Authorization: restricted operator/admin action.
- Purpose: Compare operational DB projections against chain and content-addressed refs, correcting non-authoritative projections without overwriting chain truth.
- Execution surface: may be CLI/job rather than HTTP API.

### API-OPS-002 — Recovery rebuild
- Linked FR: `FR-RECOVERY-001`
- Purpose: Reconstruct core Genesis representation from deployment config + chain + IPFS/backups.
- Safety: Must support dry-run/verification before destructive replacement where practical.

## Error Contract Requirements

Use a stable machine-readable code plus safe human message, e.g.:

```json
{
  "code": "TOKEN_ALREADY_MINTED",
  "message": "This Pigverse NFT has already been minted.",
  "correlationId": "..."
}
```

Never return stack traces, secrets, session credentials, provider tokens or private infrastructure details.

## Direct Wallet Transactions

Collector mint and Contract Owner pause/unpause/price changes should be wallet-originated transactions against the configured contract. Backend must not custody keys to submit these privileged/user transactions.
