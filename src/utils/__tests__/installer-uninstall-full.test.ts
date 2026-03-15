import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs-extra'
import { parse as parseToml } from 'smol-toml'
import { uninstallCcx } from '../installer'

const MANAGED_OUTPUT_STYLES = [
  'engineer-professional.md',
  'nekomata-engineer.md',
]

describe('uninstallCcx full integration', () => {
  const tempHome = join(tmpdir(), `ccx-uninstall-home-${Date.now()}`)
  const installDir = join(tempHome, '.claude')
  const originalHome = process.env.HOME
  const originalUserProfile = process.env.USERPROFILE

  beforeEach(async () => {
    vi.restoreAllMocks()
    process.env.HOME = tempHome
    process.env.USERPROFILE = tempHome
    await fs.ensureDir(installDir)

    await fs.ensureDir(join(installDir, 'commands', 'ccx'))
    await fs.writeFile(join(installDir, 'commands', 'ccx', 'workflow.md'), '# workflow', 'utf-8')

    await fs.ensureDir(join(installDir, 'agents', 'ccx'))
    await fs.writeFile(join(installDir, 'agents', 'ccx', 'planner.md'), '# planner', 'utf-8')

    await fs.ensureDir(join(installDir, 'skills', 'ccx', 'tools', 'verify-security'))
    await fs.writeFile(join(installDir, 'skills', 'ccx', 'tools', 'verify-security', 'SKILL.md'), '# verify-security', 'utf-8')
    await fs.ensureDir(join(installDir, 'skills', 'custom-skill'))
    await fs.writeFile(join(installDir, 'skills', 'custom-skill', 'SKILL.md'), '# custom', 'utf-8')

    await fs.ensureDir(join(installDir, '.ccx', 'bridge'))
    await fs.writeFile(join(installDir, '.ccx', 'bridge', 'compat-launcher.sh'), '#!/usr/bin/env bash\n', 'utf-8')
    await fs.writeFile(join(installDir, '.ccx', 'config.toml'), 'version = "1.0.0"\n', 'utf-8')

    await fs.ensureDir(join(installDir, 'rules'))
    await fs.writeFile(join(installDir, 'rules', 'ccg-skills.md'), '# ccg-skills', 'utf-8')
    await fs.writeFile(join(installDir, 'rules', 'ccg-grok-search.md'), '# ccg-grok-search', 'utf-8')
    await fs.writeFile(join(installDir, 'rules', 'ccx-skills.md'), '# ccx-skills', 'utf-8')
    await fs.writeFile(join(installDir, 'rules', 'ccx-grok-search.md'), '# ccx-grok-search', 'utf-8')
    await fs.writeFile(join(installDir, 'rules', 'ccg-fast-context.md'), '# ccg-fast-context', 'utf-8')
    await fs.writeFile(join(installDir, 'rules', 'custom-rule.md'), '# custom-rule', 'utf-8')

    await fs.ensureDir(join(installDir, 'bin'))
    await fs.writeFile(join(installDir, 'bin', 'codeagent-wrapper'), 'binary', 'utf-8')
    await fs.writeFile(join(installDir, 'bin', 'custom-helper'), 'custom', 'utf-8')
    await fs.writeFile(join(installDir, 'bin', 'ask'), '#!/usr/bin/env bash\nnpx claude-code-ex ask "$@"\n', 'utf-8')

    await fs.writeJSON(join(tempHome, '.claude.json'), {
      mcpServers: {
        'grok-search': { type: 'stdio', command: 'npx', args: ['-y', 'grok-search'] },
        'context7': { type: 'stdio', command: 'npx', args: ['-y', 'context7'] },
        customServer: { type: 'stdio', command: 'npx', args: ['-y', 'custom'] },
      },
      installMethod: 'npm-global',
    }, { spaces: 2 })

    await fs.ensureDir(join(tempHome, '.codex'))
    await fs.writeFile(join(tempHome, '.codex', 'config.toml'), [
      '[mcp_servers.grok-search]',
      'command = "npx"',
      'args = ["-y", "grok-search"]',
      '',
      '[mcp_servers.customServer]',
      'command = "npx"',
      'args = ["-y", "custom"]',
      '',
    ].join('\n'), 'utf-8')

    await fs.ensureDir(join(tempHome, '.gemini'))
    await fs.writeJSON(join(tempHome, '.gemini', 'settings.json'), {
      mcpServers: {
        'grok-search': { type: 'stdio', command: 'npx', args: ['-y', 'grok-search'] },
        customServer: { type: 'stdio', command: 'npx', args: ['-y', 'custom'] },
      },
    }, { spaces: 2 })

    const markerBlock = [
      '<!-- CCG-FAST-CONTEXT-START -->',
      '# managed fast context',
      '<!-- CCG-FAST-CONTEXT-END -->',
      '',
    ].join('\n')
    await fs.writeFile(join(tempHome, '.codex', 'AGENTS.md'), `# User AGENTS\n\n${markerBlock}User tail\n`, 'utf-8')
    await fs.writeFile(join(tempHome, '.gemini', 'GEMINI.md'), `# User GEMINI\n\n${markerBlock}User tail\n`, 'utf-8')

    await fs.writeJSON(join(installDir, 'settings.json'), {
      permissions: {
        allow: [
          'Bash(codeagent-wrapper --backend codex)',
          'Bash(custom-safe-command)',
        ],
      },
      hooks: {
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [
              { type: 'command', command: 'codeagent-wrapper --backend codex' },
            ],
          },
          {
            matcher: 'Edit',
            hooks: [
              { type: 'command', command: 'echo keep-me' },
            ],
          },
        ],
      },
      outputStyle: 'engineer-professional',
      env: {
        ANTHROPIC_BASE_URL: 'https://example.invalid',
      },
    }, { spaces: 2 })

    await fs.ensureDir(join(installDir, 'output-styles'))
    for (const file of MANAGED_OUTPUT_STYLES) {
      await fs.writeFile(join(installDir, 'output-styles', file), '# managed style', 'utf-8')
    }
    await fs.writeFile(join(installDir, 'output-styles', 'custom-style.md'), '# custom style', 'utf-8')

    await fs.ensureDir(join(tempHome, '.contextweaver'))
    await fs.writeFile(join(tempHome, '.contextweaver', '.env'), 'API_KEY=test', 'utf-8')

    vi.spyOn(process, 'platform', 'get').mockReturnValue('linux')
  })

  afterEach(async () => {
    process.env.HOME = originalHome
    process.env.USERPROFILE = originalUserProfile
    await fs.remove(tempHome)
  })

  afterAll(async () => {
    await fs.remove(tempHome)
  })

  it('removes all CCX-managed artifacts and preserves user-owned files', async () => {
    const result = await uninstallCcx(installDir)

    expect(result.success).toBe(true)
    expect(result.removedCommands).toContain('workflow')
    expect(result.removedAgents).toContain('planner')
    expect(result.removedSkills.length).toBeGreaterThan(0)
    expect(result.removedRules).toEqual(expect.arrayContaining([
      'ccg-skills.md',
      'ccg-grok-search.md',
      'ccx-skills.md',
      'ccx-grok-search.md',
      'ccg-fast-context.md',
    ]))
    expect(result.removedMcpServers).toEqual(expect.arrayContaining(['grok-search', 'context7']))
    expect(result.removedCodexMirror).toContain('grok-search')
    expect(result.removedGeminiMirror).toContain('grok-search')
    expect(result.removedSettingsEntries).toEqual(expect.arrayContaining([
      'Bash(codeagent-wrapper --backend codex)',
      'codeagent-wrapper --backend codex',
      'outputStyle',
    ]))
    expect(result.removedOutputStyles).toEqual(expect.arrayContaining(MANAGED_OUTPUT_STYLES))
    expect(result.removedContextWeaver).toBe(true)
    expect(typeof result.removedGlobalPackageHint).toBe('boolean')

    expect(await fs.pathExists(join(installDir, 'commands', 'ccx'))).toBe(false)
    expect(await fs.pathExists(join(installDir, 'agents', 'ccx'))).toBe(false)
    expect(await fs.pathExists(join(installDir, 'skills', 'ccx'))).toBe(false)
    expect(await fs.pathExists(join(installDir, '.ccx'))).toBe(false)
    expect(await fs.pathExists(join(installDir, 'bin', 'codeagent-wrapper'))).toBe(false)
    expect(await fs.pathExists(join(tempHome, '.contextweaver'))).toBe(false)

    expect(await fs.pathExists(join(installDir, 'skills', 'custom-skill', 'SKILL.md'))).toBe(true)
    expect(await fs.pathExists(join(installDir, 'bin', 'custom-helper'))).toBe(true)
    expect(await fs.pathExists(join(installDir, 'rules', 'custom-rule.md'))).toBe(true)
    expect(await fs.pathExists(join(installDir, 'output-styles', 'custom-style.md'))).toBe(true)

    const claudeConfig = await fs.readJSON(join(tempHome, '.claude.json'))
    expect(claudeConfig.mcpServers['grok-search']).toBeUndefined()
    expect(claudeConfig.mcpServers.context7).toBeUndefined()
    expect(claudeConfig.mcpServers.customServer).toBeDefined()

    const codexConfig = parseToml(await fs.readFile(join(tempHome, '.codex', 'config.toml'), 'utf-8')) as Record<string, any>
    expect(codexConfig.mcp_servers['grok-search']).toBeUndefined()
    expect(codexConfig.mcp_servers.customServer).toBeDefined()

    const geminiSettings = await fs.readJSON(join(tempHome, '.gemini', 'settings.json'))
    expect(geminiSettings.mcpServers['grok-search']).toBeUndefined()
    expect(geminiSettings.mcpServers.customServer).toBeDefined()

    const settings = await fs.readJSON(join(installDir, 'settings.json'))
    expect(settings.permissions.allow).toEqual(['Bash(custom-safe-command)'])
    expect(settings.hooks.PreToolUse).toHaveLength(1)
    expect(settings.hooks.PreToolUse[0].hooks[0].command).toBe('echo keep-me')
    expect(settings.outputStyle).toBeUndefined()
    expect(settings.env.ANTHROPIC_BASE_URL).toBe('https://example.invalid')

    const agentsContent = await fs.readFile(join(tempHome, '.codex', 'AGENTS.md'), 'utf-8')
    const geminiContent = await fs.readFile(join(tempHome, '.gemini', 'GEMINI.md'), 'utf-8')
    expect(agentsContent).toContain('# User AGENTS')
    expect(agentsContent).toContain('User tail')
    expect(agentsContent).not.toContain('CCG-FAST-CONTEXT-START')
    expect(geminiContent).toContain('# User GEMINI')
    expect(geminiContent).toContain('User tail')
    expect(geminiContent).not.toContain('CCG-FAST-CONTEXT-START')
  })
})
