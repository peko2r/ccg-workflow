# Getting Started

This page is for first-time CCX users. The goal is to get a minimal working path running first, then layer on extra models and MCP tools if needed.

## What CCX is

CCX is a workflow layer on top of Claude Code:

- **Gemini** handles frontend analysis
- **Codex** handles backend analysis
- **Claude** integrates plans, applies code changes, reviews output, and delivers the final result

In the default mode, Claude remains in the write/review loop. For narrowly scoped tasks, you can also use `/ccx:codex-exec` so Codex drives implementation and Claude + Gemini review the outcome.

## Prerequisites

| Dependency | Required | Purpose |
|------------|----------|---------|
| Node.js 20+ | Yes | `ora@9.x` requires Node 20+ |
| Claude Code CLI | Yes | Base runtime for CCX |
| jq | Recommended | Commonly used in hooks, auto-authorization, and command processing |
| Codex CLI | Optional | Backend routing, `/ccx:backend`, `/ccx:codex-exec` |
| Gemini CLI | Optional | Frontend routing, `/ccx:frontend` |
| Python 3 | Required for `maild` only | `maild` runtime; Windows uses `python`, macOS/Linux use `python3` |

## Install

```bash
npx claude-code-ex
```

On first run, CCX asks for language selection and persists it for later sessions.

## CLI usage vs slash command usage

### `ccx` CLI

The CLI is for installation and operational tasks:

- install and update
- MCP configuration
- MCP diagnostics and repair
- bridge / helper commands
- the `maild` daemon

Common examples:

```bash
npx claude-code-ex
npx claude-code-ex init
npx claude-code-ex config mcp
npx claude-code-ex diagnose-mcp
ccx maild status
```

### `/ccx:*` slash commands

Slash commands run inside Claude Code and cover analysis, planning, coding, review, OPSX, and Agent Teams.

The current implementation installs **27 `/ccx:*` commands**.

Common examples:

```text
/ccx:frontend add dark mode to the login page
/ccx:backend add pagination to /api/users
/ccx:plan implement JWT auth
/ccx:review
```

## Recommended first-run paths

### Path A: minimal usable setup

1. Run install:

```bash
npx claude-code-ex
```

2. Initialize workflows:

```bash
npx claude-code-ex init
```

3. Inside Claude Code, run:

```text
/ccx:frontend add a dark mode toggle to the login page
```

If Gemini gets routed in, the base workflow is working.

### Path B: full collaboration setup

1. Install Codex CLI and Gemini CLI
2. Configure MCP:

```bash
npx claude-code-ex config mcp
```

3. Validate with a plan-driven workflow:

```text
/ccx:plan implement user authentication
/ccx:execute .claude/plan/user-auth.md
```

## Verification steps

### Verify CLI

```bash
npx claude-code-ex init
npx claude-code-ex diagnose-mcp
```

### Verify slash commands

```text
/ccx:frontend improve the homepage hero area
/ccx:backend add pagination to the orders endpoint
```

### Verify Agent Teams flag

If you want `/ccx:team-*`, enable it in `~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

## Install `jq`

::: code-group

```bash [macOS]
brew install jq
```

```bash [Debian / Ubuntu]
sudo apt install jq
```

```bash [RHEL / CentOS]
sudo yum install jq
```

```bash [Windows]
choco install jq
# or
scoop install jq
```

:::

## Install Claude Code

```bash
npx claude-code-ex menu
```

Then choose **Install Claude Code**. Current menu paths support `npm`, `homebrew`, `curl`, `powershell`, and `cmd`.

## Next

- [Command reference](./commands.md)
- [Workflow guide](./workflows.md)
- [MCP reference](./mcp.md)
- [Configuration, CLI, layout, migration, troubleshooting](./configuration.md)
