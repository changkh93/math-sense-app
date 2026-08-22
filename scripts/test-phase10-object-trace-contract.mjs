import assert from 'node:assert/strict';
import { normalizeRuntimeEvents } from '../src/components/PythonWorld/lumiEventNormalizer.js';
import { reduceExecutionTraceState } from '../src/components/PythonWorld/executionTraceReducer.js';
import { evaluateMissionRun } from '../src/components/PythonWorld/missionEvaluator.js';
import { OBJECT_TRACE_SPIKE_MISSIONS, getObjectTraceSpikeMissionById } from '../src/components/PythonWorld/lumiObjectTraceSpikeCatalog.js';

console.log('=== Running Phase 10: Execution Trace & Object Trace Contract Tests ===');

// 1. Test Event Normalizer with Frame and Object Events
console.log('[Test 1] Testing Event Normalizer for Unified Frame & Object Events...');
const rawEventsSample = [
  { type: 'line', line: 1, variables: { a: 10 }, frameId: 'main' },
  {
    type: 'frame_entered',
    frameId: 'frame_1',
    callableKind: 'method',
    functionName: 'charge',
    receiverInstanceId: 'instance-1',
    sourceLine: 6,
  },
  {
    type: 'line',
    line: 7,
    variables: {
      self: { kind: 'python_instance', id: 'instance-1', className: 'Drone', publicAttributes: { integrity: 20 } },
    },
    activeFrameId: 'frame_1',
    receiverInstanceId: 'instance-1',
  },
  {
    type: 'memory_changed',
    sourceLine: 7,
    name: 'self',
    before: { kind: 'python_instance', id: 'instance-1', className: 'Drone', publicAttributes: { integrity: 20 } },
    after: { kind: 'python_instance', id: 'instance-1', className: 'Drone', publicAttributes: { integrity: 30 } },
    receiverInstanceId: 'instance-1',
  },
  {
    type: 'frame_exited',
    frameId: 'frame_1',
    functionName: 'charge',
    returnValue: null,
    sourceLine: 8,
  },
];

const normalized = normalizeRuntimeEvents(rawEventsSample);
assert.equal(normalized.length, 5);
assert.equal(normalized[0].type, 'line_entered');
assert.equal(normalized[1].type, 'frame_entered');
assert.equal(normalized[1].payload.callableKind, 'method');
assert.equal(normalized[1].payload.receiverInstanceId, 'instance-1');
assert.equal(normalized[3].type, 'memory_changed');
assert.equal(normalized[4].type, 'frame_exited');
console.log('  -> Event Normalizer contract verified');

// 2. Test Execution Trace Reducer (Variables, Instances, Aliases, & Self Focus)
console.log('[Test 2] Testing ExecutionTraceReducer State Reconstruction...');

// Step 2.1: Before method call (seq 0)
const stateAt0 = reduceExecutionTraceState(normalized, 0);
assert.equal(stateAt0.activeFrameId, 'main');
assert.equal(stateAt0.activeSelfRef, null);
assert.equal(stateAt0.variables.a, 10);

// Step 2.2: During method call (seq 2)
const stateAt2 = reduceExecutionTraceState(normalized, 2);
assert.equal(stateAt2.activeFrameId, 'frame_1');
assert.equal(stateAt2.activeSelfRef, 'instance-1');
assert.equal(stateAt2.callStack.length, 1);
assert.equal(stateAt2.callStack[0].functionName, 'charge');
assert.ok(stateAt2.instances['instance-1']);
assert.equal(stateAt2.instances['instance-1'].publicAttributes.integrity, 20);

// Step 2.3: After attribute mutation (seq 3)
const stateAt3 = reduceExecutionTraceState(normalized, 3);
assert.equal(stateAt3.activeSelfRef, 'instance-1');
assert.equal(stateAt3.instances['instance-1'].publicAttributes.integrity, 30);

// Step 2.4: After method return (seq 4)
const stateAt4 = reduceExecutionTraceState(normalized, 4);
assert.equal(stateAt4.activeFrameId, 'main');
assert.equal(stateAt4.activeSelfRef, null);
assert.equal(stateAt4.callStack.length, 0);
assert.equal(stateAt4.instances['instance-1'].publicAttributes.integrity, 30);
console.log('  -> ExecutionTraceReducer step-by-step determinism verified');

