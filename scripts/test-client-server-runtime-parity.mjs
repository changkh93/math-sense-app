/**
 * Rigorous Parity Test Suite: Client Browser Evaluator <-> Server Judge Runtime
 * Validates that all 7 official solutions, intended wrong fixtures,
 * unsupported syntax errors, and step limits produce 100% IDENTICAL behavior.
 */

import assert from 'node:assert/strict'
import { runRestrictedPythonFunction as clientRunFunction } from '../src/components/AlgorithmConstellation/runtime/restrictedPythonEvaluator.js'
import { runRestrictedPythonFunction as serverRunFunction } from '../functions/algorithmConstellation/isolatedJudgeRuntime.cjs'
import { getPrivateProblemDefinition, listRegisteredProblemIds } from '../functions/algorithmConstellation/privateProblemCatalog.cjs'
import { AC_COND_001 } from '../src/components/AlgorithmConstellation/shared/problems/ac_cond_001.js'
import { AC_COND_002 } from '../src/components/AlgorithmConstellation/shared/problems/ac_cond_002.js'
import { AC_PAT_003_PUBLIC_KERNEL } from '../src/components/AlgorithmConstellation/shared/problems/ac_pat_003.js'
import { AC_PAT_004 } from '../src/components/AlgorithmConstellation/shared/problems/ac_pat_004.js'
import { AC_SEQ_005 } from '../src/components/AlgorithmConstellation/shared/problems/ac_seq_005.js'
import { AC_NAV_005 } from '../src/components/AlgorithmConstellation/shared/problems/ac_nav_005.js'
import { AC_NAV_006 } from '../src/components/AlgorithmConstellation/shared/problems/ac_nav_006.js'

console.log('\n=== Running Client-Server Runtime Parity Matrix Test ===')

const ALL_KERNELS = [
  AC_COND_001,
  AC_COND_002,
  AC_PAT_003_PUBLIC_KERNEL,
  AC_PAT_004,
  AC_SEQ_005,
  AC_NAV_005,
  AC_NAV_006,
]

// [Matrix 1] Official solutions on all public test cases produce identical return values
console.log('[Matrix 1] Checking Official Solutions Return Value Parity on Public Tests...')
for (const kernel of ALL_KERNELS) {
  const privateDef = getPrivateProblemDefinition(kernel.id, 1)
  const officialCode = privateDef.officialSolutionCode
  const fnName = privateDef.entryFunction

  for (const testCase of kernel.assessment.publicTests) {
    let clientVal, clientErr
    try {
      clientVal = clientRunFunction(officialCode, fnName, testCase.inputs)
    } catch (e) {
      clientErr = e
    }

    const serverRes = serverRunFunction(officialCode, fnName, testCase.inputs)

    assert.equal(clientErr, undefined, `Client failed to execute official code for ${kernel.id}`)
    assert.equal(serverRes.ok, true, `Server failed to execute official code for ${kernel.id}`)
    assert.deepEqual(
      clientVal,
      serverRes.result,
      `Parity mismatch on ${kernel.id} (inputs: ${JSON.stringify(testCase.inputs)}) - Client: ${JSON.stringify(clientVal)}, Server: ${JSON.stringify(serverRes.result)}`
    )
    assert.deepEqual(clientVal, testCase.expected, `Result on ${kernel.id} must equal public test expected`)
  }
  console.log(`  -> [PASS] ${kernel.id} (${kernel.identity.studentTitle}) 100% Parity`)
}

// [Matrix 2] Intended Wrong Fixtures produce identical results or errors across both
console.log('[Matrix 2] Checking Intended Wrong Fixtures Parity...')
for (const kernel of ALL_KERNELS) {
  const privateDef = getPrivateProblemDefinition(kernel.id, 1)
  const fnName = privateDef.entryFunction

  for (const wrong of privateDef.intendedWrongSolutions) {
    for (const testCase of kernel.assessment.publicTests.slice(0, 3)) {
      let clientVal, clientOk = true
      try {
        clientVal = clientRunFunction(wrong.code, fnName, testCase.inputs)
      } catch (e) {
        clientOk = false
      }

      const serverRes = serverRunFunction(wrong.code, fnName, testCase.inputs)
      assert.equal(clientOk, serverRes.ok, `Status parity mismatch on wrong fixture ${wrong.id} for ${kernel.id}`)
      if (clientOk && serverRes.ok) {
        assert.deepEqual(
          clientVal,
          serverRes.result,
          `Return value parity mismatch on wrong fixture ${wrong.id} for ${kernel.id}`
        )
      }
    }
  }
}
console.log('  -> [PASS] All Intended Wrong Fixtures Parity Verified')

