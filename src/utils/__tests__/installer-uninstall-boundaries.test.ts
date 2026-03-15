import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import fs from 'fs-extra'
import { parse as parseToml } from 'smol-toml'
import { removeFastContextPrompt, writeFastContextPrompt } from '../installer-prompt'
import { uninstallAllCcxMcpServers } from '../installer-mcp'

describe('fast-context prompt cleanup boundaries', () => {
  const tempHome = join(tmpdir(), `ccx-fast-context-${Date.now()}`)
  const originalHome = process.env.HOME
  const originalUserProfile = process.env.USERPROFILE

  beforeEach(async () => {
    process.env.HOME = tempHome
    process.env.USERPROFILE = tempHome
    await fs.ensureDir(tempHome)
  })

  afterEach(async () => {
    process.env.HOME = originalHome
    process.env.USERPROFILE = originalUserProfile
    await fs.remove(tempHome)
  })

  afterAll(async () => {
    await fs.remove(tempHome)
  })

  it('removes managed marker blocks but preserves user-authored content', async () => {
    await fs.ensureDir(join(tempHome, '.codex'))
    await fs.ensureDir(join(tempHome, '.gemini'))
    await fs.writeFile(join(tempHome, '.codex', 'AGENTS.md'), '# user codex\n', 'utf-8')
    await fs.writeFile(join(tempHome, '.gemini', 'GEMINI.md'), '# user gemini\n', 'utf-8')

    await writeFastContextPrompt()
    await removeFastContextPrompt()

    const agents = await fs.readFile(join(tempHome, '.codex', 'AGENTS.md'), 'utf-8')
    const gemini = await fs.readFile(join(tempHome, '.gemini', 'GEMINI.md'), 'utf-8')

    expect(agents).toContain('# user codex')
    expect(gemini).toContain('# user gemini')
    expect(agents).not.toContain('CCG-FAST-CONTEXT-START')
    expect(gemini).not.toContain('CCG-FAST-CONTEXT-START')
    expect(await fs.pathExists(join(tempHome, '.claude', 'rules', 'ccg-fast-context.md'))).toBe(false)
  })
})

describe('uninstallAllCcxMcpServers boundaries', () => {
  const tempHome = join(tmpdir(), `ccx-mcp-uninstall-${Date.now()}`)
  const originalHome = process.env.HOME
  const originalUserProfile = process.env.USERPROFILE

  beforeEach(async () => {
    process.env.HOME = tempHome
    process.env.USERPROFILE = tempHome
    await fs.ensureDir(tempHome)

    await fs.writeJSON(join(tempHome, '.claude.json'), {
      mcpServers: {
        'grok-search': { type: 'stdio', command: 'npx', args: ['-y', 'grok-search'] },
        'fast-context': { type: 'stdio', command: 'npx', args: ['-y', 'fast-context'] },
        customServer: { type: 'stdio', command: 'npx', args: ['-y', 'custom'] },
      },
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
    ].join('\n'), 'utf-8')

    await fs.ensureDir(join(tempHome, '.gemini'))
    await fs.writeJSON(join(tempHome, '.gemini', 'settings.json'), {
      mcpServers: {
        'fast-context': { type: 'stdio', command: 'npx', args: ['-y', 'fast-context'] },
        customServer: { type: 'stdio', command: 'npx', args: ['-y', 'custom'] },
      },
    }, { spaces: 2 })
  })

  afterEach(async () => {
    process.env.HOME = originalHome
    process.env.USERPROFILE = originalUserProfile
    await fs.remove(tempHome)
  })

  afterAll(async () => {
    await fs.remove(tempHome)
  })

  it('removes only CCX-managed MCP entries across Claude, Codex, and Gemini', async () => {
    const result = await uninstallAllCcxMcpServers()

    expect(result.success).toBe(true)
    expect(result.removedClaude).toEqual(expect.arrayContaining(['grok-search', 'fast-context']))

    const claude = await fs.readJSON(join(tempHome, '.claude.json'))
    expect(claude.mcpServers['grok-search']).toBeUndefined()
    expect(claude.mcpServers['fast-context']).toBeUndefined()
    expect(claude.mcpServers.customServer).toBeDefined()

    const codex = parseToml(await fs.readFile(join(tempHome, '.codex', 'config.toml'), 'utf-8')) as Record<string, any>
    expect(codex.mcp_servers['grok-search']).toBeUndefined()
    expect(codex.mcp_servers.customServer).toBeDefined()

    const gemini = await fs.readJSON(join(tempHome, '.gemini', 'settings.json'))
    expect(gemini.mcpServers['fast-context']).toBeUndefined()
    expect(gemini.mcpServers.customServer).toBeDefined()
  })
})
