import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { positionPatch, needsPresenceHeartbeat } from '../src/utils/frontierNetworkPolicy.js'

const require = createRequire(import.meta.url)
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost', pretendToBeVisual: true })
globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.sessionStorage = dom.window.sessionStorage
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator })
globalThis.IS_REACT_ACT_ENVIRONMENT = true
let now = 1_800_000_000_000
const originalNow = Date.now
Date.now = () => now
let visible = 'visible'
Object.defineProperty(document, 'visibilityState', { get: () => visible })
const intervals = new Map()
let timerId = 0
window.setInterval = (fn, delay) => { intervals.set(++timerId, { fn, delay }); return timerId }
window.clearInterval = id => intervals.delete(id)
const calls = []
globalThis.__frontierTestCall = async (name, payload) => {
  calls.push({ name, payload })
  // Bound a regression instead of allowing the old response/effect loop to run forever.
  if (calls.length > 12) throw Object.assign(new Error('call storm'), { code: 'failed-precondition' })
  return { serverNowMs: now + 20, leaseExpiresAtMs: now + 90_000, hardEndsAtMs: now + 900_000 }
}
let source = readFileSync(new URL('../src/hooks/useGalaxyPlaySession.js', import.meta.url), 'utf8')
source = source.replace("from 'react'", `from '${pathToFileURL(require.resolve('react')).href}'`)
  .replace("import { httpsCallable } from 'firebase/functions'", '')
  .replace("import { functions } from '../firebase'", '')
  .replace("'../utils/frontierNetworkPolicy.js'", JSON.stringify(new URL('../src/utils/frontierNetworkPolicy.js', import.meta.url).href))
  .replace(/const callPlay = .*\n/, 'const callPlay = (...args) => globalThis.__frontierTestCall(...args)\n')
