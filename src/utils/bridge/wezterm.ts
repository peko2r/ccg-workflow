import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { getBridgeProviderOrThrow, type BridgeProvider } from './providers'
import {
  ensureBridgeRuntime,
  readProviderSession,
  removeProviderSession,
  type BridgeRuntime,
  type BridgeSessionRecord,
  writeBridgeRequest,
  writeProviderSession,
} from './runtime'
import { buildShellCommand, getBridgeShell, type BridgeShellInfo, type CommandPlan } from './shell'

export interface WezTermLaunchOptions {
  provider: BridgeProvider
  restore?: boolean
  autoApprove?: boolean
}

export interface WezTermLaunchPlan {
  backend: 'wezterm'
  status: 'planned'
  provider: BridgeProvider
  paneTitle: string
  runtimeDir: string
  providerCommand: CommandPlan
  command: CommandPlan
  warnings: string[]
}

export interface WezTermPaneInfo {
  pane_id: string | number
  title?: string
  cwd?: string
  workspace?: string
  tab_id?: string | number
  window_id?: string | number
}

export interface WezTermLaunchResult {
  backend: 'wezterm'
  status: 'launched' | 'restored'
  provider: BridgeProvider
  paneId: string
  paneTitle: string
  runtimeDir: string
  sessionFile: string
  providerCommand: CommandPlan
  command: CommandPlan
  warnings: string[]
}

export interface WezTermSendTextResult {
  backend: 'wezterm'
  provider: BridgeProvider
  paneId: string
  requestId: string
  command: CommandPlan
  status: 'sent'
}

function buildWezTermCommand(args: string[]): CommandPlan {
  return {
    command: 'wezterm',
    args,
    printable: ['wezterm', ...args].join(' '),
  }
}

function formatExecutorError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function paneMatchesSession(pane: WezTermPaneInfo, session: BridgeSessionRecord): boolean {
  if (String(pane.pane_id) !== session.paneId) {
    return false
  }

  if (typeof pane.cwd === 'string' && pane.cwd !== session.workspaceDir) {
    return false
  }

  if (typeof pane.title === 'string' && pane.title.trim()) {
    const normalizedTitle = pane.title.trim().toLowerCase()
    const expectedTitle = `ccx:${session.provider}`
    if (normalizedTitle !== expectedTitle) {
      return false
    }
  }

  return true
}

export function getValidatedWezTermPane(
  session: BridgeSessionRecord,
  executor: typeof execFileSync = execFileSync,
): WezTermPaneInfo | null {
  const pane = ensureWezTermPaneAlive(session.paneId, executor)
  return pane && paneMatchesSession(pane, session) ? pane : null
}

function getWezTermPaneState(
  session: BridgeSessionRecord,
  executor: typeof execFileSync = execFileSync,
): { pane: WezTermPaneInfo | null, error: string | null } {
  try {
    return {
      pane: getValidatedWezTermPane(session, executor),
      error: null,
    }
  }
  catch (error) {
    return {
      pane: null,
      error: formatExecutorError(error),
    }
  }
}

export function createWezTermLaunchPlan(
  runtime: BridgeRuntime,
  options: WezTermLaunchOptions,
  shell: BridgeShellInfo = getBridgeShell(),
): WezTermLaunchPlan {
  const provider = getBridgeProviderOrThrow(options.provider)
  const providerCommand = buildShellCommand(provider.executable, [], shell)
  const warnings: string[] = []

  if (shell.family === 'powershell' && !shell.found) {
    warnings.push(`Preferred Windows shell was not detected in PATH. Falling back to ${shell.executable}.`)
  }
  if (options.restore) {
    warnings.push('Restore requested. Existing pane metadata will be reused when available; otherwise a new pane is created.')
  }
  if (options.autoApprove) {
    warnings.push('Auto-approve requested, but provider-specific approval flags are not implemented in this bridge slice yet.')
  }

  const weztermArgs = ['cli', 'split-pane', '--right', '--cwd', runtime.rootDir, '--', providerCommand.command, ...providerCommand.args]

  return {
    backend: 'wezterm',
    status: 'planned',
    provider: provider.id,
    paneTitle: `ccx:${provider.id}`,
    runtimeDir: runtime.bridgeDir,
    providerCommand,
    command: buildWezTermCommand(weztermArgs),
    warnings,
  }
}

export function parseWezTermPaneId(raw: string): string {
  const paneId = raw.trim()
  if (!paneId) {
    throw new Error('WezTerm did not return a pane id.')
  }
  return paneId
}

export function listWezTermPanes(executor: typeof execFileSync = execFileSync): WezTermPaneInfo[] {
  const output = executor('wezterm', ['cli', 'list', '--format', 'json'], {
    encoding: 'utf-8',
  })
  const parsed = JSON.parse(output) as unknown
  if (!Array.isArray(parsed)) {
    throw new Error('Invalid WezTerm pane list response.')
  }
  return parsed as WezTermPaneInfo[]
}

