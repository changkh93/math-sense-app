import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { getLumiMissionSet } from '../src/components/PythonWorld/lumiCourseCatalog.js'
import { getLumiSolutionBody } from '../src/components/PythonWorld/lumiSolutionCatalog.js'
import { evaluateMissionRun } from '../src/components/PythonWorld/missionEvaluator.js'
import { getMissionVariant } from '../src/components/PythonWorld/pythonMissionCatalog.js'

console.log('=== Running Phase 18: ACT 7 Dynamic Transfer Learning Contract Test ===\n')

const workerPath = resolve(process.cwd(), 'src/components/PythonWorld/runtime/pythonWorld.worker.js')
const workerContent = readFileSync(workerPath, 'utf8')
const matchRunner = workerContent.match(/const PYTHON_RUNNER = String\.raw`([\s\S]*?)`\s*async function loadRuntime/)
assert.ok(matchRunner, 'PYTHON_RUNNER script must be present in worker')
const PYTHON_RUNNER_CODE = matchRunner[1]

function runPythonCode(mission, code, variantOverrides = {}) {
  const missionVariant = getMissionVariant(mission, variantOverrides)
  const effectiveMission = {
    ...missionVariant,
    inputValues: variantOverrides.inputValues || mission.inputValues || ['4'],
    max_steps: 1000,
  }

  const payload = {
    ...effectiveMission,
    code,
  }

  const pythonScript = `
mission_payload_json = ${JSON.stringify(JSON.stringify(payload))}
student_code = ${JSON.stringify(code)}
${PYTHON_RUNNER_CODE}
print(_run_mission(mission_payload_json, student_code))
`

  const proc = spawnSync('/usr/bin/python3', ['-c', pythonScript], { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 })
  if (proc.status !== 0) {
    throw new Error(`Python execution failed for ${mission.id}: ${proc.stderr || proc.stdout}`)
  }

  const rawResult = JSON.parse(proc.stdout.trim().split('\n').at(-1))
  const evalResult = evaluateMissionRun(effectiveMission, rawResult)
  return { runtimeResult: rawResult, evalResult }
}

// [Test 1] World Data Defensive Copy Verification
console.log('[Test 1] Validating World Data Defensive Copies and Type Safety...')
const dataSet = getLumiMissionSet('act-7-data')
const m71 = dataSet.missions[0]

const defensiveTestCode = `
from msense import world

# 1. signals list mutation
s1 = world.signals
s1.append("TAMPERED")
s2 = world.signals
assert "TAMPERED" not in s2, "world.signals must return a fresh copy!"

# 2. inventory_items list mutation
inv1 = world.inventory_items
inv1.pop()
inv2 = world.inventory_items
assert len(inv1) != len(inv2), "world.inventory_items must return a fresh copy!"

# 3. battery_cells list mutation
bat1 = world.battery_cells
bat1.clear()
bat2 = world.battery_cells
assert len(bat2) > 0, "world.battery_cells must return a fresh copy!"

# 4. status_data dict mutation
d1 = world.status_data
d1["energy"] = 999
d2 = world.status_data
assert d2["energy"] != 999, "world.status_data must return a fresh copy!"

# 5. target_pos tuple type check
pos = world.target_pos
assert type(pos) == tuple, f"world.target_pos must be a tuple! Got: {type(pos)}"

print("DEFENSIVE_COPY_OK")
`

const { runtimeResult: defResult } = runPythonCode(m71, defensiveTestCode)
assert.equal(defResult.error, null, `Defensive copy test failed: ${defResult.error}`)
assert.ok(defResult.stdout.includes('DEFENSIVE_COPY_OK'), 'Defensive copy check output must match')
console.log('  -> Defensive copies and tuple types verified 100%')

// [Test 2] Official Solutions Pass Base & Dynamic Hidden Variants
console.log('[Test 2] Validating Official Solutions across Base and Hidden Variants...')
for (const mission of dataSet.missions) {
  const solution = getLumiSolutionBody(mission)
  assert.ok(solution, `Solution must exist for ${mission.id}`)

  // Base run
  const { evalResult: baseEval } = runPythonCode(mission, solution)
  assert.equal(baseEval.basePassed, true, `${mission.id} official solution must pass base! Reason: ${baseEval.failureReason}`)

  // Variant runs
  const variants = mission.hiddenVariants || []
  assert.ok(variants.length > 0, `${mission.id} must have at least 1 hidden variant`)
  for (const variant of variants) {
    const { evalResult: variantEval } = runPythonCode(mission, solution, variant)
    assert.equal(variantEval.basePassed, true, `${mission.id} official solution must pass variant ${variant.id}! Reason: ${variantEval.failureReason}`)
  }
}
console.log('  -> All 10 ACT 7 official solutions passed Base and Hidden Variants 100%')

