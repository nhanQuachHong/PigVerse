# ADR 0013 — Browser security header baseline

Status: Accepted baseline for M10; nonce/hash CSP hardening and production-domain
verification remain pending.

## Decision

Serve the following response headers from the Next.js application for every
route, including API responses:

- a default-deny Content Security Policy limited to same-origin application
  resources, HTTPS/WSS connections, local/data fonts and local/blob/data images;
- `frame-ancestors 'none'` plus `X-Frame-Options: DENY` for clickjacking defense;
- `object-src 'none'`, same-origin form actions and a same-origin base URI;
- same-origin resource policy and opener isolation that still permits wallet
  popups;
- a restrictive browser permissions policy;
- MIME-sniffing and referrer protections; and
- one-year HSTS without the unverified `includeSubDomains` or `preload` claims.

The current production Next.js output requires inline framework bootstrap and
style content, so the baseline permits `'unsafe-inline'` for scripts and styles.
It does not allow remote script origins, wildcard script sources or `unsafe-eval`.
Moving to request nonces or build-time script hashes is a remaining M10 hardening
task and must be verified without losing static rendering or wallet behavior.

## Security boundary

Headers reduce browser attack surface but do not replace React output encoding,
server-side validation, same-origin checks or Admin authorization. HTTPS/WSS is
allowed for `connect-src` so configured RPC/provider traffic can be introduced
without broad remote script execution. Provider domains should be narrowed once
OD-005/OD-007 and deployment configuration are final.

## Verification

Requirements: SEC-WEB-001, SEC-CHAIN-001 and the M10 web-security scope.

Unit tests assert the exact policy invariants. Playwright starts the optimized
production server, verifies the emitted response headers and exercises the
existing public/Admin desktop and mobile baselines under the CSP. Final hosted
HTTPS, browser-wallet and deployment-domain verification remain pending.
