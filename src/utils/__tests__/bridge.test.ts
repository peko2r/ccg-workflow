import { describe, expect, it } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { bridgePend } from '../../commands/bridge'
import { looksLikeBridgeInvocation, parseProviderList, parseProviderTokens, parseSingleProvider } from '../bridge/parser'
import { buildPowerShellCommand } from '../bridge/shell'
import { cleanupBridgeRuntime, getBridgeRuntime, getProviderRuntimeStatus, listBridgeRequests, readProviderSession, writeBridgeRequest, writeProviderSession } from '../bridge/runtime'
import { createWezTermLaunchPlan, createWezTermSendTextPlan, ensureWezTermPaneAlive, executeWezTermLaunch, getValidatedWezTermPane, listWezTermPanes, sendTextToWezTermPane } from '../bridge/wezterm'

describe('bridge provider parsing', () => {
  it('supports space-separated providers', () => {
    expect(parseProviderList(['codex', 'gemini'])).toEqual(['codex', 'gemini'])
  })

  it('supports comma-separated providers', () => {
    expect(parseProviderList(['codex,gemini', 'claude'])).toEqual(['codex', 'gemini', 'claude'])
  })

  it('deduplicates providers while preserving order', () => {
    expect(parseProviderList(['gemini,codex', 'gemini', 'claude'])).toEqual(['gemini', 'codex', 'claude'])
  })

  it('accepts opencode aliases', () => {
    expect(parseSingleProvider('open-code')).toBe('opencode')
  })

  it('reports invalid providers', () => {
    expect(() => parseProviderList(['codex', 'unknown'])).toThrow(/Unsupported provider/)
  })

  it('returns invalid tokens separately', () => {
    expect(parseProviderTokens(['codex,unknown'])).toEqual({
      providers: ['codex'],
      invalid: ['unknown'],
    })
  })
})

describe('bridge argv detection', () => {
  it('detects provider launch mode', () => {
    expect(looksLikeBridgeInvocation(['codex', 'gemini'])).toBe(true)
    expect(looksLikeBridgeInvocation(['-r', 'codex,claude'])).toBe(true)
  })

  it('does not rewrite known subcommands', () => {
    expect(looksLikeBridgeInvocation(['init'])).toBe(false)
    expect(looksLikeBridgeInvocation(['ask', 'codex'])).toBe(false)
  })

  it('does not rewrite unrelated flags or unknown commands', () => {
    expect(looksLikeBridgeInvocation(['--lang', 'en', 'codex'])).toBe(false)
    expect(looksLikeBridgeInvocation(['codex', '--help'])).toBe(false)
    expect(looksLikeBridgeInvocation(['foo', 'codex'])).toBe(false)
  })
})

describe('bridge shell helpers', () => {
  it('quotes PowerShell commands safely', () => {
    expect(buildPowerShellCommand('codex', ['hello world', 'it\'s ready'])).toBe(
      '& \'codex\' \'hello world\' \'it\'\'s ready\'',
    )
  })
})

