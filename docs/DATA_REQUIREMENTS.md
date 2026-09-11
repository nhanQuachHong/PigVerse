# Pigverse Data Requirements

This document describes business data. It does not prescribe the final physical database schema.

## 1. Genesis Collection

### Important attributes
- Collection identifier/name: Pigverse Genesis.
- Network/deployment references.
- Contract address per environment.
- Fixed max supply = 10.
- Minted count (derived from authoritative chain state; cache allowed).
- Supported locales: VI, EN.

### Ownership
Product-owned configuration; on-chain contract state is authoritative for token ownership and mint existence.

### Lifecycle
Configured before deployment; Genesis identity and max supply remain stable.

### Mutable / Immutable
- Deployment/configuration references may differ by environment.
- Genesis max supply and identity are immutable product rules.

### Sensitive data
No private keys or secrets stored in general application records.

## 2. NFT Character

### Important attributes
- Fixed token ID 1–10.
- Character name.
- VI description.
- EN description.
- VI story/lore.
- EN story/lore.
- Artwork reference.
- IPFS artwork CID/reference.
- IPFS metadata CID/reference.
- Backup storage reference.
- Content processing state.
- Publication state.
- Mint/ownership state (derived/reconciled from chain).
- Mint transaction reference if applicable.

### Relationships
- Belongs to Pigverse Genesis.
- Has zero or one current on-chain owner.
- Has audit history.
- Has asset-processing attempts/status.

### Ownership
- Product team owns source content/copyright under current product assumption/decision.
- NFT token ownership belongs to current on-chain token owner.
- Token ownership does not transfer underlying copyright/commercial rights.

### Lifecycle
DRAFT -> PROCESSING_ASSETS -> READY -> PUBLISHED/AVAILABLE -> MINTED.
PROCESSING_ASSETS may transition to ERROR, then retry.
Unminted PUBLISHED may return to READY/unpublished.
MINTED is terminal for content mutability under current rules.

### Mutable / Immutable
Before mint: approved fields may be edited by authorized Admin.
After mint: protected artwork/metadata/content is immutable through product workflows.

### Sensitive data
Normally none in public NFT content.

### Audit
Admin changes must be traceable.

### Retention
Minted Genesis character content and associated references are intended for long-term/permanent retention. Exact operational retention for drafts/audit is TBD.

### Deletion
Minted Genesis NFT content must not be deleted as part of normal product operations. Draft deletion behavior is TBD.

## 3. Wallet Identity

### Important attributes
- EVM wallet address.
- Connection state is client/session state.

### Relationships
- May own zero to ten Genesis tokens on-chain.
- May be an authorized Application Admin.
- One wallet is Contract Owner for a deployment.

### Ownership
Wallet is externally controlled by its holder; Pigverse never owns user private keys.

### Sensitive data
Wallet address is public blockchain data but should still be handled intentionally in logs/analytics.

### Retention
Public chain ownership is permanent blockchain history. Application session retention TBD.

## 4. Admin Authorization Record

### Important attributes
- Admin wallet address.
- Authorization status.
- Created/updated audit metadata.
- Optional display label TBD.

### Relationships
- Links to Admin sessions and audit events.

### Ownership
Pigverse operational data.

### Lifecycle
Authorized -> Revoked. Re-authorization policy TBD.

### Sensitive data
Admin wallet list is operational/security-relevant. It is not a secret comparable to a private key, but unnecessary exposure should be avoided.

### Audit
Add/revoke operations should be auditable.

### Retention
Historical authorization changes should be retained according to audit policy; duration TBD.

## 5. Admin Authentication Challenge

### Important attributes
- Challenge/nonce.
- Wallet address.
- Issued time.
- Expiration time.
- Used/unused state.

### Ownership
Backend security state.

### Lifecycle
Issued -> Used or Expired.

### Mutable / Immutable
Once used, may not become reusable.

### Sensitive data
Security-sensitive ephemeral authentication data.

### Retention
Short-lived; exact TTL TBD.

### Deletion
May be purged after use/expiration according to security policy.

## 6. Admin Session

### Important attributes
- Session identifier/token reference.
- Admin wallet identity.
- Issued time.
- Expiration.
- Revocation state if supported.

### Sensitive data
Session token/credential is sensitive and must not be logged or exposed.

### Retention
TBD based on session design.

## 7. Audit Event

### Important attributes
- Event ID.
- Actor wallet.
- Action type.
- Target resource/token ID.
- Timestamp.
- Before/after context where appropriate and safe.
- Correlation/reference identifiers.

### Relationships
- May reference NFT Character or Admin Authorization.

### Mutable / Immutable
Append-only through normal operations.

### Sensitive data
Must avoid secrets/session tokens/private keys.

### Retention
TBD; must cover operational accountability needs.

## 8. Asset Processing Record

### Important attributes
- NFT token ID.
- Attempt/status.
- Artwork upload result.
- IPFS artwork reference.
- Backup result/reference.
- Metadata upload result.
- Error information safe for operations.
- Retry count/timestamps as appropriate.

### Lifecycle
Pending -> Success or Error; Error may retry.

### Mutable / Immutable
Operational state mutable until successful; final minted content references become protected by immutability rules.

## 9. Mint Activity

### Important attributes
- Token ID.
- Wallet address.
- Transaction hash.
- Observed status: pending/success/failure/unknown as supported.
- Timestamp/block reference.
- Network.

### Authority
The blockchain transaction/receipt is authoritative. Application activity records are indexes/observations.

### Retention
Successful mint history is permanent on-chain. App indexing retention TBD.

## 10. Localization Content

Important public content needs VI and EN variants. Exact fallback behavior when a translation is missing is an open decision.

## 11. Recovery Data

The product must preserve enough configuration/reference data to reconstruct core Genesis display state from:
- Contract address/network.
- On-chain token ownership/state.
- IPFS artwork/metadata.
- Backup storage copies.

Application DB backups are useful but must not override chain truth for ownership.
