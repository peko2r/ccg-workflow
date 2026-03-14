import type { InstallResult } from '../types'
import fs from 'fs-extra'
import { basename, join } from 'pathe'
import { getWorkflowById } from './installer-data'
import { PACKAGE_ROOT, injectConfigVariables, replaceHomePathsInTemplate } from './installer-template'

// ═══════════════════════════════════════════════════════
// Re-exports — all consumers import from './installer'
// These re-exports preserve backward compatibility.
// ═══════════════════════════════════════════════════════

export {
  getAllCommandIds,
  getWorkflowById,
  getWorkflowConfigs,
  getWorkflowPreset,
  WORKFLOW_PRESETS,
} from './installer-data'
export type { WorkflowPreset } from './installer-data'

export { injectConfigVariables } from './installer-template'

export {
  installAceTool,
  installAceToolRs,
  installContextWeaver,
  installFastContext,
  installMcpServer,
  syncMcpToCodex,
  syncMcpToGemini,
  uninstallAceTool,
  uninstallContextWeaver,
  uninstallFastContext,
  uninstallMcpServer,
} from './installer-mcp'
export type { ContextWeaverConfig } from './installer-mcp'

export {
  removeFastContextPrompt,
  writeFastContextPrompt,
} from './installer-prompt'

// ═══════════════════════════════════════════════════════
// Install context — shared across sub-functions
// ═══════════════════════════════════════════════════════

interface InstallConfig {
  routing: {
    mode: string
    frontend: { models: string[], primary: string }
    backend: { models: string[], primary: string }
    review: { models: string[] }
  }
  liteMode: boolean
  mcpProvider: string
}

interface InstallContext {
  installDir: string
  force: boolean
  config: InstallConfig
  templateDir: string
  result: InstallResult
}

// ═══════════════════════════════════════════════════════
// Binary download
// ═══════════════════════════════════════════════════════

const GITHUB_REPO = 'fengshao1227/ccg-workflow'
const RELEASE_TAG = 'preset'
const BINARY_DOWNLOAD_URL = `https://github.com/${GITHUB_REPO}/releases/download/${RELEASE_TAG}`
const BRIDGE_COMPAT_SHIMS = [
  { name: 'ccb', targetArgs: ['bridge'] },
  { name: 'ask', targetArgs: ['ask'] },
  { name: 'ccb-ping', targetArgs: ['ping'] },
  { name: 'pend', targetArgs: ['pend'] },
  { name: 'ccb-mounted', targetArgs: ['mounted'] },
  { name: 'ccb-cleanup', targetArgs: ['cleanup'] },
] as const

/**
 * Download codeagent-wrapper binary from GitHub Release.
 * Retry: 3 attempts with exponential backoff. Timeout: 60s per attempt.
 */
async function downloadBinaryFromRelease(binaryName: string, destPath: string): Promise<boolean> {
  const url = `${BINARY_DOWNLOAD_URL}/${binaryName}`
  const MAX_ATTEMPTS = 3
  const TIMEOUT_MS = 60_000

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

      const response = await fetch(url, { redirect: 'follow', signal: controller.signal })
      if (!response.ok) {
        clearTimeout(timer)
        if (attempt < MAX_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, attempt * 2000))
          continue
        }
        return false
      }

      const buffer = Buffer.from(await response.arrayBuffer())
      clearTimeout(timer)

      await fs.writeFile(destPath, buffer)
      if (process.platform !== 'win32') {
        await fs.chmod(destPath, 0o755)
      }
      return true
    }
    catch {
      if (attempt < MAX_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, attempt * 2000))
        continue
      }
      return false
    }
  }

  return false
}

// ═══════════════════════════════════════════════════════
// Shared file-copy helper
// ═══════════════════════════════════════════════════════

/**
 * Copy .md templates from srcDir → destDir with optional variable injection.
 * Returns list of installed file stems (filename without .md).
 */
