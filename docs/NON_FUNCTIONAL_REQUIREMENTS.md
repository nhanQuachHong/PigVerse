# Pigverse Non-Functional Requirements

No unapproved numeric SLA or performance target is invented here. Values that require measurement or Product Owner approval remain TBD.

## Performance

### NFR-PERF-001 — Public Page Responsiveness
Public pages should provide a responsive user experience under expected launch traffic. Numeric response/load targets: TBD.

### NFR-PERF-002 — Blockchain Reads
The UI should avoid unnecessary repeated RPC calls and may cache non-authoritative display data, but must reconcile critical mint/ownership state with chain when correctness matters.

## Concurrency

### NFR-REL-001 — Concurrent Mint Safety
Two or more simultaneous attempts for the same token must never result in duplicate successful mint of that token ID.

### NFR-REL-002 — Admin Concurrent Edits
Concurrent Admin edits must not silently overwrite important content without detection/handling. Exact optimistic locking/version policy is an engineering decision.

## Scalability

### NFR-OPS-001 — Genesis Scale
Architecture must comfortably support the fixed 10-token Genesis collection without unnecessary distributed-system complexity.

### NFR-OPS-002 — Future Collection Extensibility
Design should allow separate future collections/seasons without mutating Genesis. This does not require building a generalized multi-tenant marketplace now.

## Reliability

### NFR-REL-003 — Chain Authority
If application data conflicts with on-chain ownership, chain state wins.

### NFR-REL-004 — Partial Asset Failure
Partial IPFS/backup workflows must not publish an incomplete NFT.

### NFR-REL-005 — Retry Safety
Retrying asset publication or observing duplicate chain events must not create inconsistent duplicate business state.

### NFR-REL-006 — Transaction Restoration
The application should recover an accurate user-visible result when the page refreshes/disconnects during a known pending transaction where enough identifiers are available.

## Availability

### NFR-REL-007 — Read-Only Degradation
When minting is paused, the public gallery remains readable. When one external provider is degraded, the application should fail explicitly rather than presenting false ownership or false mint success.

Availability percentage target: TBD.

## Security

### NFR-SEC-001 — No Private Key Custody
Pigverse must never request, receive, store or log user/admin private keys or seed phrases.

### NFR-SEC-002 — Server-Side Admin Authorization
Admin authorization must be enforced by the backend for Admin operations; hiding UI controls is insufficient.

### NFR-SEC-003 — Signature Challenge Security
Admin wallet authentication must use a nonce/challenge that is time-bounded, single-use, bound to the intended authentication request, and protected from replay.

### NFR-SEC-004 — Contract Owner Authorization
Owner-only contract functions must be enforced on-chain.

### NFR-SEC-005 — Secret Management
RPC credentials, storage API tokens, backend session secrets and deployment secrets must not be committed to source control and must use appropriate environment/secret-management mechanisms.

### NFR-SEC-006 — Input Validation
Admin content, identifiers and all server inputs must be validated. Rendering user/content fields must avoid injection/XSS risks.

### NFR-SEC-007 — Session Protection
Admin sessions must use secure transport and secure session handling. Exact session mechanism/expiry is TBD.

### NFR-SEC-008 — Rate Limiting / Abuse Protection
Apply rate limiting or abuse controls to authentication challenges and sensitive backend operations where appropriate. Exact limits: TBD.

### NFR-SEC-009 — Dependency and Contract Review
Production release requires dependency review and a focused smart-contract security review/testing process.

## Privacy

### NFR-SEC-010 — Data Minimization
Do not collect unnecessary personal data. Wallet addresses and transaction data are public-chain identifiers but must still be used only for stated product/operational purposes.

## Accessibility

### NFR-OPS-003 — Accessible Web UI
Public and Admin UI should follow reasonable web accessibility practices: keyboard usability, semantic controls, readable contrast, alternative text for artwork where applicable. Exact conformance target: TBD.

## Observability

### NFR-OPS-004 — Structured Logging
Log important server/admin/asset-processing failures and correlation identifiers without logging private keys, seed phrases, session credentials or unnecessary sensitive data.

### NFR-OPS-005 — Health Monitoring
Production must expose appropriate health/operational signals for website/backend and critical integrations. Exact platform is TBD.

### NFR-OPS-006 — Mint/Integration Monitoring
Operational monitoring should surface repeated RPC, IPFS, backup, authentication and mint-indexing failures.

## Maintainability

### NFR-OPS-007 — Environment Separation
Base Sepolia and Base Mainnet are separate deployments/configurations. Environment-specific addresses/secrets must not be confused.

### NFR-OPS-008 — Traceable Requirements
Implementation and tests should reference requirement/business-rule IDs where practical.

## Backup / Recovery

### NFR-REL-008 — Content Backup
Artwork/metadata uses IPFS plus backup storage.

### NFR-REL-009 — Recovery Validation
Before production release, recovery of core Genesis state from chain + content stores must be documented and tested.

### NFR-REL-010 — Database Backup
If a database is used for operational/admin data, backup/restore policy and retention are TBD but must be defined before production release.

## Compatibility

### NFR-OPS-009 — EVM Wallet Compatibility
Use a connector approach capable of supporting common EVM wallets. Exact supported-wallet acceptance list is TBD.

### NFR-OPS-010 — Browser Compatibility
Supported browser/device matrix is TBD and must be decided before release testing.

## Localization

### NFR-OPS-011 — VI/EN Localization
Important public content and states support Vietnamese and English. Missing-translation fallback policy is TBD.
