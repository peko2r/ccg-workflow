import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const pythonCommand = process.platform === 'win32' ? 'python' : 'python3'
const currentDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(currentDir, '..', '..', '..')
const modulePath = resolve(projectRoot, 'lib', 'mail', 'config.py').replace(/\\/g, '/')
const script = [
  'import importlib.util',
  'from pathlib import Path',
  `module_path = Path(r'${modulePath}')`,
  "spec = importlib.util.spec_from_file_location('mail_config_test_module', module_path)",
  'module = importlib.util.module_from_spec(spec)',
  'assert spec.loader is not None',
  'spec.loader.exec_module(module)',
  'print(module.get_config_dir())',
].join('; ')

function runMailConfigDir(env: NodeJS.ProcessEnv) {
  return execFileSync(pythonCommand, ['-c', script], {
    cwd: projectRoot,
    env: {
      ...process.env,
      ...env,
    },
    encoding: 'utf8',
  }).trim()
}

describe('mail config dir env migration', () => {
  it('prefers CCX_MAIL_CONFIG_DIR when both env vars are set', () => {
    const result = runMailConfigDir({
      CCX_MAIL_CONFIG_DIR: 'override-ccx',
      CCB_MAIL_CONFIG_DIR: 'override-ccb',
    })

    expect(result).toContain('override-ccx')
  })

  it('falls back to legacy CCB_MAIL_CONFIG_DIR when new env var is missing', () => {
    const env = { ...process.env }
    delete env.CCX_MAIL_CONFIG_DIR
    env.CCB_MAIL_CONFIG_DIR = 'override-ccb'

    const result = runMailConfigDir(env)

    expect(result).toContain('override-ccb')
  })

  it('falls back to legacy CCB_MAIL_CONFIG_DIR when new env var is empty', () => {
    const result = runMailConfigDir({
      CCX_MAIL_CONFIG_DIR: '',
      CCB_MAIL_CONFIG_DIR: 'override-ccb',
    })

    expect(result).toContain('override-ccb')
  })

  it('uses default .ccx mail directory when no env override exists', () => {
    const env = { ...process.env }
    delete env.CCX_MAIL_CONFIG_DIR
    delete env.CCB_MAIL_CONFIG_DIR

    const result = runMailConfigDir(env)

    expect(result.replace(/\\/g, '/')).toContain('/.claude/.ccx/mail')
  })
})
