import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  FRONTIER_AUDIO_ASSETS_READY,
  FRONTIER_SOUNDS,
} from '../src/audio/soundRegistry.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = path.join(
  projectRoot,
  'docs',
  'audio',
  'frontier-audio-assets.json',
)
const strict = (
  process.argv.includes('--strict')
  || process.env.VITE_FRONTIER_AUDIO_ASSETS_READY === 'true'
  || FRONTIER_AUDIO_ASSETS_READY
)
const allowProvisional = process.argv.includes('--allow-provisional')
const declaredPaths = new Set()
const REQUIRED_MANIFEST_FIELDS = [
  'sourceUrl',
  'creator',
  'license',
  'licenseUrl',
  'downloadedAt',
  'sha256',
]

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
let manifest = { assets: [] }
let manifestError = null

try {
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  if (!Array.isArray(manifest.assets)) {
    manifestError = 'manifest.assets must be an array'
    manifest = { assets: [] }
  }
} catch (error) {
  manifestError = error instanceof SyntaxError
    ? `invalid JSON: ${error.message}`
    : 'manifest file is missing or unreadable'
}

const manifestEntries = new Map()
const duplicateManifestPaths = new Set()
const invalidManifestEntries = []
const provisionalManifestPaths = []

for (const entry of manifest.assets) {
  const assetPath = typeof entry?.path === 'string' ? entry.path : ''
  if (!assetPath) {
    invalidManifestEntries.push('(missing path)')
    continue
  }
  if (manifestEntries.has(assetPath)) duplicateManifestPaths.add(assetPath)
  manifestEntries.set(assetPath, entry)
  if (entry.provisional === true) provisionalManifestPaths.push(assetPath)
  const missingFields = REQUIRED_MANIFEST_FIELDS.filter((field) => {
    return typeof entry[field] !== 'string' || entry[field].trim().length === 0
  })
  const invalidHash = (
    typeof entry.sha256 === 'string'
    && !/^[a-f0-9]{64}$/i.test(entry.sha256)
  )
  if (missingFields.length > 0 || invalidHash) {
    invalidManifestEntries.push(
      `${assetPath}${missingFields.length ? ` (missing: ${missingFields.join(', ')})` : ' (invalid sha256)'}`
    )
  }
}

const undocumented = [...declaredPaths].filter((source) => !manifestEntries.has(source))
const undeclaredManifestPaths = [...manifestEntries.keys()]
  .filter((source) => !declaredPaths.has(source))

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
const documentedCount = declaredPaths.size - undocumented.length
console.log(
  `[Frontier Audio Assets] ${validCount}/${declaredPaths.size} valid`
  + ` · ${missing.length} missing · ${empty.length} empty`
)
console.log(
  `[Frontier Audio Licenses] ${documentedCount}/${declaredPaths.size} documented`
  + ` · ${invalidManifestEntries.length} invalid`
  + ` · ${provisionalManifestPaths.length} provisional`
)

if (missing.length > 0) {
  console.log(`  pending: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ' …' : ''}`)
}
if (empty.length > 0) {
  console.log(`  empty: ${empty.join(', ')}`)
}
if (manifestError) {
  console.log(`  manifest: ${manifestError}`)
}
if (undocumented.length > 0) {
  console.log(
    `  undocumented: ${undocumented.slice(0, 8).join(', ')}`
    + `${undocumented.length > 8 ? ' …' : ''}`
  )
}
if (invalidManifestEntries.length > 0) {
  console.log(
    `  invalid metadata: ${invalidManifestEntries.slice(0, 8).join(', ')}`
    + `${invalidManifestEntries.length > 8 ? ' …' : ''}`
  )
}
if (duplicateManifestPaths.size > 0) {
  console.log(`  duplicate manifest paths: ${[...duplicateManifestPaths].join(', ')}`)
}
if (undeclaredManifestPaths.length > 0) {
  console.log(
    `  stale manifest paths: ${undeclaredManifestPaths.slice(0, 8).join(', ')}`
    + `${undeclaredManifestPaths.length > 8 ? ' …' : ''}`
  )
}
if (provisionalManifestPaths.length > 0) {
  console.log(
    `  provisional QA: ${provisionalManifestPaths.slice(0, 8).join(', ')}`
    + `${provisionalManifestPaths.length > 8 ? ' …' : ''}`
  )
}

const invalidLicenseManifest = (
  Boolean(manifestError)
  || undocumented.length > 0
  || invalidManifestEntries.length > 0
  || duplicateManifestPaths.size > 0
  || undeclaredManifestPaths.length > 0
  || (!allowProvisional && provisionalManifestPaths.length > 0)
)

if (strict && (missing.length > 0 || empty.length > 0 || invalidLicenseManifest)) {
  console.error(
    'Frontier audio is enabled but its runtime assets or license records are incomplete. '
    + (
      provisionalManifestPaths.length > 0 && !allowProvisional
        ? 'Provisional QA assets require --allow-provisional and must not ship to production.'
        : 'Add the files and manifest metadata, or unset VITE_FRONTIER_AUDIO_ASSETS_READY.'
    )
  )
  process.exitCode = 1
} else if (!strict && validCount < declaredPaths.size) {
  console.log('  status: feature-gated; legacy feedback fallbacks remain active.')
}