describe('wezterm launch planning', () => {
  it('builds a wezterm launch plan', () => {
    const runtime = getBridgeRuntime('project-root')
    const shell = {
      executable: 'pwsh',
      args: ['-NoLogo', '-NoProfile', '-Command'],
      found: true,
      family: 'powershell' as const,
    }

    const plan = createWezTermLaunchPlan(runtime, { provider: 'codex', restore: true, autoApprove: true }, shell)

    expect(plan.backend).toBe('wezterm')
    expect(plan.command.command).toBe('wezterm')
    expect(plan.command.args.slice(0, 5)).toEqual(['cli', 'split-pane', '--right', '--cwd', 'project-root'])
    expect(plan.providerCommand.command).toBe('pwsh')
    expect(plan.providerCommand.args.at(-1)).toBe('& \'codex\'')
    expect(plan.warnings).toHaveLength(2)
  })

  it('builds a send-text command for a pane', () => {
    const plan = createWezTermSendTextPlan('pane-1')
    expect(plan.command).toBe('wezterm')
    expect(plan.args).toEqual(['cli', 'send-text', '--pane-id', 'pane-1', '--no-paste'])
  })

  it('parses wezterm pane lists', () => {
    const panes = listWezTermPanes((() => '[{"pane_id":12,"title":"ccg:codex"}]') as any)
    expect(panes).toEqual([{ pane_id: 12, title: 'ccg:codex' }])
    expect(ensureWezTermPaneAlive('12', (() => '[{"pane_id":12}]') as any)).toEqual({ pane_id: 12 })
    expect(ensureWezTermPaneAlive('13', (() => '[{"pane_id":12}]') as any)).toBeNull()
  })

  it('validates pane metadata against stored session details', () => {
    expect(getValidatedWezTermPane({
      provider: 'codex',
      backend: 'wezterm',
      paneId: '12',
      workspaceDir: 'project-root',
      launchedAt: '2026-03-14T00:00:00.000Z',
      shellExecutable: 'pwsh',
      providerCommand: 'pwsh -NoLogo -NoProfile -Command & \'codex\'',
    }, (() => '[{"pane_id":12,"cwd":"project-root","title":"ccg:codex"}]') as any)).toEqual({
      pane_id: 12,
      cwd: 'project-root',
      title: 'ccg:codex',
    })

    expect(getValidatedWezTermPane({
      provider: 'codex',
      backend: 'wezterm',
      paneId: '12',
      workspaceDir: 'project-root',
      launchedAt: '2026-03-14T00:00:00.000Z',
      shellExecutable: 'pwsh',
      providerCommand: 'pwsh -NoLogo -NoProfile -Command & \'codex\'',
    }, (() => '[{"pane_id":12,"cwd":"other-root","title":"ccg:codex"}]') as any)).toBeNull()
  })
})

