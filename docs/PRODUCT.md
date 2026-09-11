# Pigverse — Product Specification

## Document Control

- Product: Pigverse
- Version: 1.0
- Status: APPROVED
- Scope target: Full product, not MVP-only
- Primary network for development/testing: Base Sepolia
- Planned production network: Base Mainnet

# Product Overview

## Product Vision

Pigverse is a bilingual (Vietnamese/English) NFT character collection experience centered on 10 unique 1/1 cute 2D cartoon pig characters living in one connected universe. Users can explore the collection, read each character's lore, connect an EVM wallet, mint an available NFT, and view Pigverse NFTs they own.

The first collection, Pigverse Genesis, is permanently limited to 10 NFTs. The website remains useful after the collection sells out as a gallery, story archive, and ownership viewer. Future seasons or collections may be introduced without changing the identity or maximum supply of Genesis.

## Problem Statement

Pigverse needs a focused, trustworthy way to present and mint a small character-driven NFT collection without requiring users to create traditional accounts. The experience must preserve the uniqueness of each 1/1 NFT, make ownership verifiable on-chain, keep artwork and metadata durable, and give the creator safe operational controls without allowing already-minted NFTs to be silently changed.

## Target Users

### Collector / Visitor
People interested in cute character art and NFTs who want to browse Pigverse, understand the characters, connect a wallet, and mint a chosen available NFT.

### Admin / Creator Team
The Pigverse team responsible for preparing artwork and metadata, publishing NFTs, monitoring mint activity, and operating the collection.

### Contract Owner
The single wallet that controls smart-contract administrative functions such as pause/unpause and mint-price configuration.

## Value Proposition

- Exactly 10 unique 1/1 Pigverse Genesis NFTs with individually authored identities and lore.
- User chooses the exact NFT to mint rather than receiving a random token.
- Ownership and mint status are verifiable on Base.
- Artwork and metadata become immutable after mint.
- No username/password account is required for collectors.
- The collection remains a persistent gallery and story experience after sellout.

## Product Goals

- Deliver a complete end-to-end mint experience for Pigverse Genesis.
- Ensure no Genesis token can be minted more than once.
- Make blockchain state authoritative for ownership.
- Preserve immutable artwork/metadata for minted NFTs.
- Provide a secure wallet-signature-based Admin Dashboard.
- Support Vietnamese and English for important public content.
- Keep the system recoverable from blockchain + IPFS + backup storage if application data is lost.
- Support a later Pigverse Season 2 / Collection 2 without changing Genesis supply.

## Success Metrics

Numeric KPI targets are TBD. Initial success criteria are functional and operational:

- All 10 Genesis NFTs can be published and minted correctly.
- Duplicate mint attempts cannot create duplicate ownership.
- Minted NFT metadata cannot be edited through normal product workflows.
- Admin operations are authenticated and audited.
- Public ownership shown by the site matches on-chain ownership.
- The website can still present the full collection after 10/10 mint.

## Non-Goals

- Multi-seller NFT marketplace in the approved Genesis scope.
- Third-party creator onboarding.
- Auctions.
- Secondary-market listing or trading inside Pigverse.
- Generative trait combinations.
- Official rarity tiers such as Common/Rare/Legendary.
- NFT burn.
- Increasing Genesis supply beyond 10.
- Reserving Genesis NFTs for Admin.
- Commercial-use rights for NFT holders.

# Personas

## Persona P-01 — Visitor / Collector

- Description: Public user browsing the collection; may or may not have a wallet connected.
- Goals: Discover characters, understand lore, identify availability, mint a preferred NFT, verify ownership.
- Needs: Clear mint state, wallet compatibility, transparent transaction state, bilingual content, explorer links.
- Pain points: Failed wallet transactions, stale availability, unclear ownership, confusing crypto terminology.
- Permissions: Browse public content; connect wallet; initiate mint; view My NFTs for connected wallet.

## Persona P-02 — Application Admin

- Description: Authorized Pigverse operator authenticated using an approved EVM wallet and message signature.
- Goals: Prepare NFT content, publish/unpublish unminted NFTs, monitor mint activity, retry failed asset publishing, inspect audit history.
- Needs: Reliable draft workflow, IPFS status, safe editing rules, visibility into failures.
- Pain points: Partial upload failure, accidental edits after mint, stale on-chain state, unclear contract status.
- Permissions: Application-level content management and operational read access according to the permission matrix.

