import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/components/Space/SpaceHome.jsx', import.meta.url), 'utf8')

assert.match(
  source,
  /const \[selectedClusterId, setSelectedClusterId\] = useState\(null\)/,
  'NAV must start without a selected cluster so Multi-Verse is rendered',
)

assert.match(
  source,
  /currentView === 'planet' && !selectedClusterId/,
  'the planet root must render the cluster selector when no cluster is selected',
)

assert.doesNotMatch(
  source,
  /activeClusters\.length === 1 && !selectedClusterId/,
  'a single accessible cluster must not bypass Multi-Verse',
)

assert.doesNotMatch(
  source,
  /useState\(\(\) => \{\s*return sessionStorage\.getItem\('metasense_(?:cluster|region|chapter|unit)_id'\)/,
  'persisted learning coordinates must not override the Multi-Verse landing',
)

console.log('Space landing contract checks passed.')