// 3. Test Instance Identity vs Aliasing (a = Drone(); b = a)
console.log('[Test 3] Testing Identity vs Variable Alias Bindings...');
const aliasEvents = normalizeRuntimeEvents([
  {
    type: 'line',
    line: 1,
    variables: {
      Drone: { kind: 'python_class', className: 'Drone', methods: ['__init__', 'charge'] },
      scout: { kind: 'python_instance', id: 'instance-1', className: 'Drone', publicAttributes: { integrity: 20 } },
      backup: { kind: 'python_instance', id: 'instance-1', className: 'Drone', publicAttributes: { integrity: 20 } },
    },
  },
]);

const aliasState = reduceExecutionTraceState(aliasEvents);
assert.equal(Object.keys(aliasState.classes).length, 1);
assert.equal(aliasState.classes['Drone'].name, 'Drone');
// Key requirement: Distinct instance count must be 1, NOT 2!
assert.equal(Object.keys(aliasState.instances).length, 1, 'Aliased variable must map to exactly 1 distinct instance');
const inst1 = aliasState.instances['instance-1'];
assert.ok(inst1);
assert.deepEqual(inst1.bindings.sort(), ['backup', 'scout'].sort(), 'Both variable names must be registered as bindings');
console.log('  -> Instance identity and alias tracking verified (distinctInstanceCount = 1)');

// 4. Test In-place Mutation Detection (Custom Instance, List, Dict)
console.log('[Test 4] Testing In-place Mutation Detection in Event Tape...');
const mutationEvents = normalizeRuntimeEvents([
  {
    type: 'line',
    line: 1,
    variables: {
      scout_1: { kind: 'python_instance', id: 'instance-1', className: 'Drone', publicAttributes: { integrity: 20 } },
      scout_2: { kind: 'python_instance', id: 'instance-2', className: 'Drone', publicAttributes: { integrity: 20 } },
      packet_list: [1, 2, 3],
      status_map: { code: 'INIT' },
    },
  },
  // scout_1 mutated, scout_2 untouched, list appended, map updated
  {
    type: 'memory_changed',
    sourceLine: 5,
    name: 'scout_1',
    before: { kind: 'python_instance', id: 'instance-1', className: 'Drone', publicAttributes: { integrity: 20 } },
    after: { kind: 'python_instance', id: 'instance-1', className: 'Drone', publicAttributes: { integrity: 30 } },
  },
  {
    type: 'memory_changed',
    sourceLine: 6,
    name: 'packet_list',
    before: [1, 2, 3],
    after: [1, 2, 3, 4],
  },
  {
    type: 'memory_changed',
    sourceLine: 7,
    name: 'status_map',
    before: { code: 'INIT' },
    after: { code: 'ACTIVE' },
  },
  {
    type: 'line',
    line: 8,
    variables: {
      scout_1: { kind: 'python_instance', id: 'instance-1', className: 'Drone', publicAttributes: { integrity: 30 } },
      scout_2: { kind: 'python_instance', id: 'instance-2', className: 'Drone', publicAttributes: { integrity: 20 } },
      packet_list: [1, 2, 3, 4],
      status_map: { code: 'ACTIVE' },
    },
  },
]);

const mutationState = reduceExecutionTraceState(mutationEvents);
assert.equal(mutationState.instances['instance-1'].publicAttributes.integrity, 30);
assert.equal(mutationState.instances['instance-2'].publicAttributes.integrity, 20);
assert.deepEqual(mutationState.variables.packet_list, [1, 2, 3, 4]);
assert.deepEqual(mutationState.variables.status_map, { code: 'ACTIVE' });
console.log('  -> In-place mutation detection verified for instances, lists, and dicts');

// 5. Test Spike 01 Evaluation (Class & Instance)
console.log('[Test 5] Testing Spike 01 Evaluator...');
const spike01Mission = getObjectTraceSpikeMissionById('spike-obj-01');
assert.ok(spike01Mission, 'Spike 01 mission exists in dev catalog');

// 5.1 Valid Spike 01 Run
const validSpike01Runtime = {
  conceptsUsed: ['class', 'ClassDef', 'variable'],
  callsUsed: ['Drone'],
  events: [
    {
      type: 'line',
      line: 2,
      variables: {
        Drone: { kind: 'python_class', className: 'Drone', methods: [] },
      },
    },
    {
      type: 'line',
      line: 5,
      variables: {
        Drone: { kind: 'python_class', className: 'Drone', methods: [] },
        scout: { kind: 'python_instance', id: 'instance-1', className: 'Drone', publicAttributes: {} },
      },
    },
  ],
};

const eval01Success = evaluateMissionRun(spike01Mission, validSpike01Runtime);
assert.equal(eval01Success.cleared, true);
assert.equal(eval01Success.conceptPassed, true);
assert.equal(eval01Success.worldGoalPassed, true);
assert.equal(eval01Success.stars, 2);

