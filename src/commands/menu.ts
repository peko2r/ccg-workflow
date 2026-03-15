import ansis from 'ansis'
import inquirer from 'inquirer'
import { exec, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'pathe'
import fs from 'fs-extra'
import { parse as parseTOML } from 'smol-toml'
import { version } from '../../package.json'
import { configMcp } from './config-mcp'
import { i18n } from '../i18n'
import { checkIfGlobalInstall, uninstallCcx } from '../utils/installer'
import { readSettingsJson, writeSettingsJson } from '../utils/settings'
import { readCcxConfig } from '../utils/config'
import { init } from './init'
import { update } from './update'
import { isWindows } from '../utils/platform'

const execAsync = promisify(exec)

// ═══════════════════════════════════════════════════════
// UI Helpers
// ═══════════════════════════════════════════════════════

/**
 * Get visual display width of a string (CJK = 2, ASCII = 1)
 */
function visWidth(s: string): number {
  const stripped = s.replace(/\x1B\[[0-9;]*m/g, '')
  let w = 0
  for (const ch of stripped) {
    const code = ch.codePointAt(0) || 0
    // CJK Unified Ideographs + common fullwidth ranges
    if (
      (code >= 0x2E80 && code <= 0x9FFF)
      || (code >= 0xF900 && code <= 0xFAFF)
      || (code >= 0xFE30 && code <= 0xFE4F)
      || (code >= 0xFF00 && code <= 0xFF60)
      || (code >= 0xFFE0 && code <= 0xFFE6)
      || (code >= 0x1F300 && code <= 0x1F9FF) // Emojis
      || (code >= 0x20000 && code <= 0x2FA1F) // CJK Extension B+
    ) {
      w += 2
    }
    else {
      w += 1
    }
  }
  return w
}

/**
 * Pad a string to a fixed visible width (ANSI + CJK aware)
 */
function pad(s: string, w: number): string {
  const diff = w - visWidth(s)
  return diff > 0 ? s + ' '.repeat(diff) : s
}

const INNER_W = 60

/**
 * Center a string (with ANSI) inside a fixed-width area
 */
function centerLine(s: string, w: number): string {
  const vis = visWidth(s)
  const left = Math.max(0, Math.floor((w - vis) / 2))
  const right = Math.max(0, w - vis - left)
  return ' '.repeat(left) + s + ' '.repeat(right)
}

/**
 * Draw a boxed row: ║ <content padded to INNER_W> ║
 */
function boxRow(content: string): string {
  const vis = visWidth(content)
  const gap = Math.max(0, INNER_W - vis)
  return ansis.cyan('║') + content + ' '.repeat(gap) + ansis.cyan('║')
}

function drawHeader(statusParts: string[]): void {
  const top = ansis.cyan('╔' + '═'.repeat(INNER_W) + '╗')
  const bot = ansis.cyan('╚' + '═'.repeat(INNER_W) + '╝')
  const empty = boxRow(' '.repeat(INNER_W))

  // ASCII Art Logo
  const logo = [
    '  ██████╗  ██████╗  ██████╗ ',
    ' ██╔════╝ ██╔════╝ ██╔════╝ ',
    ' ██║      ██║      ██║  ███╗',
    ' ██║      ██║      ██║   ██║',
    ' ╚██████╗ ╚██████╗ ╚██████╔╝',
    '  ╚═════╝  ╚═════╝  ╚═════╝ ',
  ]

  console.log()
  console.log(top)
  console.log(empty)
  for (const line of logo) {
    console.log(boxRow(centerLine(ansis.bold.white(line), INNER_W)))
  }
  console.log(empty)
  console.log(boxRow(centerLine(ansis.gray('Claude + Codex + Gemini'), INNER_W)))
  console.log(boxRow(centerLine(ansis.gray('Multi-Model Collaboration'), INNER_W)))
  console.log(empty)
  if (statusParts.length > 0) {
    const statusLine = statusParts.join(ansis.gray('  |  '))
    console.log(boxRow(centerLine(statusLine, INNER_W)))
    console.log(empty)
  }
  console.log(bot)
  console.log()
}

function groupSep(label: string): InstanceType<typeof inquirer.Separator> {
  const w = 42
  const labelW = visWidth(label)
  const remaining = Math.max(0, w - labelW - 2)
  const left = Math.floor(remaining / 2)
  const right = remaining - left
  return new inquirer.Separator(ansis.gray(`${'─'.repeat(left)} ${label} ${'─'.repeat(right)}`))
}

// ═══════════════════════════════════════════════════════
// Main Menu
// ═══════════════════════════════════════════════════════

export async function showMainMenu(): Promise<void> {
  while (true) {
    // Read config for status display
    const config = await readCcxConfig()
    const cmdCount = config?.workflows?.installed?.length || 0
    const lang = config?.general?.language || 'zh-CN'
    const mcpProvider = config?.mcp?.provider || '—'

    // Build status parts
    const statusParts = [
      ansis.green(`v${version}`),
      ansis.white(`${cmdCount} commands`),
      ansis.yellow(lang),
    ]
    if (mcpProvider && mcpProvider !== '—' && mcpProvider !== 'skip') {
      statusParts.push(ansis.magenta(mcpProvider))
    }

    drawHeader(statusParts)

    const isZh = lang === 'zh-CN'

    // Build menu item helper: "  N. Label  - description"
    const item = (key: string, label: string, desc: string) => ({
      name: `  ${ansis.green(key + '.')} ${pad(label, 20)} ${ansis.gray('- ' + desc)}`,
      value: key,
    })

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: i18n.t('menu:title'),
      pageSize: 20,
      choices: [
        groupSep(isZh ? 'Claude Code' : 'Claude Code'),
        item('1', i18n.t('menu:options.init'), isZh ? '安装 CCG 工作流' : 'Install CCG workflows'),
        item('2', i18n.t('menu:options.update'), isZh ? '更新到最新版本' : 'Update to latest version'),
        item('3', i18n.t('menu:options.configMcp'), isZh ? '代码检索 MCP 工具' : 'Code retrieval MCP tool'),
        item('4', i18n.t('menu:options.configApi'), isZh ? '自定义 API 端点' : 'Custom API endpoint'),
        item('5', i18n.t('menu:options.configStyle'), isZh ? '选择输出人格' : 'Choose output personality'),

        groupSep(isZh ? '其他工具' : 'Tools'),
        item('T', i18n.t('menu:options.tools'), 'ccusage, CCometixLine'),
        item('C', i18n.t('menu:options.installClaude'), isZh ? '安装/重装 CLI' : 'Install/reinstall CLI'),

        groupSep('CCG'),
        item('H', i18n.t('menu:options.help'), isZh ? '查看全部斜杠命令' : 'View all slash commands'),
        item('-', i18n.t('menu:options.uninstall'), isZh ? '移除 CCX 配置' : 'Remove CCG config'),

        new inquirer.Separator(ansis.gray('─'.repeat(42))),
        { name: `  ${ansis.red('Q.')} ${i18n.t('menu:options.exit')}`, value: 'Q' },
      ],
    }])

    switch (action) {
      case '1':
        await init()
        break
      case '2':
        await update()
        break
      case '3':
        await configMcp()
        break
      case '4':
        await configApi()
        break
      case '5':
        await configOutputStyle()
        break
      case 'T':
        await handleTools()
        break
      case 'C':
        await handleInstallClaude()
        break
      case '-':
        await uninstall()
        break
      case 'H':
        showHelp()
        break
      case 'Q':
        console.log()
        console.log(ansis.gray(`  ${i18n.t('common:goodbye')}`))
        console.log()
        return
    }

    // Pause after action so user can see results
    console.log()
    await inquirer.prompt([{
      type: 'input',
      name: 'continue',
      message: ansis.gray(i18n.t('common:pressEnterToReturn')),
    }])
  }
}

