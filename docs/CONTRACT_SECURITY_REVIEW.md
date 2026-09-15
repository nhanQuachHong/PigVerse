# Pigverse Genesis Focused Contract Security Review

Review baseline: `d3f5461` on 2026-09-15. Scope is the deployable Solidity in
`packages/contracts/contracts/*.sol`, pinned OpenZeppelin 5.6.1 behavior and the
associated Hardhat tests. Test-only harnesses were reviewed as adversarial
evidence but are not deployment artifacts.

Status: local focused review and static-analysis gate pass. This is not an
independent audit and does not authorize Mainnet.

## Reviewed trust model

- The current on-chain Owner is trusted to publish complete IPFS metadata and
  operate pause, price, withdrawal and two-step ownership transfer.
- Collectors choose an exact token and supply the publication revision they saw.
- The contract, not the UI or database, enforces token uniqueness, payment,
  pause, publication and immutable minted metadata.
- ERC-721 receivers and the Owner withdrawal recipient are untrusted callback
  boundaries.

## Findings and evidence

| Area | Source control | Adversarial evidence | Result |
|---|---|---|---|
| Token domain and supply | `MAX_SUPPLY` is constant 10; every mint/update path validates IDs 1–10; no reserve path exists | all ten IDs mint once; 0, 11, 256 and max uint reject; raw inherited mint rejects | PASS |
| Duplicate mint and race safety | ownership and immutable URI are written in one reverting transaction; an owned ID rejects before mint | every duplicate rejects; receiver callback cannot duplicate or cross-token reenter | PASS |
| Burn prohibition | `_update` rejects the zero-address destination, including inherited burn paths | burn attempt rejects while ownership, URI and supply remain intact | PASS |
| Metadata immutability | mint copies `publishedURI` into private `_mintedURIs`; no setter exists; publish/unpublish require unminted state | post-mint publish, unpublish and remint reject; URI survives transfer | PASS |
| Publication freshness | monotonic revision must equal `expectedRevision`; mint requires a non-empty published IPFS URI | stale publish/unpublish/mint and unpublished mint reject | PASS |
| Payment and pause | mint requires exact current `mintPrice` and `_requireNotPaused`; only Owner changes controls | under/over/old price, paused mint and non-Owner controls reject | PASS |
| Owner authority | OpenZeppelin `Ownable2Step`; renunciation always rejects; withdrawal has no arbitrary recipient | pending Owner has no power before acceptance; old Owner loses power; zero transfer cannot renounce | PASS |
| Receiver callbacks | mint is `nonReentrant`; URI/supply/ownership update atomically and roll back on receiver failure | rejecting receiver consumes no identity or funds; cross-token callback mint rejects | PASS |
| Withdrawal callback | balance transfer targets current Owner and is `nonReentrant`; failed call reverts atomically | rejecting Owner retains funds; nested withdrawal rejects; later withdrawal transfers full balance | PASS |
| Standards surface | inheritance is OpenZeppelin ERC-721 with no proxy or upgrade hook | ERC-165, ERC-721 and metadata interface IDs pass; unauthorized transfer rejects | PASS |
| Deployment binding | deployment preflight requires Base Sepolia 84532, nonzero Owner and zero initial price | Mainnet/other chains and invalid Owner reject; clean module deploy has 0/10 supply | PASS locally |

## Static and build evidence

- Solhint 6.2.4 is pinned and `solhint:recommended` runs with zero warnings on
  every deployable contract through `pnpm lint` and `pnpm verify`.
- Production compilation uses Solidity 0.8.34, Cancun EVM and optimizer runs 200.
- Production-profile tests pass 25/25 on the OP-compatible Hardhat network.
- Current compiled runtime bytecode artifact is 13,648 bytes, below the EIP-170
  24,576-byte limit. Live Base Sepolia bytecode equivalence remains unverified.
- Full repository audit reports no high/critical advisory. One low `elliptic`
  and one moderate `adm-zip` advisory are confined to the Hardhat dev-tool tree;
  neither is linked into EVM bytecode. They remain time-bound supply-chain
  observations and must be rechecked on the release candidate.

The event-indexing gas recommendation is disabled deliberately: indexing every
scalar would change event topic layouts and downstream expectations without
closing a security risk. Constructor visibility warnings are disabled only for
the Solidity versions where constructor visibility is no longer valid syntax.
All other recommended rules remain active and warnings fail the gate.

## Residual boundaries

1. Contract Owner custody and compromised/lost-key response remain the HIGH
   release blocker `SEC-REV-001` / `OD-022` / `OD-023`.
2. The contract validates an IPFS prefix, not the full media package. Complete
   bilingual metadata, artwork integrity, backup and CID validation remain
   authenticated backend/Owner gates blocked on `OD-005`, `OD-006`, `OD-014`
   and `OD-015`.
3. Receipt inclusion is not product finality. Confirmation policy and canonical
   reorg reconciliation remain `SEC-REV-004` / `OD-008`.
4. The production bytecode, constructor arguments, Owner and empty initial state
   must be verified after the authorized Base Sepolia deployment.
5. Solhint, manual review and deterministic tests do not replace an independent
   audit or additional analyzer coverage before Mainnet authorization.

## Reproduction

```text
pnpm --filter @pigverse/contracts lint
pnpm --filter @pigverse/contracts test:production
pnpm verify
pnpm audit --audit-level high
```
