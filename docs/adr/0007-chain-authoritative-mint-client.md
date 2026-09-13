# ADR 0007 — Chain-authoritative exact-token mint client

Status: Implemented locally; live Base Sepolia transaction verification remains pending deployment.

The NFT detail flow submits only the approved `mint(tokenId,
expectedRevision)` contract call. Immediately before requesting the wallet
transaction, the client reads the current contract pause flag, mint price,
publication revision and published metadata URI. It then simulates the same
token, revision, sender and exact native value. A stale page, changed price,
unpublication, pause or competing mint therefore cannot be treated as a valid
preflight. Final enforcement remains on-chain.

The UI disables repeat submission while it reads, requests wallet approval or
waits for a receipt. Wallet rejection, simulation failure and contract revert do
not create ownership state. Successful UI is derived only from a successful
authoritative receipt; an RPC error remains unknown and retains an explorer link
rather than becoming success.

Once a transaction hash exists, it is stored in browser-local state scoped by
chain, contract, token ID and initiating address. Reloading with the same account
restores receipt resolution. Stored values are accepted only when they match a
transaction-hash shape. This state represents a pending transaction, never NFT
ownership; Collection and My NFTs continue to derive ownership from chain reads.

No off-chain reservation is created. Two users may submit the same token and the
contract decides the sole winner. Current code can be exercised with mocked
wallet/RPC behavior; live Base Sepolia confirmation, replacement handling and
provider/browser acceptance testing remain required before release.
