# Pigverse Git / Commit Rules

These rules are intended for Codex and human contributors working on Pigverse.

## 1. Initial Analysis

Do not commit during initial repository analysis.

Codex must first:

1. Read `AGENTS.md`.
2. Read relevant approved product and engineering docs.
3. Inspect the repository, tests, build configuration, and affected modules.
4. Report the current state and proposed next task.
5. Do not modify code during initial analysis.

## 2. Commit Gate

Commit only after all applicable checks are complete:

- requirement / acceptance criteria are satisfied;
- relevant tests pass;
- build / compile succeeds;
- lint / static checks pass when available;
- final diff has been reviewed;
- security / permission behavior has been considered;
- documentation and requirement status are updated where required;
- no unrelated files are included;
- no secrets are staged.

The expected workflow is:

```text
SPEC
↓
PLAN
↓
SMALL TASK
↓
IMPLEMENT
↓
TEST
↓
REVIEW
↓
FIX
↓
VERIFY
↓
COMMIT
```

## 3. Commit Size

One commit should represent one small coherent change.

Do not combine unrelated work into one commit.

A milestone may contain multiple small commits. Do not create one giant `complete milestone` commit when the work can be separated coherently.

Examples of coherent commit boundaries:

- smart-contract public mint behavior;
- wallet connection UI;
- admin wallet-signature authentication;
- IPFS asset-processing flow;
- one database migration plus its code/tests;
- one bug fix plus its regression test.

## 4. Commit Message Format

Use Conventional Commit-style messages when practical.

Recommended formats:

```text
feat(mint): implement token-specific public mint
feat(admin): add wallet signature authentication
feat(ui): add Pigverse collection page
fix(mint): prevent stale NFT mint attempt
fix(admin): reject expired wallet nonce
fix(ui): preserve card layout on mobile
test(contract): cover duplicate token mint
test(auth): add signature replay regression test
docs(roadmap): mark contract milestone verified
refactor(api): simplify NFT query service
chore(ci): add frontend lint check
```

Prefer messages that describe the behavior changed, not vague messages such as:

```text
update files
fix stuff
changes
final
```

## 5. Branch Naming

Preferred branch naming:

```text
feature/<task-or-feature>
fix/<bug>
refactor/<scope>
docs/<scope>
test/<scope>
chore/<scope>
```

Examples:

```text
feature/mint-flow
feature/admin-dashboard
fix/duplicate-mint
fix/wallet-network-state
docs/ui-design-system
```

## 6. Before Every Commit

At minimum inspect:

```bash
git status
git diff
git diff --staged
```

Then run the relevant verification commands for the changed scope.

Check that staged changes contain:

- only intended files;
- no `.env` secrets;
- no private keys / seed phrases;
- no wallet credentials;
- no API keys;
- no generated junk or debug artifacts;
- no accidental large binaries except approved project assets.

## 7. Never Do These Without Explicit Authorization

Never:

- commit secrets;
- commit known failing code and claim completion;
- weaken or delete tests merely to make CI pass;
- use `--no-verify` to bypass repository checks;
- force-push;
- rewrite shared history;
- reset or discard another contributor's work;
- push directly to a protected branch;
- push to remote unless the task explicitly permits it.

## 8. Push Policy

A local commit and a remote push are separate actions.

Codex may create a local commit only when the task and repository policy allow it.

Do not push to a remote repository unless explicitly authorized by the task / Product Owner / repository rules.

## 9. Completion Report After Commit

After committing, report:

```text
Commit hash:
Commit message:
Requirements covered:
Files changed:
Tests executed:
Build/static checks:
Verification result: PASS / PARTIAL / FAILED
Remaining risks:
Follow-up:
```

Do not claim `PASS` if any required verification was not actually run.

## 10. UI-Specific Commit Rule

For work based on an approved visual reference under `docs/design/`, do not commit the page until:

1. the page renders successfully;
2. desktop/mobile behavior has been checked where relevant;
3. a screenshot has been compared with the approved reference;
4. meaningful spacing, typography, sizing, alignment, and state inconsistencies have been corrected;
5. build/lint/tests pass.

Visual similarity is part of Definition of Done for reference-driven UI tasks.

## 11. Atomic Commit Cadence

A milestone may contain many commits. A task may also contain multiple commits.

**Commit is not reserved for task or milestone completion.**

After each independently reviewable coherent unit:

1. run the checks relevant to that unit;
2. inspect the staged diff;
3. verify that the unit is internally consistent;
4. commit it before beginning the next independent unit.

Required workflow:

```text
PLAN
→ COHERENT UNIT
→ IMPLEMENT
→ TARGETED TEST
→ REVIEW
→ VERIFY
→ COMMIT
→ NEXT COHERENT UNIT
```

Do not use:

```text
PLAN
→ IMPLEMENT MANY UNITS
→ COMPLETE WHOLE TASK
→ ONE LARGE COMMIT
```

Frontend Foundation is not one commit. Prefer atomic units such as workspace setup, test setup, design tokens, individual primitive groups, layouts, responsive navigation, localization, focused test coverage and documentation.

A task is a planning unit. A commit is an atomic implementation unit. They are not required to be 1:1.

Do not begin the next independent coherent unit while the previous unit is verified and still uncommitted, unless there is a documented technical reason the units cannot be separated.

## 12. Commit Size Guardrail

Before starting the next independent change, inspect:

```text
git diff --stat
git diff --numstat
```

A commit should normally remain small enough for a reviewer to understand in one focused review.

If a pending diff contains:

- more than approximately 15 meaningful source files;
- more than approximately 800–1200 manually written changed lines; or
- multiple independently reversible concerns;

stop and split the work into separate commits. These are review triggers, not hard limits.

Generated files such as lockfiles, generated metadata, migrations and approved asset imports may legitimately exceed these numbers and should be evaluated separately.
