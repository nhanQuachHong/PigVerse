# Local Failure Drills

Status: local deterministic gate implemented; hosted and live-provider drills
remain pending.

Run:

```text
pnpm test:failure-drills
```

The gate exercises controlled failures across these boundaries:

| Boundary | Injected condition | Required evidence |
|---|---|---|
| Readiness | false, rejected or timed-out chain/database check | HTTP 503, redacted component state and correlation ID |
| Admin authentication | invalid, replayed, unauthorized, rate-limited or unavailable verification | stable denial and redacted structured event |
| Mint reconciliation | unavailable/invalid transaction evidence and persistence conflict | fail-closed status and redacted event |
| Public chain reads | missing configuration, unavailable ownership/detail/collection state and unexpected resolver failure | honest degraded/503 response and redacted event |
| Asset pipeline | IPFS/backup failure, invalid provider result, chain failure, integrity conflict and unexpected checkpoint-store failure | durable safe error or rethrow plus allowlisted event |

Tests assert that logging failure cannot change the product/API outcome and that
raw exceptions, provider endpoints, credentials, wallet/transaction identifiers,
token/content identifiers, CIDs, backup references, bilingual content and asset
bytes do not enter operational events.

This command is a fast deterministic regression gate, not release evidence for
specific vendors or hosted infrastructure. After OD-005, OD-006 and OD-007 are
resolved, M12/M15 must add and execute controlled live drills for the selected
RPC, IPFS, backup, database, alert-routing and failover configuration. Results
must be captured against the exact release candidate.
