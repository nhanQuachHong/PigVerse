# ADR 0016 — Shared authentication rate limits

Status: Accepted local implementation for M8/M10; hosted concurrency verification
remains pending.

## Decision

Enforce the Admin challenge and signature-verification fixed windows with
PostgreSQL counters shared by every Next.js application instance. Use distinct
scopes for challenge issuance and verification, and store only SHA-256 hashes of
the wallet or nonce limiter key. The table has a `(scope, key_hash)` primary key.

Make the allow/deny decision with one atomic `INSERT ... ON CONFLICT DO UPDATE`
statement. PostgreSQL supplies the observed time so application-host clock skew
cannot create different windows. Cap a denied counter at one over its configured
limit and opportunistically delete expired counters, excluding the key being
decided. A database error fails authentication closed with the existing safe 503
response and redacted operational event.

Keep the bounded in-memory limiter only as an explicitly injected unit-test
double. It is not the default for production route exports. Migration `0009`
must run before any application version containing this decision serves Admin
authentication traffic.

## Security boundary

The shared limiter fixes per-process limit multiplication; it is not a complete
internet-edge denial-of-service control. Attackers can vary syntactically valid
wallets or nonce strings, and the application has no trustworthy client-IP
identity at this boundary. Deployment ingress/WAF controls and hosted capacity
limits remain necessary. The limiter never logs or persists plaintext wallets,
nonces, signatures or signed messages.

## Verification

Requirements: SEC-AUTH-002, SEC-LOG-001 and SEC-REV-006.

Unit tests verify atomic-query selection, allow/deny mapping, cleanup selection
and input bounds. Route tests inject the memory double and cover rate-limit and
database-unavailable behavior without weakening the production default.
Migration tests verify the shared key, hash-only schema and expiry index. A
hosted PostgreSQL test issuing concurrent attempts through multiple application
instances is still required before closing SEC-REV-006.
