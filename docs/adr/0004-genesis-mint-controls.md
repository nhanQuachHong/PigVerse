# ADR 0004 — Genesis owner and payment controls

Status: Accepted engineering implementation for M2; Mainnet release decisions remain open.

## Decision

Use the pinned OpenZeppelin Ownable2Step and Pausable components. There is one
active owner. Transfer requires the nominated wallet to accept before gaining
control; the old owner retains control until then. Renunciation is disabled so
an accidental transaction cannot permanently eliminate pause/price controls.
This does not resolve owner custody or lost-key recovery (OD-022/OD-023).

`pause`, `unpause` and `setMintPrice` are checked on-chain with `onlyOwner`.
Backend Application Admin status confers no contract authority. Pausing gates
mint only; ERC-721 reads, approvals and transfers remain available.

Price is an unsigned integer in native currency wei. Each mint must pay exactly
the current price: underpayment, overpayment and a stale nonmatching price
revert. Exact payment avoids implicit donation or refund callbacks. Price
changes emit both old and new values. No Mainnet price is selected here.
The deployment entry point must explicitly supply zero for initial Base
Sepolia price, and keep Mainnet release configuration separate.

## Scope and verification

Requirements: FR-CONTRACT-001/002, the contract part of FR-MINT-003,
BR-004/005/010, NFR-SEC-004 and SEC-CONTRACT-001.

`GenesisMintControls` is abstract. Its composed test harness verifies owner
authorization, current payment enforcement, transfer while paused, and
ownership handover. The harness accepts arbitrary metadata solely for testing;
it is not a deployable product. Publication eligibility and handling paid mint
proceeds must be settled in the concrete application contract before deployment.
