import assert from 'node:assert/strict'
import { normalizeRuntimeEvents } from '../src/components/PythonWorld/lumiEventNormalizer.js'
import { reduceLumiWorldState } from '../src/components/PythonWorld/lumiWorldReducer.js'

// Test attributed memory deltas
const eventsWithMemory = normalizeRuntimeEvents([
  { type: 'line', seq: 0, line: 1, variables: {} },
  { type: 'memory_changed', seq: 1, sourceLine: 1, name: 'steps', before: undefined, after: 3 },
  { type: 'line', seq: 2, line: 2, variables: { steps: 3 } },
  { type: 'memory_changed', seq: 3, sourceLine: 2, name: 'energy', before: 5, after: 3 },
  { type: 'sensor_read', seq: 4, sourceLine: 2, sensor: 'steps_to_target', value: 4 },
  { type: 'sensor_read', seq: 5, sourceLine: 2, sensor: 'path_clear', value: true },
])

const state = reduceLumiWorldState({}, eventsWithMemory)
assert.equal(state.variables.steps, 3)
assert.equal(state.variables.energy, 3)
assert.equal(state.sensorReadings.steps_to_target, 4)
assert.equal(state.sensorReadings.path_clear, true)

console.log('Phase 4 Memory Delta & Sensor Trace tests passed!')
