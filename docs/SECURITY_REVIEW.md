# Pigverse Security Review

Review baseline: `372d099` on 2026-09-14. This is a living release artifact,
not a claim that the unfinished product is production-safe.

## Scope and trust boundaries

Protected assets are the ten Genesis identities and immutable metadata,
collector funds, Contract Owner authority, Admin sessions, content revisions,
provider credentials and append-only audit evidence.

The Base contract is authoritative for ownership, publication, pause and price.
The connected wallet signs mint and Owner transactions. The Next.js server
authenticates Admin sessions, validates content and reconciles chain evidence.
PostgreSQL stores operational projections and audit history but cannot override
chain ownership. RPC, IPFS and backup providers are external trust boundaries.

## Verified controls

| Threat | Control and evidence | Current result |
|---|---|---|
| Duplicate, out-of-range, reserved or burned Genesis tokens | Contract restricts IDs to 1–10, removes raw mint paths and exposes no burn/reserve path; adversarial contract tests cover all ten identities and boundary IDs. | Verified locally |
| Mutable content after mint | Mint copies the published URI into immutable token storage; contract and database tests reject later content/publication changes. | Verified locally |
| Unauthorized pause, price, publication or withdrawal | OpenZeppelin `Ownable2Step`; every privileged contract mutation uses `onlyOwner`; withdrawal has no arbitrary recipient. Negative contract tests cover non-owner calls. | Verified locally |
| Admin signature replay or stale authorization | High-entropy expiring challenges are stored hashed, atomically single-use, domain/URI/chain-bound and verified before a hashed session is created. Every session use re-reads `owner()` and revokes on mismatch/unavailability. | Verified locally |
| Session theft through browser script or cross-site request | Production cookie uses the `__Host-` prefix, `Secure`, `HttpOnly`, `SameSite=Strict` and bounded lifetime. State-changing routes require the exact configured Origin. | Verified locally |
| False success from client-supplied chain state | Mint, publication and Owner-control flows resolve transaction/receipt/calldata/event evidence against the configured chain and contract; inconsistent or unavailable evidence fails closed. | Verified locally at inclusion level |
| Audit duplication or split writes | Publication, mint and Owner inclusion stores use deployment-scoped identifiers, database transactions and idempotency/conflict checks. | Verified locally |
| XSS/clickjacking/browser capability abuse | React renders text; application-wide CSP, frame denial, MIME, referrer, permissions, cross-origin and HSTS headers are asserted against the optimized server. | Baseline verified locally |
| Committed credentials | `verify:secrets` scans tracked and non-ignored candidate files, redacts values in findings and is part of `verify`; CI runs it. Blank examples remain valid. | Verified locally |
| Known production dependency advisory | CI runs `pnpm audit --prod --audit-level high`. The 2026-09-14 local registry result reported no known vulnerabilities. | Time-bound pass |
| Health failure log disclosure | Readiness failures emit only a bounded correlation ID and allowlisted integration category; raw exception/provider content never enters the structured logger. | Verified locally |
| Admin authentication log disclosure | Auth failures emit only bounded correlation ID, fixed stage and allowlisted category; wallet, nonce, message, signature, cookie and raw exception data never enter the logger. | Verified locally |
| Owner-control failure log disclosure | Owner-control API failures emit only bounded correlation ID, fixed operation and allowlisted category; wallet, transaction hash, price, withdrawal amount and raw exception data never enter the logger. Pending polling is not logged as a failure. | Verified locally |
| Publication failure log disclosure | Publication prepare/inclusion failures emit only bounded correlation ID, fixed operation and allowlisted category; wallet, transaction hash, token/content identifiers, metadata URI and raw exception data never enter the logger. Pending inclusion polling is not logged as a failure. | Verified locally |
| Mint-activity failure log disclosure | Public ingestion uses a distinct fixed-stage event; Admin reconciliation uses a fixed-operation event. Both exclude wallet, transaction, token/content, value and raw provider/error data. Pending and not-yet-visible transactions are not logged as failures. | Verified locally |
| Admin content failure log disclosure | Content list/update failures emit only bounded correlation ID, fixed operation and allowlisted category; bilingual content, wallet, token identifier and raw chain/database errors never enter the logger. | Verified locally |
| Admin audit failure log disclosure | Audit authorization, pagination and store failures emit only bounded correlation ID, fixed operation and allowlisted category; actor, action, target, context and raw database errors never enter the logger. | Verified locally |
| Public collection degradation log disclosure | Degraded collection reads emit only bounded correlation ID, fixed surface and allowlisted configuration/chain category; contract, owner, NFT state, metadata and provider details never enter the logger. | Verified locally |
| Public NFT-detail degradation log disclosure | Degraded detail reads use the same bounded public-read event without token ID, owner, metadata, contract/provider or raw exception data; invalid Genesis IDs remain non-alerting 404 responses. | Verified locally |
| My NFTs degradation log disclosure | Unavailable ownership reads emit only bounded correlation ID, fixed surface and allowlisted category; queried wallet, owned tokens, ownership state and provider/error data never enter the logger. Invalid wallet input remains non-alerting. | Verified locally |
| Asset-pipeline failure log disclosure | Every safe pipeline error and unexpected failure emits only bounded correlation ID and an allowlisted code; artwork bytes, bilingual content, token/content identifiers, CIDs, backup references, provider payloads and raw exceptions never enter the logger. | Verified locally |

