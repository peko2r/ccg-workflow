import { describe, expect, it } from 'vitest'
import { cleanupCcxManagedSettings } from '../settings'

describe('cleanupCcxManagedSettings', () => {
  it('removes only CCX-managed permission and hook entries', () => {
    const settings = {
      permissions: {
        allow: [
          'Bash(codeagent-wrapper --backend codex)',
          'Bash(custom-safe-command)',
        ],
      },
      hooks: {
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [
              { type: 'command', command: 'codeagent-wrapper --backend codex' },
            ],
          },
          {
            matcher: 'Edit',
            hooks: [
              { type: 'command', command: 'echo keep-me' },
            ],
          },
        ],
      },
      outputStyle: 'engineer-professional',
      env: {
        ANTHROPIC_API_KEY: 'keep-me',
      },
    }

    const result = cleanupCcxManagedSettings(settings, { removeOutputStyle: true })

    expect(result.changed).toBe(true)
    expect(result.removedPermissions).toEqual(['Bash(codeagent-wrapper --backend codex)'])
    expect(result.removedHookCommands).toEqual(['codeagent-wrapper --backend codex'])
    expect(result.removedOutputStyleSetting).toBe(true)

    expect(settings).toEqual({
      permissions: {
        allow: ['Bash(custom-safe-command)'],
      },
      hooks: {
        PreToolUse: [
          {
            matcher: 'Edit',
            hooks: [
              { type: 'command', command: 'echo keep-me' },
            ],
          },
        ],
      },
      env: {
        ANTHROPIC_API_KEY: 'keep-me',
      },
    })
  })

  it('compacts empty containers after cleanup', () => {
    const settings = {
      permissions: {
        allow: ['Bash(codeagent-wrapper --backend codex)'],
      },
      hooks: {
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [
              { type: 'command', command: 'codeagent-wrapper --backend codex' },
            ],
          },
        ],
      },
    }

    const result = cleanupCcxManagedSettings(settings)

    expect(result.changed).toBe(true)
    expect(settings).toEqual({})
  })

  it('keeps default outputStyle when removeOutputStyle is enabled', () => {
    const settings = {
      outputStyle: 'default',
    }

    const result = cleanupCcxManagedSettings(settings, { removeOutputStyle: true })

    expect(result.removedOutputStyleSetting).toBe(false)
    expect(settings).toEqual({ outputStyle: 'default' })
  })
})