describe('bridge runtime persistence', () => {
  function createTempRuntimeRoot(): string {
    return mkdtempSync(join(tmpdir(), 'ccg-bridge-test-'))
  }

  it('writes session metadata after launch and reuses it on restore', () => {
    const rootDir = createTempRuntimeRoot()
    const runtime = getBridgeRuntime(rootDir)
    const shell = {
      executable: 'pwsh',
      args: ['-NoLogo', '-NoProfile', '-Command'],
      found: true,
      family: 'powershell' as const,
    }

    const executor = ((command: string, args: string[]) => {
      if (command !== 'wezterm') {
        throw new Error(`Unexpected command: ${command}`)
      }
      if (args.includes('split-pane')) {
        return 'pane-101\n'
      }
      if (args.includes('list')) {
        return '[{"pane_id":"pane-101","title":"ccg:codex"}]'
      }
      throw new Error(`Unexpected args: ${args.join(' ')}`)
    }) as any

    const launched = executeWezTermLaunch(runtime, { provider: 'codex' }, shell, executor)
    expect(launched.status).toBe('launched')
    expect(launched.paneId).toBe('pane-101')
    expect(existsSync(launched.sessionFile)).toBe(true)

    const session = readProviderSession(runtime, 'codex')
    expect(session?.paneId).toBe('pane-101')
    expect(session?.providerCommand).toContain('pwsh')

    const restored = executeWezTermLaunch(runtime, { provider: 'codex', restore: true }, shell, executor)
    expect(restored.status).toBe('restored')
    expect(restored.paneId).toBe('pane-101')

    rmSync(rootDir, { recursive: true, force: true })
  })

  it('sends ask text to an existing pane through stdin without queueing successful sends', () => {
    const rootDir = createTempRuntimeRoot()
    const runtime = getBridgeRuntime(rootDir)
    writeProviderSession(runtime, {
      provider: 'codex',
      backend: 'wezterm',
      paneId: 'pane-404',
      workspaceDir: rootDir,
      launchedAt: '2026-03-14T00:00:00.000Z',
      shellExecutable: 'pwsh',
      providerCommand: 'pwsh -NoLogo -NoProfile -Command & \'codex\'',
    })

    const calls: Array<{ command: string, args: string[], options?: { encoding?: string, input?: string } }> = []
    const executor = ((command: string, args: string[], options?: { encoding?: string, input?: string }) => {
      calls.push({ command, args, options })
      if (args.includes('list')) {
        return '[{"pane_id":"pane-404"}]'
      }
      if (args.includes('send-text')) {
        return ''
      }
      throw new Error(`Unexpected args: ${args.join(' ')}`)
    }) as any

    const result = sendTextToWezTermPane('codex', runtime, 'summarize repo', executor)
    expect(result.status).toBe('sent')
    expect(result.paneId).toBe('pane-404')
    expect(result.requestId).toMatch(/^codex-/)
    expect(calls).toHaveLength(2)
    expect(calls[1]).toEqual({
      command: 'wezterm',
      args: ['cli', 'send-text', '--pane-id', 'pane-404', '--no-paste'],
      options: {
        encoding: 'utf-8',
        input: 'summarize repo\n',
      },
    })

    const pending = listBridgeRequests(runtime, 'codex', 10)
    expect(pending).toHaveLength(0)

    rmSync(rootDir, { recursive: true, force: true })
  })

  it('preserves original whitespace while ensuring trailing newline', () => {
    const rootDir = createTempRuntimeRoot()
    const runtime = getBridgeRuntime(rootDir)
    writeProviderSession(runtime, {
      provider: 'codex',
      backend: 'wezterm',
      paneId: 'pane-space',
      workspaceDir: rootDir,
      launchedAt: '2026-03-14T00:00:00.000Z',
      shellExecutable: 'pwsh',
      providerCommand: 'pwsh -NoLogo -NoProfile -Command & \'codex\'',
    })

    const executor = ((_: string, args: string[], options?: { encoding?: string, input?: string }) => {
      if (args.includes('list')) {
        return '[{"pane_id":"pane-space"}]'
      }
      if (args.includes('send-text')) {
        return options?.input ?? ''
      }
      throw new Error(`Unexpected args: ${args.join(' ')}`)
    }) as any

    const result = sendTextToWezTermPane('codex', runtime, '  keep edges  ', executor)
    expect(result.status).toBe('sent')

    rmSync(rootDir, { recursive: true, force: true })
  })

  it('reads pending requests in reverse chronological order with count limit', () => {
    const rootDir = createTempRuntimeRoot()
    const runtime = getBridgeRuntime(rootDir)

    writeBridgeRequest(runtime, {
      requestId: 'codex-1',
      provider: 'codex',
      message: 'first\n',
      createdAt: '2026-03-14T00:00:00.000Z',
      status: 'queued',
    })
    writeBridgeRequest(runtime, {
      requestId: 'codex-2',
      provider: 'codex',
      message: 'second\n',
      createdAt: '2026-03-14T00:00:01.000Z',
      status: 'queued',
    })
    writeBridgeRequest(runtime, {
      requestId: 'codex-3',
      provider: 'codex',
      message: 'third\n',
      createdAt: '2026-03-14T00:00:02.000Z',
      status: 'queued',
    })

    const pending = listBridgeRequests(runtime, 'codex', 2)
    expect(pending.map(item => item.requestId)).toEqual(['codex-3', 'codex-2'])

    rmSync(rootDir, { recursive: true, force: true })
  })

  it('queues a request when send-text fails but the pane is still alive', () => {
    const rootDir = createTempRuntimeRoot()
    const runtime = getBridgeRuntime(rootDir)
    writeProviderSession(runtime, {
      provider: 'codex',
      backend: 'wezterm',
      paneId: 'pane-queue',
      workspaceDir: rootDir,
      launchedAt: '2026-03-14T00:00:00.000Z',
      shellExecutable: 'pwsh',
      providerCommand: 'pwsh -NoLogo -NoProfile -Command & \'codex\'',
    })

    const executor = ((_: string, args: string[]) => {
      if (args.includes('list')) {
        return '[{"pane_id":"pane-queue"}]'
      }
      if (args.includes('send-text')) {
        throw new Error('transport failed')
      }
      throw new Error(`Unexpected args: ${args.join(' ')}`)
    }) as any

    expect(() => sendTextToWezTermPane('codex', runtime, 'retry me', executor)).toThrow(/queued/i)
    expect(listBridgeRequests(runtime, 'codex', 10)).toHaveLength(1)

    rmSync(rootDir, { recursive: true, force: true })
  })

  it('ignores malformed request files when listing pending work', () => {
    const rootDir = createTempRuntimeRoot()
    const runtime = getBridgeRuntime(rootDir)

    writeBridgeRequest(runtime, {
      requestId: 'codex-good',
      provider: 'codex',
      message: 'ok\n',
      createdAt: '2026-03-14T00:00:00.000Z',
      status: 'queued',
    })

    writeFileSync(join(rootDir, '.ccb', 'run', 'codex', 'broken.json'), '{not-json', 'utf-8')

    const pending = listBridgeRequests(runtime, 'codex', 10)
    expect(pending.map(item => item.requestId)).toEqual(['codex-good'])

    rmSync(rootDir, { recursive: true, force: true })
  })

  it('treats malformed session files as missing state', () => {
    const rootDir = createTempRuntimeRoot()
    const runtime = getBridgeRuntime(rootDir)
    mkdirSync(join(rootDir, '.ccb', 'sessions'), { recursive: true })
    writeFileSync(join(rootDir, '.ccb', 'sessions', 'codex.json'), '{broken-json', 'utf-8')

    expect(readProviderSession(runtime, 'codex')).toBeNull()
    expect(getProviderRuntimeStatus(runtime, 'codex')).toEqual({
      provider: 'codex',
      sessionFile: join(rootDir, '.ccb', 'sessions', 'codex.json'),
      mounted: false,
      paneId: undefined,
      backend: undefined,
      launchedAt: undefined,
    })

    rmSync(rootDir, { recursive: true, force: true })
  })

  it('clears dead session when ask targets a missing pane', () => {
    const rootDir = createTempRuntimeRoot()
    const runtime = getBridgeRuntime(rootDir)
    writeProviderSession(runtime, {
      provider: 'claude',
      backend: 'wezterm',
      paneId: 'pane-dead',
      workspaceDir: rootDir,
      launchedAt: '2026-03-14T00:00:00.000Z',
      shellExecutable: 'pwsh',
      providerCommand: 'pwsh -NoLogo -NoProfile -Command & \'claude\'',
    })

    expect(() => sendTextToWezTermPane('claude', runtime, 'hello', (() => '[]') as any)).toThrow(/no longer valid/)
    expect(readProviderSession(runtime, 'claude')).toBeNull()
    expect(listBridgeRequests(runtime, 'claude', 10)).toHaveLength(0)

    rmSync(rootDir, { recursive: true, force: true })
  })

  it('clears mismatched session when pane metadata points to a different workspace', () => {
    const rootDir = createTempRuntimeRoot()
    const runtime = getBridgeRuntime(rootDir)
    writeProviderSession(runtime, {
      provider: 'claude',
      backend: 'wezterm',
      paneId: 'pane-mismatch',
      workspaceDir: rootDir,
      launchedAt: '2026-03-14T00:00:00.000Z',
      shellExecutable: 'pwsh',
      providerCommand: 'pwsh -NoLogo -NoProfile -Command & \'claude\'',
    })

    expect(() => sendTextToWezTermPane('claude', runtime, 'hello', (() => '[{"pane_id":"pane-mismatch","cwd":"other-root"}]') as any)).toThrow(/no longer valid/)
    expect(readProviderSession(runtime, 'claude')).toBeNull()

    rmSync(rootDir, { recursive: true, force: true })
  })

  it('clears dead session when pane dies after the liveness check', () => {
    const rootDir = createTempRuntimeRoot()
    const runtime = getBridgeRuntime(rootDir)
    writeProviderSession(runtime, {
      provider: 'claude',
      backend: 'wezterm',
      paneId: 'pane-race',
      workspaceDir: rootDir,
      launchedAt: '2026-03-14T00:00:00.000Z',
      shellExecutable: 'pwsh',
      providerCommand: 'pwsh -NoLogo -NoProfile -Command & \'claude\'',
    })

    let listCalls = 0
    const executor = ((_: string, args: string[]) => {
      if (args.includes('list')) {
        listCalls += 1
        return listCalls === 1 ? '[{"pane_id":"pane-race"}]' : '[]'
      }
      if (args.includes('send-text')) {
        throw new Error('send-text failed')
      }
      throw new Error(`Unexpected args: ${args.join(' ')}`)
    }) as any

    expect(() => sendTextToWezTermPane('claude', runtime, 'hello', executor)).toThrow(/queued request .*restore/i)
    expect(readProviderSession(runtime, 'claude')).toBeNull()
    expect(listBridgeRequests(runtime, 'claude', 10)).toHaveLength(1)

    rmSync(rootDir, { recursive: true, force: true })
  })

  it('does not restore a session when the matching pane metadata is inconsistent', () => {
    const rootDir = createTempRuntimeRoot()
    const runtime = getBridgeRuntime(rootDir)
    const shell = {
      executable: 'pwsh',
      args: ['-NoLogo', '-NoProfile', '-Command'],
      found: true,
      family: 'powershell' as const,
    }

    writeProviderSession(runtime, {
      provider: 'codex',
      backend: 'wezterm',
      paneId: 'pane-restore',
      workspaceDir: rootDir,
      launchedAt: '2026-03-14T00:00:00.000Z',
      shellExecutable: 'pwsh',
      providerCommand: 'pwsh -NoLogo -NoProfile -Command & \'codex\'',
    })

    const executor = ((_: string, args: string[]) => {
      if (args.includes('list')) {
        return '[{"pane_id":"pane-restore","cwd":"other-root"}]'
      }
      if (args.includes('split-pane')) {
        return 'pane-new\n'
      }
      throw new Error(`Unexpected args: ${args.join(' ')}`)
    }) as any

    const restored = executeWezTermLaunch(runtime, { provider: 'codex', restore: true }, shell, executor)
    expect(restored.status).toBe('launched')
    expect(restored.paneId).toBe('pane-new')

    rmSync(rootDir, { recursive: true, force: true })
  })

  it('reports mounted provider details from session metadata', () => {
    const rootDir = createTempRuntimeRoot()
    const runtime = getBridgeRuntime(rootDir)
    const launchedAt = '2026-03-14T00:00:00.000Z'

    writeProviderSession(runtime, {
      provider: 'gemini',
      backend: 'wezterm',
      paneId: 'pane-202',
      workspaceDir: rootDir,
      launchedAt,
      shellExecutable: 'pwsh',
      providerCommand: 'pwsh -NoLogo -NoProfile -Command & \'gemini\'',
    })

    const status = getProviderRuntimeStatus(runtime, 'gemini')
    expect(status).toEqual({
      provider: 'gemini',
      sessionFile: join(rootDir, '.ccb', 'sessions', 'gemini.json'),
      mounted: true,
      paneId: 'pane-202',
      backend: 'wezterm',
      launchedAt,
    })

    const saved = JSON.parse(readFileSync(status.sessionFile, 'utf-8'))
    expect(saved.provider).toBe('gemini')

    rmSync(rootDir, { recursive: true, force: true })
  })

  it('cleans up persisted bridge sessions and run queue files', () => {
    const rootDir = createTempRuntimeRoot()
    const runtime = getBridgeRuntime(rootDir)

    writeProviderSession(runtime, {
      provider: 'claude',
      backend: 'wezterm',
      paneId: 'pane-303',
      workspaceDir: rootDir,
      launchedAt: '2026-03-14T00:00:00.000Z',
      shellExecutable: 'pwsh',
      providerCommand: 'pwsh -NoLogo -NoProfile -Command & \'claude\'',
    })
    writeBridgeRequest(runtime, {
      requestId: 'claude-1',
      provider: 'claude',
      message: 'hello\n',
      createdAt: '2026-03-14T00:00:00.000Z',
      status: 'queued',
    })

    const cleanup = cleanupBridgeRuntime(runtime)
    expect(cleanup.dryRun).toBe(false)
    expect(cleanup.cleaned).toBe(2)
    expect(cleanup.removed).toHaveLength(2)
    expect(existsSync(join(rootDir, '.ccb', 'sessions', 'claude.json'))).toBe(false)
    expect(existsSync(join(rootDir, '.ccb', 'run', 'claude'))).toBe(false)

    rmSync(rootDir, { recursive: true, force: true })
  })
})

describe('bridge command validation', () => {
  it('rejects non-numeric pend counts', () => {
    expect(() => bridgePend('codex', '5foo')).toThrow(/positive integer/)
  })
})
