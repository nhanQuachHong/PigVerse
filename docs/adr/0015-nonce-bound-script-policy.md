# ADR 0015 — Nonce-bound script policy

Status: Accepted for M10; hosted deployment verification remains pending.

## Decision

Generate a fresh cryptographically random nonce in the Next.js request proxy for
every document request. Supply the nonce-bound Content Security Policy to both
the request renderer and response so Next.js attaches the same nonce to its
framework and bootstrap scripts. Production `script-src` permits same-origin and
nonce-trusted scripts with `strict-dynamic`; it does not permit `unsafe-inline`,
`unsafe-eval`, wildcard or remote script origins. Development alone permits
`unsafe-eval` for the Next.js debugging runtime.

Call `connection()` in the root layout so every UI route is rendered on demand.
This intentionally gives up static page generation, CDN-cached HTML and some
rendering efficiency: a nonce cannot be safely reused in build-time HTML. Static
assets remain cacheable and excluded from proxy processing.

Keep `style-src 'unsafe-inline'` as a separate, explicit compatibility boundary.
Next/Image and React-generated style attributes are not authorized by a style
nonce, and removing this directive caused visible production regressions. This
decision closes the script portion of SEC-REV-005 only; it does not claim a
strict style policy.

## Security boundary

The proxy overwrites any incoming CSP and `x-nonce` values before rendering. The
nonce format is validated before interpolation to prevent directive injection.
The CSP supplements output encoding, server-side validation and authorization;
it does not make injected trusted scripts safe. `strict-dynamic` lets a trusted
Next.js bootstrap load its own chunks without granting arbitrary remote script
origins in the policy.

## Verification

Requirements: SEC-WEB-001 and SEC-REV-005.

Unit tests cover the production/development policies and reject a nonce capable
of directive injection. Playwright runs the optimized production server and
asserts that consecutive responses rotate nonces, rendered framework scripts
carry the response nonce, and production `script-src` contains neither
`unsafe-inline` nor `unsafe-eval`. The existing public, Admin, wallet, desktop,
mobile and screenshot suite passes under the policy. Hosted HTTPS and real
browser-wallet verification remain part of the release-candidate rehearsal.
