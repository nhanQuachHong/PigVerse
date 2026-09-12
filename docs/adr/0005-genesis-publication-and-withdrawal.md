# ADR 0005 — Publication-bound mint and owner withdrawal

Status: Implemented locally; deployment and adversarial integration review pending.

Authority: the approved unified Owner/Admin matrix in
`OWNER_ADMIN_ROLE_DECISION.md` supersedes the separate-role premise of ADR 0004
and `CONTRACT_INTEGRATION_DECISIONS.md`.

`PigverseGenesis` composes the NFT core and owner controls. Only the owner can
publish/unpublish an unminted token. Each change increments a revision, including
unpublish. Mint takes the chosen ID and expected revision, pays the current exact
price, and copies the published URI into immutable minted storage. This prevents
silently minting changed content from a stale page. No alternate owner mint exists.

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
price/pause parity between owner and user, and withdrawal balance accounting.
Malicious receiver/owner integration tests, deployment configuration and the
backend asset-readiness workflow remain outstanding. Mainnet is not authorized.
