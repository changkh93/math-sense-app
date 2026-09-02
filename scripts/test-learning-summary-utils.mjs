import assert from 'node:assert/strict'
import {
  getLearningProgressCompletion,
  mergeSummaryWithRecentHistory,
  mergeUnitProgressCompletion,
} from '../src/utils/learningSummaryUtils.js'

const staleSummary = {
  units: [{
    unitId: 'old-unit',
    clusterId: 'middle-math',
    regionId: 'region-1',
    chapterId: 'chapter-1',
    lastActivityMs: Date.parse('2026-07-18T10:00:00Z'),
    modalities: { quiz: true, workbook: false, video: false, text: false, codeTrace: false },
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

const deduped = mergeSummaryWithRecentHistory(staleSummary, [{
  unitId: 'old-unit',
  type: 'quiz',
  score: 100,
  timestamp: new Date('2026-07-19T03:00:00Z'),
}])
assert.equal(deduped.filter((row) => row.unitId === 'old-unit' && row.type === 'quiz').length, 1)
assert.equal(deduped[0].score, 100)

const ignored = mergeSummaryWithRecentHistory(null, [{
  unitId: 'new-unit',
  type: 'attention',
  timestamp: new Date(),
}])
assert.deepEqual(ignored, [])

// ============================================================================
// 단원 완료 체크 OR-보정 검증
// SpaceHome에서 실제 사용하는 순수 함수로 완료 보정을 검증한다.
//
// 시나리오: 학생이 영상을 끝까지 시청해 learning_progress.videoProgress.{txId}.completed === true 지만,
// completion_bonus 타이머를 놓쳐 history 의 video_daily_... 문서가 type:'attention' 으로 덮어쓰여
// effectiveHistory 에 type:'video' 행이 없는 상황. learning_progress 기반 보정이 video 완료를 복원해야 한다.
// ============================================================================

function buildUnitProgressMap(effectiveHistory, learningProgressByUnit = {}) {
  const progressMap = {}
  for (const h of effectiveHistory) {
    const uid = h.unitId
    if (!uid) continue
    let hType = 'unknown'
    if (!h.type || h.type === 'quiz') hType = 'quiz'
    else if (h.type === 'workbook') hType = 'workbook'
    else if (h.type === 'video') hType = 'video'
    else if (h.type === 'text') hType = 'text'
    else if (h.type === 'code_trace') hType = 'codeTrace'
    if (!progressMap[uid]) {
      progressMap[uid] = { quiz: false, video: false, text: false, workbook: false, codeTrace: false, missionLab: false }
    }
    progressMap[uid][hType] = true
  }
  const completionMap = Object.fromEntries(Object.entries(learningProgressByUnit).map(
    ([unitId, progress]) => [unitId, getLearningProgressCompletion(progress)]
  ))
  return mergeUnitProgressCompletion(progressMap, completionMap)
}

// 케이스 1: history에 type:'attention'만 있고 type:'video'가 없는 경우 (심규민 학생 상황 재현)
const shimHistory = [
  { unitId: 'fractions_chap1_unit2', type: 'quiz', score: 100 },       // 퀴즈 완료
  { unitId: 'fractions_chap1_unit2', type: 'text' },                    // 데이터 로그 완료
  { unitId: 'fractions_chap1_unit2', type: 'attention', attentionSource: 'completion_bonus', attentionResult: 'miss' }, // 영상은 봤지만 type:'attention'으로 덮어쓰임
]
const shimProgressMap = buildUnitProgressMap(shimHistory, {
  fractions_chap1_unit2: { videoProgress: { tx1: { completed: true } } },
})
assert.equal(shimProgressMap.fractions_chap1_unit2.video, true, 'learning_progress.completed 보정이 video=true 를 복원해야 함')
assert.equal(shimProgressMap.fractions_chap1_unit2.quiz, true)
assert.equal(shimProgressMap.fractions_chap1_unit2.text, true)

// 케이스 2: history와 progress 모두 비어있어도, progress.completed만 있으면 video 완료 인정
const progressOnly = buildUnitProgressMap([], { some_unit: { videoProgress: { tx1: { completed: true } } } })
assert.equal(progressOnly.some_unit.video, true, 'history가 비어있어도 progress.completed면 video 완료')

// 케이스 3: 보정 없을 때(기존 동작)는 type:'video' 문서가 없으면 video=false (회귀 방지용 문서화)
const noCorrection = buildUnitProgressMap(shimHistory, {})
assert.equal(noCorrection.fractions_chap1_unit2.video, false, '보정이 없으면 attention만으로는 video 미완료 (기존 버그 동작)')

// 케이스 4: isOverallCompleted 판단 — hasAnyContent && (!hasQuiz||quiz) && (!hasVideo||video) && (!hasText||text)
function isOverallCompleted(uProg, availability) {
  const { hasQuiz, hasVideo, hasText, hasWorkbook } = availability
  const hasAnyContent = hasQuiz || hasVideo || hasText || hasWorkbook
  return hasAnyContent && (!hasQuiz || uProg.quiz) && (!hasVideo || uProg.video) &&
    (!hasText || uProg.text) && (!hasWorkbook || uProg.workbook)
}
// 보정 후에는 전체 단원 완료
assert.equal(
  isOverallCompleted(shimProgressMap.fractions_chap1_unit2, { hasQuiz: true, hasVideo: true, hasText: true }),
  true,
  '세 모달리티 모두 완료 → isOverallCompleted = true'
)
// 보정 전에는 미완료
assert.equal(
  isOverallCompleted(noCorrection.fractions_chap1_unit2, { hasQuiz: true, hasVideo: true, hasText: true }),
  false,
  'video 미완료 → isOverallCompleted = false (버그 상태)'
)

// 과거 데이터 로그 history 누락: summary.text=false여도 logRead=true라면 완료.
const missingLogSummary = {
  units: ['fractions_chap1_unit1', 'fractions_chap1_unit2'].map((unitId) => ({
    unitId,
    modalities: { quiz: true, workbook: true, video: true, text: false },
    bestQuizScore: 100,
    bestWorkbookScore: 100,
  })),
}
const logHistory = mergeSummaryWithRecentHistory(missingLogSummary, [])
const originalHistory = structuredClone(logHistory)
const logProgress = Object.fromEntries(missingLogSummary.units.map(({ unitId }) => [unitId, { logRead: true }]))
const beforeLogFallback = buildUnitProgressMap(logHistory)
const afterLogFallback = buildUnitProgressMap(logHistory, logProgress)
const allContent = { hasQuiz: true, hasVideo: true, hasText: true, hasWorkbook: true }
for (const { unitId } of missingLogSummary.units) {
  assert.equal(isOverallCompleted(beforeLogFallback[unitId], allContent), false)
  assert.equal(afterLogFallback[unitId].text, true)
  assert.equal(isOverallCompleted(afterLogFallback[unitId], allContent), true)
}
assert.deepEqual(logHistory, originalHistory, '표시 보정은 원본 history/점수를 변경하지 않는다')
assert.equal(missingLogSummary.units[0].modalities.text, false, '원본 summary를 변경하지 않는다')

// 이력 없이 진도만 있어도 데이터 로그 완료를 인정하되 다른 콘텐츠 완료는 만들지 않는다.
const logOnly = buildUnitProgressMap([], { 'log-only': { logRead: true } })
assert.deepEqual(logOnly['log-only'], {
  quiz: false, video: false, text: true, workbook: false, codeTrace: false, missionLab: false,
})
assert.equal(isOverallCompleted(logOnly['log-only'], allContent), false, '다른 필수 콘텐츠까지 완료 처리하면 안 된다')
assert.equal(isOverallCompleted(logOnly['log-only'], { hasText: true }), true)

// 날짜만 있거나 잘못된 truthy 값이면 미완료. history의 완료를 false로 되돌리지 않는다.
for (const logRead of [undefined, null, false, 0, 1, 'true', 'false']) {
  const flags = getLearningProgressCompletion({ logRead, logReadAt: new Date() })
  assert.equal(flags.text, false)
  assert.deepEqual(mergeUnitProgressCompletion({}, { unit: flags }), {})
  const existing = Object.freeze({ unit: Object.freeze({ quiz: true, text: true }) })
  assert.equal(mergeUnitProgressCompletion(existing, { unit: flags }).unit.text, true)
}

const frozenHistoryProgress = Object.freeze({ unit: Object.freeze({ quiz: true, text: false }) })
const withLog = mergeUnitProgressCompletion(frozenHistoryProgress, { unit: { text: true, workbook: true } })
assert.equal(withLog.unit.text, true)
assert.equal(withLog.unit.quiz, true)
assert.equal(withLog.unit.workbook, false, '보정 대상 외 완료 필드를 임의로 추가하지 않는다')
assert.equal(frozenHistoryProgress.unit.text, false)

// 기존 영상/Mission Lab 보정도 유지하며 명시적 true만 완료로 인정한다.
assert.deepEqual(getLearningProgressCompletion({
  logRead: true,
  videoProgress: { pending: { completed: false }, finished: { completed: true } },
  missionLab: { completed: true },
}), { text: true, video: true, missionLab: true })
assert.deepEqual(getLearningProgressCompletion({
  videoProgress: { invalid: null, truthy: { completed: 'true' } },
  missionLab: { completed: 'true' },
}), { text: false, video: false, missionLab: false })
const missionOnly = buildUnitProgressMap([], { mission: { missionLab: { completed: true } } })
assert.equal(missionOnly.mission.missionLab, true)
assert.equal(missionOnly.mission.text, false)
assert.equal(mergeUnitProgressCompletion({}, {}).unit, undefined, '비어 있는 새 구독에는 이전 완료를 유지하지 않는다')

console.log('learning summary utils tests passed')