async function copyMdTemplates(
  ctx: InstallContext,
  srcDir: string,
  destDir: string,
  options: { inject?: boolean } = {},
): Promise<string[]> {
  const installed: string[] = []
  if (!(await fs.pathExists(srcDir))) return installed

  await fs.ensureDir(destDir)
  const files = await fs.readdir(srcDir)
  for (const file of files) {
    if (!file.endsWith('.md')) continue
    const destFile = join(destDir, file)
    if (ctx.force || !(await fs.pathExists(destFile))) {
      let content = await fs.readFile(join(srcDir, file), 'utf-8')
      if (options.inject) content = injectConfigVariables(content, ctx.config)
      content = replaceHomePathsInTemplate(content, ctx.installDir)
      await fs.writeFile(destFile, content, 'utf-8')
      installed.push(file.replace('.md', ''))
    }
  }
  return installed
}

function getBridgeResourceDir(installDir: string): string {
  return join(installDir, '.ccg', 'bridge')
}

function buildBridgePowerShellLauncher(): string {
  const mapping = BRIDGE_COMPAT_SHIMS
    .map(({ name, targetArgs }) => `  '${name}' = @(${targetArgs.map(arg => `'${arg}'`).join(', ')})`)
    .join('\r\n')

  return `param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string] $ShimName,

  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $RemainingArgs
)

$commandMap = @{
${mapping}
}

if (-not $commandMap.ContainsKey($ShimName)) {
  Write-Error "Unknown CCG bridge compatibility shim: $ShimName"
  exit 64
}

$resolvedArgs = @($commandMap[$ShimName] + $RemainingArgs)
$ccgCommand = Get-Command 'ccg' -ErrorAction SilentlyContinue
if ($null -ne $ccgCommand) {
  & $ccgCommand.Source @resolvedArgs
  exit $LASTEXITCODE
}

$npxCommand = Get-Command 'npx' -ErrorAction SilentlyContinue
if ($null -ne $npxCommand) {
  & $npxCommand.Source '--yes' 'ccg-workflow' @resolvedArgs
  exit $LASTEXITCODE
}

Write-Error "Unable to locate 'ccg' or 'npx'. Install ccg-workflow globally or run 'npx ccg-workflow init' again."
exit 127
`
}

function buildBridgeCmdShim(): string {
  return `@echo off
setlocal
set "LAUNCHER=%~dp0..\\.ccg\\bridge\\compat-launcher.ps1"
where pwsh.exe >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  pwsh.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%LAUNCHER%" "%~n0" %*
) else (
  powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%LAUNCHER%" "%~n0" %*
)
exit /b %ERRORLEVEL%
`
}

function buildBridgePowerShellShim(name: string): string {
  return `& "$PSScriptRoot\\..\\.ccg\\bridge\\compat-launcher.ps1" '${name}' @args
exit $LASTEXITCODE
`
}

function normalizeGeneratedText(content: string): string {
  return content.replace(/\r\n/g, '\n')
}

async function removeManagedTextFile(filePath: string, expectedContent: string): Promise<boolean> {
  if (!(await fs.pathExists(filePath))) {
    return false
  }

  const actual = normalizeGeneratedText(await fs.readFile(filePath, 'utf-8'))
  if (actual !== normalizeGeneratedText(expectedContent)) {
    return false
  }

  await fs.remove(filePath)
  return true
}

function buildBridgePosixLauncher(): string {
  const mapping = BRIDGE_COMPAT_SHIMS
    .map(({ name, targetArgs }) => `  ${name}) set -- ${targetArgs.join(' ')} "$@" ;;`)
    .join('\n')

  return `#!/usr/bin/env sh
set -eu

shim_name=$1
shift

case "$shim_name" in
${mapping}
  *)
    printf '%s\n' "Unknown CCG bridge compatibility shim: $shim_name" >&2
    exit 64
    ;;
esac

if command -v ccg >/dev/null 2>&1; then
  exec ccg "$@"
fi

if command -v npx >/dev/null 2>&1; then
  exec npx --yes ccg-workflow "$@"
fi

printf '%s\n' "Unable to locate 'ccg' or 'npx'. Install ccg-workflow globally or run 'npx ccg-workflow init' again." >&2
exit 127
`
}

function buildBridgePosixShim(): string {
  return `#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
SHIM_NAME=$(basename "$0")
exec "$SCRIPT_DIR/../.ccg/bridge/compat-launcher.sh" "$SHIM_NAME" "$@"
`
}

