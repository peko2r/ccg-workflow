import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'CCX',
  description: 'Claude Code Ex multi-model collaboration system',

  base: '/claude-code-ex/',
  lastUpdated: true,
  cleanUrls: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/claude-code-ex/logo.svg' }],
  ],

  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: [
          { text: '快速开始', link: '/guide/getting-started' },
          { text: '命令参考', link: '/guide/commands' },
          {
            text: '深入使用',
            items: [
              { text: '工作流选择', link: '/guide/workflows' },
              { text: 'MCP 与搜索能力', link: '/guide/mcp' },
              { text: '配置、CLI 与排障', link: '/guide/configuration' },
            ],
          },
        ],
        sidebar: [
          {
            text: '开始使用 CCX',
            items: [
              { text: '快速开始', link: '/guide/getting-started' },
              { text: '命令参考', link: '/guide/commands' },
            ],
          },
          {
            text: '按场景深入',
            items: [
              { text: '工作流选择', link: '/guide/workflows' },
              { text: 'MCP 与搜索能力', link: '/guide/mcp' },
              { text: '配置、CLI 与排障', link: '/guide/configuration' },
            ],
          },
        ],
        editLink: {
          pattern: 'https://github.com/fengshao1227/claude-code-ex/edit/main/docs/:path',
          text: '在 GitHub 上编辑此页',
        },
        footer: {
          message: '基于 MIT 许可发布',
          copyright: 'Copyright © 2025-present CCX Contributors',
        },
        docFooter: {
          prev: '上一页',
          next: '下一页',
        },
        outline: {
          label: '页面导航',
        },
        lastUpdated: {
          text: '最后更新于',
        },
        returnToTopLabel: '回到顶部',
        sidebarMenuLabel: '菜单',
        darkModeSwitchLabel: '主题',
      },
    },
    en: {
      label: 'English',
      lang: 'en',
      description: 'Claude Code Ex multi-model collaboration system',
      themeConfig: {
        nav: [
          { text: 'Get Started', link: '/en/guide/getting-started' },
          { text: 'Command Reference', link: '/en/guide/commands' },
          {
            text: 'Go Deeper',
            items: [
              { text: 'Workflow Selection', link: '/en/guide/workflows' },
              { text: 'MCP and Search', link: '/en/guide/mcp' },
              { text: 'Configuration, CLI, and Troubleshooting', link: '/en/guide/configuration' },
            ],
          },
        ],
        sidebar: [
          {
            text: 'Start with CCX',
            items: [
              { text: 'Quick Start', link: '/en/guide/getting-started' },
              { text: 'Command Reference', link: '/en/guide/commands' },
            ],
          },
          {
            text: 'Go Deeper by Task',
            items: [
              { text: 'Workflow Selection', link: '/en/guide/workflows' },
              { text: 'MCP and Search', link: '/en/guide/mcp' },
              { text: 'Configuration, CLI, and Troubleshooting', link: '/en/guide/configuration' },
            ],
          },
        ],
        editLink: {
          pattern: 'https://github.com/fengshao1227/claude-code-ex/edit/main/docs/:path',
          text: 'Edit this page on GitHub',
        },
        footer: {
          message: 'Released under the MIT License',
          copyright: 'Copyright © 2025-present CCX Contributors',
        },
      },
    },
  },

  themeConfig: {
    socialLinks: [
      { icon: 'github', link: 'https://github.com/fengshao1227/claude-code-ex' },
    ],
    search: {
      provider: 'local',
    },
  },
})