export function findWezTermPaneById(panes: WezTermPaneInfo[], paneId: string): WezTermPaneInfo | null {
  return panes.find(pane => String(pane.pane_id) === paneId) ?? null
}

export function ensureWezTermPaneAlive(paneId: string, executor: typeof execFileSync = execFileSync): WezTermPaneInfo | null {
  const panes = listWezTermPanes(executor)
  return findWezTermPaneById(panes, paneId)
}

export function createWezTermSendTextPlan(paneId: string): CommandPlan {
  return buildWezTermCommand(['cli', 'send-text', '--pane-id', paneId, '--no-paste'])
}

export function sendTextToWezTermPane(
  provider: BridgeProvider,
  runtime: BridgeRuntime,
  text: string,
  executor: typeof execFileSync = execFileSync,
): WezTermSendTextResult {
  if (!text.trim()) {
    throw new Error('A message is required for ask.')
  }

  const session = readProviderSession(runtime, provider)
  if (!session) {
    throw new Error(`Provider ${provider} is not mounted. Run bridge launch first.`)
  }

  const paneState = getWezTermPaneState(session, executor)
  if (paneState.error) {
    throw new Error(`Failed to query WezTerm pane state for provider ${provider}: ${paneState.error}`)
  }
  if (!paneState.pane) {
    removeProviderSession(runtime, provider)
    throw new Error(`Provider ${provider} pane is no longer valid. Run bridge launch --restore ${provider} to recreate it.`)
  }

  const normalizedText = text.endsWith('\n') ? text : `${text}\n`
  const requestId = `${provider}-${Date.now()}-${randomUUID()}`
  const command = createWezTermSendTextPlan(session.paneId)

  try {
    executor(command.command, command.args, {
      encoding: 'utf-8',
      input: normalizedText,
    })
  }
  catch (error) {
    const requestFile = writeBridgeRequest(runtime, {
      requestId,
      provider,
      message: normalizedText,
      createdAt: new Date().toISOString(),
      status: 'queued',
    })
    const nextPaneState = getWezTermPaneState(session, executor)
    if (!nextPaneState.error && !nextPaneState.pane) {
      removeProviderSession(runtime, provider)
      throw new Error(`Provider ${provider} pane is no longer valid. Queued request ${requestId} at ${requestFile}. Run bridge launch --restore ${provider} to recreate it.`)
    }

    const followUp = nextPaneState.error
      ? ` Follow-up liveness check failed: ${nextPaneState.error}.`
      : ''
    throw new Error(
      `Failed to send ask text to provider ${provider} pane ${session.paneId}: ${formatExecutorError(error)}. Request ${requestId} was queued at ${requestFile}.${followUp}`,
    )
  }

  return {
    backend: 'wezterm',
    provider,
    paneId: session.paneId,
    requestId,
    command,
    status: 'sent',
  }
}

export function executeWezTermLaunch(
  runtime: BridgeRuntime,
  options: WezTermLaunchOptions,
  shell: BridgeShellInfo = getBridgeShell(),
  executor: typeof execFileSync = execFileSync,
): WezTermLaunchResult {
  const nextRuntime = ensureBridgeRuntime(runtime)
  const plan = createWezTermLaunchPlan(nextRuntime, options, shell)

  if (options.restore) {
    const existingSession = readProviderSession(nextRuntime, options.provider)
    if (existingSession) {
      const existingPane = getValidatedWezTermPane(existingSession, executor)
      if (existingPane) {
        const sessionFile = writeProviderSession(nextRuntime, existingSession)
        return {
          backend: 'wezterm',
          status: 'restored',
          provider: existingSession.provider,
          paneId: existingSession.paneId,
          paneTitle: plan.paneTitle,
          runtimeDir: nextRuntime.bridgeDir,
          sessionFile,
          providerCommand: plan.providerCommand,
          command: plan.command,
          warnings: plan.warnings,
        }
      }

      removeProviderSession(nextRuntime, options.provider)
    }
  }

  const paneId = parseWezTermPaneId(executor(plan.command.command, plan.command.args, { encoding: 'utf-8' }))
  const launchedAt = new Date().toISOString()
  const sessionFile = writeProviderSession(nextRuntime, {
    provider: plan.provider,
    backend: 'wezterm',
    paneId,
    workspaceDir: nextRuntime.rootDir,
    launchedAt,
    shellExecutable: shell.executable,
    providerCommand: plan.providerCommand.printable,
  })

  return {
    backend: 'wezterm',
    status: 'launched',
    provider: plan.provider,
    paneId,
    paneTitle: plan.paneTitle,
    runtimeDir: nextRuntime.bridgeDir,
    sessionFile,
    providerCommand: plan.providerCommand,
    command: plan.command,
    warnings: plan.warnings,
  }
}
