import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  LUMI_OBJECT_LEARNING_PILOT_ENABLED,
  LUMI_OBJECT_SPIKE_ENABLED,
} from '../src/config/lumiFeatureFlags.js';
import {
  LUMI_OBJECT_LEARNING_PILOT_SET,
  PILOT_OBJECT_MISSIONS,
} from '../src/components/PythonWorld/lumiObjectLearningPilotCatalog.js';
import {
  getLumiMissionById,
  getLumiMissionSet,
} from '../src/components/PythonWorld/lumiCourseCatalog.js';
import {
  getCanonicalLumiMission,
} from '../src/services/lumiRewardPolicy.js';
import {
  evaluateMissionRun,
} from '../src/components/PythonWorld/missionEvaluator.js';
import {
  selectSystemObjectInspectorItems,
} from '../src/components/PythonWorld/executionTraceSelectors.js';

console.log('=== Running Gate 2: Object Learning Pilot Contract & Real CPython Integration Tests ===\n');

// 1. Feature Flag Invariant (Default must be strictly false)
console.log('[Test 1] Verifying Gate 2 Student Beta Access...');
assert.equal(LUMI_OBJECT_LEARNING_PILOT_ENABLED, true);
assert.equal(getLumiMissionSet('object-learning-pilot').id, LUMI_OBJECT_LEARNING_PILOT_SET.id);
console.log('  -> Gate 2 is open from the student course hub');

// 2. Production Catalog & Reward Policy Isolation
console.log('[Test 2] Verifying Canonical Progress & Reward Registration...');
assert.ok(getLumiMissionById('pilot-object-9-1'));
assert.ok(getLumiMissionById('pilot-object-9-5'));
assert.ok(getCanonicalLumiMission('pilot-object-9-1'));
assert.ok(getCanonicalLumiMission('pilot-object-transfer-1'));
console.log('  -> Gate 2 missions are registered in the canonical learning ledger');

// 3. Zero-Persistence Tagging
console.log('[Test 3] Verifying Official Student-Beta Policies...');
assert.equal(LUMI_OBJECT_LEARNING_PILOT_SET.kind, 'learning-pilot');
assert.equal(LUMI_OBJECT_LEARNING_PILOT_SET.persistencePolicy, 'official');
assert.equal(LUMI_OBJECT_LEARNING_PILOT_SET.rewardPolicy, 'standard-crystals');
assert.equal(LUMI_OBJECT_LEARNING_PILOT_SET.dailyRecordPolicy, 'official');
assert.equal(LUMI_OBJECT_LEARNING_PILOT_SET.assignmentEvidencePolicy, 'python-only');
assert.equal(PILOT_OBJECT_MISSIONS.length, 6, 'Must contain 6 pilot missions (9-1 ~ 9-5 + Transfer)');

LUMI_OBJECT_LEARNING_PILOT_SET.missions.forEach((m) => {
  assert.equal(m.persistencePolicy, 'official');
  assert.equal(m.rewardPolicy, 'standard-crystals');
});
console.log('  -> Progress, daily records and rewards are enabled on all 6 entries');

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

// 5. Mission 9-1: LUMI의 정체 (Rover System Object Observation)
console.log('[Test 4] Real CPython 9-1: Verifying type(lumi) & Rover System Object Recognition...');
const m91 = PILOT_OBJECT_MISSIONS[0];
const code91 = `print(type(lumi))`;
const res91 = runPythonInRealCPython(m91, code91);
assert.ok(!res91.error, '9-1 must execute without error');
assert.ok(res91.systemObjects?.lumi, 'systemObjects.lumi must be returned');
assert.equal(res91.systemObjects.lumi.className, 'Rover');
const eval91 = evaluateMissionRun(m91, res91);
assert.equal(eval91.passed, true, '9-1 must pass evaluation');
assert.equal(eval91.worldGoalPassed, true);
assert.equal(eval91.conceptPassed, true);
const systemInspectorItems = selectSystemObjectInspectorItems(res91.systemObjects);
assert.equal(systemInspectorItems.length, 1, '9-1 must project LUMI into the System Objects inspector');
assert.equal(systemInspectorItems[0].className, 'Rover');
assert.ok(systemInspectorItems[0].methods.includes('move'));
console.log('  -> 9-1 Rover system object evaluation passed');

