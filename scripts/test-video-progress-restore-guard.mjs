import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mergeCumulativeVideoProgress } from '../src/utils/videoPlaybackUtils.js'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

// ─── Pure logic: mergeCumulativeVideoProgress ───

// 1) A session that (wrongly) restored from zero must not lower the server total.
const healed = mergeCumulativeVideoProgress(
  { totalTimeSpent: 1613, stampedSeconds: [0, 1, 2, 900, 1839] },
  { totalTimeSpent: 918, stampedSeconds: [1840, 1841], duration: 2708, contentStart: 0, contentEnd: 2707 }
)
assert.equal(healed.totalTimeSpent, 1613, 'server total must win over a smaller session total')
assert.deepEqual(healed.stampedSeconds, [0, 1, 2, 900, 1839, 1840, 1841], 'stamps must union')

// 2) A healthy session keeps growing.
assert.equal(
  mergeCumulativeVideoProgress(
    { totalTimeSpent: 100 },
    { totalTimeSpent: 250 }
  ).totalTimeSpent,
  250
)

// 3) Missing/garbage server values behave like zero, not NaN.
assert.equal(
  mergeCumulativeVideoProgress({}, { totalTimeSpent: 42 }).totalTimeSpent,
  42
)
assert.equal(
  mergeCumulativeVideoProgress({ totalTimeSpent: 'abc' }, { totalTimeSpent: 7 }).totalTimeSpent,
  7
)

// 4) Stamps are sanitized to the playback range after the union.
const rangeClamped = mergeCumulativeVideoProgress(
  { stampedSeconds: [5, 10] },
  { stampedSeconds: [3, 2707], duration: 100, contentStart: 0, contentEnd: 100 }
)
assert.deepEqual(rangeClamped.stampedSeconds, [3, 5, 10], 'out-of-range stamps dropped, union kept sorted')

// 5) todayTimeSpent is deliberately NOT part of the merge (daily reset is legitimate).
assert.ok(!('todayTimeSpent' in mergeCumulativeVideoProgress({}, {})))

// ─── Contract: MissionHub restore gating ───
const missionHub = read('src/components/Space/MissionHub.jsx')

