import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { applyMigrationTarget, parseMigrationOptions } from './migrate-learning-summary-v3.mjs'
import {
  LEARNING_SUMMARY_SCHEMA_VERSION,
  LEARNING_SUMMARY_FRESHNESS_TTL_MS,
  getLearningProgressCompletion,
  mergeSummaryWithRecentHistory,
  mergeUnitProgressCompletion,
  shouldCheckLearningSummaryFreshness,
} from '../src/utils/learningSummaryUtils.js'

const require = createRequire(import.meta.url)
const {
  historyActivityType,
  extractProgressCompletion,
  buildUnitLearningSummary,
  buildLearningSummaryFromScratch,
  migrateExistingSummaryToV3,
  auditSummaryAgainstProgress,
} = require('../functions/learningSummaryDomain.cjs')

// ─── 1. Basic Schema & Modality Merging ───
assert.equal(LEARNING_SUMMARY_SCHEMA_VERSION, 3)

const staleSummary = {
  units: [{
    unitId: 'old-unit',
    clusterId: 'middle-math',
    regionId: 'region-1',
    chapterId: 'chapter-1',
    lastActivityMs: Date.parse('2026-07-18T10:00:00Z'),
    modalities: { quiz: true, workbook: false, video: false, text: false, codeTrace: false, missionLab: false },
    bestQuizScore: 80,
  }],
}

const recentHistory = [
  {
    unitId: 'new-unit',
    clusterId: 'middle-math',
    regionId: 'region-1',
    chapterId: 'chapter-1',
    type: 'quiz',
    score: 100,
    timestamp: new Date('2026-07-19T02:29:13Z'),
  },
  {
    unitId: 'new-unit',
    clusterId: 'middle-math',
    regionId: 'region-1',
    chapterId: 'chapter-1',
    type: 'text',
    timestamp: new Date('2026-07-19T02:19:05Z'),
  },
  {
    unitId: 'new-unit',
    clusterId: 'middle-math',
    regionId: 'region-1',
    chapterId: 'chapter-1',
    type: 'video',
    timestamp: new Date('2026-07-19T02:17:24Z'),
  },
]

const merged = mergeSummaryWithRecentHistory(staleSummary, recentHistory)
assert.equal(merged.filter((row) => row.unitId === 'new-unit').length, 3)
assert.deepEqual(
  new Set(merged.filter((row) => row.unitId === 'new-unit').map((row) => row.type)),
  new Set(['quiz', 'text', 'video'])
)
assert.equal(merged.find((row) => row.unitId === 'new-unit' && row.type === 'quiz')?.score, 100)
assert.equal(merged.some((row) => row.unitId === 'old-unit' && row.type === 'quiz'), true)

// ─── 2. [P1 Check] LUMI Partial vs Complete Mission Isolation ───
// Individual LUMI / Python mission attempt must NOT mark unit missionLab complete
const individualLumi = {
  type: 'lumi_protocol',
  activityType: 'lumi_protocol_mission_complete',
  unitId: 'lumi_unit_1',
  missionId: 'm1',
  completed: true,
  // isUnitComplete is false or absent
}
assert.equal(historyActivityType(individualLumi), 'other', '개별 LUMI 미션 완료는 단원 missionLab 완료로 분류되면 안 됨')

const unitCompleteLumi = {
  type: 'lumi_protocol',
  activityType: 'lumi_protocol_mission_complete',
  unitId: 'lumi_unit_1',
  missionId: 'm_final',
  completed: true,
  isUnitComplete: true,
  completionModalities: { missionLab: true },
}
assert.equal(historyActivityType(unitCompleteLumi), 'missionLab', 'isUnitComplete/marker가 있을 때만 missionLab 완료')

// In mergeSummaryWithRecentHistory: individual mission must NOT expand to python_mission modality
const partialLumiHistory = mergeSummaryWithRecentHistory(null, [individualLumi])
assert.equal(partialLumiHistory.length, 0, '개별 LUMI 미션은 summary 단원 완료 모달리티 목록에 포함되지 않아야 함')

const completeLumiHistory = mergeSummaryWithRecentHistory(null, [unitCompleteLumi])
assert.equal(completeLumiHistory.length, 1)
assert.equal(completeLumiHistory[0].type, 'python_mission')
const summaryOnlyLumi = { schemaVersion: 3, units: [{
  unitId: 'lumi_unit_1', modalities: { missionLab: true }, lastActivityMs: 1000,
}] }
assert.equal(mergeSummaryWithRecentHistory(summaryOnlyLumi, [individualLumi]).length, 1,
  'stored Mission Lab completion must survive normalization without a recent completion event')
