# ADR 0017 — Chain-bound recovery snapshot

Status: Accepted foundation for M14; provider-backed reconstruction and live
drill remain pending.

## Decision

Begin every Genesis recovery with a read-only Base Sepolia snapshot bound to one
explicit block number and hash. Capture the current Contract Owner, pause state,
mint price, total supply and all ten token ownership/publication/immutable URI
records. Serialize the report as versioned JSON without database content,
credentials or provider errors.

Fail closed unless the configured address has bytecode and identifies itself as
`Pigverse Genesis` / `PIGVERSE` with `MAX_SUPPLY = 10`. Treat a token as unminted
only when `ownerOf` returns the exact OpenZeppelin
`ERC721NonexistentToken(tokenId)` revert. A transport error, generic revert or
malformed result is unknown and aborts the entire snapshot. Require recovered
mint count to equal `totalSupply` and require each minted immutable URI to equal
its retained publication URI.

The initial CLI has no database write/apply mode. This makes the first recovery
artifact safe to inspect and prevents incomplete provider work from mutating
operational state.

## Boundaries

The snapshot proves contract state at the recorded block, not current finality.
Operators must independently confirm the block remains canonical. Contract
identity reads reduce wrong-address risk but do not replace the signed deployment
record or source verification.

This decision cannot reconstruct bilingual editorial content or asset bytes by
itself. Full recovery still requires approved IPFS/backup providers, the final
metadata schema, byte-integrity verification and an isolated transactional
database rebuild. Backups can supply content but never ownership.

## Verification

Requirements: `FR-RECOVERY-001`, `BR-009`, `BR-014`, `BR-015`,
`NFR-REL-009`, `AT-RECOVERY-001` and `AT-RECOVERY-002` (foundation only).

Deterministic tests cover a ten-token snapshot at one block, exact nonexistent-
token classification, mismatched supply, wrong contract identity, mutable URI
conflict and provider-error redaction. The CLI import/config failure path runs on
the required Node.js runtime. Live Base Sepolia, stale-database correction and
IPFS/backup recovery evidence remain required before either acceptance test is
marked complete.
