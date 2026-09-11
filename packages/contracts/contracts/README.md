# Contract sources

M2 introduces the Genesis contract in verified atomic units before deployment.

`GenesisTokenDomain.sol` fixes the token ID domain to 1–10 (`BR-001`,
`SEC-CONTRACT-001`). Its abstract guard is exercised on the local OP-compatible
network by `test/token-domain.ts`; the harness under `contracts/test/` is test-only.

The domain guard alone does not establish mint uniqueness, ownership, payment,
pause, publishing or metadata immutability. Those remain required M2 work.
