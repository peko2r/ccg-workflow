import fs from 'fs-extra'
import { dirname } from 'pathe'

function pruneEmptyContainers(value: any): any {
  if (Array.isArray(value)) {
    const items = value
      .map(item => pruneEmptyContainers(item))
      .filter(item => item !== undefined)
    return items.length > 0 ? items : undefined
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([key, item]) => [key, pruneEmptyContainers(item)] as const)
      .filter(([, item]) => item !== undefined)

    if (entries.length === 0) {
      return undefined
    }

    return Object.fromEntries(entries)
  }

  return value
}

export async function readSettingsJson(settingsPath: string): Promise<Record<string, any>> {
  if (await fs.pathExists(settingsPath)) {
    return await fs.readJSON(settingsPath)
  }
  return {}
}

export async function writeSettingsJson(settingsPath: string, settings: Record<string, any>): Promise<void> {
  const tempPath = `${settingsPath}.tmp`
  try {
    await fs.ensureDir(dirname(settingsPath))
    await fs.writeJSON(tempPath, settings, { spaces: 2 })
    await fs.move(tempPath, settingsPath, { overwrite: true })
  }
  catch (error) {
    await fs.remove(tempPath).catch(() => {})
    throw new Error(`Failed to write settings.json: ${error}`)
  }
}

export interface CleanupManagedSettingsResult {
  removedPermissions: string[]
  removedHookCommands: string[]
  removedOutputStyleSetting: boolean
  changed: boolean
}

export function cleanupCcxManagedSettings(settings: Record<string, any>, options: { removeOutputStyle?: boolean } = {}): CleanupManagedSettingsResult {
  const result: CleanupManagedSettingsResult = {
    removedPermissions: [],
    removedHookCommands: [],
    removedOutputStyleSetting: false,
    changed: false,
  }

  const allowList = Array.isArray(settings.permissions?.allow)
    ? settings.permissions.allow
    : []

  const nextAllow = allowList.filter((entry: unknown) => {
    if (typeof entry !== 'string') {
      return true
    }

    const isManaged = entry.includes('codeagent-wrapper')
    if (isManaged) {
      result.removedPermissions.push(entry)
      result.changed = true
      return false
    }

    return true
  })

  if (Array.isArray(settings.permissions?.allow)) {
    settings.permissions.allow = nextAllow
  }

  const preToolUseHooks = Array.isArray(settings.hooks?.PreToolUse)
    ? settings.hooks.PreToolUse
    : []

  const nextPreToolUse = preToolUseHooks.filter((hookEntry: any) => {
    const hookCommands = Array.isArray(hookEntry?.hooks)
      ? hookEntry.hooks
        .map((hook: any) => hook?.command)
        .filter((command: unknown): command is string => typeof command === 'string')
      : []

    const hasManagedCommand = hookCommands.some((command: string) => command.includes('codeagent-wrapper'))
    if (hasManagedCommand) {
      result.removedHookCommands.push(...hookCommands.filter((command: string) => command.includes('codeagent-wrapper')))
      result.changed = true
      return false
    }

    return true
  })

  if (Array.isArray(settings.hooks?.PreToolUse)) {
    settings.hooks.PreToolUse = nextPreToolUse
  }

  if (options.removeOutputStyle && typeof settings.outputStyle === 'string' && settings.outputStyle !== 'default') {
    delete settings.outputStyle
    result.removedOutputStyleSetting = true
    result.changed = true
  }

  const compacted = pruneEmptyContainers(settings)
  const nextSettings = compacted && typeof compacted === 'object' ? compacted : {}

  for (const key of Object.keys(settings)) {
    delete settings[key]
  }
  Object.assign(settings, nextSettings)

  return result
}
