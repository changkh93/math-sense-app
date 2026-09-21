// Read-only byte checks against the dist that was actually deployed.
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const names = (await readdir('dist/assets')).filter(name => /^(CodeTracePlayer|PythonGameStudioPage|StudioCoachLearning)-.*\.(js|css)$/.test(name))
if (!names.some(name => name.startsWith('CodeTracePlayer-')) || !names.some(name => name.startsWith('PythonGameStudioPage-')) || !names.some(name => name.startsWith('StudioCoachLearning-'))) throw new Error('missing-feature-build')
const files = ['index.html', 'spa.html', ...names.map(name => `assets/${name}`)]
const checks = await Promise.all(files.map(async file => {
  const local = await readFile(`dist/${file}`)
  const response = await fetch(`https://msense.me/${file}`, { cache: 'no-store', signal: AbortSignal.timeout(30000) })
  const remote = Buffer.from(await response.arrayBuffer())
  return { file, status: response.status, matches: response.ok && local.equals(remote), sha256: createHash('sha256').update(local).digest('hex') }
}))
const report = { at: new Date().toISOString(), site: 'https://msense.me', passed: checks.every(check => check.matches), checks }
await writeFile('docs/collaboration/tasks/20260921-studio-coach-release/hosting.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
if (!report.passed) process.exitCode = 1