async function writeTextFileIfNeeded(filePath: string, content: string, force: boolean, mode?: number): Promise<void> {
  if (!force && await fs.pathExists(filePath)) {
    return
  }

  await fs.outputFile(filePath, content, 'utf-8')
  if (mode !== undefined) {
    await fs.chmod(filePath, mode)
  }
}

// ═══════════════════════════════════════════════════════
// Install sub-steps
// ═══════════════════════════════════════════════════════

/**
 * Install slash command .md files from templates/commands/
 */
async function installCommandFiles(ctx: InstallContext, workflowIds: string[]): Promise<void> {
  const commandsDir = join(ctx.installDir, 'commands', 'ccg')

  for (const workflowId of workflowIds) {
    const workflow = getWorkflowById(workflowId)
    if (!workflow) {
      ctx.result.errors.push(`Unknown workflow: ${workflowId}`)
      continue
    }

    for (const cmd of workflow.commands) {
      const srcFile = join(ctx.templateDir, 'commands', `${cmd}.md`)
      const destFile = join(commandsDir, `${cmd}.md`)

      try {
        if (await fs.pathExists(srcFile)) {
          if (ctx.force || !(await fs.pathExists(destFile))) {
            let content = await fs.readFile(srcFile, 'utf-8')
            content = injectConfigVariables(content, ctx.config)
            content = replaceHomePathsInTemplate(content, ctx.installDir)
            await fs.writeFile(destFile, content, 'utf-8')
            ctx.result.installedCommands.push(cmd)
          }
        }
        else {
          const placeholder = `---
description: "${workflow.descriptionEn}"
---

# /ccg:${cmd}

${workflow.description}

> This command is part of CCG multi-model collaboration system.
`
          await fs.writeFile(destFile, placeholder, 'utf-8')
          ctx.result.installedCommands.push(cmd)
        }
      }
      catch (error) {
        ctx.result.errors.push(`Failed to install ${cmd}: ${error}`)
        ctx.result.success = false
      }
    }
  }
}

/**
 * Install agent .md files from templates/commands/agents/
 */
async function installAgentFiles(ctx: InstallContext): Promise<void> {
  try {
    await copyMdTemplates(
      ctx,
      join(ctx.templateDir, 'commands', 'agents'),
      join(ctx.installDir, 'agents', 'ccg'),
      { inject: true },
    )
  }
  catch (error) {
    ctx.result.errors.push(`Failed to install agents: ${error}`)
    ctx.result.success = false
  }
}

/**
 * Install expert prompt .md files from templates/prompts/{codex,gemini,claude}/
 */
async function installPromptFiles(ctx: InstallContext): Promise<void> {
  const promptsTemplateDir = join(ctx.templateDir, 'prompts')
  const promptsDir = join(ctx.installDir, '.ccg', 'prompts')
  if (!(await fs.pathExists(promptsTemplateDir))) return

  for (const model of ['codex', 'gemini', 'claude']) {
    try {
      const installed = await copyMdTemplates(
        ctx,
        join(promptsTemplateDir, model),
        join(promptsDir, model),
      )
      for (const name of installed) {
        ctx.result.installedPrompts.push(`${model}/${name}`)
      }
    }
    catch (error) {
      ctx.result.errors.push(`Failed to install ${model} prompts: ${error}`)
      ctx.result.success = false
    }
  }
}

/**
 * Recursively collect skill names (directories containing SKILL.md, excludes root).
 * Used by both install (count) and uninstall (list names).
 */
async function collectSkillNames(dir: string, depth = 0): Promise<string[]> {
  const names: string[] = []
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        names.push(...await collectSkillNames(join(dir, entry.name), depth + 1))
      }
      else if (entry.name === 'SKILL.md' && depth > 0) {
        names.push(basename(dir))
      }
    }
  }
  catch { /* Directory doesn't exist or can't be read */ }
  return names
}

/**
 * Remove a directory and collect .md file stems. Returns [] if dir doesn't exist.
 */
