# Pigverse Full Product Roadmap

This roadmap covers the approved product through production release. Completing an early milestone does not mean the product is complete.

## M0 — Repository & Engineering Foundation

**Status:** IMPLEMENTED — local verification passed 2026-09-11; hosted CI execution awaits the first authorized push.

**Goal:** Establish repeatable project structure, environments, CI and architecture baseline.

**Requirements:** cross-cutting prerequisites.  
**Tasks:** initialize repo/modules; select/document stack; environment config; CI; test harness; migrations; formatting/lint/static checks; ADRs for major engineering choices.  
**Tests:** build smoke, migration smoke, secret/config checks.  
**DoD:** project builds/tests in CI; Sepolia/Mainnet config separated; no secrets committed.

## M1 — Frontend Foundation

**Status:** VERIFIED — local unit, build, accessibility and desktop/mobile visual-regression checks passed 2026-09-12; hosted CI awaits the first authorized push.

**Goal:** Establish the shared frontend foundation before implementing full pages.

**Requirements:** cross-cutting prerequisites for `FR-PUBLIC-*`, `FR-WALLET-*`, `FR-MINT-*`, `FR-ADMIN-*`, `FR-I18N-001` and `FR-LICENSE-001`.  
**Tasks:** application shell; routing; public/admin layouts; responsive container and navigation; design tokens; typography; color, spacing, radius and shadow scales; button/form/card primitives; `NFTCard`; `NFTStatusBadge`; `WalletButton`; `PageContainer`; `SectionHeading`; `Modal`; empty/error/loading states; toast pattern; shared icons; asset conventions; VI/EN localization foundation; accessibility baseline; screenshot/visual-regression foundation.  
**Rules:** full pages may not introduce page-local substitutes for shared primitives. Approved design references set visual direction; the foundation implements it consistently.  
**Tests:** component behavior; keyboard/focus semantics; responsive shell; locale switching/fallbacks; deterministic visual screenshots at approved desktop/mobile viewports.  
**DoD:** shared foundations are documented, reusable, tested and visually verified before full-page delivery starts.

## M2 — Genesis Smart Contract

**Status:** IN DEVELOPMENT — concrete publication-bound mint and owner withdrawal pass local and adversarial integration tests alongside core invariants. The authenticated Admin UI reads pause, mint price and contract balance from chain, sends pause/unpause/price/withdraw transactions through the connected Owner wallet, and requires an explicit recipient-and-balance confirmation for withdrawal. Included Owner transactions are recovered by hash, independently verified from chain and atomically persisted with append-only audit events. Live Base Sepolia deployment, finality/reorg reconciliation and Owner-wallet custody verification remain pending.

**Goal:** Implement and verify the 10-token exact-mint contract.

**Requirements:** `FR-MINT-001`, `FR-MINT-003`, `FR-CONTRACT-001`, `FR-CONTRACT-002`.  
**Rules:** `BR-001..005`, `BR-008`, `BR-010`, `BR-011`, `BR-017`, `BR-018`.  
**Tasks:** choose/document ERC-721-compatible design; implement token range/supply; exact mint; price; pause; owner; metadata immutability approach; deploy local/test; contract tests/security analysis.  
**Risk:** metadata mutability and hidden admin/reserve paths.  
**DoD:** all contract invariants and owner authorization tests pass.

## M3 — Public Home + Collection

**Status:** IN DEVELOPMENT — Home and Collection now render canonical artwork, VI/EN content and honest chain-derived/degraded states; desktop/mobile screenshots reviewed. Live deployment integration and final character-content enrichment remain pending.

Home (`FR-PUBLIC-001`, `BR-001`, `BR-007`, `BR-015`): renders the approved Pigverse hero direction, four featured canonical characters, all ten Genesis identities, chain-derived N/10 progress, degraded-state retry and Story/Collection paths. Component coverage proves the specified authoritative `3 / 10 Minted` acceptance state; E2E covers VI/EN rendering (including the mobile-menu locale control), exact card counts, responsive overflow and desktop/mobile visual baselines.

Collection freshness (`FR-PUBLIC-002`, `BR-009`): visible pages refresh their server-derived state every 30 seconds and on tab return. Hidden tabs and pending refresh transitions do not initiate automatic reads; manual retry shares the pending guard. Hook tests cover timing, visibility, cleanup and pending transitions. This is browsing freshness, not a replacement for pre-mint chain validation; live deployed-contract verification remains pending.

