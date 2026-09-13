# ADR 0008 — Chain-derived My NFTs projection

Status: Implemented locally; live Base Sepolia transfer verification remains pending deployment.

My NFTs uses the connected EVM address only as a query identity. The server reads
the canonical ten-token ownership projection from Base Sepolia and filters tokens
whose normalized on-chain owner equals that address. No database, session or
pending-mint record can add a token to this result.

Ownership is considered known only when the complete ten-token ownership snapshot
is available. If the RPC or deployment configuration prevents that proof, the API
returns `ownershipStatus: unavailable` and the UI renders a recoverable error. It
does not present an empty collection, because that would falsely imply verified
zero ownership.

The client query key includes the active wallet address, so provider account
changes select a new ownership query. It also refreshes on demand, on window focus
and every 30 seconds to reflect transfers performed outside Pigverse. Disconnect
removes wallet-specific results and returns to the connection prompt.

Local projection, API and component tests cover invalid input, unavailable chain,
zero ownership, owned cards, explicit refresh and account changes. Live external
transfer verification remains part of the deployed Base Sepolia acceptance run.
