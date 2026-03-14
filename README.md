# Claude Code Ex (CCX) Multi-Model Collaboration

<div align="center">

[![npm version](https://img.shields.io/npm/v/claude-code-ex.svg)](https://www.npmjs.com/package/claude-code-ex)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Compatible-green.svg)](https://claude.ai/code)
[![Tests](https://img.shields.io/badge/Tests-134%20passed-brightgreen.svg)]()

[简体中文](./README.zh-CN.md) | English

</div>

A multi-model collaboration development system where Claude Code orchestrates Codex + Gemini. Frontend tasks route to Gemini, backend tasks route to Codex, and Claude handles orchestration and code review.

## Why CCG?

- **Zero-config model routing** — Frontend tasks automatically go to Gemini, backend tasks to Codex. No manual switching.
- **Security by design** — External models have no write access. They return patches; Claude reviews before applying.
- **27 slash commands** — From planning to execution, git workflow to code review, all accessible via `/ccx:*`.
- **Spec-driven development** — Integrates [OPSX](https://github.com/fission-ai/opsx) to turn vague requirements into verifiable constraints, eliminating AI improvisation.

## Architecture

```
Claude Code (Orchestrator)
       │
   ┌───┴───┐
   ↓       ↓
Codex   Gemini
(Backend) (Frontend)
   │       │
   └───┬───┘
       ↓
  Unified Patch
```

External models have no write access — they only return patches, which Claude reviews before applying.

## Quick Start

### Prerequisites

| Dependency | Required | Notes |
|------------|----------|-------|
| **Node.js 20+** | Yes | `ora@9.x` requires Node >= 20. Node 18 causes `SyntaxError` |
| **Claude Code CLI** | Yes | [Install guide](#install-claude-code) |
| **jq** | Yes | Used for auto-authorization hook ([install](#install-jq)) |
| **Codex CLI** | No | Enables backend routing |
| **Gemini CLI** | No | Enables frontend routing |

### Installation

```bash
npx claude-code-ex
```

On first run, CCG prompts you to select a language (English / Chinese). This preference is saved for all future sessions.

### Install jq

```bash
# macOS
brew install jq

# Linux (Debian/Ubuntu)
sudo apt install jq

# Linux (RHEL/CentOS)
sudo yum install jq

# Windows
choco install jq   # or: scoop install jq
```

### Install Claude Code

```bash
npx claude-code-ex menu  # Select "Install Claude Code"
```

Supports: npm, homebrew, curl, powershell, cmd.

### Mail Daemon (`maild`)

CCX ships with a mail daemon for ASK-by-email workflows.

### Requirements

- Python 3 must be available
- Use `python` on Windows
- Use `python3` on macOS / Linux

### Entry points

```bash
maild status
ccx maild status
```

Both forms are equivalent.

### Config files

```text
# Repository template
config/mail/config.template.json

# Active user config
~/.claude/.ccx/mail/config.json
```

Override the config directory with `CCX_MAIL_CONFIG_DIR`.

Compatibility note: the current version still accepts the legacy `CCB_MAIL_CONFIG_DIR`, but `CCX_MAIL_CONFIG_DIR` takes precedence.

### Setup

```bash
maild setup
```

The wizard asks for:

- service mailbox (`service_account`)
- target mailbox (`target_email`)
- default provider such as `claude`, `codex`, `gemini`
- default working directory (optional)

### Common commands

```bash
maild setup              # interactive setup
maild config             # show current config
maild test               # test IMAP / SMTP
maild start              # start in background
maild start -f           # start in foreground
maild status             # show daemon status
maild stop               # stop the daemon
```

### Recommended flow

```bash
maild setup
maild test
maild start
maild status
```

### What it does

- Polls the IMAP inbox
- Uses IMAP IDLE when the provider supports it
- Sends replies over SMTP
- Routes mail content to the configured provider
- Falls back to `default_provider` and `default_work_dir` when the message does not override them

### Mail routing

You can put a provider prefix directly in the email body:

```text
CLAUDE: fix the bug
CODEX: analyze this code
```

If no prefix is provided, `default_provider` is used.

### Testing tips

1. Use a dedicated test mailbox first
2. Confirm IMAP / SMTP is enabled on the provider side
3. Prefer app passwords / authorization codes
4. Only do real send/receive validation after `maild test` passes

## Commands

### Development Workflow

| Command | Description | Model |
|---------|-------------|-------|
| `/ccx:workflow` | Full 6-phase development workflow | Codex + Gemini |
| `/ccx:plan` | Multi-model collaborative planning (Phase 1-2) | Codex + Gemini |
| `/ccx:execute` | Multi-model collaborative execution (Phase 3-5) | Codex + Gemini + Claude |
| `/ccx:codex-exec` | Codex full execution (plan → code → review) | Codex + multi-model review |
| `/ccx:feat` | Smart feature development | Auto-routed |
| `/ccx:frontend` | Frontend tasks (fast mode) | Gemini |
| `/ccx:backend` | Backend tasks (fast mode) | Codex |

### Analysis & Quality

| Command | Description | Model |
|---------|-------------|-------|
| `/ccx:analyze` | Technical analysis | Codex + Gemini |
| `/ccx:debug` | Problem diagnosis + fix | Codex + Gemini |
| `/ccx:optimize` | Performance optimization | Codex + Gemini |
| `/ccx:test` | Test generation | Auto-routed |
| `/ccx:review` | Code review (auto git diff) | Codex + Gemini |
| `/ccx:enhance` | Prompt enhancement | Built-in |

### OPSX Spec-Driven

| Command | Description |
|---------|-------------|
| `/ccx:spec-init` | Initialize OPSX environment |
| `/ccx:spec-research` | Requirements → Constraints |
| `/ccx:spec-plan` | Constraints → Zero-decision plan |
| `/ccx:spec-impl` | Execute plan + archive |
| `/ccx:spec-review` | Dual-model cross-review |

### Agent Teams (v1.7.60+)

| Command | Description |
|---------|-------------|
| `/ccx:team-research` | Requirements → constraints (parallel exploration) |
| `/ccx:team-plan` | Constraints → parallel implementation plan |
| `/ccx:team-exec` | Spawn Builder teammates for parallel coding |
| `/ccx:team-review` | Dual-model cross-review |

> **Prerequisite**: Enable Agent Teams in `settings.json`: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`

### Git Tools

| Command | Description |
|---------|-------------|
| `/ccx:commit` | Smart commit (conventional commit format) |
| `/ccx:rollback` | Interactive rollback |
| `/ccx:clean-branches` | Clean merged branches |
| `/ccx:worktree` | Worktree management |

### Project Setup

| Command | Description |
|---------|-------------|
| `/ccx:init` | Initialize project CLAUDE.md |
| `/ccx:context` | Project context management (.context/ init, log, compress, history) |

## Workflow Guides

### Planning & Execution Separation

```bash
# 1. Generate implementation plan
/ccx:plan implement user authentication

# 2. Review the plan (editable)
# Plan saved to .claude/plan/user-auth.md

# 3a. Execute (Claude refactors) — fine-grained control
/ccx:execute .claude/plan/user-auth.md

# 3b. Execute (Codex does everything) — efficient, low Claude token usage
/ccx:codex-exec .claude/plan/user-auth.md
```

### OPSX Spec-Driven Workflow

Integrates [OPSX architecture](https://github.com/fission-ai/opsx) to turn requirements into constraints, eliminating AI improvisation:

```bash
/ccx:spec-init                          # Initialize OPSX environment
/ccx:spec-research implement user auth  # Research → constraints
/ccx:spec-plan                          # Parallel analysis → zero-decision plan
/ccx:spec-impl                          # Execute the plan
/ccx:spec-review                        # Independent review (anytime)
```

> **Tip**: `/ccx:spec-*` commands internally call `/opsx:*`. You can `/clear` between phases — state is persisted in the `openspec/` directory.

### Agent Teams Parallel Workflow

Leverage Claude Code Agent Teams to spawn multiple Builder teammates for parallel coding:

```bash
/ccx:team-research implement kanban API  # 1. Requirements → constraints
# /clear
/ccx:team-plan kanban-api               # 2. Plan → parallel tasks
# /clear
/ccx:team-exec                          # 3. Builders code in parallel
# /clear
/ccx:team-review                        # 4. Dual-model cross-review
```

> **vs Traditional Workflow**: Team series uses `/clear` between steps to isolate context, passing state through files. Ideal for tasks decomposable into 3+ independent modules.

## Configuration

### Directory Structure

```
~/.claude/
├── commands/ccx/       # 26 slash commands
├── agents/ccx/         # Sub-agents
├── skills/ccx/         # Quality gates + multi-agent orchestration
├── bin/codeagent-wrapper
└── .ccx/
    ├── config.toml     # CCX configuration
    └── prompts/
        ├── codex/      # 6 Codex expert prompts
        └── gemini/     # 7 Gemini expert prompts
```

On Windows installs, `~/.claude/bin` also contains the managed helper commands `ask`, `pend`, and `maild`, and `~/.claude/.ccx/bridge/` stores the shared launcher resources.

### Environment Variables

Configure in `~/.claude/settings.json` under `"env"`:

| Variable | Description | Default | When to change |
|----------|-------------|---------|----------------|
| `CODEAGENT_POST_MESSAGE_DELAY` | Wait after Codex completion (sec) | `5` | Set to `1` if Codex process hangs |
| `CODEX_TIMEOUT` | Wrapper execution timeout (sec) | `7200` | Increase for very long tasks |
| `BASH_DEFAULT_TIMEOUT_MS` | Claude Code Bash timeout (ms) | `120000` | Increase if commands time out |
| `BASH_MAX_TIMEOUT_MS` | Claude Code Bash max timeout (ms) | `600000` | Increase for long builds |

<details>
<summary>Example settings.json</summary>

```json
{
  "env": {
    "CODEAGENT_POST_MESSAGE_DELAY": "1",
    "CODEX_TIMEOUT": "7200",
    "BASH_DEFAULT_TIMEOUT_MS": "600000",
    "BASH_MAX_TIMEOUT_MS": "3600000"
  }
}
```

</details>

### MCP Configuration

```bash
npx claude-code-ex menu  # Select "Configure MCP"
```

**Code retrieval** (choose one):
- **ace-tool** (recommended) — Code search via `search_context`. [Official](https://augmentcode.com/) | [Third-party proxy](https://acemcp.heroman.wtf/)
- **fast-context** (recommended) — Windsurf Fast Context, AI-powered search without full-repo indexing. Requires Windsurf account
- **ContextWeaver** (alternative) — Local hybrid search, requires SiliconFlow API Key (free)

**Optional tools**:
- **Context7** — Latest library documentation (auto-installed)
- **Playwright** — Browser automation / testing
- **DeepWiki** — Knowledge base queries
- **Exa** — Search engine (requires API Key)

### Auto-Authorization Hook

CCG automatically installs a Hook to auto-authorize `codeagent-wrapper` commands (requires [jq](#install-jq)).

<details>
<summary>Manual setup (for versions before v1.7.71)</summary>

Add to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.command' 2>/dev/null | grep -q 'codeagent-wrapper' && echo '{\"hookSpecificOutput\": {\"hookEventName\": \"PreToolUse\", \"permissionDecision\": \"allow\", \"permissionDecisionReason\": \"codeagent-wrapper auto-approved\"}}' || true",
            "timeout": 1
          }
        ]
      }
    ]
  }
}
```

</details>

## Utilities

```bash
npx claude-code-ex menu  # Select "Tools"
```

- **ccusage** — Claude Code usage analytics
- **CCometixLine** — Status bar tool (Git + usage tracking)

## Update / Uninstall

```bash
# Update
npx claude-code-ex@latest            # npx users
npm install -g claude-code-ex@latest  # npm global users

# Uninstall
npx claude-code-ex  # Select "Uninstall"
npm uninstall -g claude-code-ex  # npm global users need this extra step
```

## FAQ

### Codex CLI 0.80.0 process does not exit

In `--json` mode, Codex does not automatically exit after output completion.

**Fix**: Set `CODEAGENT_POST_MESSAGE_DELAY=1` in your environment variables.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

Looking for a place to start? Check out issues labeled [`good first issue`](https://github.com/fengshao1227/claude-code-ex/labels/good%20first%20issue).

## Contributors

<!-- readme: contributors,claude/-,bots/- -start -->
<table>
<tr>
    <td align="center"><a href="https://github.com/fengshao1227"><img src="https://avatars.githubusercontent.com/fengshao1227?v=4&s=100" width="100;" alt="fengshao1227"/><br /><sub><b>fengshao1227</b></sub></a></td>
    <td align="center"><a href="https://github.com/RebornQ"><img src="https://avatars.githubusercontent.com/RebornQ?v=4&s=100" width="100;" alt="RebornQ"/><br /><sub><b>RebornQ</b></sub></a></td>
    <td align="center"><a href="https://github.com/23q3"><img src="https://avatars.githubusercontent.com/23q3?v=4&s=100" width="100;" alt="23q3"/><br /><sub><b>23q3</b></sub></a></td>
    <td align="center"><a href="https://github.com/MrNine-666"><img src="https://avatars.githubusercontent.com/MrNine-666?v=4&s=100" width="100;" alt="MrNine-666"/><br /><sub><b>MrNine-666</b></sub></a></td>
    <td align="center"><a href="https://github.com/GGzili"><img src="https://avatars.githubusercontent.com/GGzili?v=4&s=100" width="100;" alt="GGzili"/><br /><sub><b>GGzili</b></sub></a></td>
</tr>
</table>
<!-- readme: contributors,claude/-,bots/- -end -->

## Credits

- [cexll/myclaude](https://github.com/cexll/myclaude) — codeagent-wrapper
- [UfoMiao/zcf](https://github.com/UfoMiao/zcf) — Git tools
- [GudaStudio/skills](https://github.com/GuDaStudio/skills) — Routing design
- [ace-tool](https://linux.do/t/topic/1344562) — MCP tool

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=fengshao1227/claude-code-ex&type=timeline&legend=top-left)](https://www.star-history.com/#fengshao1227/claude-code-ex&type=timeline&legend=top-left)

## Contact

- **Email**: [fengshao1227@gmail.com](mailto:fengshao1227@gmail.com) — Sponsorship, collaboration, or development ideas
- **Issues**: [GitHub Issues](https://github.com/fengshao1227/claude-code-ex/issues) — Bug reports and feature requests
- **Discussions**: [GitHub Discussions](https://github.com/fengshao1227/claude-code-ex/discussions) — Questions and community chat

## License

MIT

---

v1.7.83 | [Issues](https://github.com/fengshao1227/claude-code-ex/issues) | [Contributing](./CONTRIBUTING.md)