async function removeDirCollectMdNames(dir: string): Promise<string[]> {
  if (!(await fs.pathExists(dir))) return []
  const files = await fs.readdir(dir)
  const names = files.filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''))
  await fs.remove(dir)
  return names
}

/**
 * Install skill files from templates/skills/ → ~/.claude/skills/ccg/
 * Includes v1.7.73 legacy layout migration.
 */
async function installSkillFiles(ctx: InstallContext): Promise<void> {
  const skillsTemplateDir = join(ctx.templateDir, 'skills')
  const skillsDestDir = join(ctx.installDir, 'skills', 'ccg')
  if (!(await fs.pathExists(skillsTemplateDir))) return

  try {
    // Migration: move old v1.7.73 layout into skills/ccg/ namespace
    const oldSkillsRoot = join(ctx.installDir, 'skills')
    const ccgLegacyItems = ['tools', 'orchestration', 'SKILL.md', 'run_skill.js']
    const needsMigration = !await fs.pathExists(skillsDestDir)
      && await fs.pathExists(join(oldSkillsRoot, 'tools'))
    if (needsMigration) {
      await fs.ensureDir(skillsDestDir)
      for (const item of ccgLegacyItems) {
        const oldPath = join(oldSkillsRoot, item)
        const newPath = join(skillsDestDir, item)
        if (await fs.pathExists(oldPath)) {
          await fs.move(oldPath, newPath, { overwrite: true })
        }
      }
    }

    // Recursive copy: preserves full directory tree
    await fs.copy(skillsTemplateDir, skillsDestDir, {
      overwrite: ctx.force,
      errorOnExist: false,
    })

    // Post-copy: apply template variable replacement to .md files
    const replacePathsInDir = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = join(dir, entry.name)
        if (entry.isDirectory()) {
          await replacePathsInDir(fullPath)
        }
        else if (entry.name.endsWith('.md')) {
          const content = await fs.readFile(fullPath, 'utf-8')
          const processed = replaceHomePathsInTemplate(content, ctx.installDir)
          if (processed !== content) {
            await fs.writeFile(fullPath, processed, 'utf-8')
          }
        }
      }
    }
    await replacePathsInDir(skillsDestDir)

    ctx.result.installedSkills = (await collectSkillNames(skillsDestDir)).length
  }
  catch (error) {
    ctx.result.errors.push(`Failed to install skills: ${error}`)
    ctx.result.success = false
  }
}

/**
 * Install rule .md files from templates/rules/ → ~/.claude/rules/
 */
async function installRuleFiles(ctx: InstallContext): Promise<void> {
  try {
    const installed = await copyMdTemplates(
      ctx,
      join(ctx.templateDir, 'rules'),
      join(ctx.installDir, 'rules'),
    )
    if (installed.length > 0) ctx.result.installedRules = true
  }
  catch (error) {
    ctx.result.errors.push(`Failed to install rules: ${error}`)
  }
}

async function installBridgeCompatFiles(ctx: InstallContext): Promise<void> {
  const resourceDir = getBridgeResourceDir(ctx.installDir)
  const binDir = join(ctx.installDir, 'bin')

  try {
    await fs.ensureDir(resourceDir)
    await fs.ensureDir(binDir)

    if (process.platform === 'win32') {
      await writeTextFileIfNeeded(join(resourceDir, 'compat-launcher.ps1'), buildBridgePowerShellLauncher(), ctx.force)

      for (const shim of BRIDGE_COMPAT_SHIMS) {
        await writeTextFileIfNeeded(join(binDir, `${shim.name}.cmd`), buildBridgeCmdShim(), ctx.force)
        await writeTextFileIfNeeded(join(binDir, `${shim.name}.ps1`), buildBridgePowerShellShim(shim.name), ctx.force)
      }
    }
    else {
      await writeTextFileIfNeeded(join(resourceDir, 'compat-launcher.sh'), buildBridgePosixLauncher(), ctx.force, 0o755)

      for (const _shim of BRIDGE_COMPAT_SHIMS) {
        await writeTextFileIfNeeded(join(binDir, _shim.name), buildBridgePosixShim(), ctx.force, 0o755)
      }
    }

    ctx.result.installedBridgeShims = BRIDGE_COMPAT_SHIMS.map(({ name }) => name)
    ctx.result.bridgeResourcePath = resourceDir
  }
  catch (error) {
    ctx.result.errors.push(`Failed to install bridge compatibility shims: ${error}`)
    ctx.result.success = false
  }
}

