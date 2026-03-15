#!/usr/bin/env node
import cac from 'cac'
import { setupCommands } from './cli-setup'
import { looksLikeBridgeInvocation } from './utils/bridge'

const ROOT_COMMANDS = new Set([
  'ask',
  'bridge',
  'cleanup',
  'config',
  'diagnose-mcp',
  'fix-mcp',
  'i',
  'init',
  'maild',
  'mounted',
  'pend',
  'ping',
  'uninstall',
  'update',
])

function rewriteBridgeArgv(argv: string[]): string[] {
  const cliArgs = argv.slice(2)
  if (!looksLikeBridgeInvocation(cliArgs)) {
    return argv
  }

  return [argv[0], argv[1], 'bridge', ...cliArgs]
}

async function main(): Promise<void> {
  const cli = cac('ccx')
  await setupCommands(cli)
  cli.parse(rewriteBridgeArgv(process.argv))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
