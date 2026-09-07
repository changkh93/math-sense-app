import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { getCanonicalLumiMission } from '../src/services/lumiRewardPolicy.js'
import { getMissionVariant } from '../src/components/PythonWorld/pythonMissionCatalog.js'
import { evaluateMissionRun, evaluateMissionAttempt } from '../src/components/PythonWorld/missionEvaluator.js'
const worker = readFileSync('src/components/PythonWorld/runtime/pythonWorld.worker.js', 'utf8')
const runner = worker.match(/const PYTHON_RUNNER = String\.raw`([\s\S]*?)`\s*async function loadRuntime/)[1]
const mission = getCanonicalLumiMission('while-collect-03')
const code = 'from msense import world, lumi\nwhile world.signal_count > 0:\n    lumi.collect()'
const cases = [mission, getMissionVariant(mission, mission.hiddenVariants[0])]
const results = cases.map(m => {
  const script = `mission_payload_json = ${JSON.stringify(JSON.stringify(m))}\nstudent_code = ${JSON.stringify(code)}\n${runner}\nprint(_run_mission(mission_payload_json, student_code))`
  const proc = spawnSync('/usr/bin/python3', ['-c', script], {encoding:'utf8'})
  assert.equal(proc.status, 0, proc.stderr)
  const result = JSON.parse(proc.stdout.trim())
  assert.equal(result.error, null)
  assert.deepEqual(result.events.filter(e => e.type === 'sensor_read' && e.sensor === 'signal_count').map(e => e.value), Array.from({length:m.world.objects.length + 1}, (_, i) => m.world.objects.length - i))
  assert.equal(evaluateMissionRun(m, result, true).cleared, true)
  const erroneous = {...result, error:{type:'ValueError',message:'test runtime error',line:3}}
  assert.equal(evaluateMissionRun(m, erroneous, true).cleared, false, 'collecting everything before an error must not pass')
  assert.equal(evaluateMissionAttempt({mission:m,runtimeResult:erroneous}).basePassed, false)
  return result
})
assert.equal(evaluateMissionAttempt({mission,runtimeResult:results[0],variantResults:[results[1]]}).passed, true)
console.log('Exact student solution: 3→2→1→0 and 4→3→2→1→0; base/hidden pass without errors; false-positive guard passed')
