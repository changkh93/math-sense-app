import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { LOST_LIGHT_FINAL_MISSIONS, LUMI_LOST_LIGHT_FINAL_SET } from '../src/components/PythonWorld/lumiLostLightFinalCatalog.js'
import { evaluateMissionRun } from '../src/components/PythonWorld/missionEvaluator.js'
import { LUMI_RELEASE_READINESS } from '../src/config/lumiReleaseReadiness.js'
import { LUMI_LOST_LIGHT_FINAL_ENABLED } from '../src/config/lumiFeatureFlags.js'
import { getMissionVariant } from '../src/components/PythonWorld/pythonMissionCatalog.js'

console.log('=== Running Gate 6: Final THE LOST LIGHT Contract Tests ===\n')

// 1. Gate 6 student beta access
console.log('[Test 1] Verifying Gate 6 Student-Beta Access...')
assert.equal(LUMI_RELEASE_READINESS.act2To8ProductionReady, true)
assert.equal(LUMI_RELEASE_READINESS.gate6FinalApproved, true)
assert.equal(LUMI_LOST_LIGHT_FINAL_ENABLED, true)
console.log('  -> Gate 6 is open for student testing')

// 2. Real Python Execution Engine Setup
const workerFilePath = path.resolve('src/components/PythonWorld/runtime/pythonWorld.worker.js')
const workerContent = fs.readFileSync(workerFilePath, 'utf8')
const matchRunner = workerContent.match(/const PYTHON_RUNNER = String\.raw`([\s\S]*?)`\s*async function loadRuntime/)
assert.ok(matchRunner, 'Must extract PYTHON_RUNNER from worker file')
const pythonRunnerCode = matchRunner[1]

function runPythonInCPython(missionJson, studentCode) {
  const runnerScript = `
mission_payload_json = ${JSON.stringify(JSON.stringify(missionJson))}
student_code = ${JSON.stringify(studentCode)}

${pythonRunnerCode}
print(_run_mission(mission_payload_json, student_code))
`

  const child = spawnSync('/usr/bin/python3', ['-c', runnerScript], {
    encoding: 'utf8',
    env: { PATH: '/usr/bin:/bin:/usr/sbin:/sbin', HOME: process.env.HOME || '/Users/selah' },
  })
  if (child.error || child.status !== 0) {
    throw new Error(`Python execution failed: ${child.stderr || child.error}`)
  }
  const lines = child.stdout.trim().split('\n')
  const jsonStr = lines[lines.length - 1]
  return JSON.parse(jsonStr)
}

// 3. F-01 ~ F-04 Real CPython Execution Tests
console.log('[Test 2] Real CPython F-01 to F-04 Final Mission Evaluations...')

// F-01: Priority urgent signal selection
const mF01 = LOST_LIGHT_FINAL_MISSIONS[0]
assert.equal(evaluateMissionRun(mF01, runPythonInCPython(mF01, mF01.starterCode)).basePassed, false, 'F-01 starter must not reveal the answer')
const codeF01 = `${mF01.starterCode.replace('    # TODO: 모든 신호를 비교하여 corruption이 가장 큰 신호를 urgent에 저장하세요.', '    for signal in signal_list:\n        if signal["corruption"] > urgent["corruption"]:\n            urgent = signal')}`
const resF01 = runPythonInCPython(mF01, codeF01)
assert.equal(evaluateMissionRun(mF01, resF01).basePassed, true, 'F-01 base must pass evaluation')
const resF01Variant = runPythonInCPython(getMissionVariant(mF01, mF01.hiddenVariants[0]), codeF01)
assert.equal(evaluateMissionRun(mF01.hiddenVariants[0], resF01Variant).basePassed, true, 'F-01 same solution must pass transfer data')

// F-02: choose_action Navigation function
const mF02 = LOST_LIGHT_FINAL_MISSIONS[1]
assert.equal(evaluateMissionRun(mF02, runPythonInCPython(mF02, mF02.starterCode)).basePassed, false, 'F-02 starter must not clear')
const codeF02 = `def choose_action(energy, corruption):
    if energy < 30:
        return "CHARGE"
    elif corruption > 0:
        return "PURIFY"
    return "STANDBY"
act_1 = choose_action(20, 50)
act_2 = choose_action(80, 40)`
const resF02 = runPythonInCPython(mF02, codeF02)
assert.equal(evaluateMissionRun(mF02, resF02).passed, true, 'F-02 must pass evaluation')

// F-03: While loop persistent fleet purification
const mF03 = LOST_LIGHT_FINAL_MISSIONS[2]
assert.equal(evaluateMissionRun(mF03, runPythonInCPython(mF03, mF03.starterCode)).basePassed, false, 'F-03 starter must not clear')
const codeF03 = `${mF03.starterCode}
while total_corruption > 0:
    for d in fleet:
        d.purify(10)
    total_corruption = sum(d.corruption for d in fleet)`
const resF03 = runPythonInCPython(mF03, codeF03)
assert.equal(evaluateMissionRun(mF03, resF03).passed, true, 'F-03 must pass evaluation')

// F-04: THE LOST LIGHT Comprehensive Relay Restoration
const mF04 = LOST_LIGHT_FINAL_MISSIONS[3]
assert.equal(evaluateMissionRun(mF04, runPythonInCPython(mF04, mF04.starterCode)).basePassed, false, 'F-04 starter must not clear')
const codeF04 = `class RelayBeacon:
    def __init__(self, name, power):
        self.name = name
        self.power = power
        self.active = False
    def activate(self):
        self.active = True
relays = []
for spec in world.entity_specs:
    relays.append(RelayBeacon(spec["name"], spec["power"]))
for relay in relays:
    relay.activate()`
const resF04 = runPythonInCPython(mF04, codeF04)
const evalF04Base = evaluateMissionRun(mF04, resF04)
assert.equal(evalF04Base.basePassed, true, 'F-04 base must pass')

const varF04 = mF04.hiddenVariants[0]
const resF04Var = runPythonInCPython(getMissionVariant(mF04, varF04), codeF04)
const evalF04Var = evaluateMissionRun(varF04, resF04Var)
assert.equal(evalF04Var.basePassed, true, 'F-04 variant must pass')

const evalF04Full = evaluateMissionRun(mF04, resF04, evalF04Var.basePassed)
assert.equal(evalF04Full.passed, true, 'F-04 must pass 3 stars')
assert.equal(evalF04Full.stars, 3)
console.log('  -> All 4 Final missions evaluated and passed')

console.log('\n=== All Gate 6 Final Contract Tests Passed 100%! ===')
