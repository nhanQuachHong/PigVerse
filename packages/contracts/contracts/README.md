# Contract sources

M2 introduces the Genesis contract in verified atomic units before deployment.

`GenesisTokenDomain.sol` fixes the token ID domain to 1–10 (`BR-001`,
`SEC-CONTRACT-001`). Its abstract guard is exercised on the local OP-compatible
network by `test/token-domain.ts`; the harness under `contracts/test/` is test-only.

`GenesisNFTCore.sol` adds OpenZeppelin ERC-721 ownership, exact internal mint,
write-once tokenURI, supply accounting and burn rejection. `test/genesis-core.ts`
covers all ten IDs, duplicates, transfers, invalid receivers and callback state.
See `docs/adr/0003-genesis-erc721-core.md` for design and boundaries.

`GenesisMintControls.sol` provides owner-only pause/unpause and exact native-wei
payment rules, tested in composition with the NFT core. Ownership handover uses
two-step acceptance; renunciation is disabled (ADR 0004).

The production components remain abstract. Public mint eligibility, publishing
synchronization and paid-mint proceeds handling remain required M2 work. Never
deploy the test harnesses as the application contract.
