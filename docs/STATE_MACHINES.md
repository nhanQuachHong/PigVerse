# Pigverse State Machines

State dimensions are separated to avoid treating transient UI state, publication state and on-chain ownership as one ambiguous status.

## SM-001 — Character Content / Publication

### States

`DRAFT`, `PROCESSING_ASSETS`, `ERROR`, `READY`, `PUBLISHED`, `MINTED_LOCKED`

### Allowed transitions

| From | Action | To | Actor | Conditions / Side Effects |
|---|---|---|---|---|
| DRAFT | Process assets | PROCESSING_ASSETS | Admin | Valid unminted draft |
| PROCESSING_ASSETS | All required uploads/backups succeed | READY | System | Persist active asset package |
| PROCESSING_ASSETS | Required step fails | ERROR | System | Record safe error; do not publish |
| ERROR | Retry | PROCESSING_ASSETS | Admin/System | Retry is safe/idempotent |
| READY | Edit content | DRAFT | Admin | Unminted; invalidates/replaces active prepared revision safely |
| READY | Publish | PUBLISHED | Admin | Unminted + complete assets |
| PUBLISHED | Unpublish | READY | Admin | Still unminted |
| PUBLISHED | Edit | DRAFT | Admin | Only if still unminted; revision/audit required |
| PUBLISHED | On-chain mint confirmed | MINTED_LOCKED | System projection | Content becomes protected/immutable |
| READY/DRAFT | On-chain mint detected unexpectedly | MINTED_LOCKED | System projection | Chain truth wins; prevent further edits |

### Forbidden transitions

- `MINTED_LOCKED -> DRAFT/READY/PUBLISHED` through normal product operations.
- `ERROR -> PUBLISHED` without successful required processing.
- Any publication/edit transition that assumes unminted state without rechecking chain when correctness matters.

## SM-002 — On-Chain Token Ownership

### States

`UNMINTED`, `MINTED`

### Transition

`UNMINTED -- successful mint(tokenId) --> MINTED`

### Invariants

- No transition back to `UNMINTED` under approved product behavior.
- A token cannot transition to `MINTED` twice.
- Product has no approved burn transition.

## SM-003 — User Mint UX

### States

`IDLE`, `VALIDATING`, `AWAITING_WALLET`, `PENDING`, `SUCCESS`, `FAILED`, `UNKNOWN_RECONCILING`

### Key transitions

- IDLE -> VALIDATING on Mint click.
- VALIDATING -> AWAITING_WALLET after checking network/token/pause/price.
- AWAITING_WALLET -> IDLE/FAILED if user rejects.
- AWAITING_WALLET -> PENDING when tx hash submitted.
- PENDING -> SUCCESS only after authoritative successful outcome.
- PENDING -> FAILED after authoritative revert/failure.
- PENDING -> UNKNOWN_RECONCILING if provider disappears but tx hash exists.
- UNKNOWN_RECONCILING -> SUCCESS/FAILED/PENDING when chain access returns.

### Forbidden behavior

Never transition to SUCCESS solely because the wallet returned a hash or the backend DB says minted.

## SM-004 — Contract Mint Availability

### States

`ACTIVE`, `PAUSED`

| From | Action | To | Actor |
|---|---|---|---|
| ACTIVE | pause | PAUSED | Contract Owner |
| PAUSED | unpause | ACTIVE | Contract Owner |

Browsing remains available in both states.

## SM-005 — Admin Authentication Challenge

### States

`ISSUED`, `USED`, `EXPIRED`

- `ISSUED -> USED` after a valid signature is verified and authorization passes.
- `ISSUED -> EXPIRED` after TTL.
- USED/EXPIRED are terminal.
- Replayed challenges are rejected.

## SM-006 — Admin Authorization

### States

`AUTHORIZED`, `REVOKED`

Revocation mechanics for already-issued sessions remain governed by `OD-002/OD-003`; sensitive operations must not rely on a stale UI role indicator.

## SM-007 — Asset Processing Attempt

### States

`PENDING`, `ARTWORK_STORED`, `BACKUP_STORED`, `METADATA_STORED`, `COMPLETE`, `ERROR`

Implementation may use fewer/more internal substates, but external invariants are:

- required artwork + metadata + backup durability must be satisfied before READY;
- retry cannot corrupt a valid prior output;
- processing must bind to a specific content revision to avoid Admin-edit races.
