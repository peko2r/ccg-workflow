import { detectWindowsShell, getPreferredWindowsShell, isWindows } from '../platform'

export interface CommandPlan {
  command: string
  args: string[]
  printable: string
}

export interface BridgeShellInfo {
  executable: string
  args: string[]
  found: boolean
  family: 'direct' | 'powershell'
}

function formatCommand(command: string, args: string[]): string {
  return [command, ...args.map(arg => (/\s/.test(arg) ? JSON.stringify(arg) : arg))].join(' ')
}

export function escapePowerShellArgument(value: string): string {
  return `'${value.replace(/'/g, `''`)}'`
}

export function buildPowerShellCommand(command: string, args: string[] = []): string {
  const invocation = [escapePowerShellArgument(command), ...args.map(escapePowerShellArgument)].join(' ')
  return `& ${invocation}`
}

export function getBridgeShell(): BridgeShellInfo {
  if (!isWindows()) {
    return {
      executable: 'sh',
      args: ['-lc'],
      found: true,
      family: 'direct',
    }
  }

  const detected = detectWindowsShell()
  return {
    executable: detected ?? getPreferredWindowsShell(),
    args: ['-NoLogo', '-NoProfile', '-Command'],
    found: detected !== null,
    family: 'powershell',
  }
}

export function buildShellCommand(command: string, args: string[], shell: BridgeShellInfo = getBridgeShell()): CommandPlan {
  if (shell.family === 'powershell') {
    const script = buildPowerShellCommand(command, args)
    const shellArgs = [...shell.args, script]
    return {
      command: shell.executable,
      args: shellArgs,
      printable: formatCommand(shell.executable, shellArgs),
    }
  }

  return {
    command,
    args,
    printable: formatCommand(command, args),
  }
}