// (visWidth and pad are defined in UI Helpers section above)

// ═══════════════════════════════════════════════════════
// Help
// ═══════════════════════════════════════════════════════

function showHelp(): void {
  const config = readCcxConfigSync()
  const isZh = (config?.general?.language || 'zh-CN') === 'zh-CN'

  console.log()
  console.log(ansis.cyan.bold(`  ${i18n.t('menu:help.title')}`))
  console.log()

  const col1 = 22 // command column width
  const section = (title: string) => console.log(ansis.yellow.bold(`  ${title}`))
  const cmd = (name: string, desc: string) => console.log(`  ${ansis.green(name.padEnd(col1))} ${ansis.gray(desc)}`)

  // Development Workflows
  section(i18n.t('menu:help.sections.devWorkflow'))
  cmd('/ccx:workflow', i18n.t('menu:help.descriptions.workflow'))
  cmd('/ccx:plan', i18n.t('menu:help.descriptions.plan'))
  cmd('/ccx:execute', i18n.t('menu:help.descriptions.execute'))
  cmd('/ccx:frontend', i18n.t('menu:help.descriptions.frontend'))
  cmd('/ccx:backend', i18n.t('menu:help.descriptions.backend'))
  cmd('/ccx:feat', i18n.t('menu:help.descriptions.feat'))
  cmd('/ccx:analyze', i18n.t('menu:help.descriptions.analyze'))
  cmd('/ccx:debug', i18n.t('menu:help.descriptions.debug'))
  cmd('/ccx:optimize', i18n.t('menu:help.descriptions.optimize'))
  cmd('/ccx:test', i18n.t('menu:help.descriptions.test'))
  cmd('/ccx:review', i18n.t('menu:help.descriptions.review'))
  console.log()

  // Agent Teams
  section(isZh ? 'Agent Teams 并行实施:' : 'Agent Teams Parallel:')
  cmd('/ccx:team-research', isZh ? '需求 → 约束集' : 'Requirements → Constraints')
  cmd('/ccx:team-plan', isZh ? '约束 → 并行计划' : 'Constraints → Parallel plan')
  cmd('/ccx:team-exec', isZh ? '并行实施' : 'Parallel execution')
  cmd('/ccx:team-review', isZh ? '双模型审查' : 'Dual-model review')
  console.log()

  // OpenSpec Workflows
  section(i18n.t('menu:help.sections.opsx'))
  cmd('/ccx:spec-init', i18n.t('menu:help.descriptions.specInit'))
  cmd('/ccx:spec-research', i18n.t('menu:help.descriptions.specResearch'))
  cmd('/ccx:spec-plan', i18n.t('menu:help.descriptions.specPlan'))
  cmd('/ccx:spec-impl', i18n.t('menu:help.descriptions.specImpl'))
  cmd('/ccx:spec-review', i18n.t('menu:help.descriptions.specReview'))
  console.log()

  // Git Tools
  section(i18n.t('menu:help.sections.gitTools'))
  cmd('/ccx:commit', i18n.t('menu:help.descriptions.commit'))
  cmd('/ccx:rollback', i18n.t('menu:help.descriptions.rollback'))
  cmd('/ccx:clean-branches', i18n.t('menu:help.descriptions.cleanBranches'))
  cmd('/ccx:worktree', i18n.t('menu:help.descriptions.worktree'))
  console.log()

  // Project Init
  section(i18n.t('menu:help.sections.projectMgmt'))
  cmd('/ccx:init', i18n.t('menu:help.descriptions.init'))
  cmd('/ccx:enhance', isZh ? 'Prompt 增强' : 'Prompt enhancement')
  console.log()

  console.log(ansis.gray(`  ${i18n.t('menu:help.hint')}`))
  console.log()
}

