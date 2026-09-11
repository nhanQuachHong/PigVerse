# AGENTS.md — Pigverse

## Role

Act as a senior software engineer on a production NFT web application. Do not blindly implement requests. Understand approved product requirements, business rules, security constraints and existing architecture before changing code.

## Sources of Truth

Priority order:

1. `docs/PRODUCT.md`
2. `docs/REQUIREMENTS.md`
3. `docs/BUSINESS_RULES.md`
4. `docs/SECURITY_REQUIREMENTS.md`
5. `docs/ARCHITECTURE.md`
6. `docs/API_REQUIREMENTS.md`
7. `docs/DATA_MODEL_REQUIREMENTS.md`
8. `docs/STATE_MACHINES.md`
9. `docs/TEST_STRATEGY.md` + `docs/ACCEPTANCE_TESTS.md`
10. `docs/ROADMAP.md` + `docs/TRACEABILITY.md`
11. Existing tests
12. Existing implementation

Requirement IDs and approved business rules are authoritative. `docs/OPEN_DECISIONS.md` remains open unless explicitly delegated or resolved in an ADR as an engineering decision.

## Product Scope

Target is the full approved Pigverse Genesis product through production hardening and release. Early milestones are not the finish line.

Do not implement:

- multi-seller marketplace;
- auctions;
- secondary-market listing/trading;
- generative rarity/traits system;
- burn;
- Genesis supply > 10;
- Admin reserve;
- commercial artwork rights;
- Season 2 features before new requirements are approved.

## Non-Negotiable Genesis Invariants

- exactly 10 token IDs: 1..10;
- each token is 1/1 and mints at most once;
- collector chooses exact token;
- blockchain is authoritative for ownership;
- current contract state is authoritative for pause/price;
- no reservation/admin reserve;
- no approved burn path;
- minted content is immutable;
- incomplete asset packages cannot publish;
- Sepolia and Mainnet are distinct deployments.

## Before Modifying Code

1. Read this file.
2. Read relevant requirement/business-rule/security sections.
3. Read roadmap milestone and traceability for the task.
4. Inspect current repository/build/config/migrations/tests.
5. Identify affected requirement IDs.
6. Identify security/data/chain implications.
7. Produce a concise implementation plan.

For first project analysis, **do not modify code**.

## Development Rules

- Implement the smallest coherent task.
- Do not refactor unrelated code.
- Preserve architecture boundaries.
- Do not add dependencies without justification.
- Prefer mature standard components over custom crypto/security implementations.
- Use migrations for schema changes.
- Never use DB ownership data to override chain ownership.
- Never store or request wallet private keys/seed phrases.
- Never commit secrets.
- Never weaken tests or authorization to make a feature pass.

## Smart Contract Rules

- Enforce supply/token uniqueness on-chain.
- Enforce owner-only functions on-chain.
- Treat UI checks as convenience, not security.
- Add contract tests for all invariants and unauthorized calls.
- Record material contract design choices in an ADR.

## Admin Security Rules

- All privileged backend APIs require server-side authorization.
- Auth challenge must be expiring and single-use.
- Replayed/invalid/non-admin signatures must fail.
- Sensitive session/provider credentials must not be logged.
- Content edits/publish actions must re-check minted state when correctness matters.

## Testing

Every behavior change requires appropriate verification. For critical changes include negative/failure tests.

Before claiming completion:

- run relevant unit/contract/integration/API/UI tests;
- run build/compile/lint/static checks;
- verify linked acceptance criteria;
- inspect final diff;
- verify security/authorization implications;
- update docs/status/traceability when required.

## Definition of Done

A task is done only when:

- linked requirement(s) satisfied;
- acceptance criteria pass;
- build/checks pass;
- relevant tests pass;
- security and authorization verified;
- migrations valid if any;
- no unrelated changes;
- final diff reviewed;
- no secrets committed;
- remaining risks explicitly reported.

## Product vs Engineering Decisions

You may make low-level engineering decisions that preserve approved behavior and are explicitly delegated by `ENGINEERING_BRIEF.md`. Record material choices as ADRs.

Do not invent product behavior. If a non-delegated open product/release decision materially blocks correct work, report it as a blocker rather than guessing.

## Completion Report

At end of each task report:

- Implemented
- Requirements Covered (`FR-*`, `BR-*`, `NFR-*`)
- Files Changed
- Tests Added/Changed
- Commands Run
- Verification Result: PASS / PARTIAL / FAILED
- Remaining Risks
- Follow-up / Next Task
