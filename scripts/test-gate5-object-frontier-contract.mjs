import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { OBJECT_FRONTIER_MISSIONS, LUMI_OBJECT_FRONTIER_SET } from '../src/components/PythonWorld/lumiObjectFrontierCatalog.js'
import { evaluateMissionRun } from '../src/components/PythonWorld/missionEvaluator.js'

console.log('=== Running Gate 5: Object Frontier Optional Pilot Contract Tests ===\n')

// 1. Student beta learning policy check
console.log('[Test 1] Verifying Gate 5 Student-Beta Learning Policies...')
assert.equal(LUMI_OBJECT_FRONTIER_SET.kind, 'frontier-pilot')
assert.equal(LUMI_OBJECT_FRONTIER_SET.persistencePolicy, 'official')
assert.equal(LUMI_OBJECT_FRONTIER_SET.rewardPolicy, 'standard-crystals')
assert.equal(OBJECT_FRONTIER_MISSIONS.length, 3)

for (const m of LUMI_OBJECT_FRONTIER_SET.missions) {
  assert.equal(m.persistencePolicy, 'official')
  assert.equal(m.rewardPolicy, 'standard-crystals')
}
console.log('  -> Gate 5 progress, daily records and rewards are enabled')

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

// 3. XF-01 Single Inheritance Test
console.log('[Test 2] Real CPython XF-01: Verifying Single Inheritance...')
const mXF01 = OBJECT_FRONTIER_MISSIONS[0]
assert.equal(evaluateMissionRun(mXF01, runPythonInCPython(mXF01, mXF01.starterCode)).passed, false, 'XF-01 starter must require an edit')
const codeXF01 = `
class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity

    def charge(self, amount):
        self.integrity += amount

class ScoutDrone(Drone):
    pass

s = ScoutDrone("ALPHA", 20)
s.charge(10)
`
const resXF01 = runPythonInCPython(mXF01, codeXF01)
assert.ok(!resXF01.error)
assert.ok(resXF01.conceptsUsed.includes('inheritance'))
assert.equal(evaluateMissionRun(mXF01, resXF01).passed, true, 'XF-01 must pass evaluation')
console.log('  -> XF-01 Single inheritance verified')

// 4. XF-02 Method Override Test
console.log('[Test 3] Real CPython XF-02: Verifying Method Override...')
const mXF02 = OBJECT_FRONTIER_MISSIONS[1]
assert.equal(evaluateMissionRun(mXF02, runPythonInCPython(mXF02, mXF02.starterCode)).passed, false, 'XF-02 starter must require override logic')
const codeXF02 = `
class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity

    def charge(self, amount):
        self.integrity += amount

class TurboDrone(Drone):
    def charge(self, amount):
        self.integrity += amount * 2

t = TurboDrone("TURBO-1", 20)
t.charge(10)
`
const resXF02 = runPythonInCPython(mXF02, codeXF02)
assert.ok(!resXF02.error)
assert.equal(evaluateMissionRun(mXF02, resXF02).passed, true, 'XF-02 must pass evaluation')
console.log('  -> XF-02 Method override verified')

// 5. XF-03 Composition Test
console.log('[Test 4] Real CPython XF-03: Verifying Composition...')
const mXF03 = OBJECT_FRONTIER_MISSIONS[2]
assert.equal(evaluateMissionRun(mXF03, runPythonInCPython(mXF03, mXF03.starterCode)).passed, false, 'XF-03 starter must require the composed method call')
const codeXF03 = `
class Battery:
    def __init__(self, capacity):
        self.capacity = capacity

    def charge(self, amount):
        self.capacity += amount

class Drone:
    def __init__(self, name, battery_capacity):
        self.name = name
        self.battery = Battery(battery_capacity)

d = Drone("ALPHA", 50)
d.battery.charge(30)
`
const resXF03 = runPythonInCPython(mXF03, codeXF03)
assert.ok(!resXF03.error)
assert.equal(evaluateMissionRun(mXF03, resXF03).passed, true, 'XF-03 must pass evaluation')
console.log('  -> XF-03 Composition verified')

// 6. Security Invariant: Multiple Inheritance must be blocked
console.log('[Test 5] Security Invariant: Multiple Inheritance Rejection...')
const codeMultiInherit = `
class A: pass
class B: pass
class C(A, B): pass
`
const resMulti = runPythonInCPython(mXF01, codeMultiInherit)
assert.ok(resMulti.error, 'Multiple inheritance must be rejected by sandbox')
assert.ok(resMulti.error.message.includes('다중 상속'), 'Must show clear error message')
console.log('  -> Multiple inheritance successfully rejected')

const resBuiltinBase = runPythonInCPython(mXF01, 'class UnsafeList(list):\n    pass')
assert.ok(resBuiltinBase.error, 'Subclassing a builtin must be rejected')
assert.ok(resBuiltinBase.error.message.includes('사용자가 정의한 안전한 클래스'))

console.log('\n=== All Gate 5 Object Frontier Contract Tests Passed 100%! ===')
