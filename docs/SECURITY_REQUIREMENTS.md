# Pigverse Security Requirements

## Security Objectives

1. Never custody or expose wallet private keys/seed phrases.
2. Prevent unauthorized Admin actions.
3. Prevent signature replay and session abuse.
4. Enforce smart-contract privileges on-chain.
5. Preserve Genesis mint/supply/immutability invariants even if UI/backend is malicious or stale.
6. Protect provider credentials and production deployment configuration.
7. Prevent untrusted content/input from producing XSS/injection or arbitrary file abuse.

## SEC-AUTH-001 — Admin Wallet Authentication

- Use a structured, replay-resistant wallet-signature challenge; SIWE/EIP-4361 is preferred if compatible.
- Challenge must be high entropy, expiring and single-use.
- Bind challenge to intended domain/origin and wallet identity; include chain/context where standard requires.
- Atomically consume challenge on successful verification.
- Do not establish Admin session until current authorization is checked.

## SEC-AUTH-002 — Admin Session

- Secure transport required in production.
- Use secure cookie/session handling if cookie-based; protect against CSRF where applicable.
- Avoid exposing bearer/session credentials to logs or client storage unnecessarily.
- Session expiry/revocation policy is `OD-003`; sensitive actions should re-check current Admin authorization.

## SEC-AUTHZ-001 — Server-Side Authorization

Every Admin write/read of privileged operational data must enforce authorization in backend code. UI gating is convenience only.

## SEC-AUTHZ-002 — Role Separation

Application Admin and Contract Owner are separate authorities.

- Admin authorization does not grant contract owner rights.
- Contract ownership does not automatically grant backend Admin rights unless wallet is separately authorized.

## SEC-CONTRACT-001 — Genesis Invariants

Contract tests/review must verify:

- token ID domain is 1..10;
- each token mints at most once;
- total supply cannot exceed 10;
- mint requires current configured payment rule;
- public mint respects pause state;
- only owner changes price/pause;
- no unauthorized reserve/admin mint path violates `BR-008/BR-018`;
- no approved burn path;
- minted token metadata cannot be changed contrary to `BR-011`.

## SEC-CONTRACT-002 — Contract Dependencies

Prefer mature audited standard components over custom reimplementation. Pin/review dependency versions. Run static analysis and focused manual review before Mainnet.

## SEC-CONTRACT-003 — Owner Key

Pigverse application must not store the Contract Owner private key. Mainnet owner custody, compromise/loss procedure and any future multisig migration remain explicit open operational/product decisions (`OD-022`, `OD-023`).

## SEC-INPUT-001 — General Validation

- Validate token IDs, wallet addresses, locale values, enums and IDs server-side.
- Do not trust client-supplied owner/mint/pause/price values.
- Normalize EVM addresses consistently without making case-sensitive authorization errors.
- Validate pagination/filter bounds.

## SEC-UPLOAD-001 — Artwork Upload

Before production define allowed formats and size (`OD-014`). At minimum:

- verify actual file/media type rather than filename alone;
- reject active/executable content not required by product;
- bound file size and dimensions/resources;
- avoid unsafe server-side image parsing paths;
- use non-executable object storage semantics;
- sanitize/escape metadata rendered in UI.

## SEC-WEB-001 — Web Security

- Encode untrusted text output to prevent XSS.
- Use CSP and modern secure headers appropriate to stack.
- Restrict CORS to required origins.
- Protect state-changing cookie-auth endpoints against CSRF when applicable.
- No secrets in frontend bundle.

## SEC-ABUSE-001 — Rate Limiting

Apply bounded abuse controls to challenge issuance/verification, Admin authentication failures and expensive/sensitive backend operations. Exact numbers remain TBD based on deployment.

## SEC-SECRETS-001 — Secret Management

Never commit:

- RPC API keys;
- IPFS/pinning tokens;
- object-store credentials;
- session secrets;
- deployment private keys;
- wallet private keys/seed phrases.

Use environment/secret manager/CI secret facilities and least privilege.

## SEC-CHAIN-001 — Network / Contract Binding

All chain actions must validate expected chain ID and configured contract address. Production UI must make the active network/contract clear for privileged owner actions.

## SEC-DATA-001 — Audit Safety

Audit events must not contain private keys, raw session credentials, provider secrets or unnecessary sensitive request payloads.

## SEC-LOG-001 — Logging

Log correlation IDs, high-value security/admin events and integration failures. Redact credentials/tokens. Avoid logging signed authentication material more than needed for safe diagnosis.

## SEC-SUPPLY-CHAIN-001 — Dependencies

Before release:

- dependency vulnerability review;
- lockfile/reproducible dependency management;
- secret scan;
- smart-contract static analysis;
- no unresolved critical/high security findings.

## Required Security Tests

- unauthenticated Admin endpoint denial;
- valid signature from non-admin denied;
- invalid/expired/replayed challenge denied;
- revoked Admin behavior per chosen policy;
- owner-only contract functions reject non-owner;
- mint rejects already-minted token;
- mint rejects paused state;
- token ID out of range rejected;
- content mutation rejected after mint;
- XSS payloads rendered safely;
- upload validation failures;
- environment/network mismatch checks;
- secrets absent from repository/build output.
