# Workflow Guide

This page helps you choose the right CCX workflow by task type. The README stays at the navigation level; this page is the full reference.

## Selection overview

```text
Got a task
  │
  ├─ Simple, focused, and clear? ─────→ /ccx:frontend or /ccx:backend
  ├─ Want to review a plan first? ────→ /ccx:plan → /ccx:execute
  ├─ Plan is clear and tokens matter? → /ccx:plan → /ccx:codex-exec
  ├─ Need strict constraints/auditability? → /ccx:spec-*
  ├─ Can split into 3+ isolated modules? → /ccx:team-*
  └─ Want a full end-to-end path? ────→ /ccx:workflow
```

## Simple focused tasks

Use this when:

- the change is local to one page, component, API, or logic path
- the direction is already clear
- you do not need a separate plan artifact first

Recommended commands:

```text
/ccx:frontend improve the dashboard layout
/ccx:backend add pagination to the orders endpoint
```

Boundaries:

- not ideal for work spanning multiple modules
- not ideal when you want to review a plan before coding

## Plan + Execute

This is the most common path.

### Flow

```text
/ccx:plan implement user authentication
/ccx:execute .claude/plan/user-auth.md
```

### Best fit

- medium to large tasks
- you want to review a plan before execution
- you want Claude to stay in control while implementing

### Characteristics

- `plan` produces a reviewable execution plan
- `execute` follows that plan with Claude still steering implementation
- well suited to tasks that may need course correction during execution

### Preconditions

- Claude Code is working normally
- `.claude/plan/` is writable
- install Codex CLI and/or Gemini CLI if you rely on their analysis paths

## Codex-Exec

### Flow

```text
/ccx:plan implement user authentication
/ccx:codex-exec .claude/plan/user-auth.md
```

### Best fit

- requirements are well scoped
- the plan is already explicit enough
- you want lower Claude token consumption
- you prefer Codex to push implementation in one pass

### Difference from `execute`

- `execute`: Claude leads execution; better for complex or adaptive tasks
- `codex-exec`: Codex leads execution; better for clear, low-ambiguity tasks

### Boundaries

- avoid this path when requirements are still fuzzy
- if you need strict constraint-first execution, use OPSX instead

## OPSX spec-driven workflow

Use this when:

- the work is high-risk or tightly constrained
- you do not want key implementation decisions happening during execution
- you want a traceable chain from requirements to constraints to plan to implementation

### Flow

```text
/ccx:spec-init
/ccx:spec-research implement RBAC
/ccx:spec-plan
/ccx:spec-impl
/ccx:spec-review
```

### Characteristics

- `spec-research`: turns requirements into constraints
- `spec-plan`: turns constraints into a zero-decision plan
- `spec-impl`: executes against that plan
- `spec-review`: independent dual-model review and can be used standalone

### Boundaries

- heavyweight for small changes
- best reserved for high-control work rather than everyday edits

## Agent Teams

Use this when:

- the task can be decomposed into **3+ isolated modules**
- file ownership boundaries are clear
- you want to trade coordination overhead for faster delivery through parallel work

### Flow

```text
/ccx:team-research implement order CRUD + payment + notifications
/ccx:team-plan order-system
/ccx:team-exec
/ccx:team-review
```

### Characteristics

- `team-research`: parallel exploration of codebase and constraints
- `team-plan`: produces a file-scope-isolated parallel plan
- `team-exec`: spawns Builder teammates for concurrent implementation
- `team-review`: Codex + Gemini cross-review the output

### Preconditions

Enable the feature in `~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### Boundaries

- not a good fit when modules are tightly coupled
- if you need to frequently steer the work mid-flight, the continuous conversation workflows are usually better

## Full workflow

```text
/ccx:workflow implement a full authentication flow
```

Use this when:

- you want one entry point for the whole lifecycle
- you do not need to manually intervene at each phase
- you are comfortable letting the system run research → ideate → plan → execute → optimize → review

Boundaries:

- if you want a plan checkpoint before implementation, `plan + execute` is safer
- if you need hard constraints, OPSX is a better fit

## Recommended decision rules

- **Single focused task**: `frontend` / `backend`
- **Medium or large task**: `plan + execute`
- **Medium or large but clearly scoped**: `plan + codex-exec`
- **High-control / auditable task**: `spec-*`
- **Parallel multi-module task**: `team-*`
- **Full automation path**: `workflow`
