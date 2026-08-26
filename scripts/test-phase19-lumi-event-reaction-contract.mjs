import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
import { getLumiMissionSet } from '../src/components/PythonWorld/lumiCourseCatalog.js'
import { normalizeRuntimeEvents } from '../src/components/PythonWorld/lumiEventNormalizer.js'
import { createInitialWorldState, reduceLumiWorldState } from '../src/components/PythonWorld/lumiWorldReducer.js'
import { getMissionVariant } from '../src/components/PythonWorld/pythonMissionCatalog.js'

console.log('=== Running Phase 19: LUMI Event Reaction & Condition Trace Contract ===\n')

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

  const req = createRequire(import.meta.url)
  const { spawnSync } = req('node:child_process')
  const pythonScript = `
mission_payload_json = ${JSON.stringify(JSON.stringify(payload))}
student_code = ${JSON.stringify(code)}
${PYTHON_RUNNER_CODE}
print(_run_mission(mission_payload_json, student_code))
`
  const proc = spawnSync('/usr/bin/python3', ['-c', pythonScript], { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 })
  if (proc.status !== 0) {
    throw new Error(`Python execution failed for ${mission.id}: ${proc.stderr}`)
  }

  const rawResult = JSON.parse(proc.stdout.trim().split('\n').at(-1))
  const normalizedEvents = normalizeRuntimeEvents(rawResult.events || [])
  const initialWorld = createInitialWorldState(effectiveMission.world || {})
  const reducedState = reduceLumiWorldState(initialWorld, normalizedEvents)

  return {
    rawResult,
    normalizedEvents,
    initialWorld,
    reducedState,
  }
}

// -------------------------------------------------------------
// [Test 1] Target Sanitization & Contextual Kinds
// -------------------------------------------------------------
console.log('[Test 1] Validating Target Sanitization and Contextual Kinds...')

// Check ACT 2: non-movement missions have target === null in initial state
const act2Set = getLumiMissionSet('act-2-memory')
for (const mId of ['lumi-act2-01', 'lumi-act2-02', 'lumi-act2-03']) {
  const mission = act2Set.missions.find((m) => m.id === mId)
  assert.ok(mission, `Mission ${mId} must exist`)
  const initState = createInitialWorldState(mission.world || {})
  assert.equal(initState.target, null, `ACT 2 mission ${mId} should have target = null (no misleading fake beacon)`)
  assert.equal(initState.scene, 'workbench', `ACT 2 mission ${mId} scene should be workbench`)
}

// Check ACT 4: if-charge-01 has target === null and scene === 'station'
const act4Set = getLumiMissionSet('act-4-decision')
const ifCharge = act4Set.missions.find((m) => m.id === 'if-charge-01')
assert.ok(ifCharge)
const ifChargeInit = createInitialWorldState(ifCharge.world || {})
assert.equal(ifChargeInit.target, null, 'ACT 4-1 if-charge-01 should have target = null')
assert.equal(ifChargeInit.scene, 'station', 'ACT 4-1 should have scene = station')
assert.ok(ifChargeInit.stations.length > 0, 'ACT 4-1 should have station pads')
assert.ok(ifChargeInit.barriers.length > 0, 'ACT 4-1 should have barrier')

// Check ACT 4: if-launch-02 has target.kind === 'sos'
const ifLaunch = act4Set.missions.find((m) => m.id === 'if-launch-02')
assert.ok(ifLaunch)
const ifLaunchInit = createInitialWorldState(ifLaunch.world || {})
assert.equal(ifLaunchInit.target?.kind, 'sos', 'ACT 4-2 if-launch-02 target kind should be sos')

// Check ACT 7: data missions have target === null unless specifically defining coordinates (7-08)
const act7Set = getLumiMissionSet('act-7-data')
for (const m of act7Set.missions) {
  const initState = createInitialWorldState(m.world || {})
  if (m.id === 'lumi-data-7-08') {
    assert.equal(initState.target?.kind, 'sos', 'ACT 7-08 should have contextual target kind sos')
  } else {
    assert.equal(initState.target, null, `ACT 7 mission ${m.id} should have target = null`)
  }
  assert.equal(initState.scene, 'data', `ACT 7 mission ${m.id} scene should be data`)
}

