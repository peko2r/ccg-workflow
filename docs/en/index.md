---
layout: home

hero:
  name: CCX
  text: Multi-model workflows with transparent code ownership
  tagline: Gemini handles frontend analysis, Codex handles backend analysis, and Claude stays in charge of orchestration, review, and final delivery.
  image:
    src: /logo.svg
    alt: CCX
  actions:
    - theme: brand
      text: Get started
      link: /en/guide/getting-started
    - theme: alt
      text: Full command reference
      link: /en/guide/commands
    - theme: alt
      text: GitHub
      link: https://github.com/fengshao1227/claude-code-ex

features:
  - icon: 🔀
    title: Automatic model routing
    details: Frontend work goes to Gemini, backend work goes to Codex, and Claude integrates the result.
  - icon: 🔒
    title: Transparent by default
    details: Claude stays in the write/review loop by default instead of handing your repository to an external model end to end.
  - icon: 📐
    title: Spec-driven execution
    details: OPSX turns requirements into constraints first, then into executable plans.
  - icon: 👥
    title: Agent Teams for parallel work
    details: Large tasks can be decomposed into isolated concurrent streams and reviewed afterward.
  - icon: 🧩
    title: MCP ecosystem included
    details: Works with ace-tool, ace-tool-rs, fast-context, ContextWeaver, grok-search, Context7, and more, with mirror sync to Codex and Gemini.
  - icon: ✉️
    title: Email ASK workflow
    details: Includes the `maild` daemon for email-driven ASK flows.
---
