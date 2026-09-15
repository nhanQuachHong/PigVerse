# Pigverse

Pigverse Genesis is a bilingual VI/EN experience for ten fixed 1/1 NFT characters on Base. This repository is organized as a modular web application plus a smart-contract package.

## Requirements

- Node.js 24
- pnpm 11.19
- Docker 29+ for the local PostgreSQL migration smoke test

## Start locally

```bash
pnpm install
pnpm dev
```

The web application runs at <http://localhost:3000>. M0 provides the engineering shell only; product features are delivered milestone-by-milestone from `docs/ROADMAP.md`.

## Verification

```bash
pnpm verify
docker compose up -d postgres
pnpm db:migrate
docker compose down
```

Read-only Base Sepolia recovery inspection is available after a contract is
deployed and the public RPC/contract environment is configured:

```bash
pnpm recovery:inspect
```

See `docs/RECOVERY_RUNBOOK.md`. This command never writes application data.

## Repository map

- `apps/web` — public and Admin web application/backend boundary
- `packages/contracts` — Pigverse Genesis Solidity project
- `packages/config` — explicit chain/deployment configuration validation
- `packages/database` — PostgreSQL migrations and runner
- `public/assets` — approved production artwork; canonical NFT images must not be altered
- `docs` — approved product, architecture, security, testing, roadmap and design references

Read `AGENTS.md` before changing code. Product requirements and business rules under `docs/` are authoritative.