// The listener must keep loadingProgress=true while auth is unresolved, and must
// retry transient failures before unblocking restore without data.
assert.doesNotMatch(
  missionHub,
  /if \(!userId \|\| !unitId\) \{\s*setLoadingProgress\(false\)/,
  'listener must not mark progress as loaded when userId/unitId is missing'
)
assert.match(
  missionHub,
  /if \(!userId \|\| !unitId\) \{\s*\/\/ Keep "loading"[\s\S]*?setLoadingProgress\(true\)/,
  'listener must hold the loading gate while userId/unitId is unresolved'
)
assert.match(
  missionHub,
  /LEARNING_PROGRESS_LISTEN_MAX_ATTEMPTS/,
  'listener must cap retry attempts'
)
assert.match(
  missionHub,
  /setTimeout\(subscribe, LEARNING_PROGRESS_RETRY_BASE_MS \* attempts\)/,
  'listener must re-subscribe with backoff on failure'
)

// Restore must only read totalTimeSpent as max(server, offline cache).
assert.match(
  missionHub,
  /totalTimeSpentRef\.current = Math\.max\(\s*Number\(serverData\?\.totalTimeSpent\) \|\| 0,\s*Number\(localData\.totalTimeSpent\) \|\| 0,\s*\)/,
  'Part 1 restore must never fall back to zero when the offline cache has a total'
)

// ─── Contract: cache poisoning guard ───
// The interval writes the offline cache only after confirming stamps exist, and
// passes the cumulative total so the cache can restore credited time.
assert.match(
  missionHub,
  /const rawStamps = Array\.from\(stampedSetRef\.current\)\s*\n\s*if \(rawStamps\.length === 0\) return\s*\n\s*const cached = writeVideoProgressCache\(\{[\s\S]{0,400}?totalTimeSpent: totalTimeSpentRef\.current,/,
  'auto-save interval must gate the cache write behind non-empty stamps and store the total'
)
assert.match(
  missionHub,
  /const handleUnloadSave = \(\) => \{\s*if \(!idTokenRef\.current \|\| !videoWriterEnabledRef\.current\) return\s*const rawStamps = Array\.from\(stampedSetRef\.current\)\s*\n\s*if \(rawStamps\.length === 0\) return/,
  'unload save must bail before touching the cache when no stamps exist'
)
assert.match(
  missionHub,
  /localStorage\.setItem\(cacheKey \+ '_total', String\(Math\.max\(0, Number\(totalTimeSpent\) \|\| 0\)\)\)/,
  'cache must persist the cumulative total'
)
assert.match(
  missionHub,
  /const totalTimeSpent = Number\.parseFloat\(localStorage\.getItem\(cacheKey \+ '_total'\) \|\| ''\) \|\| 0/,
  'cache read must surface the persisted cumulative total'
)
assert.match(
  missionHub,
  /const VIDEO_CACHE_WRITE_INTERVAL_MS = 5 \* 1000/,
  'local cache writes must be throttled to the five-second recovery cadence'
)
assert.match(
  missionHub,
  /nowMs - lastVideoCacheWriteAtRef\.current\) >= VIDEO_CACHE_WRITE_INTERVAL_MS/,
  'time updates must not serialize the full cache on every player tick'
)
assert.match(
  missionHub,
  /const queued = navigator\.sendBeacon[\s\S]{0,160}?if \(queued\) hasSentBeaconRef\.current = true/,
  'a rejected beacon enqueue must remain retryable'
)

// ─── Contract: every MissionHub write path clamps cumulative fields ───
const writePaths = [
  /autoSaveIntervalRef\.current = setInterval[\s\S]{0,2000}?mergeCumulativeVideoProgress\(/,
  /const handleUnloadSave = \(\) => \{[\s\S]{0,2000}?mergeCumulativeVideoProgress\(/,
  /const restartVideoFromBeginning = useCallback\([\s\S]{0,3000}?mergeCumulativeVideoProgress\(/,
  /const handleSaveVideoPosition = async[\s\S]{0,3000}?mergeCumulativeVideoProgress\(/,
]
for (const pattern of writePaths) {
  assert.match(missionHub, pattern, 'a MissionHub save path is missing the cumulative merge clamp')
}

// Local learningProgress updates must flow through applyLearningProgress so the
// clamp ref never goes stale between snapshots.
assert.match(missionHub, /const applyLearningProgress = useCallback\(/)
assert.doesNotMatch(missionHub, /[^a-zA-Z]setLearningProgress\(/, 'direct setLearningProgress calls must use applyLearningProgress')

// ─── Contract: SpaceHome reward transaction clamps ───
const spaceHome = read('src/components/Space/SpaceHome.jsx')
assert.match(
  spaceHome,
  /\[\`\$\{baseKey\}\.totalTimeSpent\`\]: Math\.max\(\s*Number\(existingVideoProg\.totalTimeSpent\) \|\| 0,/,
  'interval-reward write must clamp totalTimeSpent against the server record'
)
assert.match(
  spaceHome,
  /new Set\(\[\.\.\.existingStamps, \.\.\.stampedSeconds\]\)/,
  'interval-reward write must union stamps with the server record'
)

// ─── Contract: syncVideoProgress cloud function clamps ───
const functions = read('functions/index.js')
const syncFn = functions.slice(
  functions.indexOf('exports.syncVideoProgress'),
  functions.indexOf('exports.syncVideoProgress') + 8000
)
assert.match(syncFn, /transaction\.get\(progressRef\)/, 'beacon handler must read the stored record')
assert.match(
  syncFn,
  /Math\.max\(\s*Number\(existingTx\.totalTimeSpent\) \|\| 0,/,
  'beacon handler must clamp totalTimeSpent against the stored record'
)
assert.match(
  syncFn,
  /new Set\(\[\.\.\.existingStamps, \.\.\.incomingStamps\]\)/,
  'beacon handler must union stamps with the stored record'
)
assert.doesNotMatch(
  syncFn,
  /todayTimeSpent[\s\S]{0,200}Math\.max/,
  'todayTimeSpent must stay outside the cumulative clamp (daily reset is legitimate)'
)

console.log('Video progress restore/cumulative guard tests passed.')
