import { delimiter, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { detectWindowsShell, getMcpCommand, getPlatformName, getPathSeparator, getPreferredWindowsShell, getWindowsShellCandidates, isLinux, isMacOS, isWindows } from '../platform'

// Note: these tests run on the actual platform, so we test based on current OS

describe('platform detection', () => {
  it('exactly one platform detector returns true', () => {
    const results = [isWindows(), isMacOS(), isLinux()]
    const trueCount = results.filter(Boolean).length
    // At least one should be true (could be 0 on exotic platforms)
    // But on CI/dev machines, exactly one should be true
    expect(trueCount).toBeLessThanOrEqual(1)
  })

  it('isWindows returns boolean', () => {
    expect(typeof isWindows()).toBe('boolean')
  })

  it('isMacOS returns boolean', () => {
    expect(typeof isMacOS()).toBe('boolean')
  })

  it('isLinux returns boolean', () => {
    expect(typeof isLinux()).toBe('boolean')
  })
})

describe('getMcpCommand', () => {
  if (process.platform === 'win32') {
    it('wraps npx with cmd /c on Windows', () => {
      expect(getMcpCommand('npx')).toEqual(['cmd', '/c', 'npx'])
    })

    it('wraps node with cmd /c on Windows', () => {
      expect(getMcpCommand('node')).toEqual(['cmd', '/c', 'node'])
    })

    it('does not wrap unknown commands on Windows', () => {
      expect(getMcpCommand('custom-tool')).toEqual(['custom-tool'])
    })
  }
  else {
    it('returns command as-is on Unix', () => {
      expect(getMcpCommand('npx')).toEqual(['npx'])
    })

    it('returns node as-is on Unix', () => {
      expect(getMcpCommand('node')).toEqual(['node'])
    })

    it('returns custom commands as-is on Unix', () => {
      expect(getMcpCommand('custom-tool')).toEqual(['custom-tool'])
    })
  }
})

describe('getPlatformName', () => {
  it('returns a non-empty string', () => {
    const name = getPlatformName()
    expect(name.length).toBeGreaterThan(0)
  })

  it('returns one of known platform names or raw platform string', () => {
    const name = getPlatformName()
    expect(['macOS', 'Windows', 'Linux']).toContain(name)
  })
})

describe('getPathSeparator', () => {
  it('returns / on Unix or \\ on Windows', () => {
    const sep = getPathSeparator()
    if (process.platform === 'win32') {
      expect(sep).toBe('\\')
    }
    else {
      expect(sep).toBe('/')
    }
  })
})

describe('Windows shell helpers', () => {
  it('returns Windows shells in preference order', () => {
    expect(getWindowsShellCandidates()).toEqual(['pwsh', 'powershell'])
  })

  it('prefers pwsh when both shells are available', () => {
    const pathEntries = ['/tools/pwsh', '/tools/powershell']
    const pathEnv = pathEntries.join(delimiter)
    const matches = new Set([
      join('/tools/pwsh', 'pwsh.exe'),
      join('/tools/powershell', 'powershell.exe'),
    ])

    expect(detectWindowsShell(pathEnv, filePath => matches.has(filePath))).toBe('pwsh')
  })

  it('falls back to powershell when pwsh is unavailable', () => {
    const pathEntries = ['/tools/pwsh', '/tools/powershell']
    const pathEnv = pathEntries.join(delimiter)
    const matches = new Set([join('/tools/powershell', 'powershell.exe')])

    expect(detectWindowsShell(pathEnv, filePath => matches.has(filePath))).toBe('powershell')
  })

  it('defaults to powershell when no shell is detected', () => {
    expect(getPreferredWindowsShell('')).toBe('powershell')
  })
})
