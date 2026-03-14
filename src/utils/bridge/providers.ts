export type BridgeProvider = 'codex' | 'gemini' | 'claude' | 'opencode'

export interface BridgeProviderDefinition {
  id: BridgeProvider
  displayName: string
  executable: string
}

const BRIDGE_PROVIDERS: Record<BridgeProvider, BridgeProviderDefinition> = {
  codex: {
    id: 'codex',
    displayName: 'Codex',
    executable: 'codex',
  },
  gemini: {
    id: 'gemini',
    displayName: 'Gemini',
    executable: 'gemini',
  },
  claude: {
    id: 'claude',
    displayName: 'Claude',
    executable: 'claude',
  },
  opencode: {
    id: 'opencode',
    displayName: 'OpenCode',
    executable: 'opencode',
  },
}

const BRIDGE_PROVIDER_ALIASES: Record<string, BridgeProvider> = {
  claude: 'claude',
  codex: 'codex',
  gemini: 'gemini',
  opencode: 'opencode',
  'open-code': 'opencode',
  open_code: 'opencode',
}

export function getBridgeProviderIds(): BridgeProvider[] {
  return Object.keys(BRIDGE_PROVIDERS) as BridgeProvider[]
}

export function normalizeBridgeProvider(input: string): BridgeProvider | null {
  const normalized = input.trim().toLowerCase()
  return BRIDGE_PROVIDER_ALIASES[normalized] ?? null
}

export function getBridgeProvider(input: string): BridgeProviderDefinition | null {
  const provider = normalizeBridgeProvider(input)
  return provider ? BRIDGE_PROVIDERS[provider] : null
}

export function getBridgeProviderOrThrow(input: string): BridgeProviderDefinition {
  const provider = getBridgeProvider(input)
  if (!provider) {
    throw new Error(`Unsupported provider: ${input}`)
  }
  return provider
}
