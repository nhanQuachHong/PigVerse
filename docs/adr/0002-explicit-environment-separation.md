# ADR-0002: Explicit Base environment separation

- Status: Accepted
- Date: 2026-09-11
- Decision scope: M0 environment foundation (`NFR-OPS-007`, `NFR-SEC-005`)

## Context

Base Sepolia and Base Mainnet are separate deployments. Silent fallback between their RPC URLs, contract addresses, chain IDs, databases or credentials could direct a user or Contract Owner to the wrong contract.

## Decision

Keep separate environment templates and variable names for Base Sepolia and Base Mainnet. Runtime validation must bind environment name, expected chain ID and contract address. Deployment credentials stay outside Git and remain blank in examples.

Base Sepolia uses chain ID `84532`; Base Mainnet uses chain ID `8453`. Mainnet deployment remains disabled until the release blockers in `docs/OPEN_DECISIONS.md` are resolved.

## Consequences

Configuration is more explicit and slightly repetitive. That repetition is intentional: production cannot silently reuse Sepolia settings.