/**
 * Synchronous config read for non-async contexts (help display)
 */
function readCcxConfigSync(): any {
  try {
    const configPath = join(homedir(), '.claude', '.ccx', 'config.toml')
    if (fs.pathExistsSync(configPath)) {
      return parseTOML(fs.readFileSync(configPath, 'utf-8'))
    }
  }
  catch { /* ignore */ }
  return null
}

// ═══════════════════════════════════════════════════════
// API Configuration
// ═══════════════════════════════════════════════════════

async function configApi(): Promise<void> {
  console.log()
  console.log(ansis.cyan.bold(`  ${i18n.t('menu:api.title')}`))
  console.log()

  const settingsPath = join(homedir(), '.claude', 'settings.json')
  let settings: Record<string, any> = {}

  if (await fs.pathExists(settingsPath)) {
    settings = await readSettingsJson(settingsPath)
  }

  // Show current config
  const currentUrl = settings.env?.ANTHROPIC_BASE_URL
  const currentKey = settings.env?.ANTHROPIC_API_KEY || settings.env?.ANTHROPIC_AUTH_TOKEN
  if (currentUrl || currentKey) {
    console.log(ansis.gray(`  ${i18n.t('menu:api.currentConfig')}`))
    if (currentUrl)
      console.log(ansis.gray(`    URL: ${currentUrl}`))
    if (currentKey)
      console.log(ansis.gray(`    Key: ${currentKey.slice(0, 8)}...${currentKey.slice(-4)}`))
    console.log()
  }

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message: `${i18n.t('menu:api.urlPrompt')} ${ansis.gray(`(${i18n.t('menu:api.leaveEmptyOfficial')})`)}`,
      default: currentUrl || '',
    },
    {
      type: 'password',
      name: 'key',
      message: `${i18n.t('menu:api.keyPrompt')} ${ansis.gray(`(${i18n.t('menu:api.leaveEmptySkip')})`)}`,
      mask: '*',
    },
  ])

  if (!answers.url && !answers.key) {
    console.log(ansis.gray(i18n.t('common:configNotModified')))
    return
  }

  // Update settings
  if (!settings.env)
    settings.env = {}

  if (answers.url?.trim()) {
    settings.env.ANTHROPIC_BASE_URL = answers.url.trim()
  }

  if (answers.key?.trim()) {
    settings.env.ANTHROPIC_API_KEY = answers.key.trim()
    delete settings.env.ANTHROPIC_AUTH_TOKEN
  }

  // Default optimization config
  settings.env.DISABLE_TELEMETRY = '1'
  settings.env.DISABLE_ERROR_REPORTING = '1'
  settings.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = '1'
  settings.env.CLAUDE_CODE_ATTRIBUTION_HEADER = '0'
  settings.env.MCP_TIMEOUT = '60000'

  // codeagent-wrapper permission allowlist
  if (!settings.permissions)
    settings.permissions = {}
  if (!settings.permissions.allow)
    settings.permissions.allow = []
  const wrapperPerms = [
    'Bash(~/.claude/bin/codeagent-wrapper --backend gemini*)',
    'Bash(~/.claude/bin/codeagent-wrapper --backend codex*)',
  ]
  for (const perm of wrapperPerms) {
    if (!settings.permissions.allow.includes(perm))
      settings.permissions.allow.push(perm)
  }

  await fs.ensureDir(join(homedir(), '.claude'))
  await fs.writeJson(settingsPath, settings, { spaces: 2 })

  console.log()
  console.log(ansis.green(`  ✓ ${i18n.t('menu:api.saved')}`))
  console.log(ansis.gray(`    ${i18n.t('common:configFile')}: ${settingsPath}`))
}

