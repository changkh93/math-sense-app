import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  getLumiCourseCatalog,
  getLumiMissionRegistrationById,
  getLumiMissionSet,
} from '../src/components/PythonWorld/lumiCourseCatalog.js'
import {
  getCanonicalLumiMission,
  getLumiMissionTransactionId,
} from '../src/services/lumiRewardPolicy.js'
import {
  getLumiGoalLabel,
  getLumiInitialCode,
  getLumiLearningSteps,
  getLumiMissionHints,
  getLumiSolutionPreview,
  isSolvedStarterAllowed,
} from '../src/components/PythonWorld/lumiScaffolding.js'
import {
  getLumiSolutionBody,
  hasLumiSolution,
} from '../src/components/PythonWorld/lumiSolutionCatalog.js'
import { getLumiPygameBridge } from '../src/components/PythonWorld/lumiPygameBridgeRegistry.js'
import { normalizeRuntimeEvents } from '../src/components/PythonWorld/lumiEventNormalizer.js'
import { createInitialWorldState, reduceLumiWorldState } from '../src/components/PythonWorld/lumiWorldReducer.js'
import { evaluateMissionRun } from '../src/components/PythonWorld/missionEvaluator.js'
import { getMissionVariant } from '../src/components/PythonWorld/pythonMissionCatalog.js'

console.log('=== Running Phase 17: LUMI ACT 0~8 Full Curriculum & Contract Test ===\n')

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

  const { spawnSync } = importSync()
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

  const runtimeResult = {
    events: rawResult.events || [],
    finalState: reducedState,
    conceptsUsed: rawResult.conceptsUsed || [],
    callsUsed: rawResult.callsUsed || [],
    stdout: rawResult.stdout || '',
    error: rawResult.error || null,
  }

  const evalResult = evaluateMissionRun(effectiveMission, runtimeResult)
  return { evalResult, runtimeResult }
}

function importSync() {
  const { spawnSync } = requireLike()
  return { spawnSync }
}

import { createRequire } from 'node:module'
const requireLike = () => {
  const req = createRequire(import.meta.url)
  return req('node:child_process')
}

const catalog = getLumiCourseCatalog()

// [Test 1] ACT Mission Counts, Ordering, and Field Tests
console.log('[Test 1] Validating ACT Mission Structure and Ordering...')
const EXPECTED_ACTS = [
  { actId: 'act-0-awakening', count: 6, fieldCodeName: 'VS-06' },
  { actId: 'act-1-command', count: 6, fieldCodeName: '1-6' },
  { actId: 'act-2-memory', count: 6, fieldCodeName: '2-6' },
  { actId: 'act-3-sensor', count: 5, fieldCodeName: '3-F' },
  { actId: 'act-4-decision', count: 6, fieldCodeName: '4-F' },
  { actId: 'act-5-automation', count: 7, fieldCodeName: '5-F' },
  { actId: 'act-6-persistence', count: 7, fieldCodeName: '6-F' },
  { actId: 'act-7-data', count: 10, fieldCodeName: '7-F' },
  { actId: 'act-8-ability', count: 7, fieldCodeName: '8-F' },
]

const allOfficialMissions = []
for (const expected of EXPECTED_ACTS) {
  const set = getLumiMissionSet(expected.actId)
  assert.ok(set, `Mission set for ${expected.actId} must exist`)
  assert.equal(set.missions.length, expected.count, `${expected.actId} must have exactly ${expected.count} missions`)

  const lastMission = set.missions[set.missions.length - 1]
  assert.equal(lastMission.codeName, expected.fieldCodeName, `${expected.actId} last mission must be ${expected.fieldCodeName}`)
  allOfficialMissions.push(...set.missions)
}
console.log(`  -> Checked 9 ACTs, total ${allOfficialMissions.length} official missions verified`)

// [Test 2] No duplicate IDs or Aliases across curriculum
console.log('[Test 2] Validating ID and Alias Uniqueness...')
const seenIds = new Map()
for (const m of allOfficialMissions) {
  assert.ok(!seenIds.has(m.id), `Duplicate mission ID detected: ${m.id}`)
  seenIds.set(m.id, m.codeName)

  if (Array.isArray(m.aliases)) {
    for (const alias of m.aliases) {
      assert.ok(!seenIds.has(alias), `Duplicate alias detected: ${alias} (in mission ${m.id})`)
      seenIds.set(alias, m.id)
    }
  }
}
console.log('  -> All IDs and Aliases are globally unique')

