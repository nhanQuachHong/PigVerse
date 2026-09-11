# ADR 0003 — Fixed Genesis ERC-721 core

Status: Accepted engineering decision for the M2 ownership core.

## Context and authority

`ENGINEERING_BRIEF.md` delegates mature ERC-721-compatible implementation
selection. `BR-001..003`, `BR-009`, `BR-011` and `BR-017` require fixed IDs,
unique minting, transferable chain ownership and immutable minted content.

## Decision

Use the already pinned OpenZeppelin Contracts 5.6.1 ERC721 implementation.
The abstract `GenesisNFTCore` stores a token's URI exactly once during mint,
before the receiver callback. There is no URI setter or mutable base URI.
Successful mints increment supply; receiver rejection reverts the entire mint.
The token domain and zero-address/burn prohibition are also enforced in the
ERC-721 ownership update hook. Standard approvals and transfers remain available.

This is a non-upgradeable core. Do not introduce a proxy or overridable metadata
setter that could replace minted content. No burn extension is included.

The core is abstract and exposes no public mint. Test harnesses intentionally
expose internals and must never be used as the application deployment contract.
The concrete contract must enforce publication eligibility, exact payment and
pause before invoking the internal mint with an approved immutable IPFS URI.
Passing an arbitrary collector-supplied URI is not an acceptable public API.

## Consequences and remaining work

This implements the engineering preference for contract-level URI immutability
in OD-016; it does not mark the Product Owner decision FINAL. URI immutability
alone does not prove valid metadata, immutable nested asset references, backup
durability or complete publication. Those remain publishing-pipeline gates.

Public mint authorization, publication synchronization, owner controls and
deployment safety remain subsequent M2 units. No production deployment is
authorized by this ADR, and no Application Admin/Contract Owner permission is
added by the abstract core.