// [Test 3] Hardcoded/Naive Solutions Must Fail Dynamic Hidden Variants
console.log('[Test 3] Validating Hardcoded/Naive Solutions Fail Hidden Variants (True Transfer)...')

// 7-1: Hardcoded print(3)
const m1 = dataSet.missions[0]
const naive71 = `signals = ["ALPHA", "BETA", "GAMMA"]\nprint(3)`
const { evalResult: r71Var } = runPythonCode(m1, naive71, m1.hiddenVariants[0])
assert.equal(r71Var.basePassed, false, '7-1 hardcoded print(3) must fail variant (expects 4)')

// 7-2: Hardcoded outputs without subscript
const m2 = dataSet.missions[1]
const naive72 = `print("crystal")\nprint("laser")`
const { evalResult: r72Var } = runPythonCode(m2, naive72, m2.hiddenVariants[0])
assert.equal(r72Var.basePassed, false, '7-2 hardcoded output must fail variant (expects battery/plasma and subscript)')

// 7-3: Hardcoded len 3
const m3 = dataSet.missions[2]
const naive73 = `print(3)`
const { evalResult: r73Var } = runPythonCode(m3, naive73, m3.hiddenVariants[0])
assert.equal(r73Var.basePassed, false, '7-3 hardcoded print(3) must fail variant (expects 5)')

// 7-4: Hardcoded used = cell3
const m4 = dataSet.missions[3]
const naive74 = `used = "cell3"\nprint(used)`
const { evalResult: r74Var } = runPythonCode(m4, naive74, m4.hiddenVariants[0])
assert.equal(r74Var.basePassed, false, '7-4 hardcoded pop must fail variant (expects omega_cell)')

// 7-5: Cheating with print(items) single line
const m5 = dataSet.missions[4]
const naive75 = `from msense import world\nprint(world.inventory_items)`
const { evalResult: r75Base } = runPythonCode(m5, naive75)
assert.equal(r75Base.basePassed, false, '7-5 print(list) must fail printedSequence goal')

// 7-6: Hardcoded split output 3
const m6 = dataSet.missions[5]
const naive76 = `signals = ["A", "B", "C"]\nprint(3)`
const { evalResult: r76Var } = runPythonCode(m6, naive76, m6.hiddenVariants[0])
assert.equal(r76Var.basePassed, false, '7-6 hardcoded signals must fail variant (expects 5)')

// 7-7: Hardcoded join output
const m7 = dataSet.missions[6]
const naive77 = `message = "ALPHA-BETA-GAMMA"\nprint(message)`
const { evalResult: r77Var } = runPythonCode(m7, naive77, m7.hiddenVariants[0])
assert.equal(r77Var.basePassed, false, '7-7 hardcoded join must fail variant (expects LUMI-NAV-ONLINE)')

// 7-8: Hardcoded tuple (4, 2)
const m8 = dataSet.missions[7]
const naive78 = `target_pos = (4, 2)\nprint(target_pos)`
const { evalResult: r78Var } = runPythonCode(m8, naive78, m8.hiddenVariants[0])
assert.equal(r78Var.basePassed, false, '7-8 hardcoded tuple must fail variant (expects (7, 3))')

// 7-9: Hardcoded dict energy 80
const m9 = dataSet.missions[8]
const naive79 = `stats = {"name": "LUMI", "energy": 80, "shield": 5}\nprint(80)`
const { evalResult: r79Var } = runPythonCode(m9, naive79, m9.hiddenVariants[0])
assert.equal(r79Var.basePassed, false, '7-9 hardcoded dict must fail variant (expects 42)')

// 7-10: Hardcoded SAFE output
const m10 = dataSet.missions[9]
const naive710 = `telemetry = {"STATUS": "SAFE"}\nprint("SAFE")`
const { evalResult: r710Var } = runPythonCode(m10, naive710, m10.hiddenVariants[0])
assert.equal(r710Var.basePassed, false, '7-10 hardcoded SAFE must fail variant (expects DANGER and full dict)')

console.log('  -> All hardcoded/naive solutions properly rejected by dynamic variants!')

console.log('\n=== All Phase 18 ACT 7 Dynamic Transfer Tests Passed 100%! ===\n')
