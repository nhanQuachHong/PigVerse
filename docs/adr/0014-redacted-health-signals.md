# ADR 0014 — Redacted liveness and readiness signals

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

The public response contains only `ok/error` component states, overall status
and an ISO timestamp. It never returns endpoint URLs, contract/Owner addresses,
database errors, stack traces, provider payloads or credentials. Liveness and
readiness are separate so a provider outage does not cause an orchestrator to
restart a healthy application process.

## Boundaries and follow-up

This signal detects reachability, not full business correctness, provider
latency targets, finality or data freshness. Monitoring must use liveness for
process restart decisions and readiness for traffic/alert decisions. M12/M15
must still configure polling, alert routing and controlled RPC/database failure
drills. IPFS and backup checks will be added only after the providers in
OD-005/OD-006 are approved and implemented.

## Verification

Requirements: NFR-OPS-005, NFR-OPS-006, NFR-REL-007 and SEC-SECRETS-001.

Unit and route tests cover ready, missing configuration, false, rejected and
timed-out integrations, cache/coalescing behavior and response redaction.
Playwright verifies the emitted degraded response from the optimized server when
deployment configuration is intentionally absent. Live provider and hosted
monitoring verification remain pending.
