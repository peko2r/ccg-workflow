import type { CAC } from 'cac'
import type { CliOptions } from './types'
import ansis from 'ansis'
import { version } from '../package.json'
import { configMcp } from './commands/config-mcp'
import { diagnoseMcp, fixMcp } from './commands/diagnose-mcp'
import { init } from './commands/init'
import { update } from './commands/update'
import {
  bridgeAsk,
  bridgeCleanup,
  bridgeLaunch,
  bridgeMounted,
  bridgePend,
  bridgePing,
} from './commands/bridge'
import { showMainMenu, uninstall as runUninstall } from './commands/menu'
import { runMaild } from './commands/maild'
import { i18n, initI18n } from './i18n'
import { readCcxConfig } from './utils/config'

function customizeHelp(sections: any[]): any[] {
  sections.unshift({
    title: '',
    body: ansis.cyan.bold(`Claude Code Ex (CCX) v${version}`),
  })

  sections.push({
    title: ansis.yellow(i18n.t('cli:help.commands')),
    body: [
      `  ${ansis.cyan('ccx')}              ${i18n.t('cli:help.commandDescriptions.showMenu')}`,
      `  ${ansis.cyan('ccx init')} | ${ansis.cyan('i')}     ${i18n.t('cli:help.commandDescriptions.initConfig')}`,
      `  ${ansis.cyan('ccx update')}       ${i18n.t('cli:help.commandDescriptions.update')}`,
      `  ${ansis.cyan('ccx uninstall')}    ${i18n.t('cli:help.commandDescriptions.uninstall')}`,
      `  ${ansis.cyan('ccx config mcp')}   ${i18n.t('cli:help.commandDescriptions.configMcp')}`,
      `  ${ansis.cyan('ccx diagnose-mcp')} ${i18n.t('cli:help.commandDescriptions.diagnoseMcp')}`,
      `  ${ansis.cyan('ccx fix-mcp')}      ${i18n.t('cli:help.commandDescriptions.fixMcp')}`,
      `  ${ansis.cyan('ccx codex gemini')} ${i18n.t('cli:help.commandDescriptions.bridgeLaunch')}`,
      `  ${ansis.cyan('ccx ask codex "..."')} ${i18n.t('cli:help.commandDescriptions.bridgeAsk')}`,
      `  ${ansis.cyan('ccx ping codex')}   ${i18n.t('cli:help.commandDescriptions.bridgePing')}`,
      `  ${ansis.cyan('ccx pend codex 5')} ${i18n.t('cli:help.commandDescriptions.bridgePend')}`,
      `  ${ansis.cyan('ccx mounted')}      ${i18n.t('cli:help.commandDescriptions.bridgeMounted')}`,
      `  ${ansis.cyan('ccx cleanup')}      ${i18n.t('cli:help.commandDescriptions.bridgeCleanup')}`,
      `  ${ansis.cyan('ccx maild status')} ${i18n.t('cli:help.commandDescriptions.maild')}`,
      '',
      ansis.gray(`  ${i18n.t('cli:help.shortcuts')}`),
      `  ${ansis.cyan('ccx i')}            ${i18n.t('cli:help.shortcutDescriptions.quickInit')}`,
    ].join('\n'),
  })

  sections.push({
    title: ansis.yellow(i18n.t('cli:help.options')),
    body: [
      `  ${ansis.green('--lang, -l')} <lang>         ${i18n.t('cli:help.optionDescriptions.displayLanguage')} (zh-CN, en)`,
      `  ${ansis.green('--force, -f')}               ${i18n.t('cli:help.optionDescriptions.forceOverwrite')}`,
      `  ${ansis.green('--help, -h')}                ${i18n.t('cli:help.optionDescriptions.displayHelp')}`,
      `  ${ansis.green('--version, -v')}             ${i18n.t('cli:help.optionDescriptions.displayVersion')}`,
      '',
      ansis.gray(`  ${i18n.t('cli:help.nonInteractiveMode')}`),
      `  ${ansis.green('--skip-prompt, -s')}         ${i18n.t('cli:help.optionDescriptions.skipAllPrompts')}`,
      `  ${ansis.green('--frontend, -F')} <models>   ${i18n.t('cli:help.optionDescriptions.frontendModels')}`,
      `  ${ansis.green('--backend, -B')} <models>    ${i18n.t('cli:help.optionDescriptions.backendModels')}`,
      `  ${ansis.green('--mode, -m')} <mode>         ${i18n.t('cli:help.optionDescriptions.collaborationMode')}`,
      `  ${ansis.green('--workflows, -w')} <list>    ${i18n.t('cli:help.optionDescriptions.workflows')}`,
      `  ${ansis.green('--install-dir, -d')} <path>  ${i18n.t('cli:help.optionDescriptions.installDir')}`,
    ].join('\n'),
  })

  sections.push({
    title: ansis.yellow(i18n.t('cli:help.examples')),
    body: [
      ansis.gray(`  # ${i18n.t('cli:help.exampleDescriptions.showInteractiveMenu')}`),
      `  ${ansis.cyan('npx claude-code-ex')}`,
      '',
      ansis.gray(`  # ${i18n.t('cli:help.exampleDescriptions.runFullInitialization')}`),
      `  ${ansis.cyan('npx claude-code-ex init')}`,
      `  ${ansis.cyan('npx claude-code-ex i')}`,
      '',
      ansis.gray(`  # ${i18n.t('cli:help.exampleDescriptions.fullUninstall')}`),
      `  ${ansis.cyan('npx claude-code-ex uninstall')}`,
      '',
      ansis.gray(`  # ${i18n.t('cli:help.exampleDescriptions.customModels')}`),
      `  ${ansis.cyan('npx claude-code-ex i --frontend gemini,codex --backend codex,gemini')}`,
      '',
      ansis.gray(`  # ${i18n.t('cli:help.exampleDescriptions.parallelMode')}`),
      `  ${ansis.cyan('npx claude-code-ex i --mode parallel')}`,
      '',
      ansis.gray(`  # ${i18n.t('cli:help.exampleDescriptions.bridgeLaunch')}`),
      `  ${ansis.cyan('npx ccx codex gemini')}`,
      `  ${ansis.cyan('npx ccx bridge --restore codex,claude')}`,
      '',
      ansis.gray(`  # ${i18n.t('cli:help.exampleDescriptions.bridgeAsk')}`),
      `  ${ansis.cyan('npx ccx ask codex "summarize the repository"')}`,
      `  ${ansis.cyan('npx ccx mounted')}`,
      '',
    ].join('\n'),
  })

  return sections
}

