# Pigverse Edge Cases

## Wallet / Identity

### EC-WALLET-001 — User rejects wallet connection
No authenticated/admin state is created. Public browsing remains available.

### EC-WALLET-002 — Wallet disconnects while browsing
Protected/mint actions require reconnect. Public content remains visible.

### EC-WALLET-003 — User changes wallet account
My NFTs and any wallet-specific state must refresh for the new address. Admin authorization must be re-evaluated.

### EC-WALLET-004 — Wrong network
Mint/owner actions must not proceed against an unintended network. Product should guide user to the correct environment/network.

## Minting

### EC-MINT-001 — Double click Mint
UI should avoid duplicate submissions where possible, but contract rules remain the final protection against duplicate token mint.

### EC-MINT-002 — Two users mint the same NFT concurrently
Only one may successfully mint the fixed token ID. Loser receives a clear failure/revert state; site refreshes availability.

### EC-MINT-003 — NFT becomes minted while detail page is stale
Before/at transaction execution current chain state decides. UI reconciles and marks token minted.

### EC-MINT-004 — User rejects transaction in wallet
No NFT ownership change. UI returns to safe non-success state.

### EC-MINT-005 — Transaction pending for a long time
Keep state pending/unknown rather than successful; provide transaction link where possible.

### EC-MINT-006 — User refreshes browser while transaction pending
If transaction hash is known/persisted safely, re-query and reconstruct final result.

### EC-MINT-007 — Transaction reverts
Do not mark NFT minted by that user. Show human-readable failure and refresh authoritative token state.

### EC-MINT-008 — Price changes before transaction confirmation
Contract current rules determine validity. UI should re-read current price for new attempts and explain mismatch/failure.

### EC-MINT-009 — Contract paused before transaction executes
Final outcome follows contract execution. UI must not predeclare success.

### EC-MINT-010 — RPC unavailable after wallet submits transaction
Preserve tx hash where possible and show unknown/pending state until it can be reconciled.

### EC-MINT-011 — Duplicate chain event observation
Backend/indexer must deduplicate by stable chain identifiers and avoid duplicate business records/actions.

### EC-MINT-012 — Transaction replaced/repriced
Resolve using provider/chain transaction semantics; do not treat the original hash alone as final success.

## NFT Content / Asset Processing

### EC-ASSET-001 — Artwork IPFS upload fails
Remain non-publishable; record safe error; allow Admin retry.

### EC-ASSET-002 — Artwork upload succeeds but metadata fails
State becomes ERROR/non-publishable; do not expose as mintable.

### EC-ASSET-003 — IPFS succeeds but backup fails
Under approved rule, do not mark asset package READY until required backup succeeds.

### EC-ASSET-004 — Retry after partial success
Retry must not corrupt successful prior outputs or produce conflicting active metadata references.

### EC-ASSET-005 — IPFS gateway unavailable
Try configured fallback behavior if available or display recoverable asset error; ownership correctness remains unaffected.

### EC-ASSET-006 — Admin edits content while asset processing
Define safe locking/version behavior so generated metadata corresponds to the intended content revision.

### EC-ASSET-007 — NFT gets minted while Admin has stale edit form
Save/publish must re-check minted state and reject protected changes.

## Admin Authentication / Authorization

### EC-ADMIN-001 — Reused authentication nonce
Reject.

### EC-ADMIN-002 — Expired nonce
Reject and issue a new challenge on new auth attempt.

### EC-ADMIN-003 — Signature valid but wallet not Admin
Reject Admin access.

### EC-ADMIN-004 — Admin permission revoked while session active
Sensitive operations must re-evaluate authorization according to chosen session/revocation policy. Exact immediate-revocation mechanics: TBD.

### EC-ADMIN-005 — Two Admins edit same NFT
Must not silently lose one Admin's change; concurrency control strategy TBD.

### EC-ADMIN-006 — Admin unpublishes while user is viewing NFT
Public page may update to non-mintable/unpublished state; already-submitted on-chain transactions follow contract rules.

## Contract Owner

### EC-OWNER-001 — Non-owner attempts pause/price update
Contract rejects.

### EC-OWNER-002 — Owner connects to wrong environment
Product must show network/contract context and avoid directing actions to wrong deployment.

### EC-OWNER-003 — Owner wallet compromised
Incident procedure is not yet defined; this is a production-blocking operational/security decision.

## Data / Recovery

### EC-DATA-001 — Database says Available but chain says Minted
Chain wins; application corrects its representation.

### EC-DATA-002 — Database lost
Recover core collection from chain + IPFS + backup. Non-authoritative operational history recovery depends on backup policy.

### EC-DATA-003 — IPFS metadata and application draft differ before mint
Only the approved active version may be publishable; content revisioning strategy required.

### EC-DATA-004 — Backup restore contains stale ownership
Ownership is re-derived from chain; backup does not override it.

## Public UI / Localization

### EC-UI-001 — Missing VI or EN translation
Fallback rule is TBD; NFT must not silently publish incomplete required bilingual content if both are mandatory.

### EC-UI-002 — Sold out 10/10
Mint controls disappear/disable appropriately, but Collection, NFT Detail, Story and ownership viewing remain active.

### EC-UI-003 — Owner address changes through external NFT transfer
Public owner/My NFTs update from chain even though Pigverse did not initiate the transfer.

### EC-UI-004 — Explorer unavailable
Core product still works; explorer link failure does not change transaction truth.