// [Test 3] Canonical ID & Reward Transaction ID Identity
console.log('[Test 3] Validating Canonical Resolution & Reward Transaction IDs...')
const testAliasPairs = [
  { canonicalId: 'if-charge-01', alias: 'lumi-act4-01' },
  { canonicalId: 'if-rescue-06', alias: 'lumi-act4-06' },
  { canonicalId: 'while-break-05', alias: 'lumi-act6-05' },
  { canonicalId: 'while-rescue-07', alias: 'lumi-act6-07' },
  { canonicalId: 'lumi-data-7-01', alias: 'lumi-act7-01' },
  { canonicalId: 'lumi-data-7-10', alias: 'lumi-act7-10' },
  { canonicalId: 'function-move-01', alias: 'lumi-act8-01' },
  { canonicalId: 'function-field-07', alias: 'lumi-act8-07' },
]

for (const pair of testAliasPairs) {
  const canonicalByOriginal = getCanonicalLumiMission(pair.canonicalId)
  const canonicalByAlias = getCanonicalLumiMission(pair.alias)

  assert.ok(canonicalByOriginal, `Canonical lookup for ${pair.canonicalId} must succeed`)
  assert.ok(canonicalByAlias, `Canonical lookup for alias ${pair.alias} must succeed`)
  assert.equal(canonicalByOriginal.id, pair.canonicalId)
  assert.equal(canonicalByAlias.id, pair.canonicalId, `Alias ${pair.alias} must resolve to canonical ID ${pair.canonicalId}`)

  const txOriginal = getLumiMissionTransactionId('lumi-season-1', pair.canonicalId)
  const txAlias = getLumiMissionTransactionId('lumi-season-1', pair.alias)
  assert.equal(txOriginal, txAlias, `Transaction ID for alias ${pair.alias} must match canonical ID`)
}
console.log('  -> Canonical ID and Transaction ID equivalence verified')

// [Test 4] Scaffolding: Visible Initial Code 0 Executable Lines (Observe Exception Only)
console.log('[Test 4] Validating Initial Code & Reset Scaffolding Contract...')
for (const m of allOfficialMissions) {
  const visibleCode = getLumiInitialCode(m)
  assert.equal(typeof visibleCode, 'string', `${m.id}: visible code must be string`)

  if (isSolvedStarterAllowed(m)) {
    assert.equal(m.id, 'lumi-vs-01', 'Only lumi-vs-01 may allow solved starter')
  } else {
    const executableLines = visibleCode
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
    assert.deepEqual(executableLines, [], `${m.id}: visible initial code must contain 0 executable lines! Found: ${executableLines.join(', ')}`)
  }

  // Solution preview should never be identical to empty comment initial code
  const solutionPreview = getLumiSolutionPreview(m)
  assert.ok(solutionPreview?.code, `${m.id}: solution preview must exist`)
  if (!isSolvedStarterAllowed(m)) {
    assert.notEqual(solutionPreview.code.trim(), visibleCode.trim(), `${m.id}: solution preview must not equal initial code`)

    const exposedSolutionLines = solutionPreview.code
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => (
        line.length >= 9 &&
        !line.startsWith('#') &&
        !line.startsWith('from ') &&
        visibleCode.includes(line)
      ))
    assert.deepEqual(
      exposedSolutionLines,
      [],
      `${m.id}: initial comments must not expose complete solution statements: ${exposedSolutionLines.join(', ')}`,
    )
  }

  // Check Hints & Learning Steps
  const hints = getLumiMissionHints(m)
  assert.ok(hints.length >= 2, `${m.id}: must have progressive hints`)
  assert.equal(hints[0].label, '1단계 · 개념 설명')
  assert.ok(getLumiLearningSteps(m).length >= 1, `${m.id}: learning steps required`)

  // Check student-facing goal labels
  const goals = m.goals || (m.goal ? [m.goal] : [])
  for (const g of goals) {
    const label = getLumiGoalLabel(g)
    assert.notEqual(label, g.type, `${m.id}: internal goal type must never reach students`)
  }
}
console.log('  -> Initial code and reset contracts verified')

// [Test 5] Negative Test: Empty / Initial Starter Code FAILS Mission Goals
console.log('[Test 5] Validating Starter Code Execution Fails Base Goals (No Free Passes)...')
for (const m of allOfficialMissions) {
  if (isSolvedStarterAllowed(m)) continue
  const starter = getLumiInitialCode(m)
  const { evalResult } = await runPythonCode(m, starter)
  assert.equal(evalResult.basePassed, false, `Mission ${m.id} starter code must fail goals!`)
}
console.log('  -> All non-observe starter codes correctly fail goals')

// [Test 6] Official Solutions Pass 100% and Generalize to Hidden Variants
console.log('[Test 6] Executing Official Solutions & Hidden Variants...')
for (const m of allOfficialMissions) {
  const solution = getLumiSolutionBody(m)
  assert.ok(solution, `Mission ${m.id} must have official solution`)

  // Base test
  const { evalResult } = await runPythonCode(m, solution)
  assert.equal(evalResult.basePassed, true, `Mission ${m.id} solution must pass base goals! Reason: ${evalResult.failureReason}`)

  // Hidden Variants test
  const variants = m.hiddenVariants || []
  for (const variant of variants) {
    const { evalResult: variantResult } = await runPythonCode(m, solution, variant)
    assert.equal(variantResult.basePassed, true, `Mission ${m.id} solution must pass variant ${variant.id || 'anonymous'}! Reason: ${variantResult.failureReason}`)
  }
}
console.log(`  -> All ${allOfficialMissions.length} solutions passed base and hidden variant tests 100%`)

