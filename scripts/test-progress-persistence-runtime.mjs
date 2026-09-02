import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { mergeCumulativeVideoProgress, getVideoPlaybackRange } from '../src/utils/videoPlaybackUtils.js'

// Execute the production effect/HTTP handler with in-memory I/O. No Firebase
// credentials, production requests, timers or browser session are used.
const hub = readFileSync(new URL('../src/components/Space/MissionHub.jsx', import.meta.url), 'utf8')
const effectSource = hub.slice(hub.indexOf('  // ─── Video Progress: Part 2'), hub.indexOf('  // ─── Silent Toast helper'))
const ref = (current) => ({ current })
const events = new Map()
const writes = []
let cleanup
let beaconAttempts = 0
const context = {
  userId: 'student', unitId: 'unit', selectedTx: { id: 'tx', start: 0, end: 100, videoId: 'abcdefghijk' },
  loadingProgress: false, activeUnit: { title: 'Video' }, db: {},
  videoWriterEnabledRef: ref(true), videoDirtySeqRef: ref(1), lastFlushedSeqRef: ref(0),
  inFlightFlushRef: ref(false), requestVideoFlushRef: ref(null), videoFlushSessionKeyRef: ref('unit:tx'),
  videoDurationRef: ref(100), stampedSetRef: ref(new Set([0, 1])), lastVideoTimeRef: ref(2),
  totalTimeSpentRef: ref(2), dailyTimeSpentRef: ref(2), dailyTimeSpentDateRef: ref('2026-09-02'),
  learningProgressRef: ref({}), autoSaveIntervalRef: ref(null), hasSentBeaconRef: ref(false),
  idTokenRef: ref('test-token'), videoCompletedRef: ref(false), videoCompletionBonusGivenRef: ref(false),
  getTrackingDiagnostics: () => ({}), getYouTubeVideoId: (v) => v, getFunctionUrl: () => 'mock',
  getVideoPlaybackRange, mergeCumulativeVideoProgress,
  writeVideoProgressCache: (data) => ({ position: data.position, stamps: data.stampedSeconds }),
  setStampCount: () => {}, setSaveStatus: () => {}, serverTimestamp: () => 'timestamp',
  doc: () => 'progress', setInterval: () => 1, clearInterval: () => {}, setTimeout: () => 1,
  useEffect: (fn) => { cleanup = fn() },
  window: { addEventListener: (event, fn) => events.set(event, fn), removeEventListener: () => {} },
  document: { visibilityState: 'visible', addEventListener: (event, fn) => events.set(event, fn), removeEventListener: () => {} },
  navigator: { sendBeacon: () => ++beaconAttempts > 1 },
  console,
}
context.applyLearningProgress = (update) => { context.learningProgressRef.current = update(context.learningProgressRef.current) }
context.setDoc = (_ref, data) => new Promise((resolve) => writes.push({ data, resolve }))
vm.runInNewContext(effectSource, context)
const flush = context.requestVideoFlushRef.current
const first = flush()
assert.equal(writes.length, 1)
assert.equal(writes[0].data.videoProgress.tx.totalTimeSpent, 2, 'setDoc must receive a nested map, not literal dotted keys')
context.videoDirtySeqRef.current = 2
context.stampedSetRef.current.add(2)
await flush() // hidden/pause while the first write is pending
assert.equal(writes.length, 1, 'overlapping triggers must not write concurrently')
writes[0].resolve()
await first
assert.equal(writes.length, 2, 'a newer explicitly requested flush must be drained after the first write')
assert.equal(context.lastFlushedSeqRef.current, 1, 'only the captured sequence is clean')
writes[1].resolve()
await Promise.resolve()
await Promise.resolve()
assert.equal(context.lastFlushedSeqRef.current, 2)
await flush()
assert.equal(writes.length, 2, 'a paused/unchanged session must not write')

