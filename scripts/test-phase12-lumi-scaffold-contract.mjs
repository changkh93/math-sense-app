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
const mainJourneyActIds = new Set([
  'act-0-awakening',
  'act-1-command',
  'act-2-memory',
  'act-3-sensor',
  'act-4-decision',
  'act-5-automation',
  'act-6-persistence',
  'act-7-data',
  'act-8-ability',
])
const mainJourneyMissionIds = new Set(catalog.acts
  .filter((act) => mainJourneyActIds.has(act.id))
  .flatMap((act) => getLumiMissionSet(act.id)?.missions || [])
  .map((mission) => mission.id))
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
  } else if (mainJourneyMissionIds.has(mission.id)) {
    const executableLines = initialCode
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
    assert.deepEqual(executableLines, [], `${mission.id}: initial editor must not expose executable solution code`)

    const exposedSolutionLines = getLumiSolutionPreview(mission).code
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => (
        line.length >= 9 &&
        !line.startsWith('#') &&
        !line.startsWith('from ') &&
        initialCode.includes(line)
      ))
    assert.deepEqual(exposedSolutionLines, [], `${mission.id}: initial comments must not reveal complete solution statements`)
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
assert.match(getLumiInitialCode(collectMission), /잔여 신호 지속 수집/, 'collect mission comments must identify the current task')
assert.doesNotMatch(getLumiInitialCode(collectMission), /world\.objects\[0\]/, 'collect mission initial comments must not reveal the solution expression')

assert.equal(observeCount, 1, 'only the first awakening observation mission may expose completed code')
console.log(`  -> ${missions.length} missions checked`)
console.log('  -> main journey ACT 0~8 has one observe exception; every other initial editor is comment-only')
console.log('  -> main journey initial comments identify the task without copying complete solution statements')
console.log('  -> every mission has student-facing goals, concrete steps, and a complete solution preview')
console.log('\n=== Phase 12 Scaffolding Contract Passed! ===')
