# 快速开始

本页面向第一次使用 CCX 的用户，目标是先跑通最小可用路径，再决定是否启用更多模型与 MCP。

## CCX 是什么

CCX 是运行在 Claude Code 之上的多模型工作流层：

- **Gemini** 负责前端分析
- **Codex** 负责后端分析
- **Claude** 负责计划整合、代码落地、审阅与最终交付

默认模式下，Claude 保持写入/审阅闭环；如果任务目标非常明确，也可以改用 `/ccx:codex-exec` 让 Codex 主导实施，再由 Claude + Gemini 做结果审查。

## 前置条件

| 依赖 | 必需 | 用途 |
|------|------|------|
| Node.js 20+ | 是 | `ora@9.x` 依赖 Node 20+ |
| Claude Code CLI | 是 | CCX 运行基础 |
| jq | 推荐 | 常见 Hook / 自动授权 / 命令处理场景会用到 |
| Codex CLI | 否 | 后端路由、`/ccx:backend`、`/ccx:codex-exec` |
| Gemini CLI | 否 | 前端路由、`/ccx:frontend` |
| Python 3 | `maild` 需要 | `maild` 运行依赖；Windows 用 `python`，macOS / Linux 用 `python3` |

## 安装

```bash
npx claude-code-ex
```

首次运行会提示选择语言，并保存到后续会话。

## CLI 使用 vs Slash Command 使用

### `ccx` CLI

CLI 负责安装和运维类任务：

- 安装与更新
- MCP 配置
- MCP 诊断与修复
- bridge / helper 命令
- `maild` 守护进程

常见示例：

```bash
npx claude-code-ex
npx claude-code-ex init
npx claude-code-ex config mcp
npx claude-code-ex diagnose-mcp
ccx maild status
```

### `/ccx:*` Slash Commands

Slash commands 在 Claude Code 内执行，负责分析、规划、编码、审查、OPSX 与 Agent Teams。

当前实现共安装 **27 个 `/ccx:*` 命令**。

常见示例：

```text
/ccx:frontend 给登录页加暗色模式切换
/ccx:backend 给 /api/users 增加分页
/ccx:plan 实现 JWT 认证
/ccx:review
```

## 推荐的首次路径

### 路径 A：最小可用体验

1. 运行安装：

```bash
npx claude-code-ex
```

2. 执行初始化：

```bash
npx claude-code-ex init
```

3. 在 Claude Code 中执行：

```text
/ccx:frontend 给登录页加一个暗色模式切换
```

如果你看到 Gemini 被调度，说明基础路由已生效。

### 路径 B：启用完整协作能力

1. 安装 Codex CLI 与 Gemini CLI
2. 配置 MCP：

```bash
npx claude-code-ex config mcp
```

3. 用计划型工作流验证：

```text
/ccx:plan 实现用户认证
/ccx:execute .claude/plan/user-auth.md
```

## 验证步骤

### 验证 CLI

```bash
npx claude-code-ex init
npx claude-code-ex diagnose-mcp
```

### 验证 Slash Commands

```text
/ccx:frontend 优化首页 Hero 区
/ccx:backend 给订单接口增加分页
```

### 验证 Agent Teams 开关

如果要使用 `/ccx:team-*`，在 `~/.claude/settings.json` 的 `env` 中启用：

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

## 安装 `jq`

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
# 或
scoop install jq
```

:::

## 安装 Claude Code

```bash
npx claude-code-ex menu
```

然后在菜单中选择 **安装 Claude Code**。当前支持 `npm`、`homebrew`、`curl`、`powershell`、`cmd` 等入口。

## 下一步

- [命令参考](./commands.md)
- [工作流指南](./workflows.md)
- [MCP 参考](./mcp.md)
- [配置、CLI、目录结构、迁移与排障](./configuration.md)
