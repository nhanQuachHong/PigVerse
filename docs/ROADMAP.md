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

**Status:** IN DEVELOPMENT — concrete publication-bound mint and owner withdrawal pass local integration tests alongside core invariants; adversarial integration tests, deployment verification and backend publication synchronization remain pending.

**Goal:** Implement and verify the 10-token exact-mint contract.

**Requirements:** `FR-MINT-001`, `FR-MINT-003`, `FR-CONTRACT-001`, `FR-CONTRACT-002`.  
**Rules:** `BR-001..005`, `BR-008`, `BR-010`, `BR-011`, `BR-017`, `BR-018`.  
**Tasks:** choose/document ERC-721-compatible design; implement token range/supply; exact mint; price; pause; owner; metadata immutability approach; deploy local/test; contract tests/security analysis.  
**Risk:** metadata mutability and hidden admin/reserve paths.  
**DoD:** all contract invariants and owner authorization tests pass.

## M3 — Public Home + Collection

**Goal:** Deliver Home and Collection with 10 Genesis slots using the shared frontend foundation.

**Requirements:** `FR-PUBLIC-001`, `FR-PUBLIC-002`, part of `FR-I18N-001`.  
**Tasks:** content model; public APIs; 10-card grid; filters; featured characters; N/10 progress.  
**DoD:** public acceptance tests pass using chain-aware projections.

## M4 — NFT Detail

**Goal:** Deliver the NFT Detail experience for every valid Genesis token.

**Requirements:** `FR-PUBLIC-003`, part of `FR-I18N-001`, `FR-LICENSE-001` placeholder only until legal text is approved.  
**Tasks:** artwork/gallery; bilingual character content; status; token and owner identifiers; network, contract and explorer links; invalid-token handling; live state refresh.  
**DoD:** detail acceptance tests pass for valid, invalid, available, minted and degraded-chain states.

## M5 — Wallet + Mint Flow

**Goal:** Complete the collector exact-token mint journey on Base Sepolia.

**Requirements:** `FR-WALLET-001`, `FR-MINT-001..003`.  
**Tasks:** wallet connector; network handling; preflight; exact-token transaction; pending restoration; result celebration.  
**Tests:** race, reject, wrong network, pause, price change, refresh and RPC degradation.  
**DoD:** selected-token mint works on Base Sepolia and does not falsely report success.

## M6 — My NFTs

**Goal:** Show Genesis NFTs currently owned by the connected wallet.

**Requirements:** `FR-WALLET-002`.  
**Tasks:** chain-authoritative ownership query; owned-card list; empty, loading and degraded states; external-transfer refresh.  
**DoD:** My NFTs acceptance tests pass without treating application database state as ownership authority.

## M7 — Story

**Goal:** Deliver the bilingual Pigverse Story using the public shell and shared content patterns.

**Requirements:** part of `FR-I18N-001`; `FR-LICENSE-001` only after approved legal text exists.  
**Tasks:** Story route/content model; responsive editorial layout; locale and asset behavior; accessible reading flow.  
**DoD:** VI/EN Story renders consistently at approved desktop/mobile viewports with missing-content behavior verified.

## M8 — Admin Foundation

**Goal:** Establish the admin shell and secure Admin Dashboard access.

**Requirements:** `FR-ADMIN-001`.  
**Tasks:** admin layout/navigation and shared states; challenge/verify/session; Admin authorization store/config; replay prevention; server-side guards; rate limiting; audit auth events where appropriate.  
**Open:** `OD-002`, `OD-003`, `OD-004` should be resolved/documented before production; engineering may choose SIWE-compatible implementation.  
**DoD:** unauthorized/replay/expired scenarios pass security tests.

## M9 — Admin Content + IPFS / Metadata

**Goal:** Manage and publish complete asset packages for the 10 unminted characters safely.

**Requirements:** `FR-ADMIN-002`, `FR-ADMIN-003`, `FR-ADMIN-004`, `FR-ADMIN-005`, `FR-ASSET-001`, `FR-I18N-001`.  
**Tasks:** draft editor; bilingual validation; concurrency/versioning; publish/unpublish; chain recheck; append-only audit and mint reconciliation; provider adapters/config; upload validation; artwork/IPFS; backup; metadata generation; metadata/IPFS + backup; revision binding; retry/error UI.  
**Open:** provider selections, upload limits, exact metadata schema.  
**DoD:** minted-lock, stale-edit, partial-failure, retry, duplicate-observation and historical revoked-admin tests pass; recovery references are recorded.

## M10 — Security Hardening

**Goal:** Remove critical/high security blockers.

**Scope:** admin auth, sessions, uploads, web security, secret management, contract review, owner operations.  
**Tasks:** threat review; dependency scan; contract static/manual review; headers/CSP/CORS/CSRF as applicable; rate limiting; secret scan; owner action UX/network safeguards.  
**DoD:** no unresolved BLOCKER/HIGH security finding in approved scope.

## M11 — Full E2E + Visual Regression

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

**Goal:** Demonstrate recovery of Genesis public state.

**Requirements:** `FR-RECOVERY-001`.  
**Tasks:** reconciliation job/CLI; rebuild process; backup/restore docs; stale DB correction; dry-run safety.  
**DoD:** recovery drill from chain + IPFS + backup passes.

## M15 — Reliability & Observability

**Goal:** Production-grade failure handling and visibility.

**Scope:** `NFR-REL-*`, `NFR-OPS-004..006`.  
**Tasks:** structured logs; health; metrics/alerts; RPC/IPFS/storage timeout/retry; provider degraded states; correlation IDs.  
**DoD:** controlled provider-failure drills produce correct degraded behavior and observable signals.

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
