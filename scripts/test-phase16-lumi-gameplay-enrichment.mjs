import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import {
  VERTICAL_SLICE_MISSIONS,
  ALL_VERTICAL_SLICE_MISSIONS,
  ACT_1_MISSIONS,
  ACT_2_MISSIONS,
  GAMEPLAY_VERTICAL_SLICE_MISSIONS,
  LUMI_COURSE_CATALOG,
  getLumiMissionById,
  getLumiMissionRegistrationById,
} from '../src/components/PythonWorld/lumiCourseCatalog.js'
import { getLumiSolutionPreview } from '../src/components/PythonWorld/lumiScaffolding.js'
import { normalizeRuntimeEvents } from '../src/components/PythonWorld/lumiEventNormalizer.js'
import { reduceLumiWorldState, createInitialWorldState } from '../src/components/PythonWorld/lumiWorldReducer.js'
import { evaluateMissionRun } from '../src/components/PythonWorld/missionEvaluator.js'

const workerContent = fs.readFileSync(path.resolve('src/components/PythonWorld/runtime/pythonWorld.worker.js'), 'utf8')
const matchRunner = workerContent.match(/const PYTHON_RUNNER = String\.raw`([\s\S]*?)`\s*async function loadRuntime/)
assert.ok(matchRunner, 'PYTHON_RUNNER script must be present in worker')
const PYTHON_RUNNER_CODE = matchRunner[1]

console.log('=== Running Phase 16: LUMI Gameplay Enrichment & Pygame Bridge Contract ===\n')

// ----------------------------------------------------
// 1. ACT 0 & Curriculum Structure Validation
// ----------------------------------------------------
console.log('[Test 1] Validating ACT 0 and Course Catalog Structure...')
const act0Def = LUMI_COURSE_CATALOG.acts.find((a) => a.id === 'act-0-awakening')
assert.equal(act0Def.coreMissions, 6, 'ACT 0 must have exactly 6 core missions')
assert.equal(VERTICAL_SLICE_MISSIONS.length, 6, 'VERTICAL_SLICE_MISSIONS must contain 6 core missions')
assert.equal(ALL_VERTICAL_SLICE_MISSIONS.length, 10, 'ALL_VERTICAL_SLICE_MISSIONS must contain 10 total missions')

// Verify legacy missions are resolved
assert.ok(getLumiMissionById('lumi-vs-07'), 'lumi-vs-07 must be resolvable')
assert.ok(getLumiMissionById('lumi-vs-10'), 'lumi-vs-10 must be resolvable')
console.log('  -> ACT 0 core & legacy resolution verified')

// ----------------------------------------------------
// 2. ACT 2 v2 Missions & Pygame Bridge Validation
// ----------------------------------------------------
console.log('[Test 2] Validating ACT 2 enriched missions & Pygame Bridge Cards...')
assert.equal(ACT_2_MISSIONS.length, 6, 'ACT 2 must have 6 missions')
assert.equal(ACT_2_MISSIONS[0].id, 'lumi-act2-01')
assert.equal(ACT_2_MISSIONS[1].id, 'lumi-act2-02')
assert.equal(ACT_2_MISSIONS[2].id, 'lumi-act2-03')
assert.equal(getLumiMissionById('lumi-act2-01')?.title, '루미 호출부호 등록', 'stable ACT 2 ID must resolve to enriched content')
assert.equal(getLumiMissionById('lumi-act2-01-legacy')?.title, '첫 기억 슬롯 (Legacy)', 'legacy content must use a non-reward-conflicting ID')
assert.equal(ACT_1_MISSIONS.length, 6, 'ACT 1 catalog count must match its six missions')

const exposedStarterFragments = [
  'game.text.render(pilot_name',
  'game.screen.blit(ship_image',
  'shield = shield - 2',
]
ACT_2_MISSIONS.slice(0, 3).forEach((mission) => {
  exposedStarterFragments.forEach((fragment) => {
    assert.equal(mission.starterCode.includes(fragment), false, `${mission.id} starter must explain the task without exposing ${fragment}`)
  })
})

// Verify Pygame Bridge on ACT 0, ACT 1, ACT 2, and VS Game
const missionsWithBridge = [
  ...VERTICAL_SLICE_MISSIONS,
  ...ACT_1_MISSIONS,
  ...ACT_2_MISSIONS.slice(0, 3),
  ...GAMEPLAY_VERTICAL_SLICE_MISSIONS,
]

