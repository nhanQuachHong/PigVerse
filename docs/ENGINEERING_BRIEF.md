# Pigverse Engineering Brief

## Status

- Product specification: **APPROVED**
- Engineering handoff: **READY WITH TRACKED OPEN DECISIONS**
- Target: full approved product through production hardening, not MVP-only
- Development/test chain: Base Sepolia
- Planned production chain: Base Mainnet

## Product Summary

Pigverse Genesis is a bilingual VI/EN NFT character experience containing exactly 10 unique 1/1 cute 2D cartoon pig NFTs. Each token has a fixed ID from 1 through 10. A collector selects the exact available character, connects an EVM wallet, and mints that token. The chain is authoritative for ownership. Minted artwork/metadata must become immutable. The website remains useful after 10/10 mint as a gallery, story archive, and ownership viewer.

The approved Genesis product is **not** a multi-seller marketplace, auction platform, secondary marketplace, generative-trait collection, or burnable/inflatable collection.

## Engineering Goals

1. Preserve Genesis invariants: max supply 10, token IDs 1–10, one successful mint per token, no reserve, no approved burn path.
2. Make on-chain state authoritative for ownership, mint status, pause state and active mint price.
3. Provide a robust exact-token mint flow that survives stale UI, concurrent mint attempts, refresh/disconnect and provider degradation without false success.
4. Provide secure Admin authentication using wallet signature challenge/session and server-side authorization.
5. Build a safe NFT content pipeline: draft -> durable artwork/metadata -> publish, with partial-failure retry and minted-content immutability.
6. Keep public content bilingual VI/EN.
7. Make core Genesis state recoverable from chain + IPFS + backup storage.
8. Provide sufficient tests, observability, deployment/recovery documentation and security hardening for production.

## Explicit Product Invariants

- `BR-001`: Genesis supply is permanently 10.
- `BR-002`: Each Genesis token is 1/1.
- `BR-003`: Collector chooses exact token.
- `BR-005`: Pause blocks new mint calls but not browsing.
- `BR-008` / `BR-018`: No reservation/admin reserve.
- `BR-009`: Blockchain wins for ownership.
- `BR-011`: Minted content is immutable.
- `BR-012`: Incomplete assets cannot be published.
- `BR-016`: NFT ownership does not grant copyright/commercial rights.
- `BR-017`: No approved burn flow.
- `BR-020`: Future seasons must not mutate Genesis identity.

## Critical Functional Requirements

- Public: `FR-PUBLIC-001..003`
- Wallet: `FR-WALLET-001..002`
- Mint: `FR-MINT-001..003`
- Admin: `FR-ADMIN-001..005`
- Assets: `FR-ASSET-001`
- Contract: `FR-CONTRACT-001..002`
- Localization: `FR-I18N-001`
- Recovery: `FR-RECOVERY-001`
- License: `FR-LICENSE-001`

## Critical NFRs

- Concurrent mint safety: `NFR-REL-001`
- Chain authority: `NFR-REL-003`
- Partial asset safety: `NFR-REL-004`
- Transaction restoration: `NFR-REL-006`
- No private-key custody: `NFR-SEC-001`
- Server-side admin authorization: `NFR-SEC-002`
- Replay-resistant auth challenge: `NFR-SEC-003`
- Contract owner authorization: `NFR-SEC-004`
- Secret management: `NFR-SEC-005`
- Recovery validation: `NFR-REL-009`
- Environment separation: `NFR-OPS-007`

## Constraints

### Required technology behavior

- EVM-compatible wallet flow.
- Base Sepolia for test/development; separate Base Mainnet deployment for production.
- NFT-compatible smart contract preserving approved Genesis invariants.
- Content-addressed artwork/metadata through IPFS plus independent backup storage.
- A backend is required for Admin authentication, authorization, asset processing, audit data and operational state.
- No user/admin private key or seed phrase custody.

### Technology selections not yet product-approved

Frontend framework, backend framework, DB, wallet connector library, exact RPC/IPFS/backup providers and exact token implementation details remain engineering/open decisions. Prefer mature, actively maintained components and record material choices as ADRs.

### Legal/product constraints

The final license wording must be approved before Base Mainnet. Mainnet mint price remains a Product Owner decision.

## Architecture Guardrails

- UI is never the authorization source.
- Database is never the ownership source.
- Do not hide or rewrite a minted Genesis token because application state differs from chain.
- Do not couple future Season 2 implementation into Genesis prematurely.
- Do not generalize into a marketplace/multi-tenant platform.
- Use explicit environment configuration so Sepolia/Mainnet contract addresses cannot be confused.
- For critical chain actions, verify network + contract + authoritative state before claiming success.

## Known Risks

1. Same-token concurrent mint race.
2. Stale frontend availability/price/pause state.
3. Contract owner key compromise or loss.
4. Admin signature replay/session theft/revoked-admin session.
5. Partial IPFS/backup failure and retry consistency.
6. DB loss or stale operational records.
7. RPC/provider outages and duplicate event observations.
8. Accidentally mutable token URI/content after mint.
9. Environment/contract-address confusion between Sepolia and Mainnet.
10. Legal/license wording not ready for production.

## Open Engineering Decisions Codex May Resolve With ADR

Provided approved behavior is preserved, Codex may make and document reasonable engineering choices for:

- project/repository structure;
- frontend/backend framework selection when repository does not already constrain it;
- PostgreSQL or another justified operational datastore;
- mature ERC-721-compatible implementation/library for the fixed 10-token collection;
- wallet connector library;
- SIWE/EIP-4361-compatible admin challenge implementation;
- concurrency control for Admin edits;
- transaction-event reconciliation mechanism;
- local caching strategy for non-authoritative data;
- exact REST/API route naming and internal module/class structure;
- logging/metrics libraries and test tooling.

## Decisions Codex Must Not Invent

- Base Mainnet mint price (`OD-009`).
- Final legal license text (`OD-021`).
- Changing single Contract Owner to multisig or another governance model (`OD-022`).
- Season 2 scope/size/contract model (`OD-024`).
- Any increase to Genesis supply.
- Any commercial-use rights.
- Any burn/reservation/auction/secondary-market behavior.

For provider/cost choices (RPC, IPFS, backup), Codex may recommend and create provider-neutral abstractions/configuration, but should not assume paid accounts or credentials exist.