**Goal:** Deliver Home and Collection with 10 Genesis slots using the shared frontend foundation.

**Requirements:** `FR-PUBLIC-001`, `FR-PUBLIC-002`, part of `FR-I18N-001`.  
**Tasks:** content model; public APIs; 10-card grid; filters; featured characters; N/10 progress.  
**DoD:** public acceptance tests pass using chain-aware projections.

## M4 — NFT Detail

**Status:** IN DEVELOPMENT — Valid Genesis routes render canonical artwork, chain-derived status/owner, deployment identifiers, on-chain IPFS metadata URI when available, related tokens, license disclosure and responsive visual baselines. Live deployed-state verification and approved final VI/EN character lore remain pending.

The current detail experience deliberately labels editorial content as pending approval because final polished character stories have not been supplied (`SPEC_REVIEW.md`). It does not promote placeholder lore to canon. Invalid and non-canonical route IDs return 404; degraded reads remain explicit and never imply mintability. API/service/component tests cover invalid IDs, the unconfigured state and a minted owner/deployment/IPFS fixture.

**Goal:** Deliver the NFT Detail experience for every valid Genesis token.

**Requirements:** `FR-PUBLIC-003`, part of `FR-I18N-001`, `FR-LICENSE-001` placeholder only until legal text is approved.  
**Tasks:** artwork/gallery; bilingual character content; status; token and owner identifiers; network, contract and explorer links; invalid-token handling; live state refresh.  
**DoD:** detail acceptance tests pass for valid, invalid, available, minted and degraded-chain states.

## M5 — Wallet + Mint Flow

**Status:** IN DEVELOPMENT — the reactive injected/EIP-6963 wallet foundation,
Base Sepolia network guard, exact-token preflight/submission, pending restoration
and authoritative receipt outcomes are implemented locally. Deterministic
production-browser EIP-1193 tests now cover approval, rejection, account change,
disconnect and Base Sepolia switching on desktop/mobile. A separate deterministic
production-browser profile verifies the selected token/revision calldata, exact
current value, pending-hash persistence and authoritative success restoration on
desktop/mobile; live deployed-chain and named real-wallet verification remain
pending.

**Goal:** Complete the collector exact-token mint journey on Base Sepolia.

**Requirements:** `FR-WALLET-001`, `FR-MINT-001..003`.  
**Tasks:** wallet connector; network handling; preflight; exact-token transaction; pending restoration; result celebration.  
**Tests:** race, reject, wrong network, pause, price change, refresh and RPC degradation.  
**DoD:** selected-token mint works on Base Sepolia and does not falsely report success.

## M6 — My NFTs

**Status:** VERIFIED LOCALLY — chain-derived ownership, zero-token, unavailable,
refresh and account-change behavior pass unit/API/UI and responsive visual tests.
Production-browser coverage connects a deterministic injected wallet, renders
the owned card response and re-queries to a verified empty state after
`accountsChanged`; live Base Sepolia transfer verification awaits deployment.

**Goal:** Show Genesis NFTs currently owned by the connected wallet.

**Requirements:** `FR-WALLET-002`.  
**Tasks:** chain-authoritative ownership query; owned-card list; empty, loading and degraded states; external-transfer refresh.  
**DoD:** My NFTs acceptance tests pass without treating application database state as ownership authority.

## M7 — Story

**Status:** IN DEVELOPMENT — responsive VI/EN editorial structure, approved
illustrations and explicit missing-content behavior pass local UI/visual checks;
final Product Owner-approved bilingual narrative copy is still required.

**Goal:** Deliver the bilingual Pigverse Story using the public shell and shared content patterns.

**Requirements:** part of `FR-I18N-001`; `FR-LICENSE-001` only after approved legal text exists.  
**Tasks:** Story route/content model; responsive editorial layout; locale and asset behavior; accessible reading flow.  
**DoD:** VI/EN Story renders consistently at approved desktop/mobile viewports with missing-content behavior verified.

## M8 — Admin Foundation

**Status:** IN DEVELOPMENT — hashed PostgreSQL challenge/session persistence,
origin-bound expiring single-use wallet challenges, signature verification,
current-owner authorization, strict opaque cookies, logout/session routes and
bounded PostgreSQL-shared abuse controls plus a wallet-signature access UI pass
local security, component and visual tests; deployed PostgreSQL/RPC wallet E2E and the
privileged workflows assigned to later milestones remain pending.

**Goal:** Establish the admin shell and secure Admin Dashboard access.