// ═══════════════════════════════════════════════════════
// Output Style Configuration
// ═══════════════════════════════════════════════════════

const OUTPUT_STYLES = [
  { id: 'default', nameKey: 'menu:style.default', descKey: 'menu:style.defaultDesc' },
  { id: 'engineer-professional', nameKey: 'menu:style.engineerPro', descKey: 'menu:style.engineerProDesc' },
  { id: 'nekomata-engineer', nameKey: 'menu:style.nekomata', descKey: 'menu:style.nekomataDesc' },
  { id: 'laowang-engineer', nameKey: 'menu:style.laowang', descKey: 'menu:style.laowangDesc' },
  { id: 'ojousama-engineer', nameKey: 'menu:style.ojousama', descKey: 'menu:style.ojousamaDesc' },
  { id: 'abyss-cultivator', nameKey: 'menu:style.abyss', descKey: 'menu:style.abyssDesc' },
]

async function configOutputStyle(): Promise<void> {
  console.log()
  console.log(ansis.cyan.bold(`  ${i18n.t('menu:style.title')}`))
  console.log()

  const settingsPath = join(homedir(), '.claude', 'settings.json')
  let settings: Record<string, any> = {}
  if (await fs.pathExists(settingsPath)) {
    settings = await readSettingsJson(settingsPath)
  }

  const currentStyle = settings.outputStyle || 'default'
  console.log(ansis.gray(`  ${i18n.t('menu:style.currentStyle')}: ${currentStyle}`))
  console.log()

  const { style } = await inquirer.prompt([{
    type: 'list',
    name: 'style',
    message: i18n.t('menu:style.selectStyle'),
    choices: OUTPUT_STYLES.map(s => ({
      name: `${i18n.t(s.nameKey)} ${ansis.gray(`- ${i18n.t(s.descKey)}`)}`,
      value: s.id,
    })),
    default: currentStyle,
  }])

  if (style === currentStyle) {
    console.log(ansis.gray(i18n.t('menu:style.notChanged')))
    return
  }

  // Copy style file if not default
  if (style !== 'default') {
    const outputStylesDir = join(homedir(), '.claude', 'output-styles')
    await fs.ensureDir(outputStylesDir)

    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)
    let pkgRoot = dirname(dirname(__dirname))
    if (!await fs.pathExists(join(pkgRoot, 'templates'))) {
      pkgRoot = dirname(pkgRoot)
    }
    const templatePath = join(pkgRoot, 'templates', 'output-styles', `${style}.md`)
    const destPath = join(outputStylesDir, `${style}.md`)

    if (await fs.pathExists(templatePath)) {
      await fs.copy(templatePath, destPath)
      console.log(ansis.green(`  ✓ ${i18n.t('menu:style.installed', { style })}`))
    }
  }

  // Update settings.json
  if (style === 'default') {
    delete settings.outputStyle
  }
  else {
    settings.outputStyle = style
  }

  await fs.writeJson(settingsPath, settings, { spaces: 2 })

  console.log()
  console.log(ansis.green(`  ✓ ${i18n.t('menu:style.set', { style })}`))
  console.log(ansis.gray(`    ${i18n.t('common:restartToApply')}`))
}

