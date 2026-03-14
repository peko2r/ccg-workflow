import { getBridgeProviderIds, normalizeBridgeProvider, type BridgeProvider } from './providers'

const BRIDGE_LAUNCH_FLAGS = new Set(['-a', '--auto-approve', '-r', '--restore'])
const RESERVED_COMMANDS = new Set([
  'ask',
  'bridge',
  'cleanup',
  'config',
  'diagnose-mcp',
  'fix-mcp',
  'i',
  'init',
  'mounted',
  'pend',
  'ping',
])

function splitProviderToken(token: string): string[] {
  return token
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
}

function isProviderToken(token: string): boolean {
  const parts = splitProviderToken(token)
  return parts.length > 0 && parts.every(part => normalizeBridgeProvider(part) !== null)
}

function formatSupportedProviders(): string {
  return getBridgeProviderIds().join(', ')
}

export function parseProviderTokens(tokens: string[]): { providers: BridgeProvider[], invalid: string[] } {
  const providers: BridgeProvider[] = []
  const invalid: string[] = []
  const seen = new Set<BridgeProvider>()

  for (const token of tokens) {
    for (const part of splitProviderToken(token)) {
      const provider = normalizeBridgeProvider(part)
      if (!provider) {
        invalid.push(part)
        continue
      }

      if (!seen.has(provider)) {
        seen.add(provider)
        providers.push(provider)
      }
    }
  }

  return { providers, invalid }
}

export function parseProviderList(tokens: string[]): BridgeProvider[] {
  const filtered = tokens.filter(token => !BRIDGE_LAUNCH_FLAGS.has(token))
  const { providers, invalid } = parseProviderTokens(filtered)

  if (invalid.length > 0) {
    throw new Error(`Unsupported provider(s): ${invalid.join(', ')}. Supported providers: ${formatSupportedProviders()}.`)
  }

  if (providers.length === 0) {
    throw new Error(`At least one provider is required. Supported providers: ${formatSupportedProviders()}.`)
  }

  return providers
}

export function parseSingleProvider(token: string): BridgeProvider {
  return parseProviderList([token])[0]
}

export function looksLikeBridgeInvocation(args: string[]): boolean {
  if (args.length === 0) {
    return false
  }

  let sawBridgeFlag = false
  let firstNonFlag: string | undefined

  for (const arg of args) {
    if (BRIDGE_LAUNCH_FLAGS.has(arg)) {
      sawBridgeFlag = true
      continue
    }
    if (arg.startsWith('-')) {
      return false
    }
    firstNonFlag ??= arg
  }

  if (!firstNonFlag) {
    return sawBridgeFlag
  }

  if (RESERVED_COMMANDS.has(firstNonFlag)) {
    return false
  }

  return isProviderToken(firstNonFlag)
}