**Requirements:** `FR-ADMIN-001`.  
**Tasks:** admin layout/navigation and shared states; challenge/verify/session; Admin authorization store/config; replay prevention; server-side guards; rate limiting; audit auth events where appropriate.  
**Open:** `OD-002`, `OD-003`, `OD-004` should be resolved/documented before production; engineering may choose SIWE-compatible implementation.  
**DoD:** unauthorized/replay/expired scenarios pass security tests.

## M9 — Admin Content + IPFS / Metadata

**Status:** IN DEVELOPMENT — environment-bound immutable content revisions,
optimistic stale-edit detection, in-transaction chain mint rechecks, atomic draft
audit events and session-protected list/update APIs pass local tests. A
provider-neutral retry-safe asset pipeline, revision-bound PostgreSQL checkpoints,
owner-signed publish/unpublish preparation, inclusion reconciliation and
idempotent inclusion/audit persistence are implemented and locally verified. The
bilingual 10-slot editor, guarded publication controls, paginated immutable
audit history and chain-reconciled mint activity view pass component, API and
desktop/mobile visual tests. Verified successful mint observations atomically
lock the current matching content revision. Concrete IPFS and backup-provider
adapters, the Admin asset-processing route/UI and live database/deployed-chain
verification remain pending.

**Goal:** Manage and publish complete asset packages for the 10 unminted characters safely.

**Requirements:** `FR-ADMIN-002`, `FR-ADMIN-003`, `FR-ADMIN-004`, `FR-ADMIN-005`, `FR-ASSET-001`, `FR-I18N-001`.  
**Tasks:** draft editor; bilingual validation; concurrency/versioning; publish/unpublish; chain recheck; append-only audit and mint reconciliation; provider adapters/config; upload validation; artwork/IPFS; backup; metadata generation; metadata/IPFS + backup; revision binding; retry/error UI.  
**Open:** provider selections, upload limits, exact metadata schema.  
**DoD:** minted-lock, stale-edit, partial-failure, retry, duplicate-observation and historical revoked-admin tests pass; recovery references are recorded.

## M10 — Security Hardening

**Status:** IN DEVELOPMENT — application-wide CSP, clickjacking, MIME-sniffing,
referrer, browser-capability, cross-origin isolation and HSTS response headers are
implemented and verified against a production Next.js server. A redacting
repository secret gate and high-severity production dependency audit are wired
into CI, and the living threat/risk review is recorded in `SECURITY_REVIEW.md`.
A per-request nonce now protects production framework scripts without
`unsafe-inline` or `unsafe-eval`, with wallet and visual regression coverage.
Admin authentication rate limits now use atomic PostgreSQL counters shared
across application instances. Inline style compatibility, live multi-instance
rate-limit verification, upload hardening and the complete contract review remain
pending; open HIGH findings prevent M10 completion.

**Goal:** Remove critical/high security blockers.

**Scope:** admin auth, sessions, uploads, web security, secret management, contract review, owner operations.  
**Tasks:** threat review; dependency scan; contract static/manual review; headers/CSP/CORS/CSRF as applicable; rate limiting; secret scan; owner action UX/network safeguards.  
**DoD:** no unresolved BLOCKER/HIGH security finding in approved scope.

## M11 — Full E2E + Visual Regression

**Status:** IN DEVELOPMENT — optimized production-server desktop/mobile tests
cover the public pages, Admin foundations, security headers and deterministic
injected-wallet connect/reject/account/disconnect/network-switch journeys while
preserving approved visual baselines. The deterministic mint profile also covers
exact transaction submission, pending persistence and successful receipt
restoration. Admin signing/publication, asset and recovery journeys against
deployed services plus live mint and the approved browser/wallet matrix remain
pending.

**Goal:** Verify all critical journeys and visual contracts together.

**Tasks:** automate public, wallet, mint, admin, asset and recovery E2E where feasible; full acceptance suite; accessibility/browser matrix; deterministic desktop/mobile screenshots; regression thresholds and artifact retention.  
**DoD:** P0/P1 acceptance scenarios and approved visual baselines pass on the release candidate.

## M12 — Base Sepolia Deployment / Release Candidate

**Goal:** Deploy and verify a complete internal release candidate on Base Sepolia.

**Tasks:** Sepolia secrets/config; contract and application deployment; migrations; smoke tests; monitoring; rollback drill; record verified addresses and artifacts.  
**DoD:** complete approved workflow operates on Base Sepolia with no unresolved release-candidate blocker. This milestone does not authorize Mainnet deployment.

