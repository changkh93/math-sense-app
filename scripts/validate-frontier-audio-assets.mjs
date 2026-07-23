import { stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  FRONTIER_AUDIO_ASSETS_READY,
  FRONTIER_SOUNDS,
} from '../src/audio/soundRegistry.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const strict = (
  process.argv.includes('--strict')
  || process.env.VITE_FRONTIER_AUDIO_ASSETS_READY === 'true'
  || FRONTIER_AUDIO_ASSETS_READY
)
const declaredPaths = new Set()

for (const definition of Object.values(FRONTIER_SOUNDS)) {
  const groups = definition.variants?.length
    ? definition.variants
    : definition.sources?.length
      ? [definition.sources]
      : []
  groups.flat().forEach((source) => declaredPaths.add(source))
}

const missing = []
const empty = []

for (const source of declaredPaths) {
  const relativePath = source.replace(/^\/+/, '')
  const filePath = path.join(projectRoot, 'public', relativePath)
  try {
    const file = await stat(filePath)
    if (!file.isFile()) missing.push(source)
    else if (file.size === 0) empty.push(source)
  } catch {
    missing.push(source)
  }
}

const validCount = declaredPaths.size - missing.length - empty.length
console.log(
  `[Frontier Audio Assets] ${validCount}/${declaredPaths.size} valid`
  + ` · ${missing.length} missing · ${empty.length} empty`
)

if (missing.length > 0) {
  console.log(`  pending: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ' …' : ''}`)
}
if (empty.length > 0) {
  console.log(`  empty: ${empty.join(', ')}`)
}

if (strict && (missing.length > 0 || empty.length > 0)) {
  console.error(
    'Frontier audio is enabled but its declared runtime assets are incomplete. '
    + 'Add the files or unset VITE_FRONTIER_AUDIO_ASSETS_READY.'
  )
  process.exitCode = 1
} else if (!strict && validCount < declaredPaths.size) {
  console.log('  status: feature-gated; legacy feedback fallbacks remain active.')
}