assert.equal(mergeSummaryWithRecentHistory(summaryOnlyLumi, [])[0].type, 'python_mission')

// ─── 3. [P1 Check] Migration Stats & Daily 100% Preservation ───
const existingUserSummary = {
  schemaVersion: 2,
  totalHistoryCount: 45,
  daily: [
    { date: '2026-08-01', quizzes: 5, scoreSum: 480, crystals: 50, perfCount: 4, videos: 2, texts: 1, workbooks: 0, codeTraces: 0 },
  ],
  stats: {
    quizAttempts: 120,
    quizScoreSum: 11400,
    perfectAttempts: 95,
    workbookAttempts: 10,
    workbookScoreSum: 950,
    workbookPerfectAttempts: 8,
    darkMatterRecovered: 5,
  },
  units: [
    {
      unitId: 'unit_math_1',
      clusterId: 'elem',
      modalities: { quiz: true, workbook: false, video: true, text: false, codeTrace: false },
      bestQuizScore: 95,
    },
  ],
}

const mockProgressForMigration = [
  { id: 'unit_math_1', logRead: true },
  { id: 'unit_math_2', missionLab: { isCompleted: true } },
]

const migrated = migrateExistingSummaryToV3(existingUserSummary, mockProgressForMigration)
assert.equal(migrated.schemaVersion, 3)
assert.deepEqual(migrated.stats, existingUserSummary.stats, '기존 stats는 100% 온전하게 보존되어야 함')
assert.deepEqual(migrated.daily, existingUserSummary.daily, '기존 daily는 100% 온전하게 보존되어야 함')
assert.equal(migrated.totalHistoryCount, 45, '기존 totalHistoryCount는 보존되어야 함')
assert.deepEqual(migrateExistingSummaryToV3(migrated, mockProgressForMigration), migrated,
  'repeated migration must be idempotent')
const fromScratch = buildLearningSummaryFromScratch([
  { unitId: 'quiz', type: 'quiz', score: 100, timestamp: new Date() },
])
assert.equal(fromScratch.stats.quizAttempts, 1)
assert.equal(fromScratch.stats.quizScoreSum, 100)
assert.equal(fromScratch.totalHistoryCount, 1)
assert.equal(parseMigrationOptions([]).apply, false)
for (const args of [['--uid'], ['--uid', '--apply'], ['--apply', '--audit'], ['--limit', '0'], ['--typo']]) {
  assert.throws(() => parseMigrationOptions(args), 'invalid scope/mode must fail before DB access')
}
assert.deepEqual(parseMigrationOptions(['--after', 'u1', '--limit', '50']), {
  apply: false, audit: false, uid: null, after: 'u1', limit: 50,
})
let migrationWrite
await applyMigrationTarget({ update: async (data, precondition) => { migrationWrite = { data, precondition } } },
  { exists: true, updateTime: 'version-1' }, migrated)
assert.deepEqual(Object.keys(migrationWrite.data).sort(), ['schemaVersion', 'units'])
assert.deepEqual(migrationWrite.precondition, { lastUpdateTime: 'version-1' })
await assert.rejects(applyMigrationTarget({ update: async () => { throw new Error('concurrent update') } },
  { exists: true, updateTime: 'version-1' }, migrated), /concurrent update/)

const u1 = migrated.units.find((u) => u.unitId === 'unit_math_1')
assert.equal(u1.modalities.quiz, true, '기존 quiz 완료 보존')
assert.equal(u1.modalities.video, true, '기존 video 완료 보존')
assert.equal(u1.modalities.text, true, 'progress logRead=true 로부터 text 완료 OR 병합')
assert.equal(u1.bestQuizScore, 95, '최고점 보존')

const u2 = migrated.units.find((u) => u.unitId === 'unit_math_2')
assert.equal(u2.modalities.missionLab, true, '신규 progress missionLab 완료 추가')

// ─── 4. [P1 Check] Concurrency Monotonicity & Best Score Retention ───
const existingUnitState = {
  unitId: 'unit_race',
  modalities: { quiz: true, workbook: false, video: true, text: false, codeTrace: false, missionLab: false },
  bestQuizScore: 90,
  bestWorkbookScore: null,
  lastActivityMs: 1000,
}