// [Test 7] Specific Control Flow and Structural Verifications
console.log('[Test 7] Validating Control Flow, Break, Continue, Functions, and Scope...')

// 7a. if-launch-02 else branch
const mission42 = getCanonicalLumiMission('if-launch-02')
const stormVariant = mission42.hiddenVariants.find((v) => v.id === 'storm-blocked')
const { evalResult: r42Blocked } = await runPythonCode(mission42, getLumiSolutionBody(mission42), stormVariant)
assert.equal(r42Blocked.basePassed, true, 'if-launch-02 else branch must pass on blocked path')

// 7b. if-signal-03 elif / else branches
const mission43 = getCanonicalLumiMission('if-signal-03')
const dodgeVariant = mission43.hiddenVariants.find((v) => v.id === 'medium-threat')
const { evalResult: r43Dodge } = await runPythonCode(mission43, getLumiSolutionBody(mission43), dodgeVariant)
assert.equal(r43Dodge.basePassed, true, 'if-signal-03 elif (dodge) branch must pass')

const farVariant = mission43.hiddenVariants.find((v) => v.id === 'far-threat')
const { evalResult: r43Far } = await runPythonCode(mission43, getLumiSolutionBody(mission43), farVariant)
assert.equal(r43Far.basePassed, true, 'if-signal-03 else (move) branch must pass')

// 7c. while-break-05 break verification
const mission65 = getCanonicalLumiMission('while-break-05')
const wrongInfiniteWhile = `from msense import lumi\nwhile True:\n    lumi.move(1)`
const { evalResult: r65Wrong } = await runPythonCode(mission65, wrongInfiniteWhile)
assert.equal(r65Wrong.basePassed, false, 'while-break-05 without break must fail')

// 7d. while-continue-06 continue verification
const mission66 = getCanonicalLumiMission('while-continue-06')
const wrongCollectAll = `from msense import lumi\nfor s in lumi.scan():\n    lumi.collect(s)`
const { evalResult: r66Wrong } = await runPythonCode(mission66, wrongCollectAll)
assert.equal(r66Wrong.basePassed, false, 'while-continue-06 collecting noise must fail')

const deadContinueCollectAll = `from msense import lumi\nfor s in lumi.scan():\n    if False:\n        continue\n    lumi.collect(s)`
const { evalResult: r66DeadContinue } = await runPythonCode(mission66, deadContinueCollectAll)
assert.equal(r66DeadContinue.basePassed, false, 'while-continue-06 must reject dead continue plus noise collection')

// 7e. function-move-01 defined but not called fails
const mission81 = getCanonicalLumiMission('function-move-01')
const definedNotCalled = `from msense import lumi, world\ndef move_to_beacon():\n    lumi.move(world.target_distance)`
const { evalResult: r81Wrong } = await runPythonCode(mission81, definedNotCalled)
assert.equal(r81Wrong.basePassed, false, 'function-move-01 defined without call must fail')

// 7f. function-scope-05 local variable leaking to global fails
const mission85 = getCanonicalLumiMission('function-scope-05')
const globalLeakedCode = `local_bonus = 10\ndef calc_shield():\n    return local_bonus\ntotal_power = calc_shield()\nprint(total_power)`
const { evalResult: r85Wrong } = await runPythonCode(mission85, globalLeakedCode)
assert.equal(r85Wrong.basePassed, false, 'function-scope-05 with leaked global local_bonus must fail')

const skippedLocalCode = `def calc_shield():\n    return 10\ntotal_power = calc_shield()\nprint(total_power)`
const { evalResult: r85SkippedLocal } = await runPythonCode(mission85, skippedLocalCode)
assert.equal(r85SkippedLocal.basePassed, false, 'function-scope-05 must create local_bonus inside calc_shield')

console.log('  -> All specific control flow, branch, break, continue, function and scope tests verified')

// [Test 8] Pygame Bridge Registry Resolution
console.log('[Test 8] Validating Pygame Bridge Registry...')
for (const m of allOfficialMissions) {
  const bridge = getLumiPygameBridge(m)
  assert.ok(bridge, `${m.id}: Pygame bridge must resolve`)
  assert.ok(bridge.lumiCode, `${m.id}: bridge must have lumiCode`)
  assert.ok(bridge.pygameCode, `${m.id}: bridge must have pygameCode`)
  assert.ok(bridge.commonIdea, `${m.id}: bridge must have commonIdea`)
}
console.log('  -> Pygame Bridge registry resolved cleanly for all missions')

console.log('\n=== All Phase 17 Full ACT Contract Tests Passed! ===')
