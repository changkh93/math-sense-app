import assert from 'node:assert/strict'
import { normalizeRuntimeEvents } from '../src/components/PythonWorld/lumiEventNormalizer.js'
import { reduceLumiWorldState, createPlaybackSteps } from '../src/components/PythonWorld/lumiWorldReducer.js'

// 1. Raw worker event normalization
const rawEvents = [
  { type: 'line', seq: 0, line: 1, variables: {}, rover: { x: 1, y: 1, direction: 0, energy: 100, awake: false } },
  { type: 'world', seq: 1, action: 'wake', end: { x: 1, y: 1, direction: 0, energy: 100, awake: true } },
  { type: 'line', seq: 2, line: 2, variables: { steps: 2 }, rover: { x: 1, y: 1, direction: 0, energy: 100, awake: true } },
  { type: 'world', seq: 3, action: 'move', start: { x: 1, y: 1 }, end: { x: 3, y: 1, direction: 0, energy: 98, awake: true }, path: [{ x: 2, y: 1 }, { x: 3, y: 1 }] },
  { type: 'line', seq: 4, line: 3, variables: { steps: 2 }, rover: { x: 3, y: 1, direction: 0, energy: 98, awake: true } },
  { type: 'world', seq: 5, action: 'say', message: '도착 완료', end: { x: 3, y: 1, direction: 0, energy: 98, awake: true } },
]

const normalized = normalizeRuntimeEvents(rawEvents)
assert.equal(normalized.length, 6)
assert.equal(normalized[0].type, 'line_entered')
assert.equal(normalized[0].sourceLine, 1)
assert.equal(normalized[1].type, 'rover_woke')
assert.equal(normalized[3].type, 'rover_moved')
assert.equal(normalized[3].payload.end.x, 3)
assert.equal(normalized[5].type, 'rover_spoke')
assert.equal(normalized[5].payload.message, '도착 완료')

// 2. Pure World Reducer determinism test
const initialWorld = {
  width: 6,
  height: 5,
  rover: { x: 1, y: 1, direction: 0, energy: 100, awake: false },
  target: { x: 3, y: 1, kind: 'beacon' },
}

// Full replay
const fullState = reduceLumiWorldState(initialWorld, normalized)
assert.equal(fullState.rover.awake, true)
assert.equal(fullState.rover.x, 3)
assert.equal(fullState.rover.energy, 98)
assert.equal(fullState.rover.lastMessage, '도착 완료')
assert.equal(fullState.variables.steps, 2)

// Intermediate sequence (before move, at seq 2)
const intermediate = reduceLumiWorldState(initialWorld, normalized, 2)
assert.equal(intermediate.rover.awake, true)
assert.equal(intermediate.rover.x, 1) // not moved yet
assert.equal(intermediate.rover.energy, 100)

// Initial sequence (seq 0)
const initial = reduceLumiWorldState(initialWorld, normalized, 0)
assert.equal(initial.rover.awake, false)
assert.equal(initial.rover.x, 1)

const emptyEnergyState = reduceLumiWorldState({ rover: { energy: 0 } }, [])
assert.equal(emptyEnergyState.rover.energy, 0)

// Determinism: calling it 100 times produces identical result
for (let i = 0; i < 100; i++) {
  const rerun = reduceLumiWorldState(initialWorld, normalized)
  assert.deepEqual(rerun, fullState)
}

// 3. Playback Steps grouping
const steps = createPlaybackSteps(normalized)
assert.equal(steps.length, 3) // Line 1, Line 2, Line 3
assert.equal(steps[0].sourceLine, 1)
assert.equal(steps[0].events.length, 2) // line_entered + rover_woke
assert.equal(steps[1].sourceLine, 2)
assert.equal(steps[1].events.length, 2) // line_entered + rover_moved
assert.equal(steps[2].sourceLine, 3)
assert.equal(steps[2].events.length, 2) // line_entered + rover_spoke

console.log('Phase 2 Event Normalizer & Pure World Reducer tests passed!')
