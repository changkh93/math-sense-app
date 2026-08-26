import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { getLumiCourseCatalog, getLumiMissionSet } from '../src/components/PythonWorld/lumiCourseCatalog.js'
import { evaluateMissionRun } from '../src/components/PythonWorld/missionEvaluator.js'
import { getCanonicalLumiMission, LUMI_REWARD_FLAGS } from '../src/services/lumiRewardPolicy.js'

console.log('=== LUMI Student Open-Beta Contract ===\n')

const course = getLumiCourseCatalog()
assert.equal(course.acts.length, 11, 'ACT 0~9 + FINAL must be present')

for (const act of course.acts) {
  const set = getLumiMissionSet(act.id)
  assert.notEqual(set.kind, 'locked', `${act.id} must be reachable`)
  assert.ok(set.missions.length > 0, `${act.id} must have at least one runnable mission`)
  assert.equal(set.persistencePolicy === 'none', false, `${act.id} must record progress`)
  assert.notEqual(set.rewardPolicy, 'none', `${act.id} must participate in rewards`)
  assert.ok(getCanonicalLumiMission(set.missions[0].id), `${act.id} first mission must be canonical`)
}

assert.equal(LUMI_REWARD_FLAGS.DAILY_RECORD_ENABLED, true)
assert.equal(LUMI_REWARD_FLAGS.MINERAL_REWARD_ENABLED, true)
assert.equal(LUMI_REWARD_FLAGS.FEEDBACK_INTEGRATION_ENABLED, true)
console.log('  -> All ACT cards resolve to runnable, canonical learning sets')

const workerContent = fs.readFileSync(path.resolve('src/components/PythonWorld/runtime/pythonWorld.worker.js'), 'utf8')
const matchRunner = workerContent.match(/const PYTHON_RUNNER = String\.raw`([\s\S]*?)`\s*async function loadRuntime/)
assert.ok(matchRunner)

function runPython(mission, code) {
  const runner = `
mission_payload_json = ${JSON.stringify(JSON.stringify(mission))}
student_code = ${JSON.stringify(code)}
${matchRunner[1]}
print(_run_mission(mission_payload_json, student_code))
`
  const child = spawnSync('/usr/bin/python3', ['-c', runner], { encoding: 'utf8' })
  assert.equal(child.status, 0, child.stderr)
  return JSON.parse(child.stdout.trim().split('\n').at(-1))
}

const legacyImportMission = getLumiMissionSet('act-4-decision').missions[0]
assert.equal(runPython(legacyImportMission, legacyImportMission.starterCode).error, null, 'Safe metasense import must work')

import { getLumiSolutionBody } from '../src/components/PythonWorld/lumiSolutionCatalog.js'

const dataSet = getLumiMissionSet('act-7-data')
dataSet.missions.forEach((mission) => {
  const starterEvaluation = evaluateMissionRun(mission, runPython(mission, mission.starterCode))
  assert.equal(starterEvaluation.basePassed, false, `${mission.codeName} starter must not clear`)
  const solution = getLumiSolutionBody(mission)
  assert.ok(solution, `${mission.codeName} solution must exist`)
  const solutionEvaluation = evaluateMissionRun(mission, runPython(mission, solution))
  assert.equal(solutionEvaluation.basePassed, true, `${mission.codeName} solution must clear: ${solutionEvaluation.failureReason}`)
})
console.log('  -> Safe imports and ACT 7 data missions execute correctly')

console.log('\n=== LUMI Student Open-Beta Contract Passed ===')