missionsWithBridge.forEach((m) => {
  assert.ok(m.pygameBridge, `Mission ${m.id} must have pygameBridge metadata`)
  assert.ok(m.pygameBridge.lumiCode, `Mission ${m.id} pygameBridge must have lumiCode`)
  assert.ok(m.pygameBridge.pygameCode, `Mission ${m.id} pygameBridge must have pygameCode`)
  assert.ok(m.pygameBridge.commonIdea, `Mission ${m.id} pygameBridge must have commonIdea`)
})
console.log(`  -> ${missionsWithBridge.length} Pygame Bridge comparisons verified`)

// ----------------------------------------------------
// 3. 5 Vertical Slice Showcase Missions
// ----------------------------------------------------
console.log('[Test 3] Validating 5 Gameplay Vertical Slice Showcase Missions...')
assert.equal(GAMEPLAY_VERTICAL_SLICE_MISSIONS.length, 5)
const expectedVsGameIds = [
  'lumi-vs-game-01',
  'lumi-vs-game-02',
  'lumi-vs-game-03',
  'lumi-vs-game-04',
  'lumi-vs-game-05',
]
expectedVsGameIds.forEach((id, idx) => {
  assert.equal(GAMEPLAY_VERTICAL_SLICE_MISSIONS[idx].id, id)
  assert.ok(getLumiMissionById(id), `${id} must be registered in course catalog`)
})
console.log('  -> 5 Vertical Slice showcase missions verified')

// ----------------------------------------------------
// 4. Runtime Execution of Solutions via Python Runner
// ----------------------------------------------------
console.log('[Test 4] Executing Mission Solutions in Python Environment...')

function runPythonMission(mission, code) {
  const payload = {
    ...mission,
    code,
    world: mission.world || {},
    input_values: mission.inputValues || [],
    max_steps: 1000,
  }
  const pythonScript = `
mission_payload_json = ${JSON.stringify(JSON.stringify(payload))}
student_code = ${JSON.stringify(code)}
${PYTHON_RUNNER_CODE}
print(_run_mission(mission_payload_json, student_code))
`
  const proc = spawnSync('/usr/bin/python3', ['-c', pythonScript], { encoding: 'utf-8' })
  if (proc.status !== 0) {
    throw new Error(`Python execution failed for ${mission.id}: ${proc.stderr}`)
  }
  return JSON.parse(proc.stdout.trim().split('\n').at(-1))
}

const testTargets = [
  'lumi-vs-01',
  'lumi-vs-02',
  'lumi-vs-03',
  'lumi-vs-04',
  'lumi-vs-05',
  'lumi-vs-06',
  'lumi-act2-01',
  'lumi-act2-02',
  'lumi-act2-03',
  'lumi-vs-game-01',
  'lumi-vs-game-02',
  'lumi-vs-game-03',
  'lumi-vs-game-04',
  'lumi-vs-game-05',
]

testTargets.forEach((targetId) => {
  const mission = getLumiMissionById(targetId)
  assert.ok(mission, `Mission ${targetId} must exist`)
  const solutionPreview = getLumiSolutionPreview(mission)
  assert.ok(solutionPreview, `Solution preview for ${targetId} must exist`)

  const rawResult = runPythonMission(mission, solutionPreview.code)
  assert.equal(rawResult.error, null, `Execution of ${targetId} must succeed without error: ${JSON.stringify(rawResult.error)}`)

  // Normalize events
  const normalizedEvents = normalizeRuntimeEvents(rawResult.events || [])
  assert.ok(Array.isArray(normalizedEvents), `Normalized events for ${targetId} must be array`)

  // World State Reduction
  const reducedState = reduceLumiWorldState(mission.world, normalizedEvents)
  assert.ok(reducedState.gameState, `Reduced state for ${targetId} must have gameState`)

  // Evaluate Mission Goals
  const runtimeResult = {
    events: rawResult.events || [],
    finalState: reducedState,
    conceptsUsed: rawResult.conceptsUsed || [],
    callsUsed: rawResult.callsUsed || [],
    stdout: rawResult.stdout || '',
  }

  const evalResult = evaluateMissionRun(mission, runtimeResult)
  assert.equal(evalResult.basePassed, true, `Mission ${targetId} must pass with solution! Reason: ${evalResult.failureReason} Goals: ${JSON.stringify(evalResult.goalDetails)}`)
  console.log(`  -> Solution ${targetId} executed and cleared 100%`)
})

