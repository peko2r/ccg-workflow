# 配置说明

本页汇总 CCX 的配置、CLI 命令、安装后目录结构、迁移说明与常见故障排查。

## 安装后目录结构

常见安装结果位于：

```text
~/.claude/
├── commands/ccx/       # 27 个 slash command 模板
├── agents/ccx/         # 4 个 agent 定义
├── skills/ccx/         # 质量关卡与多 Agent 协同技能
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

说明：

- `commands/ccx/` 安装 slash commands
- `agents/ccx/` 安装 agent 模板
- `skills/ccx/` 安装 quality gate 与 orchestration skill
- `bin/` 中包含主运行二进制与受管理 helper
- `~/.claude/.ccx/` 是当前主配置目录

## 常用环境变量

这些变量通常写在 `~/.claude/settings.json` 的 `env` 节点中。

| 变量 | 说明 | 默认值 | 何时修改 |
|------|------|--------|----------|
| `CODEAGENT_POST_MESSAGE_DELAY` | Codex 完成后额外等待秒数 | `5` | Codex 输出完但进程不退出时改为 `1` |
| `CODEX_TIMEOUT` | wrapper 执行超时（秒） | `7200` | 长任务时增大 |
| `BASH_DEFAULT_TIMEOUT_MS` | Bash 默认超时 | `120000` | 命令容易超时时增大 |
| `BASH_MAX_TIMEOUT_MS` | Bash 最大超时 | `600000` | 长构建或慢测试时增大 |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | 启用 Agent Teams | 未设置 | 使用 `/ccx:team-*` 时设为 `1` |

示例：

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

## `maild` 配置

### 入口

```bash
maild status
ccx maild status
```

两种形式等价。

### 运行前提

- 需要 Python 3
- Windows 用 `python`
- macOS / Linux 用 `python3`

### 配置路径

```text
# 仓库内模板
config/mail/config.template.json

# 用户实际配置
~/.claude/.ccx/mail/config.json
```

### 配置目录变量

`maild` 当前仅支持：

```text
CCX_MAIL_CONFIG_DIR
```

这是当前实现唯一应使用的配置目录变量。

### 常用命令

```bash
maild setup
maild config
maild test
maild start
maild start -f
maild status
maild stop
```

### 首次建议流程

```bash
maild setup
maild test
maild start
maild status
```

## 核心 CLI 命令

这些命令来自 `src/cli.ts` 与 `src/cli-setup.ts`：

| 命令 | 用途 |
|------|------|
| `ccx` | 打开交互菜单 |
| `ccx init` / `ccx i` | 初始化 / 安装工作流 |
| `ccx update` | 更新工作流文件 |
| `ccx uninstall` | 彻底删除 CCX 受管文件与配置 |
| `ccx config mcp` | 配置 MCP |
| `ccx diagnose-mcp` | 诊断 MCP 配置 |
| `ccx fix-mcp` | 修复 MCP 配置（主要用于 Windows） |
| `ccx maild ...` | 调用 `maild` 子命令 |

## 卸载语义

执行：

```bash
npx claude-code-ex uninstall
```

该命令会清理 CCX 明确受管的产物：

- `~/.claude/commands/ccx/`、`agents/ccx/`、`skills/ccx/`、`.ccx/`
- 受管 `codeagent-wrapper` 与 bridge shim
- `~/.claude.json` 中的 CCX MCP 服务，以及同步到 `~/.codex/config.toml` / `~/.gemini/settings.json` 的镜像
- `~/.claude/settings.json` 中由 CCX 写入的 `codeagent-wrapper` 自动授权项
- `~/.claude/output-styles/` 下 CCX 安装的 style 文件
- `fast-context` 注入到 rules / `AGENTS.md` / `GEMINI.md` 的受管内容
- `~/.contextweaver/`

安全边界：仅删除固定白名单或可验证为 CCX 受管的内容，不删除用户自定义 MCP、skills、bin 文件与无关设置。

### 卸载边界示例

| 会删除 | 不会删除 |
|---|---|
| `~/.claude/commands/ccx/`、`agents/ccx/`、`skills/ccx/` | 用户自建 `~/.claude/skills/<custom>/` |
| `~/.claude.json` 中 `CCX_MCP_IDS` 对应 MCP | 用户自定义 MCP 条目 |
| `~/.codex/config.toml` / `~/.gemini/settings.json` 中 CCX 镜像 MCP | 用户手动配置的非 CCX MCP |
| `settings.json` 中 `codeagent-wrapper` 自动授权项 | `ANTHROPIC_BASE_URL`、`ANTHROPIC_API_KEY`、其他无关设置 |
| `~/.claude/output-styles/` 下 CCX 安装的 style 文件 | 用户自定义 style 文件 |
| fast-context 注入的 marker block | `AGENTS.md` / `GEMINI.md` 中用户原有内容 |
| `~/.contextweaver/` | 其它非 CCX 创建的 home 目录 |

如为 npm 全局安装，最后仍需手动执行：

```bash
npm uninstall -g claude-code-ex
```

## Bridge / helper CLI 命令

| 命令 | 用途 |
|------|------|
| `ccx bridge [...providers]` | 启动 bridge 运行时 |
| `ccx ask <provider> ...` | 向已挂载 provider 发送请求 |
| `ccx ping <provider>` | 检查 provider 状态 |
| `ccx pend <provider> [count]` | 查看待处理请求 |
| `ccx mounted [provider]` | 查看已挂载 provider |
| `ccx cleanup` | 清理 bridge 运行时状态 |

这些命令偏高级运维用途，适合直接管理 bridge runtime 的场景。

## 固定约束

当前实现中，以下口径应视为固定事实：

- 品牌统一为 **CCX**
- 主 CLI 为 `ccx`
- 斜杠命令统一为 `/ccx:*`
- 主配置目录为 `~/.claude/.ccx/`
- Agent Teams 通过 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 启用
- `maild` 仅识别 `CCX_MAIL_CONFIG_DIR`

## 迁移说明

如果你曾使用旧版命名，重点变化如下：

- `ccg` / `ccb` 不再是当前公开主入口
- slash commands 统一使用 `/ccx:*`
- skills 安装路径为 `~/.claude/skills/ccx/`
- 受管理配置目录统一为 `~/.claude/.ccx/`
- `maild` 配置目录统一使用 `CCX_MAIL_CONFIG_DIR`

## 故障排查

### Node 18 报语法错误

请升级到 **Node.js 20+**。

### Codex 输出完但进程不退出

在 `settings.json` 中设置：

```json
{
  "env": {
    "CODEAGENT_POST_MESSAGE_DELAY": "1"
  }
}
```

### MCP 工具异常

先运行：

```bash
npx claude-code-ex diagnose-mcp
```

Windows 如有需要，再运行：

```bash
npx claude-code-ex fix-mcp
```

### Agent Teams 不可用

确认已启用：

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### `maild` 无法启动

优先检查：

- 系统是否安装 Python 3
- `config/mail/config.template.json` 是否已按需复制并初始化
- 用户配置是否位于 `~/.claude/.ccx/mail/config.json`
- `maild` 配置目录是否通过 `CCX_MAIL_CONFIG_DIR` 正确指向

## 相关文档

- [快速开始](./getting-started.md)
- [命令参考](./commands.md)
- [工作流指南](./workflows.md)
- [MCP 参考](./mcp.md)