## Persona P-03 — Contract Owner

- Description: Single EVM wallet with privileged on-chain administration rights.
- Goals: Pause/unpause minting and configure mint price safely.
- Needs: Clear confirmation of network, contract, current price and pause state.
- Pain points: Wrong-network actions, accidental price changes, compromised owner wallet.
- Permissions: On-chain owner functions only. Application Admin status and Contract Owner status are logically separate roles even if initially held by the same person.

# Roles & Permissions

| Capability | Guest | Connected Collector | Application Admin | Contract Owner |
|---|---:|---:|---:|---:|
| View Home/Story/Collection | ✓ | ✓ | ✓ | ✓ |
| View NFT detail | ✓ | ✓ | ✓ | ✓ |
| Connect wallet | ✓ | ✓ | ✓ | ✓ |
| Mint available NFT | ✗ until wallet connected | ✓ | ✓ if using collector flow | ✓ if using collector flow |
| View My NFTs | ✗ until wallet connected | ✓ | ✓ | ✓ |
| Create/edit NFT draft | ✗ | ✗ | ✓ | ✗ unless also Admin |
| Upload artwork / metadata | ✗ | ✗ | ✓ | ✗ unless also Admin |
| Publish/unpublish unminted NFT | ✗ | ✗ | ✓ | ✗ unless also Admin |
| Edit minted NFT content | ✗ | ✗ | ✗ | ✗ |
| View application audit history | ✗ | ✗ | ✓ | ✗ unless also Admin |
| View mint activity | ✗ | own/public data only | ✓ | ✓ if also Admin |
| Pause/unpause contract | ✗ | ✗ | ✗ unless owner | ✓ |
| Change mint price | ✗ | ✗ | ✗ unless owner | ✓ |
| Increase Genesis max supply | ✗ | ✗ | ✗ | ✗ |
| Burn Genesis NFT | ✗ | ✗ | ✗ | ✗ |
| Reserve Genesis NFT | ✗ | ✗ | ✗ | ✗ |

# Core User Journeys

## UJ-001 — Explore Pigverse

- Actor: Guest / Connected Collector
- Trigger: User visits the website.
- Preconditions: Public site available.
- Main flow:
  1. User lands on Home.
  2. User sees hero, Pigverse introduction, 3–4 featured characters, and X/10 minted progress.
  3. User chooses Explore Collection.
  4. User views all 10 Genesis NFT cards.
  5. User filters All / Available / Minted.
  6. User opens an NFT detail page.
- Alternative flows: User enters Collection, Story, NFT detail, or My NFTs directly.
- Failure flows: Blockchain read unavailable; IPFS image temporarily unavailable; stale cached state.
- Postconditions: No state change required.

## UJ-002 — Mint a Chosen NFT

- Actor: Connected Collector
- Trigger: User clicks Mint on an available NFT.
- Preconditions:
  - Correct supported Base network.
  - NFT is published and shown as available.
  - Contract is not paused.
  - Wallet connected.
- Main flow:
  1. Application reads current contract state and mint price.
  2. User initiates mint for a specific fixed token ID.
  3. Wallet asks the user to sign/send the transaction.
  4. Transaction is submitted.
  5. UI enters a pending state.
  6. Chain confirms a successful mint.
  7. NFT is shown as minted with owner data.
  8. User receives a celebration state and links to My NFTs / Collection.
- Alternative flows: User reconnects wallet after disconnect; user refreshes while transaction is pending; state is reconstructed from tx/chain.
- Failure flows: User rejects signature/transaction; wrong network; transaction reverts; price changed; contract paused; another user minted first; RPC failure.
- Postconditions: On success, selected token ID has one owner and cannot be minted again.

## UJ-003 — View My NFTs

- Actor: Connected Collector
- Trigger: User opens My NFTs.
- Preconditions: Wallet connected.
- Main flow:
  1. App identifies connected wallet address.
  2. App determines which Genesis tokens are currently owned by that wallet.
  3. Matching Pigverse NFTs are shown.
- Alternative flow: Wallet owns zero Genesis NFTs; show empty state and Explore Pigverse CTA.
- Failure flow: Chain/RPC query fails; show recoverable error rather than false ownership.
- Postconditions: No ownership change.

