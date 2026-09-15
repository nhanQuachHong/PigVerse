# ADR 0019 — Authoritative receipt state

Status: Accepted local transaction-state foundation; live Base Sepolia
verification remains pending.

## Decision

Mint, publication and Owner-control UI share one receipt-state hook with five
states: `idle`, `pending`, `success`, `reverted` and `uncertain`.

The hook observes both Wagmi's wait action and the raw transaction receipt. The
wait action retains pending and transaction-replacement handling. The raw query
polls while no receipt exists and preserves the receipt's actual status.
This is required because Wagmi's wait wrapper throws after seeing a reverted
receipt while it attempts to derive the revert reason; consumers cannot reliably
read `wait.data.status === "reverted"`.

A raw `success` or `reverted` receipt is authoritative. A wait failure without a
raw included receipt is `uncertain`, never success or revert. Contradictory
included statuses fail closed as `uncertain`. Operational audit/reconciliation
failures remain separate from the collector or Owner's chain-derived outcome.

## Consequences

- Included reverts remain traceable and cannot be mislabeled as ownership,
  publication or Owner-control success.
- Pending hashes survive reload and unknown provider outcomes remain visible.
- The raw query adds one bounded receipt polling path while a transaction is
  unresolved, then stops after an included receipt.
- Confirmation/finality beyond first inclusion remains governed by `OD-008` and
  is not resolved by this hook.

## Verification

Requirements: `FR-MINT-002`, `FR-ADMIN-003`, `FR-CONTRACT-001`,
`FR-CONTRACT-002`, `BR-009`, `NFR-REL-006`.

Pure state tests cover idle, pending, uncertain, success, revert and
contradictory observations. Mint, publication and Owner-control component tests
cover their individual persistence/audit behavior. The production-browser mint
profile proves automatic success, reload restoration and included revert on
desktop/mobile. Admin production-browser verification remains pending.
