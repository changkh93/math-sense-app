import assert from 'node:assert/strict'
import {
  getBuiltinPythonMissionSets,
  getPythonMissionSetForUnit,
  getLumiVerticalSliceSet,
  getLumiCourseCatalog,
  getAllPythonMissionSets,
} from '../src/components/PythonWorld/pythonMissionCatalog.js'
import { evaluateMissionRun } from '../src/components/PythonWorld/missionEvaluator.js'

// 1. Catalog contract
const legacySets = getBuiltinPythonMissionSets()
assert.equal(legacySets.length, 4)
assert.equal(legacySets.reduce((sum, item) => sum + item.missions.length, 0), 20)

const vsSet = getLumiVerticalSliceSet()
assert.equal(vsSet.id, 'lumi-vertical-slice-v1')
assert.equal(vsSet.kind, 'prototype')
assert.equal(vsSet.missions.length, 10)

const courseCatalog = getLumiCourseCatalog()
assert.equal(courseCatalog.id, 'lumi-season-1')
assert.equal(courseCatalog.acts.length, 10)
assert.equal(courseCatalog.acts.reduce((sum, act) => sum + act.coreMissions, 0), 61)
const dataCore = courseCatalog.acts.find((act) => act.id === 'act-7-data')
assert.match(dataCore.concepts, /split/)
assert.match(dataCore.concepts, /join/)
assert.match(dataCore.concepts, /tuple/)
assert.equal(vsSet.missions[0].starterCode, 'lumi.wake()')

const allSets = getAllPythonMissionSets()
assert.equal(allSets.length, 6)

// 2. Evaluator new goal types
// VS-01: awake goal
const evalAwake = evaluateMissionRun({
  goals: [{ type: 'awake' }],
  conceptEvidence: { mustCall: ['lumi.wake'] },
}, {
  finalState: { rover: { x: 2, y: 2, awake: true } },
  callsUsed: ['lumi.wake'],
  events: [{ type: 'rover_woke' }],
})
assert.equal(evalAwake.worldGoalPassed, true)
assert.equal(evalAwake.conceptPassed, true)
assert.equal(evalAwake.cleared, true)
assert.equal(evalAwake.nextUnlocked, true)
assert.equal(evalAwake.stars, 2) // 3 stars are reserved for a passed transfer route

// VS-05 / VS-06: eventOccurred / spokenMessage
const evalSpeech = evaluateMissionRun({
  goals: [{ type: 'position', x: 3, y: 3 }, { type: 'eventOccurred', eventType: 'rover_spoke' }],
  conceptEvidence: { mustCall: ['lumi.move', 'lumi.turn', 'lumi.say'] },
}, {
  finalState: { rover: { x: 3, y: 3 } },
  callsUsed: ['lumi.move', 'lumi.turn', 'lumi.say'],
  events: [
    { type: 'rover_moved' },
    { type: 'rover_turned' },
    { type: 'rover_spoke', message: '비콘 도착' },
  ],
})
assert.equal(evalSpeech.worldGoalPassed, true)
assert.equal(evalSpeech.conceptPassed, true)

// Worker raw events must also satisfy v2 event goals.
const evalRawSpeech = evaluateMissionRun({
  goals: [{ type: 'eventOccurred', eventType: 'rover_spoke' }],
  conceptEvidence: { mustCall: ['lumi.say'] },
}, {
  finalState: { rover: { x: 2, y: 2 } },
  callsUsed: ['lumi.say'],
  events: [{ type: 'world', action: 'say', message: '신호 수신' }],
})
assert.equal(evalRawSpeech.worldGoalPassed, true)

// VS-10: blocked transfer goal (positionUnchanged & noCollision)
const evalBlockedTransfer = evaluateMissionRun({
  world: { rover: { x: 1, y: 2 } },
  goals: [
    { type: 'positionUnchanged', x: 1, y: 2 },
    { type: 'noCollision' },
  ],
  conceptEvidence: { mustUse: ['if'] },
}, {
  finalState: { rover: { x: 1, y: 2 } },
  conceptsUsed: ['if'],
  callsUsed: [],
  events: [{ type: 'sensor_read', sensor: 'path_clear', value: false }],
})
assert.equal(evalBlockedTransfer.worldGoalPassed, true)
assert.equal(evalBlockedTransfer.conceptPassed, true)
assert.equal(evalBlockedTransfer.stars, 2)

const malformedMission = evaluateMissionRun({}, { finalState: { rover: { awake: true } } })
assert.equal(malformedMission.worldGoalPassed, false)

// Missing required concept prevents mission clearance
const eval1Star = evaluateMissionRun({
  goals: [{ type: 'position', x: 4, y: 2 }],
  conceptEvidence: { mustUse: ['for', 'range'] },
}, {
  finalState: { rover: { x: 4, y: 2 } },
  conceptsUsed: [], // bypassed concepts
})
assert.equal(eval1Star.worldGoalPassed, true)
assert.equal(eval1Star.conceptPassed, false)
assert.equal(eval1Star.cleared, false)
assert.equal(eval1Star.completed, false)
assert.equal(eval1Star.nextUnlocked, false)
assert.equal(eval1Star.stars, 0)

console.log('Phase 1 API & Evaluator contract tests passed!')
