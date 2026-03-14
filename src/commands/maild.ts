import { spawn } from 'node:child_process'
import { dirname, join } from 'pathe'
import { fileURLToPath } from 'node:url'

function resolveMaildScript(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url))
  return join(currentDir, '..', '..', 'bin', 'maild')
}

export async function runMaild(args: string[] = []): Promise<void> {
  const script = resolveMaildScript()
  const python = process.platform === 'win32' ? 'python' : 'python3'

  await new Promise<void>((resolve, reject) => {
    const child = spawn(python, [script, ...args], {
      stdio: 'inherit',
      env: process.env,
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0)
        resolve()
      else
        reject(new Error(`maild exited with code ${code ?? 1}`))
    })
  })
}
