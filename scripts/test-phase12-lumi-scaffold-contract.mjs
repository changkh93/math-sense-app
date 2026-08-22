import assert from 'node:assert/strict'
import { getLumiCourseCatalog, getLumiMissionSet } from '../src/components/PythonWorld/lumiCourseCatalog.js'
import {
  LUMI_DRAFT_SCHEMA_VERSION,
  getLumiGoalLabel,
  getLumiInitialCode,
  getLumiLearningSteps,
  getLumiMissionHints,
  getLumiSolutionPreview,
  getRelevantMissionApi,
  isSolvedStarterAllowed,
} from '../src/components/PythonWorld/lumiScaffolding.js'

console.log('=== Running Phase 12: LUMI Scaffolding Contract ===\n')

const catalog = getLumiCourseCatalog()
const officialSets = catalog.acts.map((act) => getLumiMissionSet(act.id))
const extraSetIds = [
  'technical-spike-object-trace',
  'object-learning-pilot',
  'object-tactical-pilot',
  'object-frontier-pilot',
]
const allSets = [...officialSets, ...extraSetIds.map((id) => getLumiMissionSet(id))]
  .filter((set) => Array.isArray(set?.missions) && set.missions.length > 0)

const missions = allSets.flatMap((set) => set.missions)
assert.ok(missions.length >= 60, `expected the complete LUMI curriculum, received ${missions.length} missions`)
assert.equal(LUMI_DRAFT_SCHEMA_VERSION, 'v7')

let observeCount = 0
for (const mission of missions) {
  const initialCode = getLumiInitialCode(mission)
  assert.equal(typeof initialCode, 'string', `${mission.id}: initial code must be a string`)
  assert.ok(initialCode.trim(), `${mission.id}: initial editor guidance must not be empty`)

  if (isSolvedStarterAllowed(mission)) {
    observeCount += 1
    assert.equal(initialCode, mission.starterCode, `${mission.id}: observe mission must keep its approved code`)
  } else {
    const executableLines = initialCode
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
    assert.deepEqual(executableLines, [], `${mission.id}: initial editor must not expose executable solution code`)
  }

  const hints = getLumiMissionHints(mission)
  assert.ok(hints.length >= 1, `${mission.id}: at least one progressive hint is required`)
  assert.equal(hints[0].label, '1단계 · 개념 설명', `${mission.id}: first help step must explain the concept`)
  assert.ok(getLumiLearningSteps(mission).length >= 1, `${mission.id}: concrete writing steps are required`)
  assert.ok(getLumiSolutionPreview(mission)?.code, `${mission.id}: a complete in-editor solution preview is required`)

  const goals = mission.goals || (mission.goal ? [mission.goal] : [])
  goals.forEach((goal) => {
    assert.notEqual(getLumiGoalLabel(goal), goal.type, `${mission.id}: internal goal type must never reach students`)
  })
}

const collectMission = missions.find((mission) => mission.id === 'while-collect-03')
assert.ok(collectMission, 'while-collect-03 must exist')
const collectApi = getRelevantMissionApi(collectMission)
assert.ok(collectApi.some((item) => item.signature === 'world.objects' && /리스트/.test(item.description)), 'world.objects must be explained as a list')
assert.ok(collectApi.some((item) => item.signature === 'lumi.collect(object)' && /목록/.test(item.detail)), 'collect() must explain that the world list changes')
assert.match(getLumiInitialCode(collectMission), /world\.objects\[0\]/, 'collect mission comments must describe the next code block precisely')

assert.equal(observeCount, 1, 'only the first awakening observation mission may expose completed code')
console.log(`  -> ${missions.length} missions checked`)
console.log('  -> one explicit observe exception; every other initial editor is comment-only')
console.log('  -> every mission has student-facing goals, concrete steps, and a complete solution preview')
console.log('\n=== Phase 12 Scaffolding Contract Passed! ===')
