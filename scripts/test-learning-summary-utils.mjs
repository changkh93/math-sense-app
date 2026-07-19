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

console.log('learning summary utils tests passed')
