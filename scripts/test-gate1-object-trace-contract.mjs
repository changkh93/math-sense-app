import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { LUMI_OBJECT_SPIKE_ENABLED } from '../src/config/lumiFeatureFlags.js';
import {
  selectClassRegistrations,
  selectInstanceCreations,
  selectInstanceAliases,
  selectAttributeDiffs,
  deriveExecutionModel,
} from '../src/components/PythonWorld/executionTraceSelectors.js';
import { normalizeRuntimeEvents } from '../src/components/PythonWorld/lumiEventNormalizer.js';
import { reduceExecutionTraceState } from '../src/components/PythonWorld/executionTraceReducer.js';
import { evaluateMissionRun } from '../src/components/PythonWorld/missionEvaluator.js';
import {
  LUMI_OBJECT_TRACE_SPIKE_SET,
  OBJECT_TRACE_SPIKE_MISSIONS,
} from '../src/components/PythonWorld/lumiObjectTraceSpikeCatalog.js';
import {
  getLumiMissionById,
  getLumiMissionSet,
} from '../src/components/PythonWorld/lumiCourseCatalog.js';
import {
  getCanonicalLumiMission,
} from '../src/services/lumiRewardPolicy.js';

console.log('=== Running Real CPython Runner & Hardened Gate 1 Invariant Tests ===\n');

// 1. Student beta access
console.log('[Test 1] Verifying Student Beta Access...');
assert.equal(LUMI_OBJECT_SPIKE_ENABLED, true, 'Object Trace must be open during the student beta');
assert.equal(getLumiMissionSet('technical-spike-object-trace').id, LUMI_OBJECT_TRACE_SPIKE_SET.id);
console.log('  -> Object Trace is reachable from the student course hub');

// 2. Production Catalog & Reward Policy Isolation
console.log('[Test 2] Verifying Canonical Progress & Reward Registration...');
assert.ok(getLumiMissionById('spike-obj-01'));
assert.ok(getLumiMissionById('SPIKE-01'));
assert.ok(getCanonicalLumiMission('spike-obj-01'));
assert.ok(getCanonicalLumiMission('spike-obj-02'));
console.log('  -> Object Trace missions resolve through the canonical learning ledger');

// 3. Zero-Persistence Tagging
console.log('[Test 3] Verifying Official Student-Beta Policies...');
assert.equal(LUMI_OBJECT_TRACE_SPIKE_SET.kind, 'technical-spike');
assert.equal(LUMI_OBJECT_TRACE_SPIKE_SET.persistencePolicy, 'official');
assert.equal(LUMI_OBJECT_TRACE_SPIKE_SET.rewardPolicy, 'standard-crystals');
assert.equal(LUMI_OBJECT_TRACE_SPIKE_SET.dailyRecordPolicy, 'official');
LUMI_OBJECT_TRACE_SPIKE_SET.missions.forEach((m) => {
  assert.equal(m.persistencePolicy, 'official');
  assert.equal(m.rewardPolicy, 'standard-crystals');
});
console.log('  -> Progress, daily records and rewards are enabled');

// 4. Real Python Execution Engine Setup
const workerFilePath = path.resolve('src/components/PythonWorld/runtime/pythonWorld.worker.js');
const workerContent = fs.readFileSync(workerFilePath, 'utf8');

const matchRunner = workerContent.match(/const PYTHON_RUNNER = String\.raw`([\s\S]*?)`\s*async function loadRuntime/);
assert.ok(matchRunner, 'Must extract PYTHON_RUNNER from worker file');
const pythonRunnerCode = matchRunner[1];

function runPythonInRealCPython(missionJson, studentCode) {
  const runnerScript = `
mission_payload_json = ${JSON.stringify(JSON.stringify(missionJson))}
student_code = ${JSON.stringify(studentCode)}

${pythonRunnerCode}
print(_run_mission(mission_payload_json, student_code))
`;

  const child = spawnSync('/usr/bin/python3', ['-c', runnerScript], {
    encoding: 'utf8',
    env: { PATH: '/usr/bin:/bin:/usr/sbin:/sbin', HOME: process.env.HOME || '/Users/selah' },
  });
  if (child.error || child.status !== 0) {
    throw new Error(`Python execution failed: ${child.stderr || child.error}`);
  }
  const lines = child.stdout.trim().split('\n');
  const jsonStr = lines[lines.length - 1];
  return JSON.parse(jsonStr);
}

