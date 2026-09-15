# ADR 0018 — Bounded RPC read retry

Status: Accepted local reliability foundation for M15; provider failover and
hosted tuning remain pending.

## Decision

The shared server-side JSON-RPC read transport retries at most one transient
failure by default. A retry is allowed only after a network/timeout rejection or
HTTP 408, 425, 429 or 5xx response. It uses a 100 ms linear delay and a new
JSON-RPC request ID. The existing ten-second per-attempt timeout remains.

JSON-RPC errors, contract reverts, malformed successful responses and permanent
HTTP failures are returned immediately. Exhausted transport errors are reduced
to the stable `RPC transport unavailable` category so provider diagnostics or
credentials cannot propagate into application state or user-facing failures.

Retry count, delay and timeout are bounded internal options for deterministic
verification and later deployment tuning: no more than three retries, five
seconds of delay or thirty seconds per attempt. The defaults are engineering
guardrails, not product SLA or provider-selection decisions.

## Rationale

Chain reads are idempotent, so one short retry masks a brief provider/network
interruption without changing chain authority. A strict limit avoids retry
storms and long hidden waits. Business and protocol errors are not transient;
retrying them would waste capacity and could blur the distinction between a
real contract revert and provider degradation.

## Boundaries and follow-up

This decision does not select an RPC provider, add a secondary provider, define
production latency targets or close `OD-007`/`SEC-REV-007`. M12/M15 must tune and
verify the policy against the selected hosted provider, configure alert routing
and exercise a controlled primary/fallback failure drill before release.

## Verification

Requirements: `NFR-REL-007`, `NFR-OPS-006`, `INT-003`.

Unit tests cover transient network recovery, transient HTTP recovery, fresh
request IDs, bounded exhaustion, error redaction, immediate permanent HTTP
failure, immediate JSON-RPC revert, malformed-response rejection and option
bounds. The full build and deterministic desktop/mobile browser suites verify
that public reads and exact-token mint behavior remain intact.
