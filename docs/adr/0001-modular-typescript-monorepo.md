# ADR-0001: Modular TypeScript monorepo

- Status: Accepted
- Date: 2026-09-11
- Decision scope: M0 repository foundation (`NFR-OPS-001`, `NFR-OPS-008`)

## Context

Pigverse Genesis has ten fixed tokens and requires a public web experience, protected backend operations, a relational operational store, and one Solidity contract. The approved architecture rejects unnecessary microservices while preserving clear module boundaries.

## Decision

Use a pnpm TypeScript monorepo with:

- Next.js App Router for the web UI and server-side application boundary;
- PostgreSQL for mutable Admin, audit, asset-processing and chain-projection data;
- Hardhat 3 and OpenZeppelin Contracts for Solidity implementation and verification;
- viem-compatible contract tooling, with wagmi planned for the wallet UI in M3.

Backend modules remain server-only and independently testable even though they deploy with the web application. The smart contract and deployment tooling remain in a separate workspace package.

## Consequences

One deployable web application is sufficient for Genesis scale. Contract logic remains independently compiled and tested. PostgreSQL must never become the ownership authority; Base contract state wins.
