import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { validateProject, fileKind } from '../src/components/PythonGameStudio/projectPolicy.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../public/space-invaders')
const files = [{ path: 'main.py', kind: 'python', text: '' }]
for (const name of (await fs.readdir(resolve(root, 'assets'))).sort()) {
  const bytes = await fs.readFile(resolve(root, 'assets', name))
  files.push({ path: `assets/${name}`, kind: fileKind(name), data: bytes.toString('base64') })
}
files.push({ path: 'asset_credits.py', kind: 'python', text: await fs.readFile(resolve(root, 'asset_credits.py'), 'utf8') })
const project = validateProject({ id: 'space-invaders-starter-v1', title: '우주 방어대 · Space Invaders',
  schemaVersion: 1, runtimeVersion: 'pygame-web-0.9-cp312-v1', revision: 0, entrypoint: 'main.py', files })
await fs.writeFile(resolve(root, 'space-invaders-starter.mspygame.json'), JSON.stringify(project))
console.log(`Starter validated: ${project.files.length} files, ${project.totalBytes} bytes, empty main.py, complete font license.`)
