# ADR 0014 — Redacted operational signals

Status: Accepted local foundation for M15; hosted monitoring and alerting remain
pending.

## Decision

Expose two unauthenticated, non-cacheable operational signals:

- `GET /api/health/live` returns HTTP 200 when the Next.js process can serve a
  request. It does not contact external integrations.
- `GET /api/health` is deployment readiness. It returns HTTP 200 only when the
  Base Sepolia configuration is valid, the configured contract can return a
  nonzero current Owner on the expected chain and PostgreSQL answers a minimal
  query. Any failed dependency returns HTTP 503.

Readiness executes independent checks in parallel with a three-second bound per
check. The handler coalesces concurrent probes and retains the safe result for
ten seconds to protect PostgreSQL and RPC from monitoring bursts; the HTTP
response remains `no-store`. These are operational defaults, not approved SLA
claims, and may be tuned from deployment evidence.

The public response contains only `ok/error` component states, overall status,
an ISO timestamp and a bounded correlation ID also returned as the
`X-Correlation-ID` header. It never returns endpoint URLs, contract/Owner
addresses, database errors, stack traces, provider payloads or credentials.
Each failed readiness component emits one structured JSON event with only the
correlation ID, fixed event name, allowlisted integration, severity and
timestamp. Raw exceptions are never accepted by this logger, and logging-sink
failure cannot change the health response. Liveness and readiness are separate
so a provider outage does not cause an orchestrator to restart a healthy
application process.

The same narrow logger boundary covers Admin authentication, content/audit,
Owner-control, publication and mint-activity API failures. Authentication and
public mint-ingestion events accept only a fixed stage and failure category.
Privileged-operation events accept only a fixed operation and an allowlisted
category; they exclude wallet addresses, transaction hashes, token/content
identifiers, URIs, action values and raw errors. Pending or not-yet-visible
transactions are normal observation states and are not logged as failures.
These events are diagnostic signals, not authorization decisions or substitutes
for the append-only chain-evidence audit.

Public collection, NFT-detail and My NFTs API degradation use a separate
`PUBLIC_READ_DEGRADED` event with only the bounded correlation ID, fixed surface,
allowlisted configuration/chain category, severity and timestamp. Responses
carry the same ID in their body and header. Contract/Owner addresses, token IDs,
queried wallets, NFT/ownership state, metadata, RPC endpoint/provider payload and
raw exceptions never enter this event, and a logging-sink failure cannot change
the honest degraded response. Invalid Genesis IDs and wallet inputs are normal
non-alerting client outcomes.

Provider-neutral asset processing emits `ASSET_PIPELINE_FAILED` once for every
safe error result and uses `UNEXPECTED_FAILURE` before rethrowing an unclassified
runtime/store failure. The event contains only the bounded correlation ID,
allowlisted error code, derived severity and timestamp. Artwork/metadata bytes,
bilingual content, token/content identifiers, hashes/CIDs, backup references,
provider payloads and raw exceptions are excluded. Logging failure cannot alter
or mask the pipeline result. This does not select or claim verification of the
still-open IPFS and backup providers.

## Boundaries and follow-up

This signal detects reachability, not full business correctness, provider
latency targets, finality or data freshness. Monitoring must use liveness for
process restart decisions and readiness for traffic/alert decisions. M12/M15
must still configure polling, alert routing and controlled RPC/database failure
drills. IPFS and backup checks will be added only after the providers in
OD-005/OD-006 are approved and implemented.

## Verification

Requirements: NFR-OPS-004, NFR-OPS-005, NFR-OPS-006, NFR-REL-007,
SEC-SECRETS-001 and SEC-LOG-001.

Unit and route tests cover ready, missing configuration, false, rejected and
timed-out integrations, cache/coalescing behavior, correlation propagation,
structured allowlists, Admin auth/content/audit, Owner-control, publication and
mint-activity failure classification, response/log redaction, correlation
propagation, public collection/detail/ownership degradation and logging-sink
isolation, including provider-neutral asset-pipeline failures.
Playwright verifies the emitted degraded response and safe JSON events from the
optimized server when deployment configuration is intentionally absent. Live
provider and hosted monitoring verification remain pending.
