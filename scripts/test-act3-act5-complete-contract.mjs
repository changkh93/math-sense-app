import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { getLumiMissionSet } from '../src/components/PythonWorld/lumiCourseCatalog.js'
import { getMissionVariant } from '../src/components/PythonWorld/pythonMissionCatalog.js'
import { evaluateMissionRun } from '../src/components/PythonWorld/missionEvaluator.js'
import { getCanonicalLumiMission } from '../src/services/lumiRewardPolicy.js'

console.log('=== LUMI ACT 3 / ACT 5 Complete Curriculum Contract ===\n')

const workerContent = fs.readFileSync(path.resolve('src/components/PythonWorld/runtime/pythonWorld.worker.js'), 'utf8')
const matchRunner = workerContent.match(/const PYTHON_RUNNER = String\.raw`([\s\S]*?)`\s*async function loadRuntime/)
assert.ok(matchRunner, 'Python runner must be extractable')

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

function verifySet(actId, expectedCount, solutions) {
  const missionSet = getLumiMissionSet(actId)
  assert.equal(missionSet.kind, 'course-act')
  assert.equal(missionSet.persistencePolicy, 'official')
  assert.equal(missionSet.rewardPolicy, 'standard-crystals')
  assert.equal(missionSet.missions.length, expectedCount)
  assert.equal(solutions.length, expectedCount)

  missionSet.missions.forEach((mission, index) => {
    assert.ok(getCanonicalLumiMission(mission.id), `${mission.codeName} must be in canonical reward registry`)

    const starterResult = runPython(mission, mission.starterCode)
    const starterEvaluation = evaluateMissionRun(mission, starterResult)
    assert.equal(starterEvaluation.basePassed, false, `${mission.codeName} starter must not clear`)

    const solution = solutions[index]
    const baseResult = runPython(mission, solution)
    const baseEvaluation = evaluateMissionRun(mission, baseResult)
    assert.equal(baseResult.error, null, `${mission.codeName} solution must execute`)
    assert.equal(baseEvaluation.basePassed, true, `${mission.codeName} solution must clear base goals`)

    for (const variant of mission.hiddenVariants || []) {
      const variantMission = getMissionVariant(mission, variant)
      const variantResult = runPython(variantMission, solution)
      const variantEvaluation = evaluateMissionRun(variantMission, variantResult, true)
      assert.equal(variantResult.error, null, `${mission.codeName}/${variant.id} must execute`)
      assert.equal(variantEvaluation.basePassed, true, `${mission.codeName}/${variant.id} must transfer`)
    }
  })

  console.log(`  -> ${actId}: ${expectedCount} missions, starters blocked, solutions and variants passed`)
}

verifySet('act-3-sensor', 5, [
  'distance = world.steps_to_target\nlumi.move(distance)',
  'route_open = world.path_clear\nlumi.say(route_open)',
  'obstacle_distance = world.obstacle_ahead_distance\nlumi.say(obstacle_distance)',
  'safe_distance = world.obstacle_ahead_distance >= 3\nlumi.say(safe_distance)',
  'can_depart = world.path_clear and world.obstacle_ahead_distance > world.steps_to_target\nlumi.say(can_depart)',
])

verifySet('act-5-automation', 7, [
  'for step in range(3):\n    lumi.move(1)',
  'distance = world.steps_to_target\nfor step in range(distance):\n    lumi.move(1)',
  'row_count = world.survey_rows\nfor step in range(row_count):\n    lumi.say(step)',
  'signal_count = world.survey_columns\ntotal = 0\nfor energy in range(1, signal_count + 1):\n    total = total + energy\nprint(total)',
  'signals = lumi.scan()\nfor signal in signals:\n    lumi.collect(signal)',
  'side_length = world.steps_to_target\nfor side in range(4):\n    for step in range(side_length):\n        lumi.move(1)\n    lumi.turn(90)',
  'rows = world.survey_rows\ncolumns = world.survey_columns\ncells = 0\nfor row in range(rows):\n    for column in range(columns):\n        cells = cells + 1\nlumi.say(cells)',
])

console.log('\n=== ACT 3 / ACT 5 Complete Curriculum Contract Passed ===')
