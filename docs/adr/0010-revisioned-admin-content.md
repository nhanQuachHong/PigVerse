# ADR 0010 — Revisioned Admin content and chain-checked writes

Status: Revisioned storage, protected APIs, guarded publication and successful-mint lifecycle synchronization are implemented locally; provider-backed asset processing and live integration verification remain pending.

Each Admin edit inserts an immutable `nft_contents` revision. A partial unique
index permits only one current revision for each Base deployment and Genesis
token, while `(deployment, token, revision)` remains unique. Clients submit the
revision they read, using `0` only for an empty slot. The store locks the current
row and rejects a mismatched revision before any chain request or write.

While the database transaction holds that row lock, the service reads all token
ownership from one pinned Base block and permits the replacement only when the
target token is authoritatively unminted. Minted and provider-unavailable states
are distinct failures and both produce no content or audit write. A
`MINTED_LOCKED` application revision is terminal even if a faulty provider later
claims the token is unminted.

The new revision and its `NFT_DRAFT_UPDATED` audit event are committed in the
same transaction. Audit context includes only changed field names and revision
numbers; it does not duplicate content, credentials or signed authentication
material. A deterministic `genesis:base-sepolia:84532` deployment identity is
registered idempotently and must match the configured contract exactly. Runtime
configuration cannot silently repoint an existing content history.

HTTP reads and writes revalidate the opaque Admin session against current
contract ownership. Writes additionally require the exact configured Origin,
use server-generated correlation IDs, enforce bounded request bodies and return
stable safe error codes.

Publication prepare and inclusion failures emit separate structured operational
events containing only the bounded correlation ID, fixed operation and allowlisted
category. Wallet/transaction identifiers, token/content identifiers, metadata
URIs, request values, provider payloads and raw exceptions are excluded. Pending
inclusion remains normal polling state and emits no failure event. A logging-sink
failure cannot change the protected API result. These signals do not replace
the successful chain-evidence audit record.

No database transaction can atomically serialize against a blockchain block.
The in-transaction recheck narrows the edit race; the contract's publication
revision guard prevents a collector from minting different metadata than the
revision selected, and later reconciliation must mark any externally observed
mint as `MINTED_LOCKED`. Guarded publication and successful-mint lifecycle
synchronization are now implemented as separate locally verified units. The
content workflow remains incomplete until provider-backed asset processing and
live database/deployed-chain verification are complete.