// ═══════════════════════════════════════════════════════
// Install Claude Code
// ═══════════════════════════════════════════════════════

async function handleInstallClaude(): Promise<void> {
  console.log()
  console.log(ansis.cyan.bold(`  ${i18n.t('menu:claude.title')}`))
  console.log()

  // Check if already installed
  let isInstalled = false
  try {
    await execAsync('claude --version', { timeout: 5000 })
    isInstalled = true
  }
  catch {
    isInstalled = false
  }

  if (isInstalled) {
    console.log(ansis.yellow(`  ⚠ ${i18n.t('menu:claude.alreadyInstalled')}`))
    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: i18n.t('menu:claude.reinstallPrompt'),
      default: false,
    }])

    if (!confirm) {
      console.log(ansis.gray(`  ${i18n.t('common:cancelled')}`))
      return
    }

    // Uninstall
    console.log()
    console.log(ansis.yellow(`  ⏳ ${i18n.t('menu:claude.uninstalling')}`))
    try {
      const uninstallCmd = isWindows() ? 'npm uninstall -g @anthropic-ai/claude-code' : 'sudo npm uninstall -g @anthropic-ai/claude-code'
      await execAsync(uninstallCmd, { timeout: 60000 })
      console.log(ansis.green(`  ✓ ${i18n.t('menu:claude.uninstallSuccess')}`))
    }
    catch (e) {
      console.log(ansis.red(`  ✗ ${i18n.t('menu:claude.uninstallFailed', { error: String(e) })}`))
      return
    }
  }

  // Select installation method
  const isMac = process.platform === 'darwin'
  const isLinux = process.platform === 'linux'

  const { method } = await inquirer.prompt([{
    type: 'list',
    name: 'method',
    message: i18n.t('menu:claude.selectMethod'),
    choices: [
      { name: `npm ${ansis.green('(⭐)')} ${ansis.gray('- npm install -g')}`, value: 'npm' },
      ...((isMac || isLinux) ? [{ name: `homebrew ${ansis.gray('- brew install')}`, value: 'homebrew' }] : []),
      ...((isMac || isLinux) ? [{ name: `curl ${ansis.gray('- official script')}`, value: 'curl' }] : []),
      ...(isWindows() ? [
        { name: `powershell ${ansis.gray('- Windows official')}`, value: 'powershell' },
        { name: `cmd ${ansis.gray('- Command Prompt')}`, value: 'cmd' },
      ] : []),
      new inquirer.Separator(),
      { name: `${ansis.gray(i18n.t('common:cancel'))}`, value: 'cancel' },
    ],
  }])

  if (method === 'cancel')
    return

  console.log()
  console.log(ansis.yellow(`  ⏳ ${i18n.t('menu:claude.installing')}`))

  try {
    if (method === 'npm') {
      const installCmd = isWindows() ? 'npm install -g @anthropic-ai/claude-code' : 'sudo npm install -g @anthropic-ai/claude-code'
      await execAsync(installCmd, { timeout: 300000 })
    }
    else if (method === 'homebrew') {
      await execAsync('brew install --cask claude-code', { timeout: 300000 })
    }
    else if (method === 'curl') {
      await execAsync('curl -fsSL https://claude.ai/install.sh | bash', { timeout: 300000 })
    }
    else if (method === 'powershell') {
      await execAsync('powershell -Command "irm https://claude.ai/install.ps1 | iex"', { timeout: 300000 })
    }
    else if (method === 'cmd') {
      await execAsync('cmd /c "curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd"', { timeout: 300000 })
    }

    console.log(ansis.green(`  ✓ ${i18n.t('menu:claude.installSuccess')}`))
    console.log()
    console.log(ansis.cyan(`  💡 ${i18n.t('menu:claude.runHint')}`))
  }
  catch (e) {
    console.log(ansis.red(`  ✗ ${i18n.t('menu:claude.installFailed', { error: String(e) })}`))
  }
}