/** Resolve platform-specific binary name. Returns null for unsupported platforms. */
function getBinaryName(): string | null {
  const osMap: Record<string, string> = { darwin: 'darwin', linux: 'linux', win32: 'windows' }
  const os = osMap[process.platform]
  if (!os) return null
  const arch = process.arch === 'arm64' ? 'arm64' : 'amd64'
  const ext = process.platform === 'win32' ? '.exe' : ''
  return `codeagent-wrapper-${os}-${arch}${ext}`
}

/**
 * Download and install codeagent-wrapper binary for current platform.
 */
async function installBinaryFile(ctx: InstallContext): Promise<void> {
  try {
    const binDir = join(ctx.installDir, 'bin')
    await fs.ensureDir(binDir)

    const binaryName = getBinaryName()
    if (!binaryName) {
      ctx.result.errors.push(`Unsupported platform: ${process.platform}`)
      ctx.result.success = false
      return
    }

    const destBinary = join(binDir, process.platform === 'win32' ? 'codeagent-wrapper.exe' : 'codeagent-wrapper')
    const installed = await downloadBinaryFromRelease(binaryName, destBinary)

    if (installed) {
      try {
        const { execSync } = await import('node:child_process')
        execSync(`"${destBinary}" --version`, { stdio: 'pipe' })
        ctx.result.binPath = binDir
        ctx.result.binInstalled = true
      }
      catch (verifyError) {
        ctx.result.errors.push(`Binary verification failed (non-blocking): ${verifyError}`)
      }
    }
    else {
      ctx.result.errors.push(`Failed to download binary: ${binaryName} from GitHub Release (after 3 attempts). Check network or visit https://github.com/${GITHUB_REPO}/releases/tag/${RELEASE_TAG}`)
    }
  }
  catch (error) {
    ctx.result.errors.push(`Failed to install codeagent-wrapper (non-blocking): ${error}`)
  }
}

// ═══════════════════════════════════════════════════════
// Public API: install / uninstall
// ═══════════════════════════════════════════════════════

export async function installWorkflows(
  workflowIds: string[],
  installDir: string,
  force = false,
  config?: {
    routing?: {
      mode?: string
      frontend?: { models?: string[], primary?: string }
      backend?: { models?: string[], primary?: string }
      review?: { models?: string[] }
    }
    liteMode?: boolean
    mcpProvider?: string
  },
): Promise<InstallResult> {
  const ctx: InstallContext = {
    installDir,
    force,
    config: {
      routing: config?.routing as InstallConfig['routing'] || {
        mode: 'smart',
        frontend: { models: ['gemini'], primary: 'gemini' },
        backend: { models: ['codex'], primary: 'codex' },
        review: { models: ['codex', 'gemini'] },
      },
      liteMode: config?.liteMode || false,
      mcpProvider: config?.mcpProvider || 'ace-tool',
    },
    templateDir: join(PACKAGE_ROOT, 'templates'),
    result: {
      success: true,
      installedCommands: [],
      installedPrompts: [],
      errors: [],
      configPath: '',
    },
  }

  // Ensure base directories
  await fs.ensureDir(join(installDir, 'commands', 'ccg'))
  await fs.ensureDir(join(installDir, '.ccg'))
  await fs.ensureDir(join(installDir, '.ccg', 'prompts'))

  // Execute each install step
  await installCommandFiles(ctx, workflowIds)
  await installAgentFiles(ctx)
  await installPromptFiles(ctx)
  await installSkillFiles(ctx)
  await installRuleFiles(ctx)
  await installBridgeCompatFiles(ctx)
  await installBinaryFile(ctx)

  ctx.result.configPath = join(installDir, 'commands', 'ccg')
  return ctx.result
}

// ═══════════════════════════════════════════════════════
// Uninstall
// ═══════════════════════════════════════════════════════

