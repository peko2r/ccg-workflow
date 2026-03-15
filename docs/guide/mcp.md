# MCP 参考

本页描述 CCX 当前实现支持的 MCP 分类、配置方式与同步行为，基于 `src/commands/config-mcp.ts` 的真实逻辑整理。

## 入口

可通过以下方式进入 MCP 配置：

```bash
npx claude-code-ex menu
# 或
npx claude-code-ex config mcp
```

当前 MCP 菜单分为三类：

- **代码检索 MCP**
- **联网搜索 MCP**
- **辅助工具 MCP**

## 代码检索 MCP

这类工具用于仓库代码检索，一般选择一个主要方案即可。

### ace-tool

- 面向 Augment 生态的代码检索方案
- 当前文案强调 `search_context` 可用，而 `enhance_prompt` 已不可用
- 可使用官方服务，也可使用第三方中转
- 安装后会同步到 Codex / Gemini MCP 配置

### ace-tool-rs

- `ace-tool` 的 Rust 版本
- 在配置菜单中与 `ace-tool` 并列为推荐选项
- 适合偏好 Rust 实现的用户

### fast-context

- Windsurf Fast Context
- 支持 API Key 手动填写，也支持本地 Windsurf 已登录时自动提取
- 支持 `FC_INCLUDE_SNIPPETS` 风格的片段返回开关
- 安装成功后，除了 MCP 本身，还会写入搜索规则到：
  - `~/.claude/rules/`
  - `~/.codex/AGENTS.md`
  - `~/.gemini/GEMINI.md`

### ContextWeaver

- 本地混合搜索方案
- 依赖 SiliconFlow API Key
- 安装成功后同样会同步到 Codex / Gemini 的 MCP 配置

## 联网搜索 MCP

### grok-search

- 用于联网搜索
- 配置项支持：
  - `GROK_API_URL`
  - `GROK_API_KEY`
  - `TAVILY_API_KEY`
  - `FIRECRAWL_API_KEY`
- 安装成功后会写入全局搜索规则到：
  - `~/.claude/rules/ccg-grok-search.md`
- 然后同步 MCP 到 Codex / Gemini

## 辅助工具 MCP

### Context7

- 获取最新库文档
- 当前实现中属于辅助 MCP 选项之一

### Playwright

- 浏览器自动化与测试
- 通过 MCP 形式接入

### DeepWiki

- 知识库查询
- 在实现中以 `mcp-deepwiki` 作为安装 ID

### Exa

- 搜索引擎 MCP
- 需要 `EXA_API_KEY`

## MCP 镜像同步

安装或卸载受管理 MCP 后，CCX 会尝试自动同步到：

- `~/.codex/config.toml`
- `~/.gemini/settings.json`

目的：

- 保持 Claude Code 侧和 Codex / Gemini 侧的 MCP 一致
- 让 `/ccx:codex-exec` 等工作流能直接复用相同 MCP 配置

## Fast Context 规则同步

安装 `fast-context` 后，还会额外写入搜索规则到：

- `~/.claude/rules/`
- `~/.codex/AGENTS.md`
- `~/.gemini/GEMINI.md`

这部分不是普通 MCP 镜像，而是额外的提示词/规则同步。

## 常见配置建议

### 只想增强代码检索

优先从以下方案里选一个：

- `ace-tool`
- `ace-tool-rs`
- `fast-context`
- `ContextWeaver`

### 还想增强联网搜索

再加：

- `grok-search`

### 需要文档、浏览器或外部搜索能力

再按需加：

- `Context7`
- `Playwright`
- `DeepWiki`
- `Exa`

## 故障排查

如果 MCP 配置异常，先运行：

```bash
npx claude-code-ex diagnose-mcp
```

Windows 场景如有需要，再运行：

```bash
npx claude-code-ex fix-mcp
```

## 相关文档

- [快速开始](./getting-started.md)
- [工作流指南](./workflows.md)
- [配置说明](./configuration.md)
