# ADR 0006 — Reactive EVM wallet connector foundation

Status: Implemented locally; browser-wallet acceptance matrix and live E2E remain pending.

Pigverse uses Wagmi v3 with Viem and TanStack Query as its client wallet
foundation. The first supported connector is the EIP-1193 injected connector,
with EIP-6963 multi-provider discovery enabled. This keeps the integration based
on a general connector abstraction while avoiding application-owned wallet or
cryptographic code.

The configured product network is Base Sepolia (`84532`). A connected address is
usable for wallet-gated product flows only when the provider reports that chain.
Other chains remain visible as connected but are classified as wrong-network;
the UI offers an explicit switch request and must not start mint or owner actions.
Account, chain and disconnect changes are supplied by the connector state rather
than copied into an application session.

Connection rejection and provider errors are presented as generic localized UI
errors. Connecting a wallet never creates collector authentication or admin
authorization. Pigverse never requests, accepts or stores a private key or seed
phrase. Later admin authentication must independently prove control of the
current account and re-evaluate authorization when that account changes.

WalletConnect is not enabled in this unit because it requires an external project
identifier and the minimum supported-wallet acceptance list remains open in
`OD-013`. It can be added as another connector without changing consumer flows
after configuration and release-browser coverage are approved.

Unit coverage verifies approved connection, safe rejection, connected-address
display, wrong-network switching, disconnect and account-state updates. Live
extension tests and the exact supported-wallet/browser matrix remain release
work; no deployment or signing key is required for this foundation.