## M13 — Localization & License Completion

**Goal:** Complete VI/EN product content and holder-rights disclosure.

**Requirements:** `FR-I18N-001`, `FR-LICENSE-001`.  
**Tasks:** locale selection; missing-translation policy; all critical states; license surface.  
**Blocker:** final legal text must be approved before Mainnet.  
**DoD:** bilingual critical flows complete; approved license accessible.

## M14 — Recovery & Reconciliation

**Status:** IN DEVELOPMENT — a read-only Base Sepolia inspection CLI captures
all ten ownership/publication/immutable-URI records at one verified block and
fails closed on wrong contract identity, ambiguous token reverts or inconsistent
supply. Local deterministic recovery fixtures pass. Content reconstruction,
database apply mode and a live chain + IPFS + backup drill remain pending.

**Goal:** Demonstrate recovery of Genesis public state.

**Requirements:** `FR-RECOVERY-001`.  
**Tasks:** reconciliation job/CLI; rebuild process; backup/restore docs; stale DB correction; dry-run safety.  
**DoD:** recovery drill from chain + IPFS + backup passes.

## M15 — Reliability & Observability

**Status:** IN DEVELOPMENT — separate process-liveness and redacted deployment-
readiness endpoints are implemented. Readiness checks configuration, current
on-chain Owner access and PostgreSQL within bounded time, coalesces concurrent
probes and reports only `ok/error`; optimized-server tests verify degraded
behavior without leaking integration details. Structured failure logging with
correlation IDs and allowlisted integration names is implemented for health
failures, Admin authentication failures, Owner-control API failures and both
stages of the publication API. Mint-activity ingestion and Admin reconciliation
now propagate correlation IDs and emit separate redacted failure/degradation
events. Inclusion polling and not-yet-visible mint transactions do not warn, and
operation events exclude wallet, transaction, token/content, value, URI and
provider-error data. Admin content list/update routes now carry the same redacted
correlation and failure contract, as does the paginated Admin audit route.
The public collection API now propagates correlation IDs and emits a distinct
redacted degradation event when configuration or chain state is unavailable;
the NFT-detail API now follows the same contract while treating out-of-domain
IDs as ordinary non-alerting 404 responses. My NFTs now reports ownership-read
degradation with the same redacted contract while invalid wallet input remains
non-alerting. The provider-neutral asset pipeline now emits correlation-bound,
allowlisted failure codes without asset/content/provider data. Provider-specific
health, metrics/alerts and retry/failover remain. A deterministic 42-case local
failure-drill gate covers readiness, authentication, mint reconciliation, public
chain reads and the asset pipeline; hosted/live-provider drills remain pending.

**Goal:** Production-grade failure handling and visibility.

**Scope:** `NFR-REL-*`, `NFR-OPS-004..006`.  
**Tasks:** structured logs; health; metrics/alerts; RPC/IPFS/storage timeout/retry; provider degraded states; correlation IDs.  
**DoD:** controlled provider-failure drills produce correct degraded behavior and observable signals. The local deterministic gate passes; hosted/live-provider evidence remains required.

## M16 — Production Infrastructure & Mainnet Readiness

**Goal:** Prepare Base Mainnet without contaminating Sepolia configuration.

**Tasks:** production secrets; provider accounts; backups; deployment/rollback; monitoring; contract deployment plan; verify owner wallet custody; set approved price; final contract review; browser/wallet support matrix.  
**Product/ops blockers:** `OD-009`, `OD-021`, `OD-022`, `OD-023` and provider credentials/choices required for actual release.

## M17 — Release Readiness Audit

**Goal:** Compare every approved requirement to implementation/tests/docs.

**Tasks:** traceability audit; migration/backup/restore test; secret scan; permission checks; final diff; runbook; rollback rehearsal.  
**DoD:** no approved-scope release blocker remains.

## M18 — Base Mainnet Production Release

**Goal:** Deploy production contract/application and enable approved mint configuration.

**DoD:** smoke tests, monitoring active, correct contract/network visible, owner/admin controls verified, public mint explicitly enabled only after checklist approval.

## M19 — Post-Release Stabilization

**Goal:** Monitor errors, mint activity, provider failures, UX issues and security alerts; fix verified production issues with regression tests.

## Future / Optional — Season 2

Season 2/Collection 2 is conceptually allowed but **not yet specified for implementation**. Do not generalize the Genesis architecture into a marketplace or multi-collection product until `OD-024` is resolved and new requirements are approved.
