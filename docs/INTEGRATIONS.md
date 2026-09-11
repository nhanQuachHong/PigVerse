# Pigverse External Integrations

## INT-001 — Base Blockchain / Genesis Smart Contract

- Purpose: Mint and own Pigverse Genesis NFTs; provide authoritative ownership and contract state.
- Direction: Web client/backend read chain; user/owner wallets submit transactions.
- Required data: Contract address, ABI/interface, network, token IDs, ownership, pause state, mint price, transaction receipts/events.
- Authentication: Wallet signatures/transactions; owner authorization enforced in contract.
- Timeout: TBD.
- Retry: Safe read retries allowed; transaction submission must avoid accidental duplicate behavior and rely on wallet/tx identity.
- Failure behavior: Do not report mint success without confirmed successful chain outcome.
- Fallback: Show explicit degraded state; cached data may be used only when clearly non-authoritative.
- Idempotency: Each token ID can mint once; event ingestion must tolerate duplicate observation.
- Webhook behavior: None required by product; indexing/provider webhook use is an engineering option if chosen.
- Security: Validate network/contract address; never expose owner private key; secure RPC credentials if private.

## INT-002 — EVM Wallet Connector

- Purpose: Connect user/Admin wallets and request signatures/transactions.
- Direction: Browser to wallet provider.
- Required data: Connected address, chain/network, signatures, transaction submissions.
- Authentication: Wallet-controlled user approval.
- Timeout: Provider-dependent; UX timeout handling TBD.
- Retry: User-initiated reconnect/retry.
- Failure behavior: Show rejection/disconnect/unsupported-provider errors clearly.
- Fallback: User may choose another supported connector/wallet where available.
- Idempotency: Connection/sign requests should not create server-side privileged state without successful verification.
- Webhook behavior: N/A.
- Security: Never request seed phrase/private key. Treat account/chain changes as state changes requiring revalidation.

## INT-003 — RPC Provider

- Purpose: Read blockchain state and transaction receipts; possibly support backend indexing/reconciliation.
- Direction: App/backend to Base RPC.
- Required data: Chain reads, transaction receipts, logs/events as required.
- Authentication: Provider API key if required.
- Timeout: TBD.
- Retry: Bounded retries for reads; avoid retry storms.
- Failure behavior: Explicit degraded state; no false ownership or false success.
- Fallback: Secondary provider strategy TBD.
- Idempotency: Read operations naturally repeatable; event processing must deduplicate.
- Webhook behavior: Optional depending provider; not currently required.
- Security: Store provider secrets securely.

## INT-004 — IPFS Provider

- Purpose: Persist NFT artwork and metadata content-addressed assets.
- Direction: Admin/backend uploads; public app reads via configured gateway(s).
- Required data: Artwork bytes, metadata document, resulting CID/reference.
- Authentication: Provider credential if pinning service requires it.
- Timeout: TBD.
- Retry: Required for safe failed uploads; retries must not publish partial state.
- Failure behavior: NFT enters/remains ERROR or non-publishable state if required upload fails.
- Fallback: Backup storage and/or alternate gateway/provider strategy TBD.
- Idempotency: Re-uploading identical content may yield same CID; workflow must tolerate duplicate attempts.
- Webhook behavior: Provider-specific and optional.
- Security: Validate uploaded media; protect provider tokens; prevent Admin upload abuse.

## INT-005 — Backup Object Storage

- Purpose: Maintain backup copy of artwork/metadata required for recovery.
- Direction: Backend/Admin workflow uploads; operational recovery reads.
- Required data: Artwork and metadata copies plus mapping to Genesis token.
- Authentication: Storage credentials/role.
- Timeout: TBD.
- Retry: Required with bounded retry policy.
- Failure behavior: Under approved rule, required backup failure prevents READY/publish until policy condition is met.
- Fallback: Provider-specific redundancy TBD.
- Idempotency: Repeat upload should not corrupt prior valid backup.
- Webhook behavior: N/A unless provider selected with event integration.
- Security: Least-privilege credentials; bucket/container access control; no public write access.

## INT-006 — Block Explorer

- Purpose: Provide users/admins navigable links for contract, wallet and transactions.
- Direction: Outbound links.
- Required data: Network, tx hash, address, token/contract identifiers.
- Authentication: Usually none; provider TBD.
- Timeout/Retry: Not critical to product state.
- Failure behavior: Explorer unavailability must not affect ownership/mint correctness.
- Fallback: Hide/disable external link or use alternate explorer if configured.
- Idempotency: N/A.
- Webhook behavior: N/A.
- Security: Construct links only for known supported explorer/network patterns; avoid arbitrary untrusted URL injection.
