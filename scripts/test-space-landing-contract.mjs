import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initialAssignmentCluster } from '../src/components/Space/assignmentNavigation.js'

const source = readFileSync(new URL('../src/components/Space/SpaceHome.jsx', import.meta.url), 'utf8')

assert.equal(initialAssignmentCluster('planet', { search: '' }, 'python'), null, 'NAV must start at Multi-Verse')
assert.equal(initialAssignmentCluster('assignment_hub', { search: '' }, 'python'), 'python', 'Archive refresh must restore its course')
assert.match(source, /useState\(\(\) => initialAssignmentCluster\(currentView, location, sessionStorage\.getItem\('metasense_cluster_id'\)\)\)/)
assert.match(source, /if \(!canLoadCourseCatalog \|\| loadingClusters \|\| errorClusters \|\| !clusters\) return;/, 'Restored course must not be erased before auth and catalog load')

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
