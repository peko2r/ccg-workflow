---
layout: home

hero:
  name: CCX
  text: 多模型协作，但代码主权仍在你手里
  tagline: Gemini 负责前端分析，Codex 负责后端分析，Claude 负责编排、审阅与最终交付。
  image:
    src: /logo.svg
    alt: CCX
  actions:
    - theme: brand
      text: 三分钟上手
      link: /guide/getting-started
    - theme: alt
      text: 完整命令参考
      link: /guide/commands
    - theme: alt
      text: GitHub
      link: https://github.com/fengshao1227/claude-code-ex

features:
  - icon: 🔀
    title: 自动模型路由
    details: 前端任务走 Gemini，后端任务走 Codex，Claude 统一整合结果并交付。
  - icon: 🔒
    title: 默认透明闭环
    details: 默认由 Claude 保持写入与审阅闭环，不把你的仓库完全交给外部模型。
  - icon: 📐
    title: 规范驱动开发
    details: 通过 OPSX 先约束、再规划、再执行，减少 AI 自由发挥。
  - icon: 👥
    title: Agent Teams 并行实施
    details: 大任务可以拆成隔离子任务并行执行，再做双模型交叉审查。
  - icon: 🧩
    title: MCP 生态集成
    details: 支持 ace-tool、ace-tool-rs、fast-context、ContextWeaver、grok-search、Context7 等工具，并同步到 Codex 与 Gemini。
  - icon: ✉️
    title: 邮件 ASK 工作流
    details: 内置 `maild` 守护进程，支持通过邮件触发工作流。
---