// 5. Real CPython Execution: SPIKE-01 (Last line instantiation)
console.log('[Test 4] Real CPython: Verifying SPIKE-01 Execution & Last-Line Instance Detection...');
const spike01Mission = OBJECT_TRACE_SPIKE_MISSIONS[0];
const spike01Code = `class Drone:\n    pass\n\nscout = Drone()`;
const spike01Result = runPythonInRealCPython(spike01Mission, spike01Code);

assert.ok(!spike01Result.error, 'SPIKE-01 must execute with 0 error');
assert.ok(spike01Result.classesMetadata.Drone, 'AST must extract Drone class');

const spike01Model = deriveExecutionModel(spike01Result.events, Infinity, spike01Result.classesMetadata);
assert.equal(spike01Model.instances.length, 1, 'scout instance must be created in real trace');
assert.equal(spike01Model.instances[0].primaryBinding, 'scout');
assert.equal(spike01Model.instances[0].className, 'Drone');
console.log('  -> Real CPython SPIKE-01 produced valid trace and detected scout instance');

// 6. Real CPython Execution: SPIKE-02 (Methods, self receiver, exact 1x mutation)
console.log('[Test 5] Real CPython: Verifying SPIKE-02 Execution, Receiver ID & Single Mutation...');
const spike02Mission = OBJECT_TRACE_SPIKE_MISSIONS[1];
const spike02Code = `class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity

    def charge(self, amount):
        self.integrity += amount

scout_1 = Drone("ALPHA", 20)
scout_2 = Drone("BETA", 20)
scout_1.charge(10)
`;

const spike02Result = runPythonInRealCPython(spike02Mission, spike02Code);
assert.ok(!spike02Result.error, 'SPIKE-02 must execute with 0 error');
assert.ok(spike02Result.classesMetadata.Drone, 'AST must extract Drone class metadata');
assert.deepEqual(spike02Result.classesMetadata.Drone.initParameters, ['name', 'integrity']);

// Inspect events
const events = spike02Result.events;
const frameEnters = events.filter((e) => e.type === 'frame_entered');
const initFrames = frameEnters.filter((e) => e.functionName === '__init__');
assert.equal(initFrames.length, 2, 'Must have 2 __init__ frame entries');
assert.equal(initFrames[0].receiverInstanceId, 'instance-1', '__init__ receiverInstanceId must be instance-1 (not null)');
assert.equal(initFrames[1].receiverInstanceId, 'instance-2', '__init__ receiverInstanceId must be instance-2 (not null)');

const chargeFrame = frameEnters.find((e) => e.functionName === 'charge');
assert.ok(chargeFrame, 'Must enter charge() frame');
assert.equal(chargeFrame.receiverInstanceId, 'instance-1', 'charge receiverInstanceId must be instance-1');

// Verify attribute mutation count for integrity: exactly 1 mutation event for 20 -> 30
const chargeMutations = events.filter(
  (e) => e.type === 'memory_changed' &&
    (e.before?.publicAttributes?.integrity ?? e.payload?.before?.publicAttributes?.integrity) === 20 &&
    (e.after?.publicAttributes?.integrity ?? e.payload?.after?.publicAttributes?.integrity) === 30
);
assert.equal(chargeMutations.length, 1, 'Must emit EXACTLY 1 mutation event for 20 -> 30 without duplicate global re-emission');
assert.equal(chargeMutations[0].sourceLine, 7, 'Mutation source line must point to charge method line 7');

// Derived model verification
const spike02Model = deriveExecutionModel(events, Infinity, spike02Result.classesMetadata);
assert.equal(spike02Model.instances.length, 2, 'Must produce 2 distinct instances');
assert.equal(spike02Model.instances[0].primaryBinding, 'scout_1', 'scout_1 must be primary binding');
assert.equal(spike02Model.instances[1].primaryBinding, 'scout_2', 'scout_2 must be primary binding');
assert.equal(spike02Model.instances[0].publicAttributes.integrity, 30, 'scout_1 integrity is 30');
assert.equal(spike02Model.instances[1].publicAttributes.integrity, 20, 'scout_2 integrity is 20');

