import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'

const base = 'public/space-invaders'
const files = ['catalog.json', 'space-invaders-course.zip', 'space-invaders-starter.mspygame.json', 'space-invaders-final.mspygame.json']
for (const dir of ['data-log', 'checkpoints', 'experiments', 'assets']) {
  for (const name of await fs.readdir(`${base}/${dir}`)) files.push(`${dir}/${name}`)
}
const results = []
for (let i = 0; i < files.length; i += 6) {
  results.push(...await Promise.all(files.slice(i, i + 6).map(async path => {
    const response = await fetch(`https://msense.me/space-invaders/${path}`)
    const remote = Buffer.from(await response.arrayBuffer())
    const local = await fs.readFile(`${base}/${path}`)
    const hash = bytes => createHash('sha256').update(bytes).digest('hex')
    if (response.status !== 200 || hash(remote) !== hash(local)) throw new Error(`Production mismatch: ${path} (${response.status})`)
    return { path, status: 200, bytes: remote.length, hashMatches: true }
  })))
}
await fs.writeFile('docs/collaboration/tasks/20260909-space-invaders-curriculum/03-production-assets.json', JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2) + '\n')
console.log(`PASS ${results.length} production downloads: HTTP 200 and exact SHA-256 match.`)