// The progress may already be saved while the completion history is not.
context.videoCompletedRef.current = true
events.get('beforeunload')()
assert.equal(beaconAttempts, 1, 'an unsynced completion must not be hidden by a clean progress sequence')
assert.equal(context.hasSentBeaconRef.current, false, 'rejected beacon remains retryable')
events.get('beforeunload')()
events.get('popstate')()
assert.equal(beaconAttempts, 2, 'successful enqueue deduplicates the same departure')
context.videoDirtySeqRef.current = 3
const stale = flush()
cleanup()
context.videoDirtySeqRef.current = 0
context.lastFlushedSeqRef.current = 0
writes[2].resolve()
await stale
assert.equal(context.lastFlushedSeqRef.current, 0, 'old effects must not acknowledge a new video session')

const source = readFileSync(new URL('../functions/index.js', import.meta.url), 'utf8')
const endpoint = source.slice(source.indexOf('exports.syncVideoProgress ='), source.indexOf('/**\n * adminResetUserPassword'))
const stored = new Map()
let historyWrites = 0
let reads = 0
const merge = (target, patch) => {
  for (const [key, value] of Object.entries(patch)) {
    if (value && Object.prototype.toString.call(value) === '[object Object]') {
      target[key] = merge(target[key] || {}, value)
    } else target[key] = value
  }
  return target
}
const makeRef = (path) => ({ path, collection: (id) => makeRef(`${path}/${id}`), doc: (id) => makeRef(`${path}/${id}`) })
const db = {
  collection: (id) => makeRef(id),
  runTransaction: async (fn) => fn({
    get: async (r) => { reads++; return { exists: stored.has(r.path), get: (key) => stored.get(r.path)?.[key] } },
    set: (r, patch) => {
      if (r.path.includes('/history/')) historyWrites++
      stored.set(r.path, merge(stored.get(r.path) || {}, patch))
    },
  }),
}
const exports = {}
vm.runInNewContext(endpoint, {
  exports, regionalFunctions: { https: { onRequest: (fn) => fn } },
  cors: (_req, _res, fn) => fn(), console,
  admin: { auth: () => ({ verifyIdToken: async () => ({ uid: 'student' }) }), firestore: () => db },
  FieldValue: { serverTimestamp: () => 'timestamp' }, getKSTDateString: () => '2026-09-02',
})
const progressPath = 'users/student/learning_progress/unit'
const historyPath = 'users/student/history/video_daily_2026-09-02_unit_tx'
stored.set(progressPath, { unrelated: true, videoProgress: { other: { completed: true }, tx: { totalTimeSpent: 20, stampedSeconds: [0] } } })
stored.set(historyPath, { crystalsEarned: 10 })
const send = async (progressData, userId = 'student') => {
  const res = { status: (code) => { res.code = code; return res }, send: () => res }
  await exports.syncVideoProgress({ method: 'POST', body: { idToken: 'mock', userId, unitId: 'unit', txId: 'tx', progressData } }, res)
  return res.code
}
assert.equal(await send({ completed: true, totalTimeSpent: 10, stampedSeconds: [1] }), 200)
assert.equal(stored.get(progressPath).videoProgress.tx.completionHistorySynced, true)
assert.equal(stored.get(progressPath).videoProgress.tx.totalTimeSpent, 20)
assert.equal(stored.get(progressPath).videoProgress.other.completed, true)
assert.equal(stored.get(historyPath).crystalsEarned, 10, 'beacon must not erase earlier rewards')
assert.equal(await send({ completed: false, completionHistorySynced: false, arbitrary: true, stampedSeconds: [2] }), 200)
assert.equal(historyWrites, 1, 'multiple beacons write completion history exactly once')
assert.equal(reads, 2, 'each beacon keeps its existing single progress read')
assert.equal(stored.get(progressPath).videoProgress.tx.completed, true, 'stale client must not revoke completion')
assert.equal(stored.get(progressPath).videoProgress.tx.arbitrary, undefined)
assert.equal(await send({ completed: true }, 'another-user'), 403)
assert.equal(reads, 2, 'unauthorized requests do not reach Firestore')
console.log('Progress persistence runtime tests passed (production effect and endpoint; in-memory I/O).')
