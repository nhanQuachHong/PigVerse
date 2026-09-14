# ADR 0009 — Owner-bound Admin wallet authentication

Status: Backend protocol implemented locally; deployed PostgreSQL/RPC and wallet E2E remain pending.

Pigverse Admin authentication uses a server-generated EIP-4361-compatible message
and Viem signature recovery. The message binds the checksummed wallet, configured
application origin/domain, Base Sepolia chain ID, 128-bit random nonce, issuance
time, five-minute expiry and an explicit no-transaction statement. The server
stores SHA-256 hashes of the nonce and complete issued message, not plaintext
credentials, and accepts only the exact issued message.

After signature verification, authorization reads `owner()` from the configured
contract at a pinned block. Missing configuration, wrong chain, missing bytecode,
RPC failure, invalid response or a signer other than the current owner all fail
closed. Challenge consumption and insertion of a 256-bit opaque session are one
PostgreSQL transaction, so concurrent replay creates at most one session.

The session lifetime is 30 minutes as a conservative bounded engineering default
while `OD-003` remains open. Browsers receive only the opaque token in an
`HttpOnly`, `SameSite=Strict`, path-root cookie; production adds `Secure` and the
`__Host-` prefix. Only its SHA-256 hash is persisted. Every session check re-reads
the current contract owner and revokes the session if ownership changed or cannot
be proven. Contract writes still require the owner's wallet transaction; the
backend never holds a signing key.

Challenge and verification routes require the configured exact Origin, cap body
size, return non-cacheable generic failures and apply bounded in-process
fixed-window limits keyed by hashed address/nonce. Production ingress should add
a distributed/IP rate limit because process-local controls do not coordinate
across instances. This remains a deployment hardening item, not an authorization
fallback.

Challenge, verification and session responses carry a bounded correlation ID.
Denied origin, invalid input, rate-limit, authorization and integration failures
emit an allowlisted structured event containing only correlation ID, stage and
safe category. Wallet address, nonce, signed message, signature, session cookie,
raw exception and provider configuration never enter this logger. Logging-sink
failure cannot change the authentication response. Malformed JSON is classified
as invalid input rather than an integration outage.
