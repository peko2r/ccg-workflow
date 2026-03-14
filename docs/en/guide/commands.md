# Command Reference

28 commands, all prefixed with `/ccx:`. Grouped by purpose.

## The workhorses

The ones you'll use most. Frontend tasks go to Gemini, backend tasks to Codex, automatically.

| Command | What it does | Who does it |
|---------|-------------|-------------|
| `/ccx:workflow` | Full cycle: research → ideate → plan → execute → optimize → review | Codex + Gemini |
| `/ccx:plan` | Just plan, don't touch code | Codex + Gemini |
| `/ccx:execute` | Run a plan file, Claude leads | Codex + Gemini + Claude |
| `/ccx:codex-exec` | Run a plan file, Codex leads, Claude only reviews | Codex |
| `/ccx:feat` | Figures out whether to plan or just do it | Auto |
| `/ccx:frontend` | Frontend work | Gemini |
| `/ccx:backend` | Backend work | Codex |

```bash
# Simplest usage
/ccx:frontend change the card component to grid layout
/ccx:backend add pagination to /api/users

# Plan first, execute later
/ccx:plan implement JWT auth
# Plan saved to .claude/plan/ — review and edit it
/ccx:execute .claude/plan/jwt-auth.md
```

## The investigators

Don't write code, just analyze. Two models cross-verify each other.

| Command | What it does |
|---------|-------------|
| `/ccx:analyze` | Technical analysis |
| `/ccx:debug` | Diagnose bugs + suggest fixes |
| `/ccx:optimize` | Find performance bottlenecks |
| `/ccx:test` | Generate tests |
| `/ccx:review` | Code review — no args means review latest git diff |
| `/ccx:enhance` | Turn vague requests into structured task descriptions |

```bash
# Review recent changes
/ccx:review

# Diagnose a specific issue
/ccx:debug why does the WebSocket connection drop after 30 seconds
```

## OPSX spec-driven

Don't want the AI to improvise? This group turns requirements into constraints first, then executes within those constraints.

| Command | What it does |
|---------|-------------|
| `/ccx:spec-init` | Set up OPSX environment |
| `/ccx:spec-research` | Research requirements, output constraints |
| `/ccx:spec-plan` | Turn constraints into a zero-decision plan |
| `/ccx:spec-impl` | Execute the plan |
| `/ccx:spec-review` | Dual-model review (can use anytime) |

```bash
/ccx:spec-init
/ccx:spec-research implement RBAC permission system
/ccx:spec-plan
/ccx:spec-impl
```

::: tip
State lives in `openspec/`. You can `/clear` between phases without losing anything.
:::

## Agent Teams (parallel)

Task splits into 3+ independent modules? Multiple Builders work at the same time.

| Command | What it does |
|---------|-------------|
| `/ccx:team-research` | Explore codebase in parallel, output constraints |
| `/ccx:team-plan` | Split into tasks that don't step on each other |
| `/ccx:team-exec` | Builders code in parallel |
| `/ccx:team-review` | Codex + Gemini cross-review |

```bash
/ccx:team-research implement order system with CRUD, payment, and notifications
# /clear
/ccx:team-plan order-system
# /clear
/ccx:team-exec
# /clear
/ccx:team-review
```

::: warning
Requires experimental feature flag: `"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"` in settings.json.
:::

## Git tools

| Command | What it does |
|---------|-------------|
| `/ccx:commit` | Analyzes diff, generates conventional commit message |
| `/ccx:rollback` | Interactive rollback |
| `/ccx:clean-branches` | Clean merged branches (dry-run by default, safe to try) |
| `/ccx:worktree` | Worktree management |

## Project management

| Command | What it does |
|---------|-------------|
| `/ccx:init` | Generate CLAUDE.md for the project |
| `/ccx:context` | Manage .context directory: log decisions, compress, view history |

```bash
/ccx:context init
/ccx:context log "Chose PostgreSQL for JSONB support"
```