// ═══════════════════════════════════════════════════════
// Uninstall
// ═══════════════════════════════════════════════════════

export async function uninstall(): Promise<void> {
  console.log()

  const isGlobalInstall = await checkIfGlobalInstall()

  if (isGlobalInstall) {
    console.log(ansis.yellow(`  ⚠️  ${i18n.t('menu:uninstall.globalDetected')}`))
    console.log()
  }

  const { confirm } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: i18n.t('menu:uninstall.confirm'),
    default: false,
  }])

  if (!confirm) {
    console.log(ansis.gray(`  ${i18n.t('menu:uninstall.cancelled')}`))
    return
  }

  console.log()
  console.log(ansis.yellow(`  ${i18n.t('menu:uninstall.uninstalling')}`))

  const installDir = join(homedir(), '.claude')
  const result = await uninstallCcx(installDir)

  if (result.success) {
    console.log(ansis.green(`  ✅ ${i18n.t('menu:uninstall.success')}`))

    if (result.removedCommands.length > 0) {
      console.log()
      console.log(ansis.cyan(`  ${i18n.t('menu:uninstall.removedCommands')}`))
      for (const cmd of result.removedCommands) {
        console.log(`    ${ansis.gray('•')} /ccx:${cmd}`)
      }
    }

    if (result.removedAgents.length > 0) {
      console.log()
      console.log(ansis.cyan(`  ${i18n.t('menu:uninstall.removedAgents')}`))
      for (const agent of result.removedAgents) {
        console.log(`    ${ansis.gray('•')} ${agent}`)
      }
    }

    if (result.removedSkills.length > 0) {
      console.log()
      console.log(ansis.cyan(`  ${i18n.t('menu:uninstall.removedSkills')}`))
      for (const skill of result.removedSkills) {
        console.log(`    ${ansis.gray('•')} ${skill}`)
      }
    }

    if (result.removedBridgeShims.length > 0) {
      console.log()
      console.log(ansis.cyan(`  ${i18n.t('menu:uninstall.removedBridgeShims')}`))
      for (const shim of result.removedBridgeShims) {
        console.log(`    ${ansis.gray('•')} ${shim}`)
      }
    }

    if (result.removedRules.length > 0) {
      console.log()
      console.log(ansis.cyan(`  ${i18n.t('menu:uninstall.removedRules')}`))
      for (const rule of result.removedRules) {
        console.log(`    ${ansis.gray('•')} ${rule}`)
      }
    }

    if (result.removedBin) {
      console.log()
      console.log(ansis.cyan(`  ${i18n.t('menu:uninstall.removedBin')}`))
      console.log(`    ${ansis.gray('•')} codeagent-wrapper`)
    }

    if (result.removedMcpServers.length > 0) {
      console.log()
      console.log(ansis.cyan(`  ${i18n.t('menu:uninstall.removedMcpServers')}`))
      for (const id of result.removedMcpServers) {
        console.log(`    ${ansis.gray('•')} ${id}`)
      }
    }

    if (result.removedCodexMirror.length > 0) {
      console.log()
      console.log(ansis.cyan(`  ${i18n.t('menu:uninstall.removedCodexMirror')}`))
      for (const id of result.removedCodexMirror) {
        console.log(`    ${ansis.gray('•')} ${id}`)
      }
    }

    if (result.removedGeminiMirror.length > 0) {
      console.log()
      console.log(ansis.cyan(`  ${i18n.t('menu:uninstall.removedGeminiMirror')}`))
      for (const id of result.removedGeminiMirror) {
        console.log(`    ${ansis.gray('•')} ${id}`)
      }
    }

    if (result.removedSettingsEntries.length > 0) {
      console.log()
      console.log(ansis.cyan(`  ${i18n.t('menu:uninstall.removedSettingsEntries')}`))
      for (const entry of result.removedSettingsEntries) {
        console.log(`    ${ansis.gray('•')} ${entry}`)
      }
    }

    if (result.removedOutputStyles.length > 0) {
      console.log()
      console.log(ansis.cyan(`  ${i18n.t('menu:uninstall.removedOutputStyles')}`))
      for (const style of result.removedOutputStyles) {
        console.log(`    ${ansis.gray('•')} ${style}`)
      }
    }

    if (result.removedContextWeaver) {
      console.log()
      console.log(ansis.cyan(`  ${i18n.t('menu:uninstall.removedContextWeaver')}`))
      console.log(`    ${ansis.gray('•')} ~/.contextweaver/`)
    }

    if (isGlobalInstall) {
      console.log()
      console.log(ansis.yellow.bold(`  🔸 ${i18n.t('menu:uninstall.lastStep')}`))
      console.log()
      console.log(`  ${i18n.t('menu:uninstall.runInNewTerminal')}`)
      console.log()
      console.log(ansis.cyan.bold('    npm uninstall -g claude-code-ex'))
      console.log()
      console.log(ansis.gray(`  (${i18n.t('menu:uninstall.afterDone')})`))
    }
  }
  else {
    console.log(ansis.red(`  ${i18n.t('menu:uninstall.failed')}`))
    for (const error of result.errors) {
      console.log(ansis.red(`    ${error}`))
    }
  }

  console.log()
}