const { useGalaxyPlaySession } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const seed = uid => sessionStorage.setItem(`metasense_galaxy_play_${uid}_session`, JSON.stringify({ sessionId: `session-${uid}`, resumeToken: 'synthetic', clientInstanceId: 'client', sequenceNumber: 0, startedAtMs: now, hardEndsAtMs: now + 900_000 }))
let hook
function Harness(props) { hook = useGalaxyPlaySession(props); return null }
const root = createRoot(document.getElementById('root'))
const render = props => act(async () => { root.render(React.createElement(React.StrictMode, null, React.createElement(Harness, props))) })
const checkpointTick = () => act(async () => { for (const timer of [...intervals.values()]) if (timer.delay === 30_000) timer.fn() })
try {
  seed('pilot')
  await render({ uid: 'pilot', active: true })
  assert.equal(calls.length, 1, 'mount/StrictMode and response re-renders must not create a callable loop')
  assert.equal([...intervals.values()].filter(t => t.delay === 30_000).length, 1)
  await render({ uid: 'pilot', active: true })
  assert.equal(calls.length, 1, 'unrelated renders do not issue checkpoints')
  await act(async () => { for (let i = 0; i < 20; i++) window.dispatchEvent(new window.Event('online')) })
  assert.equal(calls.length, 1, 'focus/online burst coalesced')
  now += 30_000
  await checkpointTick()
  assert.equal(calls.length, 2, 'normal 30-second lease renewal remains')
  assert.equal(calls[1].payload.sequenceNumber, 2)
  visible = 'hidden'; now += 30_000
  await checkpointTick()
  assert.equal(calls.length, 2, 'hidden tab does not call the server')
  visible = 'visible'
  await act(async () => { document.dispatchEvent(new window.Event('visibilitychange')) })
  assert.equal(calls.length, 3, 'returning tab renews promptly')
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
  now += 30_000
  await checkpointTick()
  assert.equal(calls.length, 3, 'offline checkpoint skipped')
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
  let resolvePending
  globalThis.__frontierTestCall = (name, payload) => {
    calls.push({ name, payload })
    return new Promise(resolve => { resolvePending = resolve })
  }
  await checkpointTick()
  await act(async () => { for (let i = 0; i < 20; i++) window.dispatchEvent(new window.Event('online')) })
  assert.equal(calls.length, 4, 'one in-flight request even under repeated events')
  await render({ uid: 'pilot', active: false })
  assert.equal([...intervals.values()].filter(t => t.delay === 30_000).length, 0)
  await render({ uid: 'guest', active: true, isGuest: true })
  await act(async () => { await hook.startSession(); await hook.checkpoint() })
  await act(async () => { await hook.endSession() })
  assert.equal(calls.length, 4, 'guest exploration and exit make no paid callable')
  await act(async () => { resolvePending({ serverNowMs: now, leaseExpiresAtMs: now + 90_000 }) })
  assert.equal(hook.session, null, 'late response cannot restore another user session')
  assert.equal(hook.session, null)

  // Run the real presence hook with an in-memory RTDB transport. No credentials,
  // network, or production data are involved.
  const writes = [], listeners = new Set()
  let rejectNextWrite = false, rejectWrite
  const subscribe = () => { const key = {}; listeners.add(key); return () => listeners.delete(key) }
  globalThis.__frontierRealtime = {
    ref: (_db, path) => ({ path, key: path.split('/').at(-1) }),
    push: parent => ({ path: `${parent.path}/test`, key: 'test' }),
    serverTimestamp: () => ({ '.sv': 'timestamp' }),
    set: async (_ref, data) => { writes.push({ type: 'set', data }) },
    update: (_ref, data) => {
      writes.push({ type: 'update', data })
      if (rejectNextWrite) {
        rejectNextWrite = false
        return new Promise((_resolve, reject) => { rejectWrite = reject })
      }
      return Promise.resolve()
    },
    remove: async () => {},
    onDisconnect: () => ({ remove: async () => {}, cancel: async () => {} }),
    onValue: (reference, callback) => {
      callback({ val: () => reference.path === '.info/connected' ? true : 0 })
      return subscribe()
    },
    onChildAdded: subscribe, onChildChanged: subscribe, onChildRemoved: subscribe,
  }
  let presenceSource = readFileSync(new URL('../src/hooks/useGalaxyWorldPresence.js', import.meta.url), 'utf8')
  presenceSource = presenceSource
    .replace("from 'react'", `from '${pathToFileURL(require.resolve('react')).href}'`)
    .replace(/import \{\n([\s\S]*?)\n\} from 'firebase\/database'/, 'const {$1} = globalThis.__frontierRealtime')
    .replace("import { realtimeDb } from '../firebase'", 'const realtimeDb = {}')
    .replace(/from '(\.\.[^']+)'/g, (_match, path) => `from '${new URL(path, new URL('../src/hooks/useGalaxyWorldPresence.js', import.meta.url)).href}'`)
  const { useGalaxyWorldPresence } = await import(`data:text/javascript;base64,${Buffer.from(presenceSource).toString('base64')}`)
  let presence
  function PresenceHarness({ enabled }) {
    presence = useGalaxyWorldPresence({ enabled, uid: 'pilot', roomOwnerUid: 'island' })
    return null
  }
  await act(async () => root.render(React.createElement(PresenceHarness, { enabled: true })))
  assert.equal(presence.isConnected, true)
  const pose = { x: 1, y: -20, z: 2, yaw: 0, scale: .25, equipment: 'diving', movementMode: 'diving' }
  now += 200
  await act(async () => presence.updatePosition(pose))
  now += 120
  await act(async () => presence.updatePosition({ ...pose, x: 1.1 }))
  assert.deepEqual(Object.keys(writes.at(-1).data).sort(), ['updatedAtMs', 'x'])
  const count = writes.length
  await act(async () => { for (const t of intervals.values()) if (t.delay === 5000) t.fn() })
  assert.equal(writes.length, count, 'moving player needs no redundant heartbeat')
  now += 5000
  await act(async () => { for (const t of intervals.values()) if (t.delay === 5000) t.fn() })
  assert.deepEqual(Object.keys(writes.at(-1).data), ['updatedAtMs'], 'stationary player stays discoverable')
  rejectNextWrite = true; now += 120
  await act(async () => { presence.updatePosition({ ...pose, x: 1.2 }) })
  now += 120
  await act(async () => presence.updatePosition({ ...pose, x: 1.2, y: -21 }))
  const warn = console.warn
  console.warn = () => {}
  try { await act(async () => { rejectWrite(new Error('synthetic rejected delta')) }) }
  finally { console.warn = warn }
  now += 120
  await act(async () => presence.updatePosition({ ...pose, x: 1.2, y: -21 }))
  assert.ok(['x', 'y', 'z', 'equipment', 'movementMode', 'scale', 'yaw'].every(key => key in writes.at(-1).data), 'rejected earlier delta forces a complete repair snapshot')
  await act(async () => root.render(React.createElement(PresenceHarness, { enabled: false })))
  assert.equal(listeners.size, 0, 'disabled presence releases all subscriptions including server clock')
} finally {
  await act(async () => root.unmount())
  assert.equal(intervals.size, 0)
  Date.now = originalNow
  dom.window.close()
  delete globalThis.__frontierTestCall
  delete globalThis.__frontierRealtime
}

const previous = { x: 1, y: -20, z: 2, yaw: 0, scale: .25, equipment: 'diving', movementMode: 'diving' }
const next = { ...previous, x: 1.1 }
assert.deepEqual(positionPatch(previous, next), { x: 1.1 })
assert.deepEqual(positionPatch(previous, previous), {})
assert.deepEqual(positionPatch(null, next), next)
assert.deepEqual({ ...previous, ...positionPatch(previous, next) }, next)
assert.deepEqual(positionPatch(previous, { ...previous, y: -21, equipment: 'hoverpack' }), { y: -21, equipment: 'hoverpack' })
assert.equal(needsPresenceHeartbeat(10_000, 9_900), false)
assert.equal(needsPresenceHeartbeat(10_000, 5_000), true)
const oldBytes = Buffer.byteLength(JSON.stringify({ ...next, updatedAtMs: 1800000000000 }))
const newBytes = Buffer.byteLength(JSON.stringify({ ...positionPatch(previous, next), updatedAtMs: 1800000000000 }))
assert.ok(newBytes < oldBytes / 2)
const hosting = JSON.parse(readFileSync(new URL('../firebase.json', import.meta.url), 'utf8')).hosting
assert.ok(hosting.headers.find(h => h.source === '/assets/**').headers.some(h => h.value.includes('immutable')))
assert.ok(hosting.headers.find(h => h.source === '/index.html').headers.some(h => h.value.includes('no-cache')))
console.log(`Frontier cost: real React scheduling, guest/hidden/focus guards, delta payload, heartbeat and cache passed. Example payload ${oldBytes} -> ${newBytes} bytes (protocol overhead excluded).`)