const normalizedSpike02Events = normalizeRuntimeEvents(events);
const spike02TraceState = reduceExecutionTraceState(normalizedSpike02Events);
assert.equal(spike02TraceState.instances['instance-1'].publicAttributes.integrity, 30, 'Evaluator reducer must retain scout_1 integrity 30');
assert.equal(spike02TraceState.instances['instance-2'].publicAttributes.integrity, 20, 'Evaluator reducer must retain scout_2 integrity 20');
assert.deepEqual(spike02TraceState.instances['instance-1'].bindings, ['scout_1'], 'self must not become a persistent instance binding');

const spike02Evaluation = evaluateMissionRun(spike02Mission, spike02Result);
assert.equal(spike02Evaluation.worldGoalPassed, true, 'Real SPIKE-02 solution must satisfy every runtime goal');
assert.equal(spike02Evaluation.passed, true, 'Real SPIKE-02 solution must pass the production evaluator');
assert.equal(spike02Evaluation.stars, 2, 'A non-transfer spike clear earns the expected 2-star result');
console.log('  -> Real CPython SPIKE-02 produced exact single mutation event and clean receiver IDs');

// 7. Real CPython Execution: Variable Reassignment & Current-Binding Model
console.log('[Test 6] Real CPython: Verifying Variable Reassignment (b = a; b = Drone())...');
const reassignCode = `class Drone:
    pass

a = Drone()
b = a
b = Drone()
`;
const reassignResult = runPythonInRealCPython(spike01Mission, reassignCode);
assert.ok(!reassignResult.error);

const reassignModel = deriveExecutionModel(reassignResult.events, Infinity, {});
assert.equal(reassignModel.instances.length, 2, 'Must have 2 instances');
assert.equal(reassignModel.instances[0].primaryBinding, 'a', 'instance-1 has primary binding "a"');
assert.deepEqual(reassignModel.instances[0].bindings, ['a'], 'instance-1 must NOT retain "b" alias after reassignment');
assert.equal(reassignModel.instances[1].primaryBinding, 'b', 'instance-2 has primary binding "b"');
assert.deepEqual(reassignModel.instances[1].bindings, ['b'], 'instance-2 has binding "b"');
assert.equal(reassignModel.aliases.length, 0, 'No aliases remain after b is reassigned');
console.log('  -> Current-binding model successfully pruned old alias on reassignment');

// 8. Real CPython Execution: Instance Limit Cap (> 50 instances)
console.log('[Test 7] Real CPython: Verifying Instance Limit Cap (> 50 instances)...');
const capCode = `class Drone:
    def __init__(self):
        pass

drones = [Drone() for _ in range(60)]
`;
const capResult = runPythonInRealCPython(spike01Mission, capCode);
assert.ok(capResult.error, 'Must raise limit error when instance cap exceeded');
assert.equal(capResult.error.type, 'MissionLimitError');
assert.ok(capResult.error.message.includes('인스턴스 생성 한도'), 'Error message must specify instance limit');
console.log('  -> Instance limit cap enforced at 50 instances');

// 9. Deterministic Replay Time-Travel Test
console.log('[Test 8] Verifying Replay Time-Travel on Real Trace Events...');
const initialReplay = deriveExecutionModel(events, -1, spike02Result.classesMetadata);
assert.equal(initialReplay.instances.length, 0, 'At playhead -1, instances count must be 0');
assert.equal(initialReplay.attributeDiffs.length, 0, 'At playhead -1, diffs count must be 0');

const midStepSeq = chargeFrame.seq - 1;
const midReplay = deriveExecutionModel(events, midStepSeq, spike02Result.classesMetadata);
assert.equal(midReplay.instances[0].publicAttributes.integrity, 20, 'Before charge step, scout_1 integrity must be 20');
console.log('  -> Deterministic time-travel verified on real execution tape');

console.log('\n=== All Real CPython & Hardened Gate 1 Tests Passed 100%! ===');