// ═══════════════════════════════════════════════════════
// Tools
// ═══════════════════════════════════════════════════════

async function handleTools(): Promise<void> {
  console.log()

  const { tool } = await inquirer.prompt([{
    type: 'list',
    name: 'tool',
    message: i18n.t('menu:tools.title'),
    choices: [
      { name: `${ansis.green('📊')} ccusage        ${ansis.gray(`${i18n.t('menu:tools.ccusage')}`)}`, value: 'ccusage' },
      { name: `${ansis.blue('📟')} CCometixLine   ${ansis.gray(`${i18n.t('menu:tools.ccline')}`)}`, value: 'ccline' },
      new inquirer.Separator(),
      { name: `${ansis.gray(`← ${i18n.t('common:back')}`)}`, value: 'cancel' },
    ],
  }])

  if (tool === 'cancel')
    return

  if (tool === 'ccusage') {
    await runCcusage()
  }
  else if (tool === 'ccline') {
    await handleCCometixLine()
  }
}

async function runCcusage(): Promise<void> {
  console.log()
  console.log(ansis.cyan(`  📊 ${i18n.t('menu:tools.runningCcusage')}`))
  console.log(ansis.gray('  $ npx ccusage@latest'))
  console.log()

  return new Promise((resolve) => {
    const child = spawn('npx', ['ccusage@latest'], {
      stdio: 'inherit',
      shell: true,
    })
    child.on('close', () => resolve())
    child.on('error', () => resolve())
  })
}