## UJ-004 — Admin Prepare and Publish NFT

- Actor: Application Admin
- Trigger: Admin creates or edits an unminted NFT.
- Preconditions: Admin authenticated by wallet signature and active session.
- Main flow:
  1. Admin creates/edits draft content.
  2. Admin uploads 1:1 artwork.
  3. System uploads artwork to IPFS and backup storage.
  4. System creates bilingual metadata/content representation as required.
  5. System uploads metadata to IPFS.
  6. NFT reaches READY.
  7. Admin publishes it.
  8. NFT becomes PUBLISHED / AVAILABLE if contract state also permits minting.
- Alternative flows: Admin edits a READY/PUBLISHED but unminted NFT; Admin unpublishes before mint.
- Failure flows: Partial IPFS failure; backup failure; session expiration; NFT becomes minted while admin is editing.
- Postconditions: Published NFT is visible and may be minted if on-chain conditions allow.

## UJ-005 — Admin Authenticate

- Actor: Application Admin
- Trigger: User attempts to enter Admin Dashboard.
- Preconditions: Wallet available.
- Main flow:
  1. Wallet connects.
  2. Backend issues a one-time nonce/challenge.
  3. Wallet signs the challenge.
  4. Backend verifies signature and wallet identity.
  5. Backend verifies the wallet is an authorized Admin.
  6. Backend creates an authenticated admin session.
- Failure flows: Invalid signature; expired/reused nonce; wallet not authorized; wrong chain data if chain binding is required; session expired.
- Postconditions: Authorized admin session exists.

## UJ-006 — Contract Owner Emergency Pause

- Actor: Contract Owner
- Trigger: Operational/security issue requires stopping new mints.
- Preconditions: Owner wallet connected to correct network and contract.
- Main flow:
  1. Owner initiates pause.
  2. Wallet submits owner transaction.
  3. Contract confirms paused state.
  4. Public website continues showing NFTs but disables Mint and displays Minting paused.
- Failure flows: Wrong wallet; wrong network; reverted transaction; stale UI.
- Postconditions: New mint calls are blocked until unpaused.

# Full Product Scope

## Core Product

- Pigverse Genesis 10-token 1/1 NFT collection.
- Fixed token IDs 1–10.
- Exact-NFT selection and mint.
- Base Sepolia test deployment and Base Mainnet production deployment path.
- Wallet-only collector identity.
- Public Home, Collection, NFT Detail, Story, My NFTs.
- Bilingual VI/EN important content.
- IPFS artwork/metadata + backup storage.
- Immutable minted content.
- Admin Dashboard with wallet-signature auth.
- Mint activity and audit history.
- Contract pause/unpause and configurable mint price.
- Blockchain-authoritative ownership.
- Gallery behavior after sellout.

## Phase 1

- Foundation and deployment environments.
- Genesis content model for 10 NFTs.
- Public pages.
- Wallet connection.
- Base Sepolia contract with free mint.
- Mint flow and concurrency protection.
- My NFTs.
- Admin authentication and basic NFT draft/publish workflow.

## Phase 2

- Full IPFS + backup workflow.
- Audit history.
- Mint activity dashboard.
- Retry/recovery operations for failed asset processing.
- Improved bilingual content workflow.
- More robust transaction restoration after refresh/disconnect.

## Phase 3

- Base Mainnet deployment readiness.
- Production mint-price configuration.
- Stronger operational tooling.
- Season/Collection architecture that keeps Genesis independent.

## Production Hardening

- Security review for smart contract and admin authentication.
- Rate limiting / abuse prevention where appropriate.
- Structured logging, health checks, monitoring and alerts.
- RPC/IPFS failure handling.
- Backup and recovery validation.
- Dependency review and secret management.
- Repeatable deployment and rollback procedure.
- E2E testing of critical wallet/mint/admin journeys.

## Future / Optional

- Pigverse Season 2 / Collection 2.
- Additional story experiences.
- Additional creator/community features if separately approved.
- Mainnet ownership integrations beyond current site.

## Explicit Out of Scope

- Open marketplace for external sellers.
- Secondary sale marketplace.
- Auctions.
- Trait generator or rarity engine.
- Burn.
- Genesis supply increase.
- Genesis reserved/admin-minted allocation.
- Commercial rights for holders.
