import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { PILOT_TACTICAL_MISSIONS, LUMI_OBJECT_TACTICAL_PILOT_SET } from '../src/components/PythonWorld/lumiObjectTacticalPilotCatalog.js'
import { evaluateMissionRun } from '../src/components/PythonWorld/missionEvaluator.js'
import { normalizeRuntimeEvents } from '../src/components/PythonWorld/lumiEventNormalizer.js'
import { projectTacticalEvents } from '../src/components/PythonWorld/lumiTacticalEventProjector.js'
import { reduceTacticalState } from '../src/components/PythonWorld/lumiTacticalReducer.js'
import { getMissionVariant } from '../src/components/PythonWorld/pythonMissionCatalog.js'

console.log('=== Running Gate 3: Tactical Pilot Contract & Real CPython Integration Tests ===\n')

// 1. Student beta persistence check
console.log('[Test 1] Verifying Gate 3 Student-Beta Learning Policies...')
assert.equal(LUMI_OBJECT_TACTICAL_PILOT_SET.kind, 'tactical-pilot')
assert.equal(LUMI_OBJECT_TACTICAL_PILOT_SET.persistencePolicy, 'official')
assert.equal(LUMI_OBJECT_TACTICAL_PILOT_SET.rewardPolicy, 'standard-crystals')
for (const m of LUMI_OBJECT_TACTICAL_PILOT_SET.missions) {
  assert.equal(m.persistencePolicy, 'official')
  assert.equal(m.rewardPolicy, 'standard-crystals')
}
console.log('  -> Gate 3 progress, daily records and rewards are enabled')

// Runner using worker PYTHON_RUNNER and /usr/bin/python3
import fs from 'node:fs'
import path from 'node:path'

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

// 2. Real CPython Execution for Gate 3 Mission 3-01
console.log('[Test 2] Real CPython 3-01: Verifying Fleet Purification Solution...')
const m301 = PILOT_TACTICAL_MISSIONS[0]
const validCode = `
class Drone:
    def __init__(self, name, corruption):
        self.name = name
        self.corruption = corruption

    def purify_signal(self, amount):
        self.corruption = self.corruption - amount

squad = []
for spec in world.entity_specs:
    squad.append(Drone(spec["name"], spec["corruption"]))
for drone in squad:
    drone.purify_signal(drone.corruption)
`

const starterResult = runPythonInCPython(m301, m301.starterCode)
assert.equal(evaluateMissionRun(m301, starterResult).basePassed, false, 'Starter code must not clear Gate 3')

const res301 = runPythonInCPython(m301, validCode)
assert.ok(!res301.error)

const normEvents = normalizeRuntimeEvents(res301.events)
const tacticalEvents = projectTacticalEvents(normEvents, m301)
const tacticalState = reduceTacticalState(tacticalEvents)

assert.equal(tacticalState.totalCount, 3)
assert.equal(tacticalState.restoredCount, 3)
const eval301Base = evaluateMissionRun(m301, res301)
assert.equal(eval301Base.basePassed, true, 'Base scenario must pass')

// Run Hidden Variants
const varA = m301.hiddenVariants[0]
const varB = m301.hiddenVariants[1]

const resVarA = runPythonInCPython(getMissionVariant(m301, varA), validCode)
const evalVarA = evaluateMissionRun(varA, resVarA)
assert.equal(evalVarA.basePassed, true, 'Transfer variant A must pass')

const resVarB = runPythonInCPython(getMissionVariant(m301, varB), validCode)
const evalVarB = evaluateMissionRun(varB, resVarB)
assert.equal(evalVarB.basePassed, true, 'Transfer variant B must pass')

const evalFull = evaluateMissionRun(m301, res301, evalVarA.basePassed && evalVarB.basePassed)
assert.equal(evalFull.passed, true, 'Gate 3 mission 3-01 with variants must pass 3-star evaluation')
assert.equal(evalFull.stars, 3, 'Must earn 3 stars on full variant pass')
console.log('  -> 3-01 Fleet purification solution evaluated successfully with 3 stars')

// 3. Determinism check (3 runs must have identical tactical state and event tape hash)
console.log('[Test 3] Verifying Determinism Across 3 Runs...')
const resRun2 = runPythonInCPython(m301, validCode)
const resRun3 = runPythonInCPython(m301, validCode)
assert.deepEqual(res301.events, resRun2.events)
assert.deepEqual(res301.events, resRun3.events)
console.log('  -> 3-01 Deterministic event tape verified')

// 4. Failure check: Hardcoded without for loop
console.log('[Test 4] Verifying Failure on Missing For Loop...')
const codeNoFor = `
class Drone:
    def __init__(self, name, corruption):
        self.name = name
        self.corruption = corruption

    def purify_signal(self, amount):
        self.corruption = self.corruption - amount

d1 = Drone("NOVA-1", 10)
d2 = Drone("NOVA-2", 20)
d3 = Drone("NOVA-3", 30)

d1.purify_signal(30)
d2.purify_signal(30)
d3.purify_signal(30)
`
const resNoFor = runPythonInCPython(m301, codeNoFor)
const evalNoFor = evaluateMissionRun(m301, resNoFor)
assert.equal(evalNoFor.passed, false, 'Missing for loop concept must fail Gate 3 evaluation')
console.log('  -> Missing for loop correctly rejected')

const hardcodedVariant = runPythonInCPython(getMissionVariant(m301, varA), `
class Drone:
    def __init__(self, name, corruption):
        self.name = name
        self.corruption = corruption
    def purify_signal(self, amount):
        self.corruption -= amount
squad = [Drone("N1", 10), Drone("N2", 20), Drone("N3", 30)]
for drone in squad:
    drone.purify_signal(drone.corruption)
`)
assert.equal(evaluateMissionRun(varA, hardcodedVariant).basePassed, false, 'Hardcoded 3-instance solution must fail 2-instance transfer')

console.log('\n=== All Gate 3 Tactical Pilot Contract Tests Passed 100%! ===')