async function handleCCometixLine(): Promise<void> {
  console.log()

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: i18n.t('menu:tools.cclineAction'),
    choices: [
      { name: `${ansis.green('➜')} ${i18n.t('menu:tools.cclineInstall')}`, value: 'install' },
      { name: `${ansis.red('✕')} ${i18n.t('menu:tools.cclineUninstall')}`, value: 'uninstall' },
      new inquirer.Separator(),
      { name: `${ansis.gray(`← ${i18n.t('common:back')}`)}`, value: 'cancel' },
    ],
  }])

  if (action === 'cancel')
    return

  if (action === 'install') {
    await installCCometixLine()
  }
  else if (action === 'uninstall') {
    await uninstallCCometixLine()
  }
}

async function installCCometixLine(): Promise<void> {
  console.log()
  console.log(ansis.yellow(`  ⏳ ${i18n.t('menu:tools.cclineInstalling')}`))

  try {
    const installCmd = isWindows() ? 'npm install -g @cometix/ccline' : 'sudo npm install -g @cometix/ccline'
    await execAsync(installCmd, { timeout: 120000 })
    console.log(ansis.green(`  ✓ ${i18n.t('menu:tools.cclineInstallSuccess')}`))

    const settingsPath = join(homedir(), '.claude', 'settings.json')
    let settings: Record<string, any> = {}

    if (await fs.pathExists(settingsPath)) {
      settings = await readSettingsJson(settingsPath)
    }

    settings.statusLine = {
      type: 'command',
      command: isWindows()
        ? '%USERPROFILE%\\.claude\\ccline\\ccline.exe'
        : '~/.claude/ccline/ccline',
      padding: 0,
    }

    await fs.ensureDir(join(homedir(), '.claude'))
    await fs.writeJson(settingsPath, settings, { spaces: 2 })
    console.log(ansis.green(`  ✓ ${i18n.t('menu:tools.cclineConfigured')}`))

    console.log()
    console.log(ansis.cyan(`  💡 ${i18n.t('common:restartToApply')}`))
  }
  catch (error) {
    console.log(ansis.red(`  ✗ ${i18n.t('menu:tools.cclineInstallFailed', { error: String(error) })}`))
  }
}

async function uninstallCCometixLine(): Promise<void> {
  console.log()
  console.log(ansis.yellow(`  ⏳ ${i18n.t('menu:tools.cclineUninstalling')}`))

  try {
    const settingsPath = join(homedir(), '.claude', 'settings.json')
    if (await fs.pathExists(settingsPath)) {
      const settings = await readSettingsJson(settingsPath)
      delete settings.statusLine
      await fs.writeJson(settingsPath, settings, { spaces: 2 })
      console.log(ansis.green(`  ✓ ${i18n.t('menu:tools.cclineConfigRemoved')}`))
    }

    const uninstallCmd = isWindows() ? 'npm uninstall -g @cometix/ccline' : 'sudo npm uninstall -g @cometix/ccline'
    await execAsync(uninstallCmd, { timeout: 60000 })
    console.log(ansis.green(`  ✓ ${i18n.t('menu:tools.cclineUninstalled')}`))
  }
  catch (error) {
    console.log(ansis.red(`  ✗ ${i18n.t('menu:tools.cclineUninstallFailed', { error: String(error) })}`))
  }
}
