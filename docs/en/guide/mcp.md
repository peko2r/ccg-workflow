# MCP Reference

This page documents the MCP categories, setup paths, and sync behavior currently implemented by CCX, based on the real logic in `src/commands/config-mcp.ts`.

## Entry points

You can open MCP configuration through:

```bash
npx claude-code-ex menu
# or
npx claude-code-ex config mcp
```

The current MCP menu is organized into three groups:

- **code retrieval MCPs**
- **web search MCP**
- **auxiliary MCPs**

## Code retrieval MCPs

These tools are for repository search. In most setups, you choose one primary option.

### ace-tool

- code retrieval path in the Augment ecosystem
- current wording explicitly notes that `search_context` works while `enhance_prompt` is no longer available
- can use the official service or a third-party proxy
- after installation, it is mirrored to Codex / Gemini MCP config

### ace-tool-rs

- Rust implementation of `ace-tool`
- listed alongside `ace-tool` as a recommended option
- useful if you prefer the Rust variant

### fast-context

- Windsurf Fast Context
- supports manual API key input or auto-extraction from a local signed-in Windsurf install
- supports a snippet-return toggle equivalent to `FC_INCLUDE_SNIPPETS`
- on successful install, CCX also writes search guidance to:
  - `~/.claude/rules/`
  - `~/.codex/AGENTS.md`
  - `~/.gemini/GEMINI.md`

### ContextWeaver

- local hybrid search path
- requires a SiliconFlow API key
- after installation, it is mirrored to Codex / Gemini MCP config

## Web search MCP

### grok-search

- web search MCP option
- supports these configuration inputs:
  - `GROK_API_URL`
  - `GROK_API_KEY`
  - `TAVILY_API_KEY`
  - `FIRECRAWL_API_KEY`
- on success, it writes global search guidance to:
  - `~/.claude/rules/ccg-grok-search.md`
- then mirrors MCP config to Codex / Gemini

## Auxiliary MCPs

### Context7

- fetches up-to-date library documentation
- currently one of the auxiliary MCP options

### Playwright

- browser automation and testing via MCP

### DeepWiki

- knowledge-base retrieval
- installed under the ID `mcp-deepwiki`

### Exa

- search-engine MCP
- requires `EXA_API_KEY`

## MCP mirror sync

After install or uninstall of a managed MCP, CCX attempts to mirror configuration to:

- `~/.codex/config.toml`
- `~/.gemini/settings.json`

Why this exists:

- it keeps Claude Code-side and Codex/Gemini-side MCP state aligned
- it allows workflows like `/ccx:codex-exec` to reuse the same MCP configuration directly

## Fast Context guidance sync

When `fast-context` is installed, CCX also writes search guidance to:

- `~/.claude/rules/`
- `~/.codex/AGENTS.md`
- `~/.gemini/GEMINI.md`

This is separate from plain MCP mirroring.

## Practical setup suggestions

### If you only want better code retrieval

Pick one primary option:

- `ace-tool`
- `ace-tool-rs`
- `fast-context`
- `ContextWeaver`

### If you also want stronger web search

Add:

- `grok-search`

### If you want docs, browser, or external search utilities

Add any of:

- `Context7`
- `Playwright`
- `DeepWiki`
- `Exa`

## Troubleshooting

Start with:

```bash
npx claude-code-ex diagnose-mcp
```

On Windows, if needed:

```bash
npx claude-code-ex fix-mcp
```

## Related docs

- [Getting started](./getting-started.md)
- [Workflow guide](./workflows.md)
- [Configuration](./configuration.md)
