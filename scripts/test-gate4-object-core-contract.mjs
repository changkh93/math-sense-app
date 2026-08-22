import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { OBJECT_CORE_MISSIONS, LUMI_OBJECT_CORE_SET } from '../src/components/PythonWorld/lumiObjectCoreCatalog.js'
import { evaluateMissionRun } from '../src/components/PythonWorld/missionEvaluator.js'
import { getCanonicalLumiMission, buildCanonicalLumiMission } from '../src/services/lumiRewardPolicy.js'
import { getMissionVariant } from '../src/components/PythonWorld/pythonMissionCatalog.js'

console.log('=== Running Gate 4: Object Core Production Course Contract Tests ===\n')

// 1. Catalog structure and policies check
console.log('[Test 1] Verifying Gate 4 Production Catalog & Policy Tags...')
assert.equal(LUMI_OBJECT_CORE_SET.kind, 'official-act')
assert.equal(LUMI_OBJECT_CORE_SET.persistencePolicy, 'official')
assert.equal(LUMI_OBJECT_CORE_SET.rewardPolicy, 'standard-crystals')
assert.equal(OBJECT_CORE_MISSIONS.length, 8, 'Object Core must contain exactly 8 official missions')

for (const m of OBJECT_CORE_MISSIONS) {
  assert.equal(m.persistencePolicy, 'official')
  assert.equal(m.rewardPolicy, 'standard-crystals')
}
console.log('  -> 8 official missions verified with official policies')

// 2. Real CPython Execution Setup
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

// 3. Real CPython 9-01 ~ 9-07, 9-F Execution Tests
console.log('[Test 2] Real CPython 9-01 to 9-F Official Mission Evaluations...')

// 9-01: print(type(lumi))
const m901 = OBJECT_CORE_MISSIONS[0]
const res901 = runPythonInCPython(m901, 'print(type(lumi))')
assert.equal(evaluateMissionRun(m901, res901).passed, true, '9-01 must pass')

// 9-04: __init__ with integrity
const m904 = OBJECT_CORE_MISSIONS[3]
const res904 = runPythonInCPython(m904, `
class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity

scout_1 = Drone("ALPHA", 20)
scout_2 = Drone("BETA", 40)
`)
assert.equal(evaluateMissionRun(m904, res904).passed, true, '9-04 must pass')

// 9-07: List + For Fleet Charging
const m907 = OBJECT_CORE_MISSIONS[6]
const res907 = runPythonInCPython(m907, `
class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity

    def charge(self, amount):
        self.integrity += amount

d1 = Drone("D-1", 10)
d2 = Drone("D-2", 10)
d3 = Drone("D-3", 10)
fleet = [d1, d2, d3]
for drone in fleet:
    drone.charge(20)
`)
assert.equal(evaluateMissionRun(m907, res907).passed, true, '9-07 must pass')

// 9-F: Comprehensive Transfer with Variant
const m9F = OBJECT_CORE_MISSIONS[7]
const res9F = runPythonInCPython(m9F, `
class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity

    def recharge(self, amount):
        self.integrity += amount

fleet = []
for spec in world.entity_specs:
    fleet.append(Drone(spec["name"], spec["integrity"]))
for d in fleet:
    d.recharge(30)
`)
const eval9FBase = evaluateMissionRun(m9F, res9F)
assert.equal(eval9FBase.basePassed, true, '9-F base must pass')

const var9F = m9F.hiddenVariants[0]
const res9FVar = runPythonInCPython(getMissionVariant(m9F, var9F), `
class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity
    def recharge(self, amount):
        self.integrity += amount
fleet = []
for spec in world.entity_specs:
    fleet.append(Drone(spec["name"], spec["integrity"]))
for d in fleet:
    d.recharge(30)
`)
const eval9FVar = evaluateMissionRun(var9F, res9FVar)
assert.equal(eval9FVar.basePassed, true, '9-F transfer variant must pass')

const eval9FFull = evaluateMissionRun(m9F, res9F, eval9FVar.basePassed)
assert.equal(eval9FFull.passed, true, '9-F must pass 3 stars')
assert.equal(eval9FFull.stars, 3)
console.log('  -> All 8 official missions evaluated and passed')

// 4. Reward Policy Resolution
console.log('[Test 3] Verifying Gate 4 Canonical Reward Policy & Idempotent Ledger...')
const canonical901 = getCanonicalLumiMission('lumi-object-9-01')
assert.ok(canonical901, 'Open Gate 4 mission must resolve a claimable reward')
assert.equal(canonical901.id, 'lumi-object-9-01')
const canonicalCandidate901 = buildCanonicalLumiMission({ mission: m901, missionSet: LUMI_OBJECT_CORE_SET })
assert.ok(canonicalCandidate901, 'Gate 4 policy descriptor must be valid before release')
assert.equal(canonicalCandidate901.unitId, 'lumi_protocol_act_9_object_core')
assert.equal(canonicalCandidate901.missionSetId, 'lumi-object-core-v1')
assert.equal(canonicalCandidate901.reward.baseCrystals, 4)
console.log('  -> Gate 4 reward resolution verified')

console.log('\n=== All Gate 4 Object Core Contract Tests Passed 100%! ===')