export interface UninstallResult {
  success: boolean
  removedCommands: string[]
  removedPrompts: string[]
  removedAgents: string[]
  removedSkills: string[]
  removedBridgeShims: string[]
  removedRules: boolean
  removedBin: boolean
  errors: string[]
}

/**
 * Uninstall workflows by removing their command files
 */
export async function uninstallWorkflows(installDir: string): Promise<UninstallResult> {
  const result: UninstallResult = {
    success: true,
    removedCommands: [],
    removedPrompts: [],
    removedAgents: [],
    removedSkills: [],
    removedBridgeShims: [],
    removedRules: false,
    removedBin: false,
    errors: [],
  }

  const commandsDir = join(installDir, 'commands', 'ccg')
  const agentsDir = join(installDir, 'agents', 'ccg')
  const skillsDir = join(installDir, 'skills', 'ccg')
  const rulesDir = join(installDir, 'rules')
  const binDir = join(installDir, 'bin')
  const ccgConfigDir = join(installDir, '.ccg')

  // Remove CCG commands directory
  try {
    result.removedCommands = await removeDirCollectMdNames(commandsDir)
  }
  catch (error) {
    result.errors.push(`Failed to remove commands directory: ${error}`)
    result.success = false
  }

  // Remove CCG agents directory
  try {
    result.removedAgents = await removeDirCollectMdNames(agentsDir)
  }
  catch (error) {
    result.errors.push(`Failed to remove agents directory: ${error}`)
    result.success = false
  }

  // Remove CCG skills directory only (skills/ccg/) — preserves user's own skills
  if (await fs.pathExists(skillsDir)) {
    try {
      result.removedSkills = await collectSkillNames(skillsDir)
      await fs.remove(skillsDir)
    }
    catch (error) {
      result.errors.push(`Failed to remove skills: ${error}`)
      result.success = false
    }
  }

  // Remove CCG rules files
  if (await fs.pathExists(rulesDir)) {
    try {
      for (const ruleFile of ['ccg-skills.md', 'ccg-grok-search.md']) {
        const rulePath = join(rulesDir, ruleFile)
        if (await fs.pathExists(rulePath)) {
          await fs.remove(rulePath)
          result.removedRules = true
        }
      }
    }
    catch (error) {
      result.errors.push(`Failed to remove rules: ${error}`)
    }
  }

  // Remove bridge compatibility shims from bin/
  if (await fs.pathExists(binDir)) {
    try {
      for (const shim of BRIDGE_COMPAT_SHIMS) {
        const managedFiles = process.platform === 'win32'
          ? [
              { path: join(binDir, `${shim.name}.cmd`), content: buildBridgeCmdShim() },
              { path: join(binDir, `${shim.name}.ps1`), content: buildBridgePowerShellShim(shim.name) },
            ]
          : [
              { path: join(binDir, shim.name), content: buildBridgePosixShim() },
            ]

        let removedAny = false
        for (const file of managedFiles) {
          removedAny = await removeManagedTextFile(file.path, file.content) || removedAny
        }

        if (removedAny && !result.removedBridgeShims.includes(shim.name)) {
          result.removedBridgeShims.push(shim.name)
        }
      }
    }
    catch (error) {
      result.errors.push(`Failed to remove bridge shims: ${error}`)
      result.success = false
    }
  }

  // Remove codeagent-wrapper binary
  if (await fs.pathExists(binDir)) {
    try {
      const wrapperName = process.platform === 'win32' ? 'codeagent-wrapper.exe' : 'codeagent-wrapper'
      const wrapperPath = join(binDir, wrapperName)
      if (await fs.pathExists(wrapperPath)) {
        await fs.remove(wrapperPath)
        result.removedBin = true
      }
    }
    catch (error) {
      result.errors.push(`Failed to remove binary: ${error}`)
      result.success = false
    }
  }

  // Remove .ccg config directory
  if (await fs.pathExists(ccgConfigDir)) {
    try {
      await fs.remove(ccgConfigDir)
      result.removedPrompts.push('ALL_PROMPTS_AND_CONFIGS')
    }
    catch (error) {
      result.errors.push(`Failed to remove .ccg directory: ${error}`)
    }
  }

  return result
}
