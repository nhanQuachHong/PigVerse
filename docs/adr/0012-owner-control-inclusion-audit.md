# ADR 0012 — Chain-verified Owner control audit

Status: Accepted engineering implementation for local M2 verification; live
deployment and finality/reorg reconciliation remain pending.

## Decision

Pause, unpause, mint-price and withdrawal transactions remain wallet-originated
contract calls. The application never accepts a client assertion that one of
these actions succeeded. The authenticated Admin client submits only the
transaction hash to a same-origin, session-protected endpoint after wallet
submission. It retains that hash in a deployment-, account- and chain-scoped
browser key so an interrupted or failed reconciliation can be retried without
resubmitting the contract mutation.

The server revalidates the current Owner session, then reads the transaction and
receipt from the configured deployment's RPC. A transaction is accepted only
when all of the following evidence agrees:

- the chain ID and configured contract are exact;
- the sender is the authenticated Owner wallet;
- the recipient and zero native transaction value match the configured contract;
- calldata decodes to `pause`, `unpause`, `setMintPrice` or `withdraw` with the
  exact expected arguments;
- the receipt succeeded and belongs to that transaction and block; and
- the exact contract event for the decoded action is present and internally
  consistent.

Pending, reverted, unavailable and contradictory observations never create an
audit success. An accepted observation records its transaction hash, block hash,
block number, action and action-specific value in `owner_control_inclusions`.
The inclusion row and its append-only `audit_events` row are written in one
database transaction. A deployment-and-transaction-hash lock makes exact retries
idempotent and rejects conflicting evidence.

The API emits a separate operational failure event for denied or unauthenticated
requests, invalid input, chain unavailability, reverted/invalid transactions,
reconciliation conflicts and unexpected unavailability. That event contains
only the bounded correlation ID, fixed Owner-control operation, allowlisted
category, severity and timestamp. It never contains wallet or transaction
identifiers, price/withdrawal values, provider payloads or raw exceptions.
`TRANSACTION_PENDING` remains an expected polling state and does not emit a
failure event. Logging failure cannot alter the API response.

## Authority and finality boundary

The contract's `onlyOwner` check is the authorization boundary for the mutation.
The Admin session and audit endpoint add authenticated operational evidence; they
do not grant contract authority and do not replace chain state. The recorded
state is explicitly `included`, not final. Block hashes are retained so a future
reconciliation worker can detect and repair reorged observations before release.

No private key is accepted, stored or submitted by this workflow. Owner custody
and compromised/lost-key recovery remain open under OD-022 and OD-023. Mainnet
deployment is not authorized by this ADR.

## Scope and verification

Requirements: FR-CONTRACT-001/002, BR-004/005/010, NFR-SEC-004 and
SEC-CONTRACT-001.

Local tests cover strict transaction/event parsing, wrong chain/contract/sender,
nonzero value, malformed calldata, pending/reverted/unavailable receipts,
idempotent persistence, conflicting evidence, atomic audit writes, authenticated
and same-origin route enforcement, response parsing, browser recovery and retry,
and Admin UI state refresh. PostgreSQL migration structure, the production build
and desktop/mobile visual baselines are also verified. Route tests additionally
cover safe failure classification, non-disclosure, quiet pending polling and
logging-sink isolation. A live Base Sepolia transaction, database migration
rehearsal and reorg/finality worker remain release work.
