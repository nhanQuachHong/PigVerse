# Pigverse High-Level Architecture

## Architecture Style

Recommended starting shape: **modular web application + smart contract**, not microservices. Genesis has fixed scale (10 NFTs); unnecessary distributed-system complexity violates `NFR-OPS-001`.

Frameworks are deliberately not fixed in the approved product spec. Codex should preserve these component boundaries regardless of implementation stack.

## Logical Components

```text
Browser
  |
  +-- Public Web UI
  |      +-- Home / Collection / NFT Detail / Story / My NFTs
  |      +-- Wallet Connector
  |      +-- Mint transaction UX
  |
  +-- Admin Web UI
         +-- Wallet-signature login
         +-- NFT content workflow
         +-- Audit / mint activity

Browser/Admin UI
       |
       v
Backend Application/API
  +-- Public Content Query
  +-- Admin Auth & Authorization
  +-- NFT Content Management
  +-- Asset Processing Orchestrator
  +-- Audit Log
  +-- Mint Observation/Reconciliation
  +-- Recovery/Operations Support
       |
       +----------> Operational Database
       +----------> IPFS Provider
       +----------> Backup Object Storage
       +----------> Base RPC

Collector Wallet -----------------------> Pigverse Genesis Contract (Base)
Contract Owner Wallet ------------------> owner-only contract functions
Backend/Public UI ----------------------> Base RPC (authoritative reads)
```

## Source-of-Truth Matrix

| Concern | Authoritative source |
|---|---|
| Current NFT owner | Base smart contract |
| Whether token ID has been minted | Base smart contract |
| Contract pause state | Base smart contract |
| Current mint price | Base smart contract |
| Immutable minted asset reference | Contract/token URI + content-addressed storage according to final contract design |
| Draft content before mint | Application datastore |
| Admin authorization | Authenticated wallet session checked against current on-chain Contract Owner |
| Admin authentication abuse windows | Operational database, shared by every application instance |
| Admin audit history | Application audit store |
| Mint activity dashboard | Chain receipt/events are authoritative; DB is an index/observation |
| Artwork/metadata durability | IPFS + required backup storage |

## Boundary Rules

### Public Web

- May cache public content and chain-derived display state.
- Must revalidate critical state before a mint transaction and reconcile final result from chain.
- Must not claim ownership based on UI state or DB.
- Must handle account/chain/disconnect changes.

### Admin Web

- No privileged operation solely because an Admin route/button is visible.
- All write operations call backend endpoints protected by authenticated session + current server-side authorization.
- Contract-owner operations require the owner wallet and on-chain authorization; application Admin role alone is insufficient.

### Backend

- Keeps no user private keys.
- Issues replay-resistant wallet-signature challenges.
- Enforces Admin authentication abuse limits through atomic shared-database counters.
- Enforces Admin authorization server-side.
- Treats chain conflicts as chain-wins for ownership.
- Orchestrates IPFS + backup as a durable unit before READY.
- Records audit events for important mutations/actions.

### Smart Contract

Must enforce, independently of frontend/backend:

- token IDs limited to Genesis 1–10;
- each token minted at most once;
- max supply cannot exceed 10;
- public exact-token mint;
- owner-only pause/unpause;
- owner-only mint-price update;
- no approved reserve/mint-to-admin bypass that violates public availability;
- no approved burn path;
- payment rule enforced from contract state;
- minted metadata immutability according to selected contract design.

## Recommended Modules

### Frontend

- `public-site`
- `wallet`
- `mint`
- `my-nfts`
- `admin`
- `i18n`
- `chain-client`

### Backend

- `auth`
- `admin-authorization`
- `nft-content`
- `asset-processing`
- `audit`
- `mint-activity`
- `chain-reconciliation`
- `recovery`
- `ops`

### Contract

- `GenesisNFT`
- owner/pause/price capabilities using mature audited building blocks where appropriate

## Data Flow — Mint

```text
NFT Detail
  -> read token owner/existence + pause + price + network
  -> user confirms Mint
  -> wallet sends mint(tokenId) with current required value
  -> store tx hash client-side/session-safe for restoration
  -> query receipt/state
  -> success only after successful authoritative outcome
  -> refresh owner/token state
  -> show celebration / My NFTs
```

No backend reservation is created.

## Data Flow — Publish Content

```text
Admin edits DRAFT
 -> validate VI/EN + media
 -> create immutable content revision candidate
 -> upload artwork to IPFS
 -> persist artwork backup
 -> generate metadata for exact revision
 -> upload metadata to IPFS
 -> persist metadata backup
 -> verify required references
 -> READY
 -> Admin Publish
 -> PUBLISHED (if still unminted)
```

Any required partial failure => `ERROR` / not publishable.

## Deployment Model

At minimum separate:

- local/dev;
- Base Sepolia test/staging;
- Base Mainnet production.

Each environment must have explicit chain ID, RPC, contract address, explorer base URL and secrets. Never default silently from Sepolia to Mainnet or vice versa.

## Future Collection Constraint

Genesis must remain independently addressable and immutable in identity. Do not build generic multi-collection complexity until Season 2 requirements are approved. Make only low-cost seams such as a collection/deployment configuration boundary where it does not complicate Genesis.
