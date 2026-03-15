# Command Reference

This page covers **`/ccx:*` slash commands only**. For CLI commands, bridge/helper commands, and the `maild` entry points, see [Configuration](./configuration.md).

The current implementation installs **27 `/ccx:*` commands**.

## Development workflows

| Command | Purpose | Main path |
|---------|---------|-----------|
| `/ccx:workflow` | Full 6-phase workflow | Codex + Gemini |
| `/ccx:plan` | Planning only, no code changes | Codex + Gemini |
| `/ccx:execute` | Execute from a plan with Claude in control | Codex + Gemini + Claude |
| `/ccx:codex-exec` | Execute from a plan with Codex in control | Codex + multi-model review |
| `/ccx:feat` | Smart feature entry point | Auto-routed |
| `/ccx:frontend` | Frontend task | Gemini |
| `/ccx:backend` | Backend task | Codex |

Examples:

```text
/ccx:frontend improve the homepage card layout
/ccx:backend add pagination to /api/users
/ccx:plan implement user authentication
```

## Analysis and quality

| Command | Purpose |
|---------|---------|
| `/ccx:analyze` | Technical analysis |
| `/ccx:debug` | Diagnosis and fix suggestions |
| `/ccx:optimize` | Performance optimization |
| `/ccx:test` | Test generation |
| `/ccx:review` | Code review; with no args it reviews recent git diff |
| `/ccx:enhance` | Turn vague requests into structured task descriptions |

Examples:

```text
/ccx:review
/ccx:debug why does the WebSocket drop after 30 seconds
/ccx:enhance I want a better settings page UX
```

## OPSX spec-driven workflow

| Command | Purpose |
|---------|---------|
| `/ccx:spec-init` | Initialize OPSX |
| `/ccx:spec-research` | Requirements → constraints |
| `/ccx:spec-plan` | Constraints → zero-decision execution plan |
| `/ccx:spec-impl` | Execute against the spec |
| `/ccx:spec-review` | Independent dual-model review |

Examples:

```text
/ccx:spec-init
/ccx:spec-research implement RBAC
/ccx:spec-plan
/ccx:spec-impl
```

## Agent Teams

| Command | Purpose |
|---------|---------|
| `/ccx:team-research` | Parallel research into requirements and constraints |
| `/ccx:team-plan` | Produce a parallelizable execution plan |
| `/ccx:team-exec` | Spawn Builder teammates for concurrent implementation |
| `/ccx:team-review` | Cross-review concurrent output |

> Prerequisite: enable `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `~/.claude/settings.json`.

## Git tools

| Command | Purpose |
|---------|---------|
| `/ccx:commit` | Smart conventional commit generation |
| `/ccx:rollback` | Interactive rollback |
| `/ccx:clean-branches` | Clean merged / stale branches |
| `/ccx:worktree` | Worktree management |

## Project management

| Command | Purpose |
|---------|---------|
| `/ccx:init` | Initialize project CLAUDE.md |
| `/ccx:context` | Manage `.context/` initialization, logging, compression, and history |

## Selection guide

- **Simple focused task**: `/ccx:frontend` or `/ccx:backend`
- **Plan first**: `/ccx:plan`
- **Execute with Claude in control**: `/ccx:execute`
- **Execute with Codex leading**: `/ccx:codex-exec`
- **Need strict constraints**: `/ccx:spec-*`
- **Need parallel work across 3+ modules**: `/ccx:team-*`
- **Want the full end-to-end path**: `/ccx:workflow`

## Related docs

- [Workflow guide](./workflows.md)
- [MCP reference](./mcp.md)
- [Configuration and CLI reference](./configuration.md)