Primary implementation evidence includes:

- `packages/contracts/contracts/GenesisNFTCore.sol`
- `packages/contracts/contracts/GenesisMintControls.sol`
- `packages/contracts/contracts/PigverseGenesis.sol`
- `apps/web/src/server/admin-auth.ts`
- `apps/web/src/server/admin-auth-store.ts`
- `apps/web/src/server/publication-transaction-reader.ts`
- `apps/web/src/server/mint-transaction-reader.ts`
- `apps/web/src/server/owner-transaction-reader.ts`
- `apps/web/src/server/operational-log.ts`
- `apps/web/src/lib/security-headers.ts`
- `scripts/verify-secrets.mjs`

## Open findings and release blockers

| ID | Severity | Finding | Required closure evidence |
|---|---|---|---|
| SEC-REV-001 | HIGH / release blocker | Owner custody and lost/compromised-key response are unresolved (`OD-022`, `OD-023`). Any exposed key is ineligible for deployment. | Approved custody/runbook, fresh wallet, access rehearsal and Base Sepolia verification |
| SEC-REV-002 | HIGH / release blocker | The Admin asset upload surface is not implemented and format/size limits remain open (`OD-014`). No upload endpoint may be released without actual media inspection, resource bounds and non-executable storage. | Approved limits plus negative upload tests and provider-backed E2E |
| SEC-REV-003 | HIGH / release blocker | Concrete IPFS/backup providers and the metadata schema are unresolved (`OD-005`, `OD-006`, `OD-015`), preventing integrity, permission and recovery review. | Approved providers/schema, least-privilege credentials, pin/backup/recovery drill |
| SEC-REV-004 | MEDIUM | Included receipts are not product finality; reorg repair and the confirmation policy remain open (`OD-008`). | Approved policy plus canonical-block reconciliation and reorg tests |
| SEC-REV-005 | MEDIUM | CSP permits inline framework scripts/styles to preserve current static Next.js output. Remote scripts and `unsafe-eval` remain denied. | Nonce/hash implementation and wallet/static-render regression suite |
| SEC-REV-006 | MEDIUM | Authentication abuse limits are process-local and therefore not globally bounded across horizontally scaled instances. | Deployment topology decision or shared rate limiter with multi-instance tests |
| SEC-REV-007 | MEDIUM | RPC provider/failover and failure alerting are unresolved (`OD-007`). | Provider decision, timeout/failover configuration and controlled failure drill |
| SEC-REV-008 | MEDIUM | Live PostgreSQL migrations, hosted HTTPS headers, real browser wallets and Base Sepolia transaction paths have not been rehearsed together. | M12 deployment runbook and end-to-end release-candidate evidence |

No finding in this table is waived. M10 remains in development while any HIGH
item is open, and Base Mainnet remains unauthorized.

## Commands and evidence cadence

The local baseline runs:

```text
pnpm verify:secrets
pnpm audit:prod
pnpm verify
pnpm test:e2e
```

Registry advisories and deployment state change over time, so their results must
be rerun on the exact release candidate. Hosted CI has not run until an
authorized push occurs.
