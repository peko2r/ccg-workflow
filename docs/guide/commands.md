# 命令参考

28 个命令，全部 `/ccx:` 开头。按用途分了几组。

## 干活的

最常用的几个。前端任务自动找 Gemini，后端任务自动找 Codex。

| 命令 | 干什么 | 谁来干 |
|------|--------|--------|
| `/ccx:workflow` | 完整走一遍：研究→构思→计划→执行→优化→评审 | Codex + Gemini |
| `/ccx:plan` | 只做规划，不动代码 | Codex + Gemini |
| `/ccx:execute` | 拿着计划文件开干，Claude 主导 | Codex + Gemini + Claude |
| `/ccx:codex-exec` | 拿着计划文件开干，Codex 主导，Claude 只审核 | Codex |
| `/ccx:feat` | 智能判断该规划还是直接干 | 自动选 |
| `/ccx:frontend` | 前端活 | Gemini |
| `/ccx:backend` | 后端活 | Codex |

```bash
# 最简单的用法
/ccx:frontend 把首页的卡片组件改成 Grid 布局
/ccx:backend 给 /api/users 加分页参数

# 先规划后执行
/ccx:plan 实现 JWT 认证
# 计划存在 .claude/plan/ 里，看完觉得没问题：
/ccx:execute .claude/plan/jwt-auth.md
```

## 查问题的

不写代码，只分析。双模型交叉验证，一个看前端一个看后端。

| 命令 | 干什么 |
|------|--------|
| `/ccx:analyze` | 技术分析 |
| `/ccx:debug` | 诊断 Bug + 给修复方案 |
| `/ccx:optimize` | 找性能瓶颈 |
| `/ccx:test` | 生成测试 |
| `/ccx:review` | 代码审查，不传参数就审最近的 git diff |
| `/ccx:enhance` | 把模糊需求变成结构化描述 |

```bash
# 自动审查最近改动
/ccx:review

# 诊断具体问题
/ccx:debug 为什么 WebSocket 连接会在 30 秒后断开
```

## OPSX 规范驱动

不想让 AI 自由发挥？用这组。先把需求变成约束条件，再按约束执行。

| 命令 | 干什么 |
|------|--------|
| `/ccx:spec-init` | 初始化 OPSX 环境 |
| `/ccx:spec-research` | 研究需求，输出约束 |
| `/ccx:spec-plan` | 约束变计划，所有决策在这步做完 |
| `/ccx:spec-impl` | 按计划执行 |
| `/ccx:spec-review` | 双模型审查（任何时候都能用） |

```bash
/ccx:spec-init
/ccx:spec-research 实现 RBAC 权限系统
# 可以 /clear 释放上下文
/ccx:spec-plan
/ccx:spec-impl
```

::: tip
状态存在 `openspec/` 目录里，中间随便 `/clear`，不会丢。
:::

## Agent Teams 并行

任务能拆成 3 个以上独立模块？用这组。多个 Builder 同时写代码。

| 命令 | 干什么 |
|------|--------|
| `/ccx:team-research` | 并行探索代码库，产出约束 |
| `/ccx:team-plan` | 拆分任务，确保模块之间不打架 |
| `/ccx:team-exec` | Builder 们同时开工 |
| `/ccx:team-review` | Codex + Gemini 交叉审查 |

```bash
/ccx:team-research 实现订单系统的 CRUD + 支付 + 通知三个模块
# /clear
/ccx:team-plan order-system
# /clear
/ccx:team-exec
# /clear
/ccx:team-review
```

::: warning
需要先在 `settings.json` 里开实验特性：`"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"`
:::

## Git 工具

| 命令 | 干什么 |
|------|--------|
| `/ccx:commit` | 分析 diff 自动生成 conventional commit |
| `/ccx:rollback` | 交互式回滚 |
| `/ccx:clean-branches` | 清理已合并分支（默认 dry-run，放心用） |
| `/ccx:worktree` | Worktree 管理 |

## 项目管理

| 命令 | 干什么 |
|------|--------|
| `/ccx:init` | 给项目生成 CLAUDE.md |
| `/ccx:context` | 管理 .context 目录：记决策、压缩日志、看历史 |

```bash
/ccx:context init
/ccx:context log "选 PostgreSQL 是因为需要 JSONB"
```