export async function setupCommands(cli: CAC): Promise<void> {
  try {
    const config = await readCcxConfig()
    const defaultLang = config?.general?.language || 'zh-CN'
    await initI18n(defaultLang)
  }
  catch {
    await initI18n('zh-CN')
  }

  cli
    .command('bridge [...providers]', i18n.t('cli:help.commandDescriptions.bridgeLaunch'))
    .option('-r, --restore', i18n.t('cli:help.optionDescriptions.bridgeRestore'))
    .option('-a, --auto-approve', i18n.t('cli:help.optionDescriptions.bridgeAutoApprove'))
    .action(async (providers: string[], options: { restore?: boolean, autoApprove?: boolean }) => {
      bridgeLaunch(providers, options)
    })

  cli
    .command('ask <provider> [...message]', i18n.t('cli:help.commandDescriptions.bridgeAsk'))
    .action(async (provider: string, message: string[]) => {
      bridgeAsk(provider, message)
    })

  cli
    .command('ping <provider>', i18n.t('cli:help.commandDescriptions.bridgePing'))
    .action(async (provider: string) => {
      bridgePing(provider)
    })

  cli
    .command('pend <provider> [count]', i18n.t('cli:help.commandDescriptions.bridgePend'))
    .action(async (provider: string, count?: string) => {
      bridgePend(provider, count)
    })

  cli
    .command('mounted [provider]', i18n.t('cli:help.commandDescriptions.bridgeMounted'))
    .action(async (provider?: string) => {
      bridgeMounted(provider)
    })

  cli
    .command('cleanup', i18n.t('cli:help.commandDescriptions.bridgeCleanup'))
    .action(async () => {
      bridgeCleanup()
    })

  cli
    .command('maild [...args]', i18n.t('cli:help.commandDescriptions.maild'))
    .action(async (args: string[]) => {
      await runMaild(args)
    })

  // Default command - show menu
  cli
    .command('', i18n.t('cli:help.commandDescriptions.showMenu'))
    .option('--lang, -l <lang>', `${i18n.t('cli:help.optionDescriptions.displayLanguage')} (zh-CN, en)`)
    .action(async (options: CliOptions) => {
      if (options.lang) {
        await initI18n(options.lang)
      }
      await showMainMenu()
    })

  // Init command
  cli
    .command('init', i18n.t('cli:help.commandDescriptions.initConfig'))
    .alias('i')
    .option('--lang, -l <lang>', `${i18n.t('cli:help.optionDescriptions.displayLanguage')} (zh-CN, en)`)
    .option('--force, -f', i18n.t('cli:help.optionDescriptions.forceOverwrite'))
    .option('--skip-prompt, -s', i18n.t('cli:help.optionDescriptions.skipAllPrompts'))
    .option('--skip-mcp', 'Skip MCP configuration (used during update)')
    .option('--frontend, -F <models>', i18n.t('cli:help.optionDescriptions.frontendModels'))
    .option('--backend, -B <models>', i18n.t('cli:help.optionDescriptions.backendModels'))
    .option('--mode, -m <mode>', i18n.t('cli:help.optionDescriptions.collaborationMode'))
    .option('--workflows, -w <workflows>', i18n.t('cli:help.optionDescriptions.workflows'))
    .option('--install-dir, -d <path>', i18n.t('cli:help.optionDescriptions.installDir'))
    .action(async (options: CliOptions) => {
      if (options.lang) {
        await initI18n(options.lang)
      }
      await init(options)
    })

  // Update command
  cli
    .command('update', i18n.t('cli:help.commandDescriptions.update'))
    .action(async () => {
      await update()
    })

  cli
    .command('uninstall', i18n.t('cli:help.commandDescriptions.uninstall'))
    .action(async () => {
      await runUninstall()
    })

  // Diagnose MCP command
  cli
    .command('diagnose-mcp', i18n.t('cli:help.commandDescriptions.diagnoseMcp'))
    .action(async () => {
      await diagnoseMcp()
    })

  // Fix MCP command (Windows only)
  cli
    .command('fix-mcp', i18n.t('cli:help.commandDescriptions.fixMcp'))
    .action(async () => {
      await fixMcp()
    })

  // Config MCP command
  cli
    .command('config <subcommand>', i18n.t('cli:help.commandDescriptions.configMcp'))
    .action(async (subcommand: string) => {
      if (subcommand === 'mcp') {
        await configMcp()
      }
      else {
        console.log(ansis.red(i18n.t('common:unknownSubcommand', { subcommand })))
        console.log(ansis.gray(i18n.t('common:availableSubcommands', { list: 'mcp' })))
      }
    })

  cli.help(sections => customizeHelp(sections))
  cli.version(version)
}
