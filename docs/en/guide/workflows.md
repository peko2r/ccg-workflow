# Workflow Guide

Different tasks call for different workflows. Don't overthink it — use this decision tree.

## How to choose

```
Got a task
  │
  ├─ Simple, one sentence? ──→ /ccx:frontend or /ccx:backend
  │
  ├─ Want to review the plan first? → /ccx:plan → /ccx:execute
  │
  ├─ Need strict control? ──→ /ccx:spec-* series
  │
  ├─ Splits into 3+ modules? → /ccx:team-* series
  │
  └─ Full end-to-end? ──────→ /ccx:workflow
```

## Plan → Execute (most common)

Codex and Gemini each produce an analysis. Claude combines them into a plan. You review it, tweak if needed, then execute.

```bash
/ccx:plan implement user authentication
# Plan saved in .claude/plan/
# Open it, read it, edit it if you want

# Two ways to execute — pick one:
/ccx:execute .claude/plan/user-auth.md   # Claude handles each step
/ccx:codex-exec .claude/plan/user-auth.md  # Codex does everything, Claude just reviews
```

**When to use which?**

`execute` — Complex tasks where you want Claude steering every step. Uses more tokens.

`codex-exec` — Clear, well-defined tasks. Codex runs the whole thing, Claude reviews at the end. Much cheaper.

## OPSX Spec-Driven (strict control)

For when you don't want the AI making stuff up. Like implementing a permission system where every detail needs to be traceable.

The idea: **turn requirements into constraints, then turn constraints into a zero-decision plan. During execution, there's nothing to decide — every decision was already made during planning.**

```bash
/ccx:spec-init
/ccx:spec-research implement RBAC permission system
# This outputs constraints like:
# - Must support role inheritance
# - Permission check latency < 5ms
# - Must have audit logging

/ccx:spec-plan
# Constraints → zero-decision plan
# Every step: which file, what change, how to verify

/ccx:spec-impl
# Execute step by step, no decisions needed

/ccx:spec-review
# Independent dual-model review, use anytime
```

You can `/clear` between phases — state lives in `openspec/`, it won't disappear.

## Agent Teams (parallel multi-module)

Task splits into independent modules? Like "order CRUD + payment integration + email notifications" — three modules with no dependencies. Let three Builders work at once.

```bash
/ccx:team-research implement order system
# Outputs constraints + success criteria
# /clear

/ccx:team-plan order-system
# Splits into non-overlapping subtasks, each Builder owns their files
# /clear

/ccx:team-exec
# Multiple Builders code in parallel
# /clear

/ccx:team-review
# Codex reviews + Gemini reviews, Critical = must fix
```

**How is this different from the normal workflow?**

Normal workflow keeps a continuous conversation — context accumulates. Team series `/clear`s between steps, passing state through files. Upside: context never blows up. Downside: you can't course-correct mid-stream.

Works best when: the task decomposes into 3+ independent modules with no tight coupling.

## Full Workflow (autopilot)

`/ccx:workflow` runs all 6 phases automatically: research → ideate → plan → execute → optimize → review.

```bash
/ccx:workflow implement full user auth with registration, login, and JWT
```

Good for when you don't want to babysit the process. For big tasks though, `plan + execute` gives you a checkpoint to review the plan before committing to it.
