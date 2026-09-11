# CODEX_START — Pigverse Initial Onboarding Prompt

Use this prompt when Codex first enters the Pigverse repository.

```text
Act as a senior/staff software engineer joining the Pigverse project.

DO NOT MODIFY CODE DURING INITIAL ANALYSIS.

First read, in this order:

1. AGENTS.md
2. README.md
3. docs/PRODUCT.md
4. docs/REQUIREMENTS.md
5. docs/BUSINESS_RULES.md
6. docs/ENGINEERING_BRIEF.md
7. docs/ARCHITECTURE.md
8. docs/DOMAIN_MODEL.md
9. docs/STATE_MACHINES.md
10. docs/API_REQUIREMENTS.md
11. docs/DATA_MODEL_REQUIREMENTS.md
12. docs/SECURITY_REQUIREMENTS.md
13. docs/TEST_STRATEGY.md
14. docs/ACCEPTANCE_TESTS.md
15. docs/ROADMAP.md
16. docs/TRACEABILITY.md
17. docs/OPEN_DECISIONS.md
18. docs/ENGINEERING_READINESS.md

Then inspect the repository:

- directory/module structure
- package/build files and lockfiles
- app/environment configuration
- smart-contract code and deployment scripts if present
- frontend/backend code if present
- database schema/migrations
- existing tests and CI
- git status and relevant recent history
- any existing ADRs

Compare the repository against the approved Pigverse requirements.

Report only; do not edit files yet.

Return:

1. Product understanding
2. Current architecture and stack
3. Existing modules/components
4. Genesis smart-contract status
5. Database/data model status
6. Wallet/Admin security status
7. Requirements already implemented (with FR IDs)
8. Requirements missing or partially implemented
9. Conflicts between code and approved business rules
10. Test coverage and failing tests
11. Security/reliability risks
12. Technical debt
13. Open decisions that actually block the next milestone
14. Recommended next milestone and smallest coherent first task
15. Exact verification commands you expect to use after implementation

Separate clearly:

CONFIRMED
ASSUMPTIONS
OPEN DECISIONS
RECOMMENDATIONS
BLOCKERS

Do not invent product requirements.
Do not implement OUT OF SCOPE features.
Do not treat database ownership as authoritative over Base.
Do not mark anything complete without tests and verification.
DO NOT MODIFY CODE DURING INITIAL ANALYSIS.
```
