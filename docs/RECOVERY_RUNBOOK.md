# Pigverse Genesis Recovery Runbook

Status: read-only chain inspection implemented and locally verified. Database,
IPFS and backup reconstruction remain pending provider decisions and a live
recovery drill.

## Purpose and safety boundary

The first recovery step captures a deterministic Base Sepolia contract snapshot
without mutating the contract, database, IPFS or backup storage. It establishes
the authoritative ownership and immutable minted-URI facts that every later
restore step must preserve.

The snapshot is evidence, not an automatic restore. Never write ownership from a
database or backup over these chain facts. Never run destructive database
recovery while the public application or Admin writers can still change state.

## Prerequisites

- use the exact reviewed release commit and Node.js 24;
- obtain the deployed Base Sepolia contract address from the signed deployment
  record, not from a browser URL or user-supplied request;
- inject `BASE_SEPOLIA_RPC_URL` and `NEXT_PUBLIC_CONTRACT_ADDRESS` through the
  operator environment/secret store;
- use a read-only RPC credential where the provider supports scoped keys; and
- create an ignored artifact directory with `mkdir -p artifacts/recovery`.

No private key is required. Do not place an RPC credential in Git, chat, shell
arguments or the generated report.

## Capture the chain snapshot

With the two required environment variables already injected, run:

```text
pnpm recovery:inspect > artifacts/recovery/base-sepolia-chain-snapshot.json
```

The command exits nonzero and produces no JSON snapshot when configuration,
transport or chain evidence is incomplete. Its error output is deliberately
generic so provider payloads and credential-bearing URLs are not disclosed.

## Automated validation performed

Every successful report proves all reads were requested at one explicit block
number and records that block's hash. The inspector also requires:

- chain ID `84532` and bytecode at the configured address;
- contract name `Pigverse Genesis`, symbol `PIGVERSE` and `MAX_SUPPLY = 10`;
- a nonzero current Contract Owner, pause state, mint price and total supply;
- exactly token IDs 1–10;
- `ownerOf` success with a nonzero address for a minted token;
- the exact OpenZeppelin `ERC721NonexistentToken(tokenId)` revert for an
  unminted token—generic RPC failures never mean “available”;
- IPFS-formatted publication and minted metadata references;
- identical published and immutable token URI for every minted token; and
- recovered minted count equal to on-chain `totalSupply`.

All integer values that may exceed JavaScript's safe range are serialized as
decimal strings.

## Operator review

Before using the artifact as recovery input:

1. record the Git commit, execution time and deployment record beside it;
2. verify the report's chain ID, contract address, block number and block hash
   against an independent Base Sepolia explorer/RPC source;
3. verify the current Owner against the approved public Owner record;
4. confirm the report has ten distinct ordered token entries; and
5. retain the JSON as immutable drill/release evidence.

Do not edit a report and present it as inspector output. Capture a new block when
the evidence is stale or its block is no longer canonical.

## Stale database recovery

Restoring a PostgreSQL backup does not restore authoritative ownership. After a
restore, capture a fresh chain snapshot before reopening traffic. Any mint
activity projection that conflicts with the snapshot is stale and must be
reconciled from chain evidence; it must never change the snapshot's owner.

The current command is deliberately dry-run only and has no database apply mode.
AT-RECOVERY-001 is not complete until a controlled stale-database drill proves
the correction through the application. Do not manually patch ownership into a
content table; the schema intentionally does not make database ownership
authoritative.

## Remaining full-rebuild procedure

AT-RECOVERY-002 additionally requires the approved IPFS and backup providers and
metadata schema (`OD-005`, `OD-006`, `OD-015`). Once resolved, the recovery flow
must:

1. retrieve each immutable minted URI and current unminted publication URI;
2. fetch metadata/artwork from IPFS and the independent backup;
3. verify content identifiers and stored SHA-256 byte hashes;
4. reject missing, mismatched, executable or schema-invalid content;
5. reconstruct revision/package records without inventing ownership;
6. apply changes transactionally to a migrated isolated database;
7. rerun chain reconciliation at a fresh canonical block; and
8. run public Home, Collection, Detail and My NFTs smoke tests before traffic is
   restored.

Until that provider-backed drill passes, M14 and `FR-RECOVERY-001` remain in
development.
