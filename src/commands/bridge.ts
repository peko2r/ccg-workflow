import {
  cleanupBridgeRuntime,
  executeWezTermLaunch,
  getBridgeProviderIds,
  getBridgeRuntime,
  getBridgeShell,
  getProviderRuntimeStatus,
  getValidatedWezTermPane,
  listBridgeRequests,
  parseProviderList,
  parseSingleProvider,
  readProviderSession,
  sendTextToWezTermPane,
} from '../utils/bridge'

interface BridgeLaunchOptions {
  restore?: boolean
  autoApprove?: boolean
}

function printStatus(payload: unknown): void {
  console.log(JSON.stringify(payload, null, 2))
}

function joinMessage(parts: string[]): string {
  return parts.join(' ')
}

export function bridgeLaunch(rawProviders: string[], options: BridgeLaunchOptions = {}): void {
  const providers = parseProviderList(rawProviders)
  const runtime = getBridgeRuntime()
  const shell = getBridgeShell()
  const launches = providers.map(provider =>
    executeWezTermLaunch(
      runtime,
      {
        provider,
        restore: options.restore,
        autoApprove: options.autoApprove,
      },
      shell,
    ),
  )

  printStatus({
    ok: true,
    action: 'launch',
    backend: 'wezterm',
    providers,
    options: {
      restore: options.restore === true,
      autoApprove: options.autoApprove === true,
    },
    runtime,
    shell,
    launches,
  })
}

export function bridgeAsk(rawProvider: string, messageParts: string[]): void {
  const provider = parseSingleProvider(rawProvider)
  const message = joinMessage(messageParts)
  const runtime = getBridgeRuntime()
  const result = sendTextToWezTermPane(provider, runtime, message)

  printStatus({
    ok: true,
    action: 'ask',
    ...result,
    runtime,
  })
}

export function bridgePing(rawProvider: string): void {
  const provider = parseSingleProvider(rawProvider)
  const runtime = getBridgeRuntime()
  const details = getProviderRuntimeStatus(runtime, provider)
  const session = readProviderSession(runtime, provider)
  const pane = session ? getValidatedWezTermPane(session) : null

  printStatus({
    ok: true,
    action: 'ping',
    provider,
    runtime,
    status: pane ? 'mounted' : 'not-mounted',
    details: {
      ...details,
      alive: pane !== null,
      pane,
    },
  })
}

function parsePendCount(rawCount?: string): number {
  if (rawCount === undefined) {
    return 20
  }

  if (!/^\d+$/.test(rawCount)) {
    throw new Error('Pend count must be a positive integer.')
  }

  const count = Number(rawCount)
  if (!Number.isSafeInteger(count) || count <= 0) {
    throw new Error('Pend count must be a positive integer.')
  }

  return count
}

export function bridgePend(rawProvider: string, rawCount?: string): void {
  const provider = parseSingleProvider(rawProvider)
  const count = parsePendCount(rawCount)
  const runtime = getBridgeRuntime()

  const items = listBridgeRequests(runtime, provider, count)

  printStatus({
    ok: true,
    action: 'pend',
    provider,
    count,
    runtime,
    status: items.length > 0 ? 'pending' : 'idle',
    items,
  })
}

export function bridgeMounted(rawProvider?: string): void {
  const runtime = getBridgeRuntime()
  const providers = rawProvider ? [parseSingleProvider(rawProvider)] : getBridgeProviderIds()

  printStatus({
    ok: true,
    action: 'mounted',
    runtime,
    providers: providers.map((provider) => {
      const details = getProviderRuntimeStatus(runtime, provider)
      const session = readProviderSession(runtime, provider)
      const pane = session ? getValidatedWezTermPane(session) : null
      return {
        ...details,
        alive: pane !== null,
        pane,
      }
    }),
  })
}

export function bridgeCleanup(): void {
  const runtime = getBridgeRuntime()

  printStatus({
    ok: true,
    action: 'cleanup',
    runtime,
    cleanup: cleanupBridgeRuntime(runtime),
  })
}
