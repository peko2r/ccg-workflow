import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getBridgeProviderIds, type BridgeProvider } from './providers'

export interface BridgeRuntime {
  rootDir: string
  bridgeDir: string
  stateDir: string
  sessionsDir: string
  runDir: string
  historyDir: string
  exists: boolean
}

export interface BridgeSessionRecord {
  provider: BridgeProvider
  backend: 'wezterm'
  paneId: string
  workspaceDir: string
  launchedAt: string
  shellExecutable: string
  providerCommand: string
}

export interface BridgeRequestRecord {
  requestId: string
  provider: BridgeProvider
  message: string
  createdAt: string
  status: 'queued'
}

function isBridgeSessionRecord(value: unknown): value is BridgeSessionRecord {
  if (!value || typeof value !== 'object') {
    return false
  }

  const record = value as Record<string, unknown>
  return typeof record.provider === 'string'
    && getBridgeProviderIds().includes(record.provider as BridgeProvider)
    && record.backend === 'wezterm'
    && typeof record.paneId === 'string'
    && typeof record.workspaceDir === 'string'
    && typeof record.launchedAt === 'string'
    && typeof record.shellExecutable === 'string'
    && typeof record.providerCommand === 'string'
}

function isBridgeRequestRecord(value: unknown): value is BridgeRequestRecord {
  if (!value || typeof value !== 'object') {
    return false
  }

  const record = value as Record<string, unknown>
  return typeof record.requestId === 'string'
    && typeof record.provider === 'string'
    && typeof record.message === 'string'
    && typeof record.createdAt === 'string'
    && record.status === 'queued'
}

function readBridgeRequestFile(filePath: string): BridgeRequestRecord | null {
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf-8')) as unknown
    return isBridgeRequestRecord(parsed) ? parsed : null
  }
  catch {
    return null
  }
}

export interface ProviderRuntimeStatus {
  provider: BridgeProvider
  sessionFile: string
  mounted: boolean
  paneId?: string
  backend?: 'wezterm'
  launchedAt?: string
}

export interface BridgeCleanupStatus {
  dryRun: false
  cleaned: number
  removed: string[]
}

export function getBridgeRuntime(rootDir: string = process.cwd()): BridgeRuntime {
  const bridgeDir = join(rootDir, '.ccb')
  return {
    rootDir,
    bridgeDir,
    stateDir: join(bridgeDir, 'state'),
    sessionsDir: join(bridgeDir, 'sessions'),
    runDir: join(bridgeDir, 'run'),
    historyDir: join(bridgeDir, 'history'),
    exists: existsSync(bridgeDir),
  }
}

export function ensureBridgeRuntime(runtime: BridgeRuntime): BridgeRuntime {
  for (const dir of [runtime.bridgeDir, runtime.stateDir, runtime.sessionsDir, runtime.runDir, runtime.historyDir]) {
    mkdirSync(dir, { recursive: true })
  }
  return {
    ...runtime,
    exists: true,
  }
}

export function getProviderSessionFile(runtime: BridgeRuntime, provider: BridgeProvider): string {
  return join(runtime.sessionsDir, `${provider}.json`)
}

export function getProviderRunDir(runtime: BridgeRuntime, provider: BridgeProvider): string {
  return join(runtime.runDir, provider)
}

export function getBridgeRequestFile(runtime: BridgeRuntime, provider: BridgeProvider, requestId: string): string {
  return join(getProviderRunDir(runtime, provider), `${requestId}.json`)
}

export function readProviderSession(runtime: BridgeRuntime, provider: BridgeProvider): BridgeSessionRecord | null {
  const sessionFile = getProviderSessionFile(runtime, provider)
  if (!existsSync(sessionFile)) {
    return null
  }

  try {
    const parsed = JSON.parse(readFileSync(sessionFile, 'utf-8')) as unknown
    if (!isBridgeSessionRecord(parsed) || parsed.provider !== provider) {
      return null
    }
    return parsed
  }
  catch {
    return null
  }
}

export function writeProviderSession(runtime: BridgeRuntime, session: BridgeSessionRecord): string {
  const nextRuntime = ensureBridgeRuntime(runtime)
  const sessionFile = getProviderSessionFile(nextRuntime, session.provider)
  writeFileSync(sessionFile, `${JSON.stringify(session, null, 2)}\n`, 'utf-8')
  return sessionFile
}

export function removeProviderSession(runtime: BridgeRuntime, provider: BridgeProvider): boolean {
  const sessionFile = getProviderSessionFile(runtime, provider)
  if (!existsSync(sessionFile)) {
    return false
  }
  rmSync(sessionFile)
  return true
}

export function writeBridgeRequest(runtime: BridgeRuntime, request: BridgeRequestRecord): string {
  const nextRuntime = ensureBridgeRuntime(runtime)
  const providerRunDir = getProviderRunDir(nextRuntime, request.provider)
  mkdirSync(providerRunDir, { recursive: true })
  const requestFile = getBridgeRequestFile(nextRuntime, request.provider, request.requestId)
  writeFileSync(requestFile, `${JSON.stringify(request, null, 2)}\n`, 'utf-8')
  return requestFile
}

export function listBridgeRequests(runtime: BridgeRuntime, provider: BridgeProvider, count: number): BridgeRequestRecord[] {
  const providerRunDir = getProviderRunDir(runtime, provider)
  if (!existsSync(providerRunDir)) {
    return []
  }

  return readdirSync(providerRunDir)
    .filter(entry => entry.endsWith('.json'))
    .map(entry => join(providerRunDir, entry))
    .map(readBridgeRequestFile)
    .filter((record): record is BridgeRequestRecord => record !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, count)
}

export function getProviderRuntimeStatus(runtime: BridgeRuntime, provider: BridgeProvider): ProviderRuntimeStatus {
  const sessionFile = getProviderSessionFile(runtime, provider)
  const session = readProviderSession(runtime, provider)
  return {
    provider,
    sessionFile,
    mounted: session !== null,
    paneId: session?.paneId,
    backend: session?.backend,
    launchedAt: session?.launchedAt,
  }
}

export function cleanupBridgeRuntime(runtime: BridgeRuntime): BridgeCleanupStatus {
  const removed: string[] = []

  for (const dir of [runtime.sessionsDir, runtime.runDir]) {
    if (!existsSync(dir)) {
      continue
    }

    for (const entry of readdirSync(dir)) {
      const filePath = join(dir, entry)
      rmSync(filePath, { recursive: true, force: true })
      removed.push(filePath)
    }
  }

  return {
    dryRun: false,
    cleaned: removed.length,
    removed,
  }
}
