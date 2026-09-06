import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { normalizeRealtimePresence, getConnectedStudents, countStudentsByCrew, PRESENCE_TTL_MS, PRESENCE_HEARTBEAT_MS } from '../src/utils/realtimePresence.js'

const now = Date.now()
const old = now - 86400000
const connection = (state, updatedAtMs = now, extra = {}) => ({ state, updatedAtMs, crewId: 'crew-a', role: 'student', ...extra })
const normalize = (uid, connections, time = now) => normalizeRealtimePresence(uid, { connections }, time)
const foreground = normalize('one', { first: connection('online', now - 1000), second: connection('away') })
assert.equal(foreground.liveStatus.state, 'online')
assert.equal(normalize('one', { first: connection('online', old), second: connection('away') }).liveStatus.state, 'away', 'Stale foreground must not override a fresh background tab')
assert.equal(normalize('one', { first: connection('online', old) }).liveStatus.state, 'offline')
assert.equal(normalize('one', {}).liveStatus.state, 'offline')
assert.equal(normalize('one', { first: connection('online', now, { uid: 'incorrect' }) }).uid, 'one')
assert.equal(normalize('one', { first: connection('online', now, { updatedAt: old }) }).liveStatus.state, 'offline', 'Server timestamp takes precedence over client clock')
assert.equal(normalize('one', { first: connection('online', now + 120000) }).liveStatus.state, 'offline')
assert.equal(normalize('one', { first: connection('online') }, now + PRESENCE_TTL_MS).liveStatus.state, 'offline', 'Records expire without another server event')
assert.equal(normalize('one', { first: connection('online', now + PRESENCE_HEARTBEAT_MS) }, now + PRESENCE_TTL_MS).liveStatus.state, 'online', 'Heartbeat keeps a long study session visible')
const presence = {
  one: foreground,
  two: normalize('two', { first: connection('away') }),
  three: normalize('three', { first: connection('online', now, { crewId: '' }) }),
  admin: normalize('admin', { first: connection('online', now, { role: 'admin' }) }),
  parent: normalize('parent', { first: connection('online', now, { role: 'parent' }) }),
  stale: normalize('stale', { first: connection('online', old) }),
}
const students = getConnectedStudents(presence)
assert.deepEqual(students.map(student => student.uid), ['one', 'three'])
assert.deepEqual(countStudentsByCrew(students), { 'crew-a': 1 })

// Exercise the actual hook's async lifecycle with a delayed RTDB registration.
const source = readFileSync(new URL('../src/hooks/usePresence.js', import.meta.url), 'utf8')
  .replace(/import[\s\S]*?from ['"][^'"]+['"]\n/g, '')
  .replace('export function usePresence', 'function usePresence')
function harness() {
  const effects = [], writes = [], intervals = new Map()
  let connectedCallback, visibilityCallback, resolveRegistration
  const registration = new Promise(resolve => { resolveRegistration = resolve })
  const document = { hidden: false, addEventListener: (_, fn) => { visibilityCallback = fn }, removeEventListener() {} }
  const context = {
    useRef: current => ({ current }), useMemo: fn => fn(), useEffect: fn => effects.push(fn),
    realtimeDb: {}, PRESENCE_HEARTBEAT_MS, console, document,
    ref: (_, path) => path, push: path => path + '/tab', serverTimestamp: () => now,
    onValue: (_, fn) => { connectedCallback = fn; return () => {} },
    onDisconnect: () => ({ remove: () => registration, set: async () => {} }),
    set: async (path, value) => { writes.push({ path, value }) },
    update: async (path, value) => { writes.push({ path, value }) }, remove: async () => {},
    window: { setInterval: (fn, ms) => { intervals.set(ms, fn); return ms }, clearInterval: id => intervals.delete(id), setTimeout: fn => { fn(); return 1 }, clearTimeout() {} },
  }
  vm.runInNewContext(source + '\nusePresence("student", "cluster", "study");', context)
  const cleanup = effects.map(fn => fn()).filter(Boolean)
  return { writes, intervals, document, resolveRegistration, connect: value => connectedCallback({ val: () => value }), visibility: () => visibilityCallback(), cleanup: () => cleanup.forEach(fn => fn()) }
}
const stopped = harness()
const pending = stopped.connect(true)
stopped.cleanup()
stopped.resolveRegistration()
await pending
assert.equal(stopped.writes.filter(w => w.path.endsWith('/tab')).length, 0, 'Disposed setup must not resurrect a connection')
assert.equal(stopped.intervals.size, 0)
const live = harness()
const connecting = live.connect(true)
live.intervals.get(PRESENCE_HEARTBEAT_MS)()
assert.equal(live.writes.length, 0, 'Do not write before disconnect cleanup is armed')
live.resolveRegistration()
await connecting
assert.equal(live.writes.length, 1)
live.intervals.get(PRESENCE_HEARTBEAT_MS)()
assert.equal(live.writes.length, 2)
live.document.hidden = true
live.visibility()
assert.equal(live.writes.at(-1).value.state, 'away')
const count = live.writes.length
live.intervals.get(PRESENCE_HEARTBEAT_MS)()
assert.equal(live.writes.length, count, 'Hidden tabs do not heartbeat')
await live.connect(false)
live.document.hidden = false
live.visibility()
live.intervals.get(PRESENCE_HEARTBEAT_MS)()
assert.equal(live.writes.length, count, 'Disconnected clients do not queue presence writes')
live.cleanup()
console.log('Presence freshness, counts, heartbeat and async teardown checks passed')
