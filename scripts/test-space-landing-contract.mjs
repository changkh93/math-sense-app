import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initialAssignmentCluster } from '../src/components/Space/assignmentNavigation.js'

const source = readFileSync(new URL('../src/components/Space/SpaceHome.jsx', import.meta.url), 'utf8')
const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')

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

const loggedOutBranch = source.slice(source.indexOf('// Public education homepage'), source.indexOf('if (hasAccountDataIssue)'))
assert.match(loggedOutBranch, /if \(!user\)/, 'public root chrome must be gated by the logged-out branch')
assert.match(loggedOutBranch, /<PublicHomeIntro onLogin=\{handleLogin\} \/>/, 'logged-out root must retain the public introduction')
assert.match(loggedOutBranch, /<Footer \/>/, 'logged-out root must retain the public footer')
assert.doesNotMatch(appSource, /<PublicHomeIntro \/>/, 'the public introduction must not render beside the authenticated root app')
assert.doesNotMatch(source, /isLoading && !user[^\n]*PublicHomeIntro/, 'auth bootstrap must not render the logged-out homepage')
assert.match(source, /if \(isLoading\) \{\s*return <AuthBootstrapScreen \/>/, 'auth bootstrap must render a neutral loading screen')
assert.match(appSource, /if \(pathname === '\/'\) return <AuthBootstrapScreen \/>/, 'the lazy root fallback must not reveal the logged-out homepage')
assert.match(appSource, /<Route path="\/" element=\{null\} \/><Route path="\*" element=\{<Footer \/>\} \/>/, 'the global footer must stay off the authenticated root route')

console.log('Space landing contract checks passed.')
