# ADR 0005 — Publication-bound mint and owner withdrawal

Status: Implemented locally in the contract and Owner UI; live deployment and
Owner-transaction audit/reconciliation remain pending.

Authority: the approved unified Owner/Admin matrix in
`OWNER_ADMIN_ROLE_DECISION.md` supersedes the separate-role premise of ADR 0004
and `CONTRACT_INTEGRATION_DECISIONS.md`.

`PigverseGenesis` composes the NFT core and owner controls. Only the owner can
publish/unpublish an unminted token. Each mutation supplies the expected current
publication revision and fails on a stale value; each successful change increments
that revision, including unpublish. Mint takes the chosen ID and expected revision,
pays the current exact price, and copies the published URI into immutable minted
storage. This prevents stale Admin tabs or collector pages from silently acting on
changed content. No alternate owner mint exists.

Publication requires a nonempty `ipfs://` reference. This is a scheme check, not
proof of a valid CID, safe metadata or successful pinning/backup. The authenticated
backend must verify the complete asset package and revision before constructing
the owner's publication transaction. Owner attestation is the on-chain trust
boundary for those off-chain facts.

Owner-only withdrawal sends the entire balance to the current owner, with no
arbitrary beneficiary argument. This is the simplest implementation of the
approved withdrawal permission. A failed transfer reverts and retains funds;
mint and withdraw share OpenZeppelin's reentrancy guard. There is no transfer
to the owner during mint, so a recipient failure does not block collectors.

Local tests cover revision races, unpublish, post-mint locks, authorization,
price/pause parity between owner and user, withdrawal balance accounting and a
malicious receiver that rejects payment before later recovery. The Admin UI
shows the contract balance and requires a second confirmation with the exact
Owner recipient before asking that wallet to sign `withdraw()`; it cannot choose
another beneficiary. Live deployment configuration, provider-backed asset
readiness and Owner-transaction audit/reconciliation remain outstanding. Mainnet
is not authorized.
