import assert from 'node:assert/strict'
import { mergeSummaryWithRecentHistory } from '../src/utils/learningSummaryUtils.js'

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
// (SpaceHome.jsx unitProgressMap useMemo 의 videoCompletedFromProgress 보정과 동일 알고리즘)
//
// 시나리오: 학생이 영상을 끝까지 시청해 learning_progress.videoProgress.{txId}.completed === true 지만,
// completion_bonus 타이머를 놓쳐 history 의 video_daily_... 문서가 type:'attention' 으로 덮어쓰여
// effectiveHistory 에 type:'video' 행이 없는 상황. learning_progress 기반 보정이 video 완료를 복원해야 한다.
// ============================================================================

// SpaceHome.jsx unitProgressMap useMemo 의 핵심 보정 로직을 순수 함수로 모델링
function buildUnitProgressMap(effectiveHistory, videoCompletedFromProgress = {}) {
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
      progressMap[uid] = { quiz: false, video: false, text: false, workbook: false, codeTrace: false }
    }
    progressMap[uid][hType] = true
  }
  // OR-보정: learning_progress.videoProgress.completed === true 면 video 모달리티를 완료로 인정
  for (const [unitId, completed] of Object.entries(videoCompletedFromProgress)) {
    if (!completed) continue
    if (!progressMap[unitId]) {
      progressMap[unitId] = { quiz: false, video: false, text: false, workbook: false, codeTrace: false }
    }
    progressMap[unitId].video = true
  }
  return progressMap
}

// 케이스 1: history에 type:'attention'만 있고 type:'video'가 없는 경우 (심규민 학생 상황 재현)
const shimHistory = [
  { unitId: 'fractions_chap1_unit2', type: 'quiz', score: 100 },       // 퀴즈 완료
  { unitId: 'fractions_chap1_unit2', type: 'text' },                    // 데이터 로그 완료
  { unitId: 'fractions_chap1_unit2', type: 'attention', attentionSource: 'completion_bonus', attentionResult: 'miss' }, // 영상은 봤지만 type:'attention'으로 덮어쓰임
]
const shimProgressMap = buildUnitProgressMap(shimHistory, { fractions_chap1_unit2: true })
assert.equal(shimProgressMap.fractions_chap1_unit2.video, true, 'learning_progress.completed 보정이 video=true 를 복원해야 함')
assert.equal(shimProgressMap.fractions_chap1_unit2.quiz, true)
assert.equal(shimProgressMap.fractions_chap1_unit2.text, true)

// 케이스 2: history와 progress 모두 비어있어도, progress.completed만 있으면 video 완료 인정
const progressOnly = buildUnitProgressMap([], { some_unit: true })
assert.equal(progressOnly.some_unit.video, true, 'history가 비어있어도 progress.completed면 video 완료')

// 케이스 3: 보정 없을 때(기존 동작)는 type:'video' 문서가 없으면 video=false (회귀 방지용 문서화)
const noCorrection = buildUnitProgressMap(shimHistory, {})
assert.equal(noCorrection.fractions_chap1_unit2.video, false, '보정이 없으면 attention만으로는 video 미완료 (기존 버그 동작)')

// 케이스 4: isOverallCompleted 판단 — hasAnyContent && (!hasQuiz||quiz) && (!hasVideo||video) && (!hasText||text)
function isOverallCompleted(uProg, availability) {
  const { hasQuiz, hasVideo, hasText } = availability
  const hasAnyContent = hasQuiz || hasVideo || hasText
  return hasAnyContent && (!hasQuiz || uProg.quiz) && (!hasVideo || uProg.video) && (!hasText || uProg.text)
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

console.log('learning summary utils tests passed')
