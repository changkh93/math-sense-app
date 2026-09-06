import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { performance } from 'node:perf_hooks'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { FRONTIER_GRAPHICS, FRONTIER_GRAPHICS_KEY, readFrontierGraphics, isMarineHabitatVisible } from '../src/components/GalaxySocial/frontierPerformance.js'
import { createSeabedGeometry } from '../src/components/GalaxySocial/exploration/marineGeometry.js'

assert.equal(readFrontierGraphics({ getItem: () => 'low' }), 'low')
assert.equal(readFrontierGraphics({ getItem: () => '__proto__' }), 'balanced')
assert.equal(readFrontierGraphics({ getItem() { throw Error('blocked storage') } }), 'balanced')
assert.equal(FRONTIER_GRAPHICS.balanced.shadows, false)
assert.ok(FRONTIER_GRAPHICS.low.dpr < FRONTIER_GRAPHICS.balanced.dpr)
assert.equal(FRONTIER_GRAPHICS.balanced.groundTextureSize ** 2 / 512 ** 2, 1 / 16)
assert.equal(isMarineHabitatVisible({ x: 0, y: 30, z: 0 }, { x: 0, y: -3, z: 0 }, 24), false, 'flight must not render all schools directly below')
assert.equal(isMarineHabitatVisible({ x: 0, y: -5, z: 0 }, { x: 3, y: -3, z: 4 }, 24), true)
const start = performance.now()
const floor = createSeabedGeometry(20)
assert.ok(floor.index.count / 3 <= 100_000)
console.log(`Seabed: ${floor.index.count / 3} triangles (previous 225280), ${Math.round(performance.now() - start)} ms local generation; timing is not a hardware guarantee.`)
floor.dispose()

const require = createRequire(import.meta.url)
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.localStorage = dom.window.localStorage
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const localize = source => source.replace(/from ['"]react['"]/g, `from '${pathToFileURL(require.resolve('react')).href}'`)
  .replace(/['"]\.\.\/components\/GalaxySocial\/frontierPerformance['"]/g, JSON.stringify(new URL('../src/components/GalaxySocial/frontierPerformance.js', import.meta.url).href))
const load = source => import(`data:text/javascript;base64,${Buffer.from(localize(source)).toString('base64')}`)
const { useDeferredFrontierWorld } = await load(read('../src/hooks/useDeferredFrontierWorld.js'))
const { useFrontierGraphics } = await load(read('../src/hooks/useFrontierGraphics.js'))
let id = 0
const frames = new Map(), timers = new Map()
window.requestAnimationFrame = fn => { frames.set(++id, fn); return id }
window.cancelAnimationFrame = key => frames.delete(key)
window.setTimeout = fn => { timers.set(++id, fn); return id }
window.clearTimeout = key => timers.delete(key)
const flush = queue => act(async () => { const values = [...queue.values()]; queue.clear(); values.forEach(fn => fn()) })
let ready, graphicsA, graphicsB
function Harness({ canStart }) {
  ready = useDeferredFrontierWorld(canStart)
  graphicsA = useFrontierGraphics()
  graphicsB = useFrontierGraphics()
  return null
}
const root = createRoot(document.getElementById('root'))
const render = canStart => act(async () => root.render(React.createElement(React.StrictMode, null, React.createElement(Harness, { canStart }))))
await render(false)
assert.equal(ready, false); assert.equal(frames.size, 0)
await render(true)
assert.equal(ready, false); assert.equal(frames.size, 1, 'StrictMode must schedule just one world mount')
await render(false)
await flush(frames); await flush(timers)
assert.equal(ready, false, 'reopening a menu before mount cancels preparation')
await render(true); await flush(frames)
assert.equal(ready, false, 'paint opportunity precedes CPU-heavy construction')
await flush(timers)
assert.equal(ready, true)
await render(false)
assert.equal(ready, true, 'later menus must not dispose/recreate the existing world')
await act(async () => graphicsA.selectMode('low'))
assert.equal(graphicsB.mode, 'low', 'briefing and running world share changes')
assert.equal(localStorage.getItem(FRONTIER_GRAPHICS_KEY), 'low')
await act(async () => graphicsA.selectMode('invalid'))
assert.equal(graphicsB.mode, 'low')
await act(async () => root.unmount())

let visibility = 'visible'
Object.defineProperty(document, 'visibilityState', { get: () => visibility })
const modes = []
const { useFrontierRenderLoop } = await load(read('../src/hooks/useFrontierRenderLoop.js'))
function RenderBudget({ paused }) { modes.push(useFrontierRenderLoop(paused)); return null }
const budgetRoot = createRoot(document.getElementById('root'))
const renderBudget = paused => act(async () => budgetRoot.render(React.createElement(React.StrictMode, null, React.createElement(RenderBudget, { paused }))))
await renderBudget(true)
assert.equal(modes.at(-1), 'never')
await renderBudget(false)
assert.equal(modes.at(-1), 'always')
await act(async () => { visibility = 'hidden'; document.dispatchEvent(new window.Event('visibilitychange')) })
assert.equal(modes.at(-1), 'never')
await act(async () => { visibility = 'visible'; document.dispatchEvent(new window.Event('visibilitychange')) })
assert.equal(modes.at(-1), 'always')
await renderBudget(true)
await act(async () => { document.dispatchEvent(new window.Event('visibilitychange')) })
assert.equal(modes.at(-1), 'never', 'returning to a tab must not render through an open modal')
await act(async () => budgetRoot.unmount())
const before = modes.length
document.dispatchEvent(new window.Event('visibilitychange'))
assert.equal(modes.length, before, 'visibility listener cleaned up')

const marine = read('../src/components/GalaxySocial/exploration/FrontierMarineWorld.jsx')
assert.match(marine, /mesh\.count = counters\[index\]/, 'off-range instances excluded from actual draw count')
assert.doesNotMatch(marine, /setScalar\(visible \? f\.size : 0\)/)
const meta = read('../src/components/GalaxySocial/MetaGalaxy.jsx')
assert.match(read('../src/components/GalaxySocial/GalaxyWorld3D.jsx'), /frameloop=\{renderLoop\}/, 'Canvas prop must retain pause across HUD re-renders')
assert.match(meta, /const GalaxyWorld3D = lazy/)
assert.match(meta, /worldReady \? <Suspense/)
dom.window.close()
console.log('PASS graphics budgets/storage, real React deferred startup, pause/hidden/resume lifecycle, listener cleanup and visible-instance contract.')