// 5.2 Invalid Spike 01 Run: Defined class but didn't instantiate
const invalidSpike01NoInstance = {
  conceptsUsed: ['class', 'ClassDef'],
  callsUsed: [],
  events: [
    {
      type: 'line',
      line: 2,
      variables: {
        Drone: { kind: 'python_class', className: 'Drone', methods: [] },
      },
    },
  ],
};
const eval01Fail = evaluateMissionRun(spike01Mission, invalidSpike01NoInstance);
assert.equal(eval01Fail.cleared, false, 'Should fail when instance is not created');
assert.equal(eval01Fail.worldGoalPassed, false);
console.log('  -> Spike 01 Evaluator rules verified');

// 6. Test Spike 02 Evaluation (Self & Attribute Isolation)
console.log('[Test 6] Testing Spike 02 Evaluator...');
const spike02Mission = getObjectTraceSpikeMissionById('spike-obj-02');
assert.ok(spike02Mission, 'Spike 02 mission exists in dev catalog');

// 6.1 Valid Spike 02 Run
const validSpike02Runtime = {
  conceptsUsed: ['class', 'ClassDef', '__init__', 'self', 'self_attribute', 'method', 'variable', '+'],
  callsUsed: ['Drone', 'scout_1.charge'],
  events: [
    {
      type: 'line',
      line: 8,
      variables: {
        scout_1: { kind: 'python_instance', id: 'instance-1', className: 'Drone', publicAttributes: { name: 'ALPHA', integrity: 20 } },
        scout_2: { kind: 'python_instance', id: 'instance-2', className: 'Drone', publicAttributes: { name: 'BETA', integrity: 20 } },
      },
    },
    {
      type: 'frame_entered',
      frameId: 'frame_1',
      callableKind: 'method',
      functionName: 'charge',
      receiverInstanceId: 'instance-1',
      sourceLine: 6,
    },
    {
      type: 'memory_changed',
      sourceLine: 6,
      name: 'scout_1',
      before: { kind: 'python_instance', id: 'instance-1', className: 'Drone', publicAttributes: { name: 'ALPHA', integrity: 20 } },
      after: { kind: 'python_instance', id: 'instance-1', className: 'Drone', publicAttributes: { name: 'ALPHA', integrity: 30 } },
      receiverInstanceId: 'instance-1',
    },
    {
      type: 'frame_exited',
      frameId: 'frame_1',
      functionName: 'charge',
      returnValue: null,
      sourceLine: 7,
    },
    {
      type: 'line',
      line: 11,
      variables: {
        scout_1: { kind: 'python_instance', id: 'instance-1', className: 'Drone', publicAttributes: { name: 'ALPHA', integrity: 30 } },
        scout_2: { kind: 'python_instance', id: 'instance-2', className: 'Drone', publicAttributes: { name: 'BETA', integrity: 20 } },
      },
    },
  ],
};

const eval02Success = evaluateMissionRun(spike02Mission, validSpike02Runtime);
assert.equal(eval02Success.cleared, true);
assert.equal(eval02Success.conceptPassed, true);
assert.equal(eval02Success.worldGoalPassed, true);
assert.equal(eval02Success.stars, 2);

// 6.2 Invalid Spike 02 Run: Mutated both instances or didn't execute charge
const invalidSpike02BothChanged = {
  conceptsUsed: ['class', '__init__', 'self', 'method'],
  callsUsed: ['Drone'],
  events: [
    {
      type: 'line',
      line: 11,
      variables: {
        scout_1: { kind: 'python_instance', id: 'instance-1', className: 'Drone', publicAttributes: { name: 'ALPHA', integrity: 30 } },
        scout_2: { kind: 'python_instance', id: 'instance-2', className: 'Drone', publicAttributes: { name: 'BETA', integrity: 30 } },
      },
    },
  ],
};
const eval02Fail = evaluateMissionRun(spike02Mission, invalidSpike02BothChanged);
assert.equal(eval02Fail.cleared, false, 'Should fail when self did not isolate target instance');
console.log('  -> Spike 02 Evaluator rules verified');

// 7. Catalog Isolation Verification
console.log('[Test 7] Verifying Spike Catalog Complete Isolation from Production Catalog...');
assert.equal(OBJECT_TRACE_SPIKE_MISSIONS.length, 2);
OBJECT_TRACE_SPIKE_MISSIONS.forEach((m) => {
  assert.equal(m.experienceType, 'lumi_spike');
  assert.equal(m.reward, undefined, 'Spike missions must NOT have reward metadata');
});
console.log('  -> Spike catalog is 100% clean and isolated');

console.log('=== All Phase 10 Contract Tests Passed! ===\n');
