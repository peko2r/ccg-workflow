/**
 * Migration utilities for CCX path changes.
 * Handles automatic migration from legacy CCG/early-CCX directory layouts.
 */

import fs from 'fs-extra'
import { homedir } from 'node:os'
import { join } from 'pathe'

export interface MigrationResult {
  success: boolean
  migratedFiles: string[]
  errors: string[]
  skipped: string[]
}

async function copyChildrenIfNeeded(sourceDir: string, targetDir: string, result: MigrationResult, sourceLabel: string, targetLabel: string): Promise<void> {
  if (!await fs.pathExists(sourceDir)) {
    result.skipped.push(`${sourceLabel} (does not exist, nothing to migrate)`)
    return
  }

  await fs.ensureDir(targetDir)
  const entries = await fs.readdir(sourceDir)

  for (const entry of entries) {
    const sourcePath = join(sourceDir, entry)
    const targetPath = join(targetDir, entry)

    try {
      if (await fs.pathExists(targetPath)) {
        result.skipped.push(`${sourceLabel}/${entry} (already exists in new location)`)
        continue
      }

      await fs.copy(sourcePath, targetPath)
      result.migratedFiles.push(`${sourceLabel}/${entry} → ${targetLabel}/${entry}`)
    }
    catch (error) {
      result.errors.push(`Failed to migrate ${sourceLabel}/${entry}: ${error}`)
      result.success = false
    }
  }
}

async function removeDirIfEmpty(dir: string, label: string, result: MigrationResult): Promise<void> {
  try {
    if (!await fs.pathExists(dir)) {
      return
    }

    const remaining = await fs.readdir(dir)
    if (remaining.length === 0) {
      await fs.remove(dir)
      result.migratedFiles.push(`Removed old ${label} directory`)
    }
    else {
      result.skipped.push(`${label} (not empty, keeping for safety)`)
    }
  }
  catch (error) {
    result.skipped.push(`${label} (could not remove: ${error})`)
  }
}

/**
 * Migrate legacy config/prompt layouts into ~/.claude/.ccx/
 */
export async function migrateToV1_4_0(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    migratedFiles: [],
    errors: [],
    skipped: [],
  }

  const legacyRootDirs = [
    { source: join(homedir(), '.ccg'), label: '~/.ccg' },
    { source: join(homedir(), '.ccx'), label: '~/.ccx' },
  ]
  const targetRootDir = join(homedir(), '.claude', '.ccx')
  const legacyPromptDirs = [
    { source: join(homedir(), '.claude', 'prompts', 'ccg'), label: '~/.claude/prompts/ccg' },
    { source: join(homedir(), '.claude', 'prompts', 'ccx'), label: '~/.claude/prompts/ccx' },
  ]
  const targetPromptsDir = join(targetRootDir, 'prompts')

  try {
    await fs.ensureDir(targetRootDir)

    for (const legacy of legacyRootDirs) {
      await copyChildrenIfNeeded(legacy.source, targetRootDir, result, legacy.label, '~/.claude/.ccx')
      await removeDirIfEmpty(legacy.source, legacy.label, result)
    }

    for (const legacy of legacyPromptDirs) {
      if (await fs.pathExists(legacy.source)) {
        if (await fs.pathExists(targetPromptsDir)) {
          result.skipped.push(`${legacy.label} (already exists in new location)`)
        }
        else {
          await fs.copy(legacy.source, targetPromptsDir)
          result.migratedFiles.push(`${legacy.label} → ~/.claude/.ccx/prompts`)
          await fs.remove(legacy.source)
          result.migratedFiles.push(`Removed old ${legacy.label} directory`)
        }
      }
      else {
        result.skipped.push(`${legacy.label} (does not exist, nothing to migrate)`)
      }
    }

    await removeDirIfEmpty(join(homedir(), '.claude', 'prompts'), '~/.claude/prompts', result)
  }
  catch (error) {
    result.errors.push(`Migration failed: ${error}`)
    result.success = false
  }

  return result
}

/**
 * Check if migration is needed.
 */
export async function needsMigration(): Promise<boolean> {
  const legacyPaths = [
    join(homedir(), '.ccg'),
    join(homedir(), '.ccx'),
    join(homedir(), '.claude', 'prompts', 'ccg'),
    join(homedir(), '.claude', 'prompts', 'ccx'),
    join(homedir(), '.claude', 'commands', 'ccg', '_config.md'),
    join(homedir(), '.claude', 'commands', 'ccx', '_config.md'),
  ]

  for (const path of legacyPaths) {
    if (await fs.pathExists(path)) {
      return true
    }
  }

  return false
}
