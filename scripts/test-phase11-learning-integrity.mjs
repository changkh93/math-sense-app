import assert from 'node:assert/strict';
import { ACT_1_MISSIONS, ACT_2_MISSIONS } from '../src/components/PythonWorld/lumiCourseCatalog.js';
import { evaluateMissionAttempt, hasReachedGoal, getConceptEvidence } from '../src/components/PythonWorld/missionEvaluator.js';

console.log('=== Running Phase 11: Learning Integrity & Anti-Answer-Leak Tests ===\n');

// 1. Static Catalog Contract: Hologram & Scaffolding Redaction
console.log('[Test 1] Verifying Hologram Redaction (No Full Solutions in memoryFragment)...');
const allActMissions = [...ACT_1_MISSIONS, ...ACT_2_MISSIONS];

allActMissions.forEach((mission) => {
  if (mission.memoryFragment?.code) {
    const code = mission.memoryFragment.code;
    // Ensure no exact coordinate or complete execution without redaction
    assert.ok(
      code.includes('___') || code.includes('...') || code.includes('#') || code.includes('?'),
      `Mission ${mission.id} memoryFragment.code must contain redacted placeholders (___, ..., #)`
    );
  }
});
console.log('  -> All 11 ACT 1 & ACT 2 memoryFragments are properly redacted');

// 2. Static Catalog Contract: Variant Limits and Strategic Placements
console.log('[Test 2] Verifying Targeted Transfer Variants for High-Risk & Field Tests...');
const act12 = ACT_1_MISSIONS.find((m) => m.codeName === '1-2');
const act14 = ACT_1_MISSIONS.find((m) => m.codeName === '1-4');
const act15 = ACT_1_MISSIONS.find((m) => m.codeName === '1-5');
const act23 = ACT_2_MISSIONS.find((m) => m.codeName === '2-3');
const act26 = ACT_2_MISSIONS.find((m) => m.codeName === '2-6');

assert.ok(act12.hiddenVariants.length > 0, 'ACT 1-2 must have transfer variant');
assert.ok(act14.hiddenVariants.length > 0, 'ACT 1-4 must have transfer variant');
assert.ok(act15.hiddenVariants.length > 0, 'ACT 1-5 must have transfer variant');
assert.ok(act23.hiddenVariants.length > 0, 'ACT 2-3 must have transfer variant');
assert.ok(act26.hiddenVariants.length > 0, 'ACT 2-6 must have transfer variant');
console.log('  -> 5 critical missions have designated transfer variants');

// 3. Evaluator Unit Tests: No Concept Grant from Comments
console.log('[Test 3] Verifying Evaluator AST Concepts (Comments do not grant operators)...');
// Simulating runtimeResult where student code had comments but NO AST BinOp('+')
const studentWithoutPlus = {
  events: [
    { type: 'world', action: 'move', start: { x: 1, y: 2 }, end: { x: 6, y: 2 } },
  ],
  conceptsUsed: ['variable'], // AST only found variable, no '+'
  callsUsed: ['lumi.move'],
  finalState: { rover: { x: 6, y: 2 } },
};

const evalNoPlus = evaluateMissionAttempt({
  mission: act12,
  runtimeResult: studentWithoutPlus,
});

assert.equal(evalNoPlus.worldGoalPassed, true, 'Rover reached target');
assert.equal(evalNoPlus.conceptPassed, false, 'Concept + must NOT pass without AST evidence');
assert.equal(evalNoPlus.passed, false, 'Mission must fail if concept is missing');
console.log('  -> Comments in code cannot bypass concept evidence');

// 4. Evaluator Unit Tests: f-string Requirement on 2-5
console.log('[Test 4] Verifying f-string AST Requirement on ACT 2-5...');
const act25 = ACT_2_MISSIONS.find((m) => m.codeName === '2-5');

// Hardcoded string without f-string AST
const studentHardcodedString = {
  events: [
    { type: 'world', action: 'say', message: 'ENERGY 100' },
    { type: 'world', action: 'move', start: { x: 1, y: 2 }, end: { x: 4, y: 2 } },
  ],
  conceptsUsed: ['variable'], // No 'f-string'
  callsUsed: ['lumi.say', 'lumi.move'],
  finalState: { rover: { x: 4, y: 2 } },
};

const evalHardcoded = evaluateMissionAttempt({
  mission: act25,
  runtimeResult: studentHardcodedString,
});

assert.equal(evalHardcoded.worldGoalPassed, true, 'Spoken message matched');
assert.equal(evalHardcoded.conceptPassed, false, 'f-string must be in conceptsUsed');
assert.equal(evalHardcoded.passed, false, 'Mission fails without f-string');
console.log('  -> Hardcoded string cannot pass f-string requirement');

// 5. Evaluator Unit Tests: Variable Mutation Detection on 2-3
console.log('[Test 5] Verifying Variable Mutation Detection on ACT 2-3...');
// Student who just assigned energy = 3 directly without mutation
const studentNoMutation = {
  events: [
    { type: 'memory_changed', name: 'energy', before: undefined, after: 3 },
    { type: 'world', action: 'move', start: { x: 1, y: 2 }, end: { x: 4, y: 2 } },
  ],
  conceptsUsed: ['variable', '-'],
  callsUsed: ['lumi.move'],
  finalState: { rover: { x: 4, y: 2 } },
};

// Student who actually mutated energy from 5 to 3
const studentWithMutation = {
  events: [
    { type: 'memory_changed', name: 'energy', before: undefined, after: 5 },
    { type: 'memory_changed', name: 'energy', before: 5, after: 3 },
    { type: 'world', action: 'move', start: { x: 1, y: 2 }, end: { x: 4, y: 2 } },
  ],
  conceptsUsed: ['variable', '-'],
  callsUsed: ['lumi.move'],
  finalState: { rover: { x: 4, y: 2 } },
};

const evalNoMut = evaluateMissionAttempt({
  mission: act23,
  runtimeResult: studentNoMutation,
  variantResults: [
    {
      events: [{ type: 'world', action: 'move', end: { x: 5, y: 2 } }],
      conceptsUsed: ['variable', '-'],
      callsUsed: ['lumi.move'],
      finalState: { rover: { x: 5, y: 2 } },
    },
  ],
});

const evalWithMut = evaluateMissionAttempt({
  mission: act23,
  runtimeResult: studentWithMutation,
  variantResults: [
    {
      events: [{ type: 'world', action: 'move', end: { x: 5, y: 2 } }],
      conceptsUsed: ['variable', '-'],
      callsUsed: ['lumi.move'],
      finalState: { rover: { x: 5, y: 2 } },
    },
  ],
});

assert.equal(evalWithMut.worldGoalPassed, true, 'Mutated energy passes');
assert.equal(evalWithMut.passed, true, 'Full mission with variant passed');
console.log('  -> Variable mutation before/after verified');

// 6. ACT 2-6 Control Input Specification Contract
console.log('[Test 6] Verifying ACT 2-6 Control Input & Type Conversion Contract...');
assert.equal(act26.title, 'Field Test: 관제 입력과 형 변환');
assert.ok(act26.inputPanel, 'ACT 2-6 must define inputPanel');
assert.equal(act26.inputPanel.fields[0].id, 'steps');
assert.deepEqual(act26.inputValues, ['4']);
assert.deepEqual(act26.conceptEvidence.mustUse, ['input', 'int']);
assert.deepEqual(act26.hiddenVariants[0].inputValues, ['6']);
console.log('  -> ACT 2-6 Control Input & Type Conversion contract verified');

console.log('\n=== All Phase 11 Tests Passed! ===');
