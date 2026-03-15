# Claude Code Ex (CCX)

<div align="center">

[![npm version](https://img.shields.io/npm/v/claude-code-ex.svg)](https://www.npmjs.com/package/claude-code-ex)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Compatible-green.svg)](https://claude.ai/code)
[![Tests](https://img.shields.io/badge/Tests-134%20passed-brightgreen.svg)]()

简体中文 | [English](./README.md)

</div>

CCX 是运行在 Claude Code 之上的工作流层：前端分析交给 Gemini，后端分析交给 Codex，Claude 负责编排、审阅与最终交付。

## 为什么用 CCX

- **自动模型路由**：前端走 Gemini，后端走 Codex。
- **代码主权透明**：默认始终由 Claude 保持写入/审阅闭环。
- **规范驱动执行**：OPSX 把模糊需求转成约束和可执行计划。
- **支持并行交付**：Agent Teams 可将大任务拆成隔离的并发流程。
- **工程能力内置**：斜杠命令、CLI、MCP、诊断、bridge helper、`maild` 一起交付。

## 核心能力

- **27 个 `/ccx:*` 斜杠命令**：覆盖工作流、分析、Git、OPSX、Agent Teams、项目管理
- **`ccx` CLI**：负责安装、更新、彻底卸载、MCP 配置、诊断、bridge/helper 命令与 `maild`
- **4 个内置 agent**：定义在 `templates/commands/agents/*.md`
- **MCP 自动镜像同步**：同步到 `~/.codex/config.toml` 和 `~/.gemini/settings.json`
- **`maild` 邮件工作流**：仅支持 `CCX_MAIL_CONFIG_DIR`

## 架构

```text
Claude Code（编排者）
       │
   ┌───┴───┐
   ↓       ↓
Codex   Gemini
（后端） （前端）
   │       │
   └───┬───┘
       ↓
审阅后的 Patch / 执行结果
       ↓
   Claude 最终交付
```

## 快速开始

### 前置条件

- **Node.js 20+**
- **Claude Code CLI**
- **jq**，用于常见 Hook / 自动化场景
- **Codex CLI**，用于后端路由与 Codex 主导工作流
- **Gemini CLI**，用于前端路由
- **Python 3**，仅在使用 `maild` 时需要

### 安装

```bash
npx claude-code-ex
```

### 首次使用建议

```bash
npx claude-code-ex
npx claude-code-ex init
npx claude-code-ex config mcp
```

然后在 Claude Code 中试一个斜杠命令：

```text
/ccx:frontend 给登录页加一个暗色模式切换
```

## 如何选择工作流

- **简单聚焦任务** → `/ccx:frontend` 或 `/ccx:backend`
- **想先审计划再动手** → `/ccx:plan` → `/ccx:execute`
- **任务边界清晰且想节省 Claude token** → `/ccx:plan` → `/ccx:codex-exec`
- **需要严格约束与可审计过程** → `/ccx:spec-*`
- **任务可拆为 3 个以上隔离模块** → `/ccx:team-*`
- **想走完整端到端流程** → `/ccx:workflow`

## 命令总览

### 斜杠命令分组

- **开发工作流**：`workflow`、`plan`、`execute`、`codex-exec`、`feat`、`frontend`、`backend`
- **分析与质量**：`analyze`、`debug`、`optimize`、`test`、`review`、`enhance`
- **OPSX**：`spec-init`、`spec-research`、`spec-plan`、`spec-impl`、`spec-review`
- **Agent Teams**：`team-research`、`team-plan`、`team-exec`、`team-review`
- **Git 工具**：`commit`、`rollback`、`clean-branches`、`worktree`
- **项目管理**：`init`、`context`

### CLI 分组

- **核心 CLI**：`ccx`、`ccx init`、`ccx update`、`ccx uninstall`、`ccx config mcp`、`ccx diagnose-mcp`、`ccx fix-mcp`、`ccx maild ...`
- **Bridge / helper CLI**：`ccx bridge`、`ccx ask`、`ccx ping`、`ccx pend`、`ccx mounted`、`ccx cleanup`

## 卸载

```bash
npx claude-code-ex uninstall
```

该命令会删除 CCX 在 Claude/Codex/Gemini 生态中明确受管的文件与配置，包括受管 MCP 条目、MCP 镜像、fast-context 注入内容、输出风格文件与 ContextWeaver 本地目录。如通过 npm 全局安装，还需在新终端中执行 `npm uninstall -g claude-code-ex` 完成包级卸载。

## 文档入口

完整参考文档位于 `docs/`：

- [快速开始](./docs/guide/getting-started.md)
- [命令参考](./docs/guide/commands.md)
- [工作流指南](./docs/guide/workflows.md)
- [MCP 参考](./docs/guide/mcp.md)
- [配置、CLI、目录结构、迁移与排障](./docs/guide/configuration.md)

## 版本状态

当前包版本：**v1.7.85**

近期影响文档口径的关键变更：

- 品牌统一为 **CCX**
- `maild` 并入主仓库
- `fast-context` 增加并同步到 Codex / Gemini
- `/ccx:context` 加入斜杠命令集合
- `maild` 现仅支持 **`CCX_MAIL_CONFIG_DIR`**

## 参与贡献

- [贡献指南](./CONTRIBUTING.md)
- [GitHub Issues](https://github.com/fengshao1227/claude-code-ex/issues)
- [GitHub Discussions](https://github.com/fengshao1227/claude-code-ex/discussions)

## 联系方式

- **邮箱**: [fengshao1227@gmail.com](mailto:fengshao1227@gmail.com)
- **Issues**: [GitHub Issues](https://github.com/fengshao1227/claude-code-ex/issues)
- **Discussions**: [GitHub Discussions](https://github.com/fengshao1227/claude-code-ex/discussions)

## License

[MIT](./LICENSE)

---

v1.7.85 | [Issues](https://github.com/fengshao1227/claude-code-ex/issues) | [参与贡献](./CONTRIBUTING.md)
