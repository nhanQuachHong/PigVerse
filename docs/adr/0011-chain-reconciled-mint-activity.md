# ADR 0011 — Chain-reconciled mint activity projection

Status: Accepted for the current Base Sepolia implementation; production
finality policy and live integration verification remain pending.

Mint activity is an operational projection, not an ownership source of truth.
An observation is identified by deployment and transaction hash. Database
uniqueness also prevents the same non-removed transfer log from producing a
second logical mint activity record. Public ingestion accepts only a transaction
hash from a same-origin request; the backend derives and validates the sender,
token, content revision, receipt and status from the configured chain.

The projection records four distinct states: `PENDING`, `SUCCEEDED`, `REVERTED`
and `UNKNOWN`. A transaction is `SUCCEEDED` only when all of the following hold:

- the configured Base Sepolia chain and Genesis contract match;
- the transaction targets that contract and decodes as the supported mint call;
- transaction, receipt, block number and block hash are internally consistent;
- the successful receipt contains exactly one non-removed ERC-721 `Transfer`
  from the zero address to the transaction sender for the decoded token;
- contract code exists at the configured address; and
- `ownerOf(tokenId)` at the receipt block returns the transaction sender.

Missing or contradictory evidence is fail-closed as `UNKNOWN`; a reverted
receipt is `REVERTED`; and an absent receipt remains `PENDING`. Safe error
categories may be stored, but raw provider payloads, credentials and signed
authentication material are not persisted or returned.

Successful reconciliation and the current matching content revision's move to
`MINTED_LOCKED` occur in one database transaction. Other statuses never lock or
unlock content. `MINTED_LOCKED` remains terminal so a later provider failure,
recheck or unknown observation cannot make minted content editable again.

The first successful receipt is evidence of inclusion, not a claim of finality.
Block hash and transfer log index are retained for reorg-aware reconciliation.
The number of confirmations required before the product calls a mint stable
remains open in `OD-008`; this ADR does not invent that product policy. When RPC
reconciliation is unavailable, stored observations may still be shown with an
explicit unavailable marker, but they cannot override authoritative chain
ownership.

Only a currently authorized Admin session may query the paginated activity
view. Collector wallets sign and submit their own mint transactions; the backend
never receives or custodies a private key.

Both activity endpoints return a bounded correlation ID in the response body
and `X-Correlation-ID` header. Public ingestion failures emit a distinct
`MINT_ACTIVITY_FAILED` event with only a fixed stage, allowlisted category,
severity, correlation ID and timestamp. Admin authorization, invalid pagination,
unexpected failures and degraded reconciliation use the redacted privileged-
operation event. Wallet addresses, transaction/block identifiers, token/content
identifiers, revisions, values and raw provider/error data are excluded. Known
pending and not-yet-visible transactions are expected observation states and do
not emit failure events. A logging-sink failure cannot change the API result.
