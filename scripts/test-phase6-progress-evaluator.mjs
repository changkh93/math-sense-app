import assert from 'node:assert/strict'
import { mergeMissionCompletion, normalizeMissionLabProgress } from '../src/utils/pythonMissionProgressUtils.js'
import { getLumiVerticalSliceSet } from '../src/components/PythonWorld/lumiCourseCatalog.js'

const vsSet = getLumiVerticalSliceSet()
let progress = normalizeMissionLabProgress({})

// 1. Clear VS-01 with hint level 2 (Assistance = 2)
progress = mergeMissionCompletion(progress, vsSet, 'lumi-vs-01', 3, { maxLevel: 2 })
assert.equal(progress.completedMissionIds.includes('lumi-vs-01'), true)
assert.equal(progress.bestStarsByMission['lumi-vs-01'], 3)
assert.equal(progress.bestAssistanceByMission['lumi-vs-01'], 2)
assert.equal(progress.unlockedTools.includes('reset'), true)

// 2. Re-clear VS-01 independently (Assistance = 0) -> bestAssistance improves to 0
progress = mergeMissionCompletion(progress, vsSet, 'lumi-vs-01', 3, { maxLevel: 0 })
assert.equal(progress.bestAssistanceByMission['lumi-vs-01'], 0)
assert.equal(progress.bestStarsByMission['lumi-vs-01'], 3)

// 3. Clear VS-02 with hint level 1 (Assistance = 1) -> unlocks edit-token
progress = mergeMissionCompletion(progress, vsSet, 'lumi-vs-02', 3, { maxLevel: 1 })
assert.equal(progress.bestAssistanceByMission['lumi-vs-02'], 1)
assert.equal(progress.unlockedTools.includes('edit-token'), true)

// 4. Backward compatibility with v1 progress objects
const v1Progress = {
  setId: 'lumi-loop-navigation-v1',
  completedMissionIds: ['loop-calibration-01'],
  bestStarsByMission: { 'loop-calibration-01': 2 },
}
const normalizedV1 = normalizeMissionLabProgress(v1Progress)
assert.deepEqual(normalizedV1.completedMissionIds, ['loop-calibration-01'])
assert.deepEqual(normalizedV1.bestAssistanceByMission, {})
assert.deepEqual(normalizedV1.unlockedActs, ['act-0-awakening'])

console.log('Phase 6 Progress & Assistance tests passed!')