// 6. Mission 9-2: 홀로그램 설계도 (class Drone: pass -> 1 class, 0 instances)
console.log('[Test 5] Real CPython 9-2: Verifying class Drone registration vs 0 instances...');
const m92 = PILOT_OBJECT_MISSIONS[1];
const code92 = `class Drone:\n    pass\n`;
const res92 = runPythonInRealCPython(m92, code92);
assert.ok(!res92.error);
assert.ok(res92.classesMetadata?.Drone);
const eval92 = evaluateMissionRun(m92, res92);
assert.equal(eval92.passed, true, '9-2 must pass evaluation');
assert.equal(eval92.worldGoalPassed, true);

const code92WithInstance = `class Drone:\n    pass\n\nscout = Drone()\n`;
const eval92WithInstance = evaluateMissionRun(m92, runPythonInRealCPython(m92, code92WithInstance));
assert.equal(eval92WithInstance.passed, false, '9-2 must fail when an instance exists');
console.log('  -> 9-2 Blueprint registration (1 class, 0 instances) evaluation passed');

// 7. Mission 9-3: 첫 번째 실체 (scout = Drone() -> 1 instance)
console.log('[Test 6] Real CPython 9-3: Verifying Instance Assembly & Alternative Variable Name...');
const m93 = PILOT_OBJECT_MISSIONS[2];
const code93 = `class Drone:\n    pass\n\nscout = Drone()\n`;
const res93 = runPythonInRealCPython(m93, code93);
assert.ok(!res93.error);
const eval93 = evaluateMissionRun(m93, res93);
assert.equal(eval93.passed, true, '9-3 must pass evaluation with standard name');

// Alternative variable name test (alpha_scout = Drone())
const code93Alt = `class Drone:\n    pass\n\nalpha_scout = Drone()\n`;
const res93Alt = runPythonInRealCPython(m93, code93Alt);
const eval93Alt = evaluateMissionRun(m93, res93Alt);
assert.equal(eval93Alt.passed, true, '9-3 must pass evaluation with alternative variable name');

const code93TooMany = `class Drone:\n    pass\n\na = Drone()\nb = Drone()\n`;
const eval93TooMany = evaluateMissionRun(m93, runPythonInRealCPython(m93, code93TooMany));
assert.equal(eval93TooMany.passed, false, '9-3 must require exactly one instance');
console.log('  -> 9-3 Instance assembly and alternative variable name evaluation passed');

// 8. Mission 9-4: 생성될 때 정하는 상태 (__init__ & distinct instance states)
console.log('[Test 7] Real CPython 9-4: Verifying __init__ and distinct instance attributes...');
const m94 = PILOT_OBJECT_MISSIONS[3];
const code94 = `class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity

scout_1 = Drone("ALPHA", 20)
scout_2 = Drone("BETA", 40)
`;
const res94 = runPythonInRealCPython(m94, code94);
assert.ok(!res94.error);
const eval94 = evaluateMissionRun(m94, res94);
assert.equal(eval94.passed, true, '9-4 must pass evaluation');
assert.equal(eval94.worldGoalPassed, true);

// Failure check: If self.integrity is omitted, it must fail
const code94Fail = `class Drone:
    def __init__(self, name, integrity):
        self.name = name

scout_1 = Drone("ALPHA", 20)
scout_2 = Drone("BETA", 40)
`;
const res94Fail = runPythonInRealCPython(m94, code94Fail);
const eval94Fail = evaluateMissionRun(m94, res94Fail);
assert.equal(eval94Fail.passed, false, '9-4 must fail when integrity attribute is missing');

