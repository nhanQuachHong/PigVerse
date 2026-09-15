# ADR 0013 — Browser security header baseline

Status: Accepted baseline for M10; its temporary inline-script exception is
superseded by ADR 0015. Production-domain verification remains pending.

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

This baseline initially permitted `'unsafe-inline'` for framework scripts and
styles. ADR 0015 replaces the script exception with per-request nonces after
production wallet and visual verification. Inline style compatibility remains
explicitly bounded there.

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