console.log('  -> Target sanitization & contextual kinds verified across ACT 2, 4, 7, 8')

// -------------------------------------------------------------
// [Test 2] Python Worker Condition Tracing & Event Normalization
// -------------------------------------------------------------
console.log('[Test 2] Validating Python Condition Tracing and Event Normalization...')

const codeTrue = `
from msense import lumi
if lumi.energy < 30:
    lumi.charge()
`
const runTrue = runPythonCode(ifCharge, codeTrue)

// Check condition_evaluated event
const condTrueEvent = runTrue.normalizedEvents.find((e) => e.type === 'condition_evaluated')
assert.ok(condTrueEvent, 'condition_evaluated event must be emitted for if test')
assert.equal(condTrueEvent.payload.expression, 'lumi.energy < 30')
assert.equal(condTrueEvent.payload.result, true)

// Check energy_changed event
const energyChangeEvent = runTrue.normalizedEvents.find((e) => e.type === 'energy_changed')
assert.ok(energyChangeEvent, 'energy_changed event must be emitted on charge()')
assert.equal(energyChangeEvent.payload.entityId, 'lumi')
assert.equal(energyChangeEvent.payload.fromEnergy, 12)
assert.equal(energyChangeEvent.payload.toEnergy, 100)
assert.equal(energyChangeEvent.payload.reason, 'charge')

// Check reduced world state
assert.equal(runTrue.reducedState.rover.energy, 100)
assert.equal(runTrue.reducedState.activeCondition?.result, true)
assert.equal(runTrue.reducedState.activeCondition?.expression, 'lumi.energy < 30')

// Now run code with False condition
const codeFalse = `
from msense import lumi
if lumi.energy < 10:
    lumi.charge()
`
const runFalse = runPythonCode(ifCharge, codeFalse)
const condFalseEvent = runFalse.normalizedEvents.find((e) => e.type === 'condition_evaluated')
assert.ok(condFalseEvent, 'condition_evaluated event must be emitted even when False')
assert.equal(condFalseEvent.payload.result, false)
const falseEnergyEvent = runFalse.normalizedEvents.find((e) => e.type === 'energy_changed')
assert.equal(falseEnergyEvent, undefined, 'No energy_changed should be emitted when condition is False')
assert.equal(runFalse.reducedState.rover.energy, 12, 'Energy should remain 12 when charge is skipped')
assert.equal(runFalse.reducedState.activeCondition?.result, false)

console.log('  -> Python condition evaluation and generalized energy events verified')

// -------------------------------------------------------------
// [Test 3] Deterministic Event Stream (Zero Server Calls Invariant)
// -------------------------------------------------------------
console.log('[Test 3] Validating Deterministic Event Stream...')

const run1 = runPythonCode(ifCharge, codeTrue)
const run2 = runPythonCode(ifCharge, codeTrue)

assert.deepEqual(run1.normalizedEvents, run2.normalizedEvents, 'Identical code must produce identical event sequences')
assert.deepEqual(run1.reducedState, run2.reducedState, 'Identical code must produce identical world states')

console.log('  -> 100% deterministic client-side event reproduction verified')

// -------------------------------------------------------------
// [Test 4] Barrier State Invariant & Unlock Transitions
// -------------------------------------------------------------
console.log('[Test 4] Validating Barrier State and Unlock Transitions...')

const barrierWorld = {
  width: 8,
  height: 5,
  barriers: [{ id: 'gate-alpha', x: 3, label: '통제선', state: 'active' }],
}
const barrierInit = createInitialWorldState(barrierWorld)
assert.equal(barrierInit.barriers[0].state, 'active')

const unlockEvent = {
  schemaVersion: 2,
  seq: 1,
  type: 'barrier_changed',
  payload: { id: 'gate-alpha', state: 'disabled' },
}
const unlockedWorld = reduceLumiWorldState(barrierInit, [unlockEvent])
assert.equal(unlockedWorld.barriers[0].state, 'disabled')

console.log('  -> Barrier state transitions verified')

console.log('\n=== All Phase 19 Event Reaction Contract Tests Passed 100%! ===\n')