// [Matrix 3] Unsupported Syntax & Dangerous Escapes Fail Closed on Both
console.log('[Matrix 3] Checking Security Sandbox & Escape Parity...')
const ESCAPE_SNIPPETS = [
  'import os\ndef check_gate(s1, s2):\n    return True',
  'import random\ndef check_gate(s1, s2):\n    return True',
  'def check_gate(s1, s2):\n    return globalThis.process',
  'def check_gate(s1, s2):\n    return s1.__class__',
  'def check_gate(s1, s2):\n    return missing_name',
]

for (const snippet of ESCAPE_SNIPPETS) {
  let clientThrew = false
  try {
    clientRunFunction(snippet, 'check_gate', { s1: true, s2: true })
  } catch (e) {
    clientThrew = true
  }

  const serverRes = serverRunFunction(snippet, 'check_gate', { s1: true, s2: true })
  assert.equal(clientThrew, true, `Client must reject dangerous snippet: ${snippet.split('\n')[0]}`)
  assert.equal(serverRes.ok, false, `Server must reject dangerous snippet: ${snippet.split('\n')[0]}`)
}
console.log('  -> [PASS] Security Escapes Fail Closed Identically on Client & Server')

// [Matrix 4] Infinite loop step limit termination parity
console.log('[Matrix 4] Checking Step Limit / Infinite Loop Guard Parity...')
const INFINITE_LOOP_CODE = 'def check_gate(s1, s2):\n    while True:\n        pass\n'
let clientLoopThrew = false
try {
  clientRunFunction(INFINITE_LOOP_CODE, 'check_gate', { s1: true, s2: true }, { maxSteps: 500 })
} catch (e) {
  clientLoopThrew = true
}

const serverLoopRes = serverRunFunction(INFINITE_LOOP_CODE, 'check_gate', { s1: true, s2: true }, { maxSteps: 500 })
assert.equal(clientLoopThrew, true, 'Client must terminate infinite loop on step limit')
assert.equal(serverLoopRes.ok, false, 'Server must terminate infinite loop on step limit')
console.log('  -> [PASS] Infinite Loop Step Limit Terminated Identically')

// [Matrix 5] Python Control Flow Semantics (if/elif/else, nesting, variable assignment)
console.log('[Matrix 5] Checking if/elif/else Control Flow Semantics & Correctness...')
const CONTROL_FLOW_CASES = [
  {
    name: 'if/else variable assignment counterexample',
    code: `def choose(flag):
    value = 0
    if flag:
        value = 1
    else:
        value = 2
    return value
`,
    fn: 'choose',
    tests: [
      { args: { flag: true }, expected: 1 },
      { args: { flag: false }, expected: 2 },
    ],
  },
  {
    name: 'if/elif/else multi-branch decision',
    code: `def categorize(score):
    if score >= 90:
        grade = "A"
    elif score >= 80:
        grade = "B"
    elif score >= 70:
        grade = "C"
    else:
        grade = "F"
    return grade
`,
    fn: 'categorize',
    tests: [
      { args: { score: 95 }, expected: 'A' },
      { args: { score: 85 }, expected: 'B' },
      { args: { score: 75 }, expected: 'C' },
      { args: { score: 50 }, expected: 'F' },
    ],
  },
  {
    name: 'nested if/else inside branches',
    code: `def quadrant(x, y):
    if x > 0:
        if y > 0:
            return "Q1"
        else:
            return "Q4"
    else:
        if y > 0:
            return "Q2"
        else:
            return "Q3"
`,
    fn: 'quadrant',
    tests: [
      { args: { x: 1, y: 1 }, expected: 'Q1' },
      { args: { x: 1, y: -1 }, expected: 'Q4' },
      { args: { x: -1, y: 1 }, expected: 'Q2' },
      { args: { x: -1, y: -1 }, expected: 'Q3' },
    ],
  },
  {
    name: 'if/else inside for loop',
    code: `def filter_and_scale(items):
    result = []
    for x in items:
        if x > 0:
            result.append(x * 2)
        else:
            result.append(0)
    return result
`,
    fn: 'filter_and_scale',
    tests: [
      { args: { items: [1, -2, 3, 0] }, expected: [2, 0, 6, 0] },
    ],
  },
]

for (const tc of CONTROL_FLOW_CASES) {
  for (const t of tc.tests) {
    const clientVal = clientRunFunction(tc.code, tc.fn, t.args)
    const serverRes = serverRunFunction(tc.code, tc.fn, t.args)

    assert.equal(serverRes.ok, true, `Server failed on ${tc.name}`)
    assert.deepEqual(clientVal, t.expected, `Client returned wrong value for ${tc.name} with args ${JSON.stringify(t.args)}`)
    assert.deepEqual(serverRes.result, t.expected, `Server returned wrong value for ${tc.name} with args ${JSON.stringify(t.args)}`)
  }
}
console.log('  -> [PASS] if/elif/else & Nested Control Flow Semantics 100% Correct and Parity Verified')

console.log('\n=== Client-Server Runtime Parity Matrix Test Passed 100%! ===\n')
