# Claude Code Ex (CCX)

<div align="center">

[![npm version](https://img.shields.io/npm/v/claude-code-ex.svg)](https://www.npmjs.com/package/claude-code-ex)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Compatible-green.svg)](https://claude.ai/code)
[![Tests](https://img.shields.io/badge/Tests-134%20passed-brightgreen.svg)]()

[简体中文](./README.zh-CN.md) | English

</div>

CCX is a workflow layer for Claude Code: Gemini handles frontend analysis, Codex handles backend analysis, and Claude stays responsible for orchestration, review, and final delivery.

## Why CCX

- **Automatic model routing** — frontend to Gemini, backend to Codex.
- **Transparent code ownership** — Claude remains in the write/review loop by default.
- **Spec-driven execution** — OPSX converts vague requests into constraints and executable plans.
- **Parallel delivery paths** — Agent Teams split large tasks into isolated concurrent streams.
- **Integrated operations** — slash commands, CLI, MCP setup, diagnostics, bridge helpers, and `maild` ship together.

## Core capabilities

- **27 `/ccx:*` slash commands** for workflows, analysis, Git operations, OPSX, Agent Teams, and project management
- **`ccx` CLI** for install, update, full uninstall, MCP configuration, diagnostics, bridge/helper commands, and `maild`
- **4 built-in agents** under `templates/commands/agents/*.md`
- **MCP sync** to `~/.codex/config.toml` and `~/.gemini/settings.json`
- **`maild`** for ASK-by-email workflows, using `CCX_MAIL_CONFIG_DIR` only

## Architecture

```text
Claude Code (orchestrator)
       │
   ┌───┴───┐
   ↓       ↓
Codex   Gemini
(backend) (frontend)
   │       │
   └───┬───┘
       ↓
Reviewed patch / execution result
       ↓
   Claude delivery
```

## Quick start

### Prerequisites

- **Node.js 20+**
- **Claude Code CLI**
- **jq** for common hook / automation setups
- **Codex CLI** for backend routing and Codex-led workflows
- **Gemini CLI** for frontend routing
- **Python 3** only if you use `maild`

### Install

```bash
npx claude-code-ex
```

### First run checklist

```bash
npx claude-code-ex
npx claude-code-ex init
npx claude-code-ex config mcp
```

Then try a slash command inside Claude Code:

```text
/ccx:frontend add a dark mode toggle to the login page
```

## Which workflow should I use?

- **Simple focused task** → `/ccx:frontend` or `/ccx:backend`
- **Want a reviewed plan first** → `/ccx:plan` → `/ccx:execute`
- **Need lower Claude token usage on a clear task** → `/ccx:plan` → `/ccx:codex-exec`
- **Need strict constraints and auditability** → `/ccx:spec-*`
- **Need parallel execution across 3+ isolated modules** → `/ccx:team-*`
- **Want a full end-to-end path** → `/ccx:workflow`

## Command overview

### Slash command groups

- **Development workflows**: `workflow`, `plan`, `execute`, `codex-exec`, `feat`, `frontend`, `backend`
- **Analysis and quality**: `analyze`, `debug`, `optimize`, `test`, `review`, `enhance`
- **OPSX**: `spec-init`, `spec-research`, `spec-plan`, `spec-impl`, `spec-review`
- **Agent Teams**: `team-research`, `team-plan`, `team-exec`, `team-review`
- **Git tools**: `commit`, `rollback`, `clean-branches`, `worktree`
- **Project management**: `init`, `context`

### CLI groups

- **Core CLI**: `ccx`, `ccx init`, `ccx update`, `ccx uninstall`, `ccx config mcp`, `ccx diagnose-mcp`, `ccx fix-mcp`, `ccx maild ...`
- **Bridge / helper CLI**: `ccx bridge`, `ccx ask`, `ccx ping`, `ccx pend`, `ccx mounted`, `ccx cleanup`

## Uninstall

```bash
npx claude-code-ex uninstall
```

This command removes CCX-managed files and configuration under Claude/Codex/Gemini, including managed MCP entries, mirrored MCP config, fast-context prompt injection, output styles, and ContextWeaver local state. If CCX was installed globally, finish by running `npm uninstall -g claude-code-ex` in a new terminal.

## Documentation

Detailed documentation lives in `docs/`:

- [Getting started](./docs/en/guide/getting-started.md)
- [Command reference](./docs/en/guide/commands.md)
- [Workflow guide](./docs/en/guide/workflows.md)
- [MCP reference](./docs/en/guide/mcp.md)
- [Configuration, CLI, layout, migration, troubleshooting](./docs/en/guide/configuration.md)

## Version status

Current package version: **v1.7.85**

Recent documentation-sensitive changes:

- Brand unified to **CCX**
- `maild` integrated into the main repository
- `fast-context` added with sync to Codex / Gemini
- `/ccx:context` added to the slash command set
- `maild` now supports **only** `CCX_MAIL_CONFIG_DIR`

## Contributing

- [Contributing Guide](./CONTRIBUTING.md)
- [GitHub Issues](https://github.com/fengshao1227/claude-code-ex/issues)
- [GitHub Discussions](https://github.com/fengshao1227/claude-code-ex/discussions)

## Contact

- **Email**: [fengshao1227@gmail.com](mailto:fengshao1227@gmail.com)
- **Issues**: [GitHub Issues](https://github.com/fengshao1227/claude-code-ex/issues)
- **Discussions**: [GitHub Discussions](https://github.com/fengshao1227/claude-code-ex/discussions)

## License

[MIT](./LICENSE)

---

v1.7.85 | [Issues](https://github.com/fengshao1227/claude-code-ex/issues) | [Contributing](./CONTRIBUTING.md)