// Another concurrent event arrives with score 70 and text completion
const concurrentUpdated = buildUnitLearningSummary(
  'unit_race',
  [{ type: 'quiz', score: 70, timestamp: new Date(2000) }, { type: 'text', timestamp: new Date(2000) }],
  null,
  existingUnitState
)
assert.equal(concurrentUpdated.bestQuizScore, 90, '기존 최고점 90점이 낮은 점수 70점에 의해 덮어써지지 않아야 함')
assert.equal(concurrentUpdated.modalities.quiz, true)
assert.equal(concurrentUpdated.modalities.video, true, '기존 video 완료가 트랜잭션 중 유지되어야 함')
assert.equal(concurrentUpdated.modalities.text, true, '새 text 완료가 OR 병합되어야 함')

// ─── 5. [P2 Check] Mission Lab Progress Field Variants ───
const fieldVariants = [
  { completedCount: 3, totalCount: 3 },
  { completedMissionsCount: 4, totalMissions: 4 },
  { completedMissionCount: 5, totalMissionCount: 5 },
  { completed_count: 2, total_count: 2 },
  { isCompleted: true },
  { completed: true },
]
for (const variant of fieldVariants) {
  const comp = extractProgressCompletion({ missionLab: variant })
  assert.equal(comp.missionLab, true, `필드 변형 ${JSON.stringify(variant)} 은 missionLab=true 로 판정되어야 함`)
  assert.deepEqual(getLearningProgressCompletion({ missionLab: variant }), comp)
}
assert.equal(mergeUnitProgressCompletion({ u: { quiz: true } }, { u: { text: true } }).u.quiz, true)

// ─── 6. [P1 Check] Audit Functionality against DB Summary ───
const validSummary = {
  schemaVersion: 3,
  units: [
    { unitId: 'unit_a', modalities: { quiz: true, video: true, text: true, workbook: false, codeTrace: false, missionLab: false } },
  ],
}
const matchingProgress = [{ id: 'unit_a', logRead: true, videoProgress: { tx1: { completed: true } } }]
assert.deepEqual(auditSummaryAgainstProgress('test_user', validSummary, matchingProgress), [], '일치하는 경우 mismatch 0건')

const incompleteSummary = {
  schemaVersion: 3,
  units: [
    { unitId: 'unit_a', modalities: { quiz: true, video: false, text: false, workbook: false, codeTrace: false, missionLab: false } },
  ],
}
const auditIssues = auditSummaryAgainstProgress('test_user', incompleteSummary, matchingProgress)
assert.equal(auditIssues.length, 2, 'text와 video 누락 2건 감지되어야 함')

// ─── 7. Freshness TTL Check ───
const now = Date.now()
assert.equal(shouldCheckLearningSummaryFreshness({ summary: null }), true)
assert.equal(shouldCheckLearningSummaryFreshness({ summary: { schemaVersion: 2 }, lastCheckedMs: now }), true)
assert.equal(shouldCheckLearningSummaryFreshness({ summary: { schemaVersion: 3 }, lastCheckedMs: now - 5000 }), false)
assert.equal(shouldCheckLearningSummaryFreshness({ summary: { schemaVersion: 3 }, lastCheckedMs: now - LEARNING_SUMMARY_FRESHNESS_TTL_MS - 100 }), true)
for (const lastCheckedMs of [NaN, Infinity, 'invalid', now + 60000]) {
  assert.equal(shouldCheckLearningSummaryFreshness({ summary: { schemaVersion: 3 }, lastCheckedMs, nowMs: now }), true)
}

// ─── 8. Incremental cost/freshness contracts ───
const functionsSource = readFileSync(new URL('../functions/index.js', import.meta.url), 'utf8')
const incrementalSource = functionsSource.slice(
  functionsSource.indexOf('exports.syncLearningSummary'),
  functionsSource.indexOf('const LEADERBOARD_CACHE_TTL_MS')
)
assert.doesNotMatch(
  incrementalSource,
  /collection\("learning_progress"\)/,
  'normal history-triggered summary updates must not add a learning_progress read'
)
assert.doesNotMatch(
  incrementalSource,
  /summaryRef\.get\(\)/,
  'normal history-triggered summary updates must not read the summary before the transaction'
)
assert.match(
  incrementalSource,
  /!freshSnap\.exists \|\| freshSnap\.data\(\)\?\.schemaVersion !== LEARNING_SUMMARY_SCHEMA_VERSION/,
  'missing or outdated summaries discovered in the transaction must fall back to a full rebuild'
)
const freshnessSource = functionsSource.slice(
  functionsSource.indexOf('exports.getOrRebuildLearningSummary'),
  functionsSource.indexOf('exports.syncLearningSummary')
)
assert.match(freshnessSource, /orderBy\("timestamp", "desc"\)\.limit\(1\)/)
assert.match(freshnessSource, /latestHistoryMs > summaryUpdatedMs/)

console.log('✅ All learning summary v3 domain and integrity tests passed!')