const code94WithoutInit = `class Drone:
    def ping(self):
        pass

a = Drone()
b = Drone()
a.name = "ALPHA"
a.integrity = 20
b.name = "BETA"
b.integrity = 40
print("done")
`;
const eval94WithoutInit = evaluateMissionRun(m94, runPythonInRealCPython(m94, code94WithoutInit));
assert.equal(eval94WithoutInit.passed, false, '9-4 must not pass without __init__ attribute initialization');
console.log('  -> 9-4 __init__ distinct state and integrity failure checks verified');

// 9. Mission 9-5: 바로 그 객체 자신 (self & targeted charge(10))
console.log('[Test 8] Real CPython 9-5: Verifying self receiver match & single instance mutation...');
const m95 = PILOT_OBJECT_MISSIONS[4];
const code95 = `class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity

    def charge(self, amount):
        self.integrity += amount

scout_1 = Drone("ALPHA", 20)
scout_2 = Drone("BETA", 20)

scout_1.charge(10)
`;
const res95 = runPythonInRealCPython(m95, code95);
assert.ok(!res95.error);
const eval95 = evaluateMissionRun(m95, res95);
assert.equal(eval95.passed, true, '9-5 must pass evaluation');
assert.equal(eval95.worldGoalPassed, true);

// Failure check: If both instances or wrong instance charged, it must fail
const code95Fail = `class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity

    def charge(self, amount):
        self.integrity += amount

scout_1 = Drone("ALPHA", 20)
scout_2 = Drone("BETA", 20)

scout_2.charge(10)
`;
const res95Fail = runPythonInRealCPython(m95, code95Fail);
const eval95Fail = evaluateMissionRun(m95, res95Fail);
assert.equal(eval95Fail.passed, false, '9-5 must fail when wrong instance was mutated');

const code95NoOpThenAssignment = `class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity

    def charge(self, amount):
        self.integrity += amount

scout_1 = Drone("ALPHA", 20)
scout_2 = Drone("BETA", 20)
scout_1.charge(0)
scout_1.integrity = 30
print("done")
`;
const eval95NoOpThenAssignment = evaluateMissionRun(m95, runPythonInRealCPython(m95, code95NoOpThenAssignment));
assert.equal(eval95NoOpThenAssignment.passed, false, '9-5 must require charge() itself to perform the 20 -> 30 transition');

const code95MutatesOtherLast = `${code95}\nscout_2.integrity = 99\n`;
const eval95MutatesOtherLast = evaluateMissionRun(m95, runPythonInRealCPython(m95, code95MutatesOtherLast));
assert.equal(eval95MutatesOtherLast.passed, false, '9-5 must observe and reject a final-line mutation of the other instance');
console.log('  -> 9-5 Targeted mutation and receiver isolation verified');

// 10. Transfer Mission: MetaSense 밖으로의 전이 (Pet class)
console.log('[Test 9] Real CPython Transfer-1: Verifying General Python Pet Class Model...');
const mTransfer = PILOT_OBJECT_MISSIONS[5];
const codeTransfer = `class Pet:
    def __init__(self, name, energy):
        self.name = name
        self.energy = energy

    def feed(self, amount):
        self.energy += amount

p1 = Pet("나비", 50)
p2 = Pet("초코", 50)
p1.feed(20)
`;
const resTransfer = runPythonInRealCPython(mTransfer, codeTransfer);
assert.ok(!resTransfer.error);
const evalTransfer = evaluateMissionRun(mTransfer, resTransfer);
assert.equal(evalTransfer.passed, true, 'Transfer-1 must pass evaluation');
assert.equal(evalTransfer.worldGoalPassed, true);
assert.ok(!mTransfer.starterCode.includes('p1 = Pet'), 'Transfer starter must not expose the exact answer');
assert.ok(!mTransfer.starterCode.includes('p1.feed(20)'), 'Transfer starter must not expose the exact method call answer');
console.log('  -> Transfer-1 Pet class general Python model verified');

console.log('\n=== All Gate 2 Real CPython Integration Tests Passed 100%! ===');
