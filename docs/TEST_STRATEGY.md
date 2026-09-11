# Pigverse Test Strategy

## Principles

- Every Core/MUST requirement has an executable verification path.
- Contract invariants are tested independently from UI.
- Chain-authoritative behavior is tested with stale/incorrect DB projections.
- Critical failure/concurrency paths are first-class tests, not only happy paths.
- Do not weaken tests to make implementation pass.

## Test Layers

### Smart Contract Unit / Property Tests

Cover token range, one-time mint, max supply, price, pause, owner authorization, no reserve/burn path, metadata immutability and race-equivalent repeated calls.

### Backend Unit Tests

Cover validation, authorization policies, state transitions, localization publication rules, audit event creation, retry decisions, reconciliation rules.

### Backend Integration Tests

Use real test DB and controlled/fake external adapters where appropriate for auth challenge atomicity, content+audit transactions, asset partial failures, dedupe, recovery/reconciliation.

### API Tests

Verify status/error codes, validation, unauthorized/forbidden cases, idempotent retry behavior, pagination and safe error contracts.

### Frontend Component/Integration Tests

Wallet state changes, locale switching, collection filters, mint states, stale state refresh, Admin form conflicts, accessibility-critical behavior.

### E2E Browser Tests

Run against Base Sepolia/local chain-compatible test environment with wallet automation or deterministic test harness. Cover public journey, connect, selected-token mint, failure/retry, My NFTs, Admin auth/content/publish.

### Security Tests

Admin auth replay/expiry, unauthorized Admin, contract owner access control, input/XSS/upload rules, secret/config review.

### Concurrency / Race Tests

- two mint attempts for same token -> one success at most;
- two Admin stale edits -> no silent lost update;
- token minted while Admin edit/publish occurs -> protected mutation rejected;
- duplicate event ingestion -> one logical activity record.

### Recovery Tests

Start from missing/stale operational DB and demonstrate reconstruction/reconciliation from chain + IPFS + backup.

## Traceability Matrix

| Requirement | Primary Test Types | Critical Scenarios | Priority |
|---|---|---|---|
| FR-PUBLIC-001 | UI, API, E2E | Home content, featured, N/10 | P1 |
| FR-PUBLIC-002 | UI, API, E2E | 10 cards, filters, stale mint state | P1 |
| FR-PUBLIC-003 | UI, API | valid/invalid token, minted owner | P1 |
| FR-WALLET-001 | UI, E2E | connect/reject/account/chain/disconnect | P1 |
| FR-MINT-001 | Contract, UI, E2E, concurrency | exact token, same-token race, pause, price, wrong network | P0 |
| FR-MINT-002 | UI, E2E, integration | pending, refresh, revert, unknown provider | P0 |
| FR-MINT-003 | Contract, UI | paused browsing + disabled mint | P0 |
| FR-WALLET-002 | UI, integration | zero/multiple NFTs, external transfer | P1 |
| FR-ADMIN-001 | Unit, API, security, E2E | valid admin, non-admin, replay, expiry | P0 |
| FR-ADMIN-002 | API, integration, concurrency | edit, audit, stale edit, minted lock | P0 |
| FR-ASSET-001 | Integration, failure | partial IPFS/backup, retry, revision race | P0 |
| FR-ADMIN-003 | API, integration, concurrency | publish/unpublish, minted concurrently | P0 |
| FR-ADMIN-004 | API, integration | append-only audit, historical revoked admin | P1 |
| FR-ADMIN-005 | Integration, API | success/failure/pending, duplicate event | P1 |
| FR-CONTRACT-001 | Contract, E2E | owner/non-owner, pending mint around pause | P0 |
| FR-CONTRACT-002 | Contract, E2E | owner/non-owner, current price | P0 |
| FR-I18N-001 | UI, API | VI/EN switch, required fields | P1 |
| FR-RECOVERY-001 | Recovery drill | DB loss/stale DB, reconstruct chain/content | P0 before prod |
| FR-LICENSE-001 | UI/content | accessible terms, transfer still accessible | P1 before mainnet |

## Required Test Environments

- fast local/unit environment;
- deterministic contract test environment;
- integration environment with DB;
- Base Sepolia staging for real wallet/RPC/provider validation;
- production-like release rehearsal with non-production credentials/config.

## Exit Criteria Per Milestone

A milestone is not complete until:

- linked requirements implemented;
- acceptance scenarios pass;
- relevant unit/integration/API/contract/E2E tests pass;
- build/lint/static checks pass;
- no known BLOCKER/HIGH finding in changed scope;
- docs/traceability/roadmap status updated;
- final diff reviewed.
