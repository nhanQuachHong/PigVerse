# Agent Routing and Subagent Policy

## Purpose

This document defines model-routing preferences, subagent delegation rules, evidence requirements, ownership boundaries, and integration responsibilities for the Pigverse repository.

These rules apply to the main agent and all subagents unless a more specific repository instruction overrides them.

---

## Model Routing and Subagents

- Automatically delegate independent work when useful; handle small, tightly scoped tasks directly.
- Keep planning, architecture, difficult root-cause analysis, integration decisions, conflict resolution, and final review with the main agent.

### Preferred Model Routing

Treat the following as preferences, not guaranteed runtime capabilities.

#### Main Agent

- Prefer **GPT-6 Astra / ultra** when available.
- Do not claim the active model is verified unless the runtime confirms it.

#### Code Tracing, Logs, and Browser Debugging

- Prefer **gpt-5.6-terra / medium**.
- Use **high reasoning effort** for:
  - complex application state;
  - DOM issues;
  - race conditions;
  - distributed behavior;
  - cross-system analysis;
  - difficult browser-debugging scenarios.

#### Narrow Searches and Clearly Specified Checks

- Prefer **gpt-5.6-luna / low or medium** for:
  - repository searches;
  - extraction;
  - filtering;
  - simple evidence gathering;
  - clearly specified validation checks.

### Unavailable Models

If a preferred model or reasoning level is unavailable:

1. Report that it is unavailable.
2. Choose the closest available alternative.
3. Do not silently claim that the preferred model was used.

---

## Subagent Usage

Prefer subagents for work that can be isolated and independently validated, including:

- evidence gathering;
- repository searches;
- code tracing;
- log analysis;
- test-failure investigation;
- browser reproduction;
- isolated implementation work when ownership is clear.

Handle small tasks directly when delegation would add unnecessary overhead.

Subagent conclusions are hypotheses until validated.

Important conclusions must include traceable primary evidence where relevant, such as:

- file paths;
- line numbers;
- timestamps;
- request IDs;
- transaction IDs;
- stack traces;
- logs;
- snippets;
- test output;
- browser state;
- reproducible steps.

Avoid summary-of-summary handoffs.

Preserve primary evidence wherever possible.

---

## Ownership and Integration

- Give each mutable browser session one owner at a time.
- Give each edited file or tightly related file set one owner at a time.
- Avoid concurrent edits to the same files by multiple agents.
- Avoid parallel work that creates unnecessary merge conflicts.

The main agent owns:

- planning;
- architecture;
- difficult root-cause analysis;
- integration decisions;
- conflict resolution;
- acceptance decisions;
- final review.

Subagents may gather evidence or implement isolated changes, but final integration remains the responsibility of the main agent.

---

## Agent Execution Rules

When spawning a subagent:

1. Define the task clearly.
2. Define the scope and out-of-scope areas.
3. Explicitly select the preferred model and reasoning effort when supported.
4. Define expected evidence and output.
5. Announce the assignment.
6. Wait for completion, failure, or uncertainty.
7. Report completion, failure, or uncertainty.
8. Independently validate important conclusions before integrating them.

Do not accept important subagent conclusions solely because they were confidently stated.

Validate them against primary evidence.

---

## Evidence Requirements

Important conclusions must be traceable.

Prefer direct evidence over paraphrased summaries.

Good evidence includes:

```text
apps/web/app/page.tsx:84-112
```

```text
Transaction hash:
0x...
```

```text
Test:
pnpm vitest run apps/web/...
Result:
18 passed, 0 failed
```

```text
Browser reproduction:
1. Open /collection
2. Connect wallet
3. Switch to wrong network
4. Observe Wrong Network state
```

Avoid:

```text
A subagent said this is probably the problem.
```

Prefer:

```text
The issue is reproduced in:
apps/web/components/wallet/WalletButton.tsx:42-67

Evidence:
...
```

---

## Handoff Quality

Do not reduce important evidence through repeated summarization.

Bad:

```text
Agent A summarized logs.
Agent B summarized Agent A.
Main agent used Agent B's summary.
```

Preferred:

```text
Agent A provides:
- file path
- line number
- log excerpt
- reproduction
- test result

Main agent validates the evidence directly.
```

---

## Parallel Work Rules

Parallel work is encouraged only when tasks are independent.

Good parallelization examples:

- one agent traces a failing test;
- another inspects related browser behavior;
- another searches repository history;
- another checks documentation consistency.

Poor parallelization examples:

- two agents modifying the same component;
- two agents using the same mutable browser session;
- multiple agents changing the same configuration file;
- agents making overlapping architectural decisions independently.

The main agent must coordinate ownership before parallel work begins.

---

## Repository Compliance

All subagents must follow:

- root `AGENTS.md`;
- applicable nested `AGENTS.md` files;
- approved product requirements;
- business rules;
- architecture constraints;
- security requirements;
- Git and commit rules;
- testing requirements;
- documentation requirements;
- repository operational rules.

A subagent does not gain permission to bypass repository rules merely because work was delegated.

---

## Final Review Responsibility

The main agent is responsible for the final result.

Before accepting delegated work, the main agent must verify, where applicable:

- requirement correctness;
- architectural consistency;
- security implications;
- ownership and authorization behavior;
- test results;
- regression risk;
- browser behavior;
- visual consistency;
- Git diff;
- documentation updates.

Subagent completion does not equal task completion.

A task is complete only after the main agent has validated the important results and the repository's Definition of Done is satisfied.