// ----------------------------------------------------
// 5. World Reducer Game State Verification
// ----------------------------------------------------
console.log('[Test 5] Validating Game State Reducer Invariants...')
const sampleEvents = normalizeRuntimeEvents([
  { type: 'game_inited', width: 640, height: 480 },
  { type: 'screen_blitted', image: 'lumi_gold', position: [2, 2] },
  { type: 'shape_drawn', shape: 'circle', color: '#38bdf8', center: [2, 2], radius: 2 },
  { type: 'text_rendered', text: 'CALLSIGN: NOVA', position: 'top-left' },
  { type: 'hud_bar_updated', label: 'SHIELD', value: 3, maximum: 5 },
  { type: 'sound_played', name: 'shield' },
  { type: 'key_checked', key: 'RIGHT', pressed: true, frame: 1 },
  { type: 'clock_ticked', frame: 1, fps: 10 },
  { type: 'shield_raised', energy: 3 },
  { type: 'game_quitted', frame: 1 },
])

const sampleReduced = reduceLumiWorldState({}, sampleEvents)
assert.equal(sampleReduced.gameState.inited, true)
assert.equal(sampleReduced.gameState.quitted, true)
assert.equal(sampleReduced.gameState.skin, 'lumi_gold')
assert.equal(sampleReduced.gameState.shieldActive, true)
assert.equal(sampleReduced.gameState.lastSound, 'shield')
assert.equal(sampleReduced.gameState.hudBars['SHIELD'].value, 3)
assert.equal(sampleReduced.gameState.shapes.length, 1)
assert.equal(sampleReduced.gameState.texts.length, 1)
assert.ok(sampleReduced.gameState.pressedKeys.includes('RIGHT'))
console.log('  -> Game state reducer invariants verified')

// ----------------------------------------------------
// 6. Deterministic Runtime Semantics & Cost Bounds
// ----------------------------------------------------
console.log('[Test 6] Validating deterministic input, collision, and bounded UI history...')
const runtimeProbeMission = {
  id: 'runtime-probe',
  world: { width: 8, height: 5, rover: { x: 0, y: 0, awake: true } },
  limits: { maxCommands: 40, maxTraceEvents: 200, maxFrames: 4 },
}
const runtimeProbe = runPythonMission(runtimeProbeMission, `from msense import game
print(game.running)
print(game.key.pressed("RIGHT"))
print(game.collides((0, 0), (5, 5)))
print(game.collides((0, 0, 2, 2), (1, 1, 2, 2)))`)
assert.equal(runtimeProbe.error, null)
assert.match(runtimeProbe.stdout, /False\nFalse\nFalse\nTrue/)
const collisionEvents = normalizeRuntimeEvents(runtimeProbe.events).filter((event) => event.type === 'collision_detected')
assert.deepEqual(collisionEvents.map((event) => event.payload.collided), [false, true])

const notStartedTick = runPythonMission(runtimeProbeMission, `from msense import game
game.clock.tick(10)`)
assert.ok(notStartedTick.error, 'tick before init must produce a student-facing error')
assert.match(String(notStartedTick.error?.message || notStartedTick.error), /game\.init/)

const manyVisualEvents = normalizeRuntimeEvents([
  ...Array.from({ length: 100 }, (_, index) => ({ type: 'shape_drawn', shape: 'circle', center: [index, 0], radius: 1 })),
  { type: 'key_checked', key: 'RIGHT', pressed: true },
  { type: 'key_checked', key: 'RIGHT', pressed: false },
])
const boundedState = reduceLumiWorldState({}, manyVisualEvents)
assert.equal(boundedState.gameState.shapes.length, 80, 'shape history must remain capped for long loops')
assert.equal(boundedState.gameState.pressedKeys.includes('RIGHT'), false, 'released keys must not remain visually stuck')
console.log('  -> deterministic input, real overlap checks, and bounded history verified')

console.log('\n=== All Phase 16 Gameplay Enrichment & Pygame Bridge Tests Passed! ===')
