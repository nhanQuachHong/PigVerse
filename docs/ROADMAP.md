# Pigverse Full Product Roadmap

This roadmap covers the approved product through production release. Completing an early milestone does not mean the product is complete.

## M0 — Repository & Engineering Foundation

**Status:** IMPLEMENTED — local verification passed 2026-09-11; hosted CI execution awaits the first authorized push.

**Goal:** Establish repeatable project structure, environments, CI and architecture baseline.

**Requirements:** cross-cutting prerequisites.  
**Tasks:** initialize repo/modules; select/document stack; environment config; CI; test harness; migrations; formatting/lint/static checks; ADRs for major engineering choices.  
**Tests:** build smoke, migration smoke, secret/config checks.  
**DoD:** project builds/tests in CI; Sepolia/Mainnet config separated; no secrets committed.

## M1 — Genesis Smart Contract

**Goal:** Implement and verify the 10-token exact-mint contract.

**Requirements:** `FR-MINT-001`, `FR-MINT-003`, `FR-CONTRACT-001`, `FR-CONTRACT-002`.  
**Rules:** `BR-001..005`, `BR-008`, `BR-010`, `BR-011`, `BR-017`, `BR-018`.  
**Tasks:** choose/document ERC-721-compatible design; implement token range/supply; exact mint; price; pause; owner; metadata immutability approach; deploy local/test; contract tests/security analysis.  
**Risk:** metadata mutability and hidden admin/reserve paths.  
**DoD:** all contract invariants and owner authorization tests pass.

## M2 — Public Content & Collection UI

**Goal:** Deliver Home, Collection, NFT Detail and Story shell with 10 Genesis slots.

**Requirements:** `FR-PUBLIC-001..003`, part of `FR-I18N-001`, `FR-LICENSE-001` placeholder only until legal text approved.  
**Tasks:** content model; public APIs; 10-card grid; filters; featured characters; N/10; identifiers/copy/explorer links; gallery behavior.  
**DoD:** public acceptance tests pass using chain-aware projections.

## M3 — Wallet, Mint UX & My NFTs

**Goal:** Complete collector end-to-end Sepolia journey.

**Requirements:** `FR-WALLET-001`, `FR-MINT-001..003`, `FR-WALLET-002`.  
**Tasks:** wallet connector; network handling; preflight; exact-token transaction; pending restoration; result celebration; My NFTs; external-transfer refresh.  
**Tests:** race, reject, wrong network, pause, price change, refresh, RPC degradation.  
**DoD:** selected-token mint works on Base Sepolia and does not falsely report success.

## M4 — Admin Authentication & Authorization

**Goal:** Secure Admin Dashboard access.

**Requirements:** `FR-ADMIN-001`.  
**Tasks:** challenge/verify/session; Admin authorization store/config; replay prevention; server-side guards; rate limiting; audit auth events where appropriate.  
**Open:** `OD-002`, `OD-003`, `OD-004` should be resolved/documented before production; engineering may choose SIWE-compatible implementation.  
**DoD:** unauthorized/replay/expired scenarios pass security tests.

## M5 — Admin Content Workflow

**Goal:** Manage 10 unminted characters safely.

**Requirements:** `FR-ADMIN-002`, `FR-ADMIN-003`, `FR-I18N-001`.  
**Tasks:** draft editor; bilingual validation; concurrency/versioning; publish/unpublish; chain recheck; audit event foundation.  
**DoD:** minted-lock and stale-edit tests pass.

## M6 — IPFS + Backup Asset Pipeline

**Goal:** Durable content package with safe retry.

**Requirements:** `FR-ASSET-001`.  
**Tasks:** provider adapters/config; upload validation; artwork/IPFS; backup; metadata generation; metadata/IPFS + backup; revision binding; retry/error UI.  
**Open:** provider selections, upload limits, exact metadata schema.  
**DoD:** partial failures never yield publishable state; recovery refs recorded.

## M7 — Audit & Mint Operations

**Goal:** Provide operational traceability.

**Requirements:** `FR-ADMIN-004`, `FR-ADMIN-005`.  
**Tasks:** append-only audit; mint observation/reconciliation; dedupe; activity UI; filters/pagination as justified.  
**DoD:** duplicate observations and historical revoked-admin cases pass.

## M8 — Localization & License Completion

**Goal:** Complete VI/EN product content and holder-rights disclosure.

**Requirements:** `FR-I18N-001`, `FR-LICENSE-001`.  
**Tasks:** locale selection; missing-translation policy; all critical states; license surface.  
**Blocker:** final legal text must be approved before Mainnet.  
**DoD:** bilingual critical flows complete; approved license accessible.

## M9 — Recovery & Reconciliation

**Goal:** Demonstrate recovery of Genesis public state.

**Requirements:** `FR-RECOVERY-001`.  
**Tasks:** reconciliation job/CLI; rebuild process; backup/restore docs; stale DB correction; dry-run safety.  
**DoD:** recovery drill from chain + IPFS + backup passes.

## M10 — Security Hardening

**Goal:** Remove critical/high security blockers.

**Scope:** admin auth, sessions, uploads, web security, secret management, contract review, owner operations.  
**Tasks:** threat review; dependency scan; contract static/manual review; headers/CSP/CORS/CSRF as applicable; rate limiting; secret scan; owner action UX/network safeguards.  
**DoD:** no unresolved BLOCKER/HIGH security finding in approved scope.

## M11 — Reliability & Observability

**Goal:** Production-grade failure handling and visibility.

**Scope:** `NFR-REL-*`, `NFR-OPS-004..006`.  
**Tasks:** structured logs; health; metrics/alerts; RPC/IPFS/storage timeout/retry; provider degraded states; correlation IDs.  
**DoD:** controlled provider-failure drills produce correct degraded behavior and observable signals.

## M12 — Full E2E / Regression

**Goal:** Verify all critical journeys together.

**Tasks:** automate/public+wallet+mint+admin+asset+recovery E2E where feasible; full acceptance suite; accessibility/browser matrix; regression.  
**DoD:** P0/P1 acceptance scenarios pass on release candidate.

## M13 — Production Infrastructure & Mainnet Readiness

**Goal:** Prepare Base Mainnet without contaminating Sepolia configuration.

**Tasks:** production secrets; provider accounts; backups; deployment/rollback; monitoring; contract deployment plan; verify owner wallet custody; set approved price; final contract review; browser/wallet support matrix.  
**Product/ops blockers:** `OD-009`, `OD-021`, `OD-022`, `OD-023` and provider credentials/choices required for actual release.

## M14 — Release Readiness Audit

**Goal:** Compare every approved requirement to implementation/tests/docs.

**Tasks:** traceability audit; migration/backup/restore test; secret scan; permission checks; final diff; runbook; rollback rehearsal.  
**DoD:** no approved-scope release blocker remains.

## M15 — Base Mainnet Production Release

**Goal:** Deploy production contract/application and enable approved mint configuration.

**DoD:** smoke tests, monitoring active, correct contract/network visible, owner/admin controls verified, public mint explicitly enabled only after checklist approval.

## M16 — Post-Release Stabilization

**Goal:** Monitor errors, mint activity, provider failures, UX issues and security alerts; fix verified production issues with regression tests.

## Future / Optional — Season 2

Season 2/Collection 2 is conceptually allowed but **not yet specified for implementation**. Do not generalize the Genesis architecture into a marketplace or multi-collection product until `OD-024` is resolved and new requirements are approved.
