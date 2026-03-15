# 命令参考

本页只讨论 **`/ccx:*` slash commands**。CLI 命令、bridge/helper 命令与 `maild` 入口请看 [配置说明](./configuration.md)。

当前实现共安装 **27 个 `/ccx:*` 命令**。

## 开发工作流

| 命令 | 用途 | 主路径 |
|------|------|--------|
| `/ccx:workflow` | 完整 6 阶段工作流 | Codex + Gemini |
| `/ccx:plan` | 只规划，不改代码 | Codex + Gemini |
| `/ccx:execute` | 基于计划执行，Claude 主导 | Codex + Gemini + Claude |
| `/ccx:codex-exec` | 基于计划执行，Codex 主导 | Codex + 多模型审查 |
| `/ccx:feat` | 智能功能开发入口 | 自动路由 |
| `/ccx:frontend` | 前端专项任务 | Gemini |
| `/ccx:backend` | 后端专项任务 | Codex |

示例：

```text
/ccx:frontend 优化首页卡片布局
/ccx:backend 给 /api/users 增加分页
/ccx:plan 实现用户认证
```

## 分析与质量

| 命令 | 用途 |
|------|------|
| `/ccx:analyze` | 技术分析 |
| `/ccx:debug` | 问题诊断与修复建议 |
| `/ccx:optimize` | 性能优化 |
| `/ccx:test` | 测试生成 |
| `/ccx:review` | 代码审查；无参数时默认审最近 git diff |
| `/ccx:enhance` | 将模糊需求增强为结构化任务描述 |

示例：

```text
/ccx:review
/ccx:debug 为什么 WebSocket 30 秒后断开
/ccx:enhance 我想把设置页面体验做好一点
```

## OPSX 规范驱动工作流

| 命令 | 用途 |
|------|------|
| `/ccx:spec-init` | 初始化 OPSX 环境 |
| `/ccx:spec-research` | 需求 → 约束 |
| `/ccx:spec-plan` | 约束 → 零决策执行计划 |
| `/ccx:spec-impl` | 按规范实施 |
| `/ccx:spec-review` | 双模型独立审查 |

示例：

```text
/ccx:spec-init
/ccx:spec-research 实现 RBAC 权限系统
/ccx:spec-plan
/ccx:spec-impl
```

## Agent Teams

| 命令 | 用途 |
|------|------|
| `/ccx:team-research` | 并行研究需求与约束 |
| `/ccx:team-plan` | 生成可并行执行计划 |
| `/ccx:team-exec` | spawn Builder teammates 并发实施 |
| `/ccx:team-review` | 双模型交叉审查并行产物 |

> 使用前提：在 `~/.claude/settings.json` 的 `env` 中启用 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`。

## Git 工具

| 命令 | 用途 |
|------|------|
| `/ccx:commit` | 智能生成 conventional commit |
| `/ccx:rollback` | 交互式回滚 |
| `/ccx:clean-branches` | 清理已合并 / 过期分支 |
| `/ccx:worktree` | Worktree 管理 |

## 项目管理

| 命令 | 用途 |
|------|------|
| `/ccx:init` | 初始化项目 CLAUDE.md |
| `/ccx:context` | 管理 `.context/` 初始化、日志、压缩、历史 |

## 选择建议

- **简单任务**：`/ccx:frontend` 或 `/ccx:backend`
- **先出计划**：`/ccx:plan`
- **计划后由 Claude 执行**：`/ccx:execute`
- **计划后由 Codex 主导执行**：`/ccx:codex-exec`
- **严格约束流程**：`/ccx:spec-*`
- **跨 3+ 模块并行**：`/ccx:team-*`
- **完整端到端流程**：`/ccx:workflow`

## 相关文档

- [工作流指南](./workflows.md)
- [MCP 参考](./mcp.md)
- [配置说明（含 CLI 命令）](./configuration.md)
