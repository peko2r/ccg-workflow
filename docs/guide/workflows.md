# 工作流指南

本页帮助你按任务类型选择 CCX 工作流。README 只保留入口级说明，这里给出完整参考。

## 选择总览

```text
拿到任务
  │
  ├─ 简单、聚焦、方向清晰？ ───→ /ccx:frontend 或 /ccx:backend
  ├─ 想先看计划再执行？ ───────→ /ccx:plan → /ccx:execute
  ├─ 计划明确且希望低 token？ ─→ /ccx:plan → /ccx:codex-exec
  ├─ 需要严格约束与审计？ ─────→ /ccx:spec-* 系列
  ├─ 可拆成 3+ 隔离模块？ ─────→ /ccx:team-* 系列
  └─ 想走完整端到端流程？ ─────→ /ccx:workflow
```

## 简单任务

适用场景：

- 单一前端页面或组件调整
- 单一后端接口、逻辑或测试任务
- 你已经知道目标，不需要专门规划文件

推荐命令：

```text
/ccx:frontend 优化 dashboard 布局
/ccx:backend 给订单接口增加分页
```

边界：

- 不适合跨多个模块、依赖关系复杂的任务
- 不适合你需要先审计划的场景

## Plan + Execute

这是最常见的主路径。

### 流程

```text
/ccx:plan 实现用户认证
/ccx:execute .claude/plan/user-auth.md
```

### 适用场景

- 任务规模中等到较大
- 你希望先看到计划，再决定是否执行
- 你希望 Claude 在执行时继续掌握节奏与落地细节

### 特点

- `plan` 聚焦于产出可审查计划
- `execute` 在计划基础上执行，Claude 仍然处于主导位置
- 适合需要中途纠偏、逐步确认的项目

### 前置条件

- Claude Code 可正常运行
- `.claude/plan/` 目录可写
- 如果你依赖 Codex / Gemini 分析，则相应 CLI 已安装

## Codex-Exec

### 流程

```text
/ccx:plan 实现用户认证
/ccx:codex-exec .claude/plan/user-auth.md
```

### 适用场景

- 需求边界清楚
- 计划已经足够明确
- 希望降低 Claude token 消耗
- 更偏向让 Codex 一次性推进实现

### 与 `execute` 的区别

- `execute`：Claude 主导执行，适合复杂或需要临场判断的任务
- `codex-exec`：Codex 主导执行，适合清晰、低歧义任务

### 边界

- 如果需求仍存在大量不确定性，不建议直接用 `codex-exec`
- 如果你需要强约束流程，应改用 OPSX

## OPSX 规范驱动

适用场景：

- 权限系统、审计链路、规范严格的改造
- 你不希望模型在执行阶段继续做关键决策
- 你希望 requirements → constraints → plan → implementation 全链路可追溯

### 流程

```text
/ccx:spec-init
/ccx:spec-research 实现 RBAC 权限系统
/ccx:spec-plan
/ccx:spec-impl
/ccx:spec-review
```

### 特点

- `spec-research`：把需求转为约束
- `spec-plan`：把约束转为零决策执行计划
- `spec-impl`：按计划逐步实施
- `spec-review`：独立双模型审查，可单独使用

### 边界

- 对小任务来说偏重
- 更适合高风险或高约束需求，不适合所有日常改动

## Agent Teams

适用场景：

- 任务可以明确拆成 **3 个以上隔离模块**
- 多个模块之间文件边界清晰
- 你希望用并行实施换取交付速度

### 流程

```text
/ccx:team-research 实现订单 CRUD + 支付 + 通知
/ccx:team-plan order-system
/ccx:team-exec
/ccx:team-review
```

### 特点

- `team-research`：并行研究代码库和约束
- `team-plan`：生成文件范围隔离的并行计划
- `team-exec`：spawn Builder teammates 并发写代码
- `team-review`：Codex + Gemini 交叉审查并行产物

### 前置条件

在 `~/.claude/settings.json` 中启用：

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### 边界

- 模块耦合度高时，不适合并行
- 如果你需要在执行中频繁改方向，连续对话式工作流通常更适合

## 完整 Workflow

```text
/ccx:workflow 实现完整用户认证流程
```

适用场景：

- 想用统一入口跑完整链路
- 任务不需要你在每个阶段显式介入
- 你接受让系统自行完成 research → ideate → plan → execute → optimize → review

边界：

- 如果你想在执行前强制审计划，用 `plan + execute` 更稳妥
- 如果你想严格约束每一步，用 OPSX 更合适

## 推荐决策规则

- **单点任务**：`frontend` / `backend`
- **中大型任务**：`plan + execute`
- **中大型且边界清晰**：`plan + codex-exec`
- **高约束 / 高审计要求**：`spec-*`
- **并行模块化任务**：`team-*`
- **想走全链路自动化**：`workflow`
