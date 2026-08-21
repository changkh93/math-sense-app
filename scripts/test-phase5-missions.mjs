import assert from 'node:assert/strict'
import { getLumiVerticalSliceSet } from '../src/components/PythonWorld/lumiCourseCatalog.js'
import { evaluateMissionRun } from '../src/components/PythonWorld/missionEvaluator.js'
import { getMissionVariant } from '../src/components/PythonWorld/pythonMissionCatalog.js'

const vsSet = getLumiVerticalSliceSet()
assert.equal(vsSet.missions.length, 10)

const simulatedSolutions = [
  // VS-01
  {
    missionId: 'lumi-vs-01',
    runtimeResult: { finalState: { rover: { awake: true } }, callsUsed: ['lumi.wake'], events: [{ type: 'rover_woke' }] },
    expectedStars: 2,
  },
  // VS-02
  {
    missionId: 'lumi-vs-02',
    runtimeResult: { finalState: { rover: { x: 2, y: 2 } }, callsUsed: ['lumi.move'], events: [{ type: 'rover_moved' }] },
    expectedStars: 2,
  },
  // VS-03
  {
    missionId: 'lumi-vs-03',
    runtimeResult: { finalState: { rover: { x: 4, y: 2 } }, callsUsed: ['lumi.move'], events: [{ type: 'rover_moved' }] },
    expectedStars: 2,
  },
  // VS-04
  {
    missionId: 'lumi-vs-04',
    runtimeResult: { finalState: { rover: { x: 3, y: 2 } }, callsUsed: ['lumi.move', 'lumi.turn'], events: [{ type: 'rover_moved' }, { type: 'rover_turned' }] },
    expectedStars: 2,
  },
  // VS-05
  {
    missionId: 'lumi-vs-05',
    runtimeResult: { finalState: { rover: { x: 2, y: 2 } }, callsUsed: ['lumi.say'], events: [{ type: 'rover_spoke', message: '신호 수신' }] },
    expectedStars: 2,
  },
  // VS-06
  {
    missionId: 'lumi-vs-06',
    runtimeResult: { finalState: { rover: { x: 3, y: 3 } }, callsUsed: ['lumi.move', 'lumi.turn', 'lumi.say'], events: [{ type: 'rover_moved' }, { type: 'rover_spoke' }] },
    hiddenPassed: true,
    expectedStars: 3,
  },
  // VS-07
  {
    missionId: 'lumi-vs-07',
    runtimeResult: { finalState: { rover: { x: 4, y: 2 } }, conceptsUsed: ['variable'], callsUsed: ['lumi.move'], events: [{ type: 'rover_moved' }] },
    expectedStars: 2,
  },
  // VS-08
  {
    missionId: 'lumi-vs-08',
    runtimeResult: { finalState: { rover: { x: 2, y: 2 } }, conceptsUsed: ['variable'], callsUsed: ['lumi.say'], events: [{ type: 'rover_spoke', message: '3' }] },
    expectedStars: 2,
  },
  // VS-09
  {
    missionId: 'lumi-vs-09',
    runtimeResult: { finalState: { rover: { x: 5, y: 2 } }, callsUsed: ['lumi.move'], events: [{ type: 'sensor_read', sensor: 'steps_to_target', value: 4 }, { type: 'rover_moved' }] },
    hiddenPassed: true,
    expectedStars: 3,
  },
  // VS-10
  {
    missionId: 'lumi-vs-10',
    runtimeResult: { finalState: { rover: { x: 5, y: 2 } }, conceptsUsed: ['if'], callsUsed: ['lumi.move'], events: [{ type: 'sensor_read', sensor: 'path_clear', value: true }, { type: 'rover_moved' }] },
    hiddenPassed: true,
    expectedStars: 3,
  },
]

for (const sim of simulatedSolutions) {
  const mission = vsSet.missions.find((m) => m.id === sim.missionId)
  assert.ok(mission, `Mission ${sim.missionId} exists`)
  const result = evaluateMissionRun(mission, sim.runtimeResult, sim.hiddenPassed)
  assert.equal(result.cleared, true, `${mission.id} cleared`)
  assert.equal(result.completed, true, `${mission.id} completed`)
  assert.equal(result.stars, sim.expectedStars, `${mission.id} stars`)
}

// Test VS-10 blocked transfer variant
const vs10 = vsSet.missions.find((m) => m.id === 'lumi-vs-10')
const blockedVariant = vs10.hiddenVariants[0]
const blockedMission = getMissionVariant(vs10, blockedVariant)
const blockedSim = evaluateMissionRun(blockedMission, {
  finalState: { rover: { x: 1, y: 2 } },
  conceptsUsed: ['if'],
  callsUsed: [], // no move call executed because if condition was False!
  events: [{ type: 'sensor_read', sensor: 'path_clear', value: false }],
})
assert.equal(blockedSim.worldGoalPassed, true, 'VS-10 blocked transfer passed by not moving')
assert.equal(blockedSim.conceptPassed, true, 'VS-10 concept evidence (if) satisfied')

const vs09 = vsSet.missions.find((m) => m.id === 'lumi-vs-09')
const nearMission = getMissionVariant(vs09, vs09.hiddenVariants[0])
assert.equal(nearMission.goals[0].x, 3, 'VS-09 singular variant goal updates array-based base goals')

console.log('Phase 5 All 10 Vertical Slice Missions validated successfully!')
