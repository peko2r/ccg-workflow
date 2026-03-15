# Configuration

This page collects CCX configuration, CLI command reference, installation layout, migration notes, and common troubleshooting paths.

## Post-install layout

A typical install looks like this:

```text
~/.claude/
├── commands/ccx/       # 27 slash command templates
├── agents/ccx/         # 4 agent definitions
├── skills/ccx/         # quality gates and multi-agent orchestration skills
├── bin/
│   ├── codeagent-wrapper
│   ├── ask
│   ├── pend
│   └── maild
└── .ccx/
    ├── config.toml
    ├── prompts/
    │   ├── codex/
    │   └── gemini/
    ├── mail/
    └── bridge/
```

Notes:

- `commands/ccx/` contains installed slash command templates
- `agents/ccx/` contains installed agent templates
- `skills/ccx/` contains quality-gate and orchestration skills
- `bin/` contains the main runtime binary and managed helpers
- `~/.claude/.ccx/` is the primary configuration directory

## Common environment variables

These are typically set under `env` in `~/.claude/settings.json`.

| Variable | Meaning | Default | When to change |
|----------|---------|---------|----------------|
| `CODEAGENT_POST_MESSAGE_DELAY` | Extra wait after Codex completes | `5` | Set to `1` if Codex finishes output but the process hangs |
| `CODEX_TIMEOUT` | Wrapper execution timeout in seconds | `7200` | Increase for long-running jobs |
| `BASH_DEFAULT_TIMEOUT_MS` | Default Bash timeout | `120000` | Increase when commands time out |
| `BASH_MAX_TIMEOUT_MS` | Maximum Bash timeout | `600000` | Increase for long builds or slow tests |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | Enables Agent Teams | unset | Set to `1` when using `/ccx:team-*` |

Example:

```json
{
  "env": {
    "CODEAGENT_POST_MESSAGE_DELAY": "1",
    "CODEX_TIMEOUT": "7200",
    "BASH_DEFAULT_TIMEOUT_MS": "600000",
    "BASH_MAX_TIMEOUT_MS": "3600000",
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

## `maild` configuration

### Entry points

```bash
maild status
ccx maild status
```

Both forms are equivalent.

### Runtime requirements

- Python 3 is required
- Windows uses `python`
- macOS / Linux use `python3`

### Config paths

```text
# Repository template
config/mail/config.template.json

# Active user config
~/.claude/.ccx/mail/config.json
```

### Config directory variable

`maild` currently supports only:

```text
CCX_MAIL_CONFIG_DIR
```

This is the only config-directory variable that should be used in the current implementation.

### Common commands

```bash
maild setup
maild config
maild test
maild start
maild start -f
maild status
maild stop
```

### Suggested first-run flow

```bash
maild setup
maild test
maild start
maild status
```

## Core CLI commands

These commands come from `src/cli.ts` and `src/cli-setup.ts`:

| Command | Purpose |
|---------|---------|
| `ccx` | Open interactive menu |
| `ccx init` / `ccx i` | Initialize / install workflows |
| `ccx update` | Update workflow files |
| `ccx uninstall` | Fully remove CCX-managed files and configuration |
| `ccx config mcp` | Configure MCP |
| `ccx diagnose-mcp` | Diagnose MCP configuration |
| `ccx fix-mcp` | Repair MCP configuration, mainly for Windows |
| `ccx maild ...` | Run `maild` subcommands |

## Uninstall semantics

Run:

```bash
npx claude-code-ex uninstall
```

This command removes CCX-managed artifacts only:

- `~/.claude/commands/ccx/`, `agents/ccx/`, `skills/ccx/`, `.ccx/`
- managed `codeagent-wrapper` and bridge shims
- CCX MCP servers from `~/.claude.json`, plus mirrored entries in `~/.codex/config.toml` and `~/.gemini/settings.json`
- CCX-added `codeagent-wrapper` auto-approval entries in `~/.claude/settings.json`
- CCX-installed files under `~/.claude/output-styles/`
- managed `fast-context` prompt injections in rules / `AGENTS.md` / `GEMINI.md`
- `~/.contextweaver/`

Safety boundary: the uninstall flow removes only fixed whitelist entries or content that can be verified as CCX-managed. User-defined MCP servers, skills, bin files, and unrelated settings are preserved.

### Uninstall boundary examples

| Removed | Preserved |
|---|---|
| `~/.claude/commands/ccx/`, `agents/ccx/`, `skills/ccx/` | user-created `~/.claude/skills/<custom>/` |
| MCP entries in `~/.claude.json` whose IDs are in `CCX_MCP_IDS` | user-defined MCP entries |
| CCX mirrored MCP entries in `~/.codex/config.toml` / `~/.gemini/settings.json` | non-CCX MCP entries added manually |
| `codeagent-wrapper` auto-approval entries in `settings.json` | `ANTHROPIC_BASE_URL`, `ANTHROPIC_API_KEY`, and unrelated settings |
| CCX-installed files under `~/.claude/output-styles/` | user-authored style files |
| fast-context injected marker blocks | user-authored content in `AGENTS.md` / `GEMINI.md` |
| `~/.contextweaver/` | other home-level directories not created by CCX |

If CCX was installed globally, finish with:

```bash
npm uninstall -g claude-code-ex
```

## Bridge / helper CLI commands

| Command | Purpose |
|---------|---------|
| `ccx bridge [...providers]` | Launch the bridge runtime |
| `ccx ask <provider> ...` | Send a request to a mounted provider |
| `ccx ping <provider>` | Check provider status |
| `ccx pend <provider> [count]` | List pending requests |
| `ccx mounted [provider]` | Show mounted providers |
| `ccx cleanup` | Clean bridge runtime state |

These are advanced operational commands, mainly useful if you actively manage the bridge runtime directly.

## Fixed product constraints

The following should be treated as current implementation facts:

- brand is **CCX**
- primary CLI is `ccx`
- slash commands are `/ccx:*`
- primary config directory is `~/.claude/.ccx/`
- Agent Teams is enabled through `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`
- `maild` only recognizes `CCX_MAIL_CONFIG_DIR`

## Migration notes

If you previously used older naming, the important updates are:

- `ccg` / `ccb` are no longer the current public entry points
- slash commands are standardized on `/ccx:*`
- skills install under `~/.claude/skills/ccx/`
- managed configuration is standardized under `~/.claude/.ccx/`
- `maild` config directories are standardized on `CCX_MAIL_CONFIG_DIR`

## Troubleshooting

### Node 18 throws syntax errors

Upgrade to **Node.js 20+**.

### Codex finishes output but the process does not exit

Set this in `settings.json`:

```json
{
  "env": {
    "CODEAGENT_POST_MESSAGE_DELAY": "1"
  }
}
```

### MCP tools are not working

Start with:

```bash
npx claude-code-ex diagnose-mcp
```

On Windows, if needed:

```bash
npx claude-code-ex fix-mcp
```

### Agent Teams is unavailable

Make sure this is enabled:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### `maild` does not start

Check these first:

- Python 3 is installed
- `config/mail/config.template.json` has been copied/initialized as needed
- the active config is under `~/.claude/.ccx/mail/config.json`
- the `maild` config directory is being pointed through `CCX_MAIL_CONFIG_DIR` when overridden

## Related docs

- [Getting started](./getting-started.md)
- [Command reference](./commands.md)
- [Workflow guide](./workflows.md)
- [MCP reference](./mcp.md)
