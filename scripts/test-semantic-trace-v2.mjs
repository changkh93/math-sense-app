import assert from 'assert'
import {
  SafePythonInterpreter,
  projectSemanticTraceToMeaningful,
  runRestrictedPythonFunction,
} from '../src/components/AlgorithmConstellation/runtime/sharedPythonEvaluatorCore.js'
import { buildEvidenceFromTrace } from '../src/components/AlgorithmConstellation/shared/evidence/evidencePrimitives.js'

console.log('\n=== Running Semantic Trace v2 & 3-Tier Projection Tests ===')

// [Test 1] Slicing, Range, Set and Index Assignment Execution
console.log('[Test 1] Validating R1~R3 Python Capability Execution...')
const testCode = `def test_suite():
    # 1. range and list comprehension/loop
    evens = []
    for i in range(0, 10, 2):
        evens.append(i)
    
    # 2. slicing
    word = 'LUMI'[::-1]
    
    # 3. set deduplication
    kinds = set([1, 1, 2, 3, 2])
    kinds.add(4)
    
    # 4. min/max and index swap
    cargos = [5, 2, 8]
    cargos[0], cargos[1] = cargos[1], cargos[0]
    
    return {
        'evens': evens,
        'word': word,
        'kind_count': len(kinds),
        'cargos': cargos
    }
`
const res = runRestrictedPythonFunction(testCode, 'test_suite')
assert.equal(res.ok, true, `Execution failed: ${res.error}`)
assert.deepEqual(res.result.evens, [0, 2, 4, 6, 8])
assert.equal(res.result.word, 'IMUL')
assert.equal(res.result.kind_count, 4)
assert.deepEqual(res.result.cargos, [2, 5, 8])
assert.ok(res.traceEvents.length > 0, 'Interpreter must emit its own semantic trace')
for (const event of res.traceEvents) {
  assert.equal(event.traceSchemaVersion, 2)
  assert.ok(typeof event.eventType === 'string')
  assert.ok('sourceSpan' in event)
  assert.ok('frame' in event)
}
assert.ok(res.traceEvents.some((event) => event.eventType === 'assignment'))
assert.ok(res.traceEvents.some((event) => event.eventType === 'loop-iteration'))
assert.ok(res.traceEvents.some((event) => event.eventType === 'container-mutation'))
assert.ok(res.traceEvents.some((event) => event.eventType === 'function-return'))

const accumulation = runRestrictedPythonFunction(
  'def total_items(items):\n    total = 0\n    for item in items:\n        total += item\n    return total\n',
  'total_items',
  { items: [1, 2] },
)
const loopEvents = accumulation.traceEvents.filter((event) => event.eventType === 'loop-iteration')
assert.equal(loopEvents.length, 2)
assert.ok(loopEvents.every((event) => event.sourceSpan.startLine === 3), 'Every iteration must remain anchored to the for statement')
const evidence = buildEvidenceFromTrace(
  { primitives: ['container-scan', 'scalar-sequence'] },
  accumulation.traceEvents,
)
assert.ok(evidence.some((item) => item.primitive === 'container-scan'))
assert.ok(evidence.some((item) => item.primitive === 'scalar-sequence'))

const duplicateStatements = runRestrictedPythonFunction(
  'def duplicate(flag):\n    if flag:\n        return False\n    if not flag:\n        return False\n',
  'duplicate',
  { flag: false },
)
const executedReturn = duplicateStatements.traceEvents.find((event) => event.eventType === 'function-return')
assert.equal(executedReturn.sourceSpan.startLine, 5, 'Duplicate source text must map to the executed occurrence')
console.log('  -> [PASS] range, slicing, set, swap execution verified 100%')

const oversizedRange = runRestrictedPythonFunction('def huge():\n    return range(1000000000)\n', 'huge')
assert.equal(oversizedRange.ok, false)
assert.equal(oversizedRange.code, 'LIMIT_EXCEEDED')

// [Test 2] 3-Tier Trace Projection (Raw -> Meaningful -> Learning Scene)
console.log('[Test 2] Validating 3-Tier Trace Projection...')
const rawEvents = []
for (let i = 0; i < 150; i++) {
  rawEvents.push({
    step: i,
    type: i % 10 === 0 ? 'branch-decision' : 'STATEMENT',
    env: { total: i * 2 },
  })
}
const scenes = projectSemanticTraceToMeaningful(rawEvents, 15)
assert.ok(scenes.length <= 15, 'Learning scenes must be capped at 15 for Explorer')
assert.equal(scenes[0].sceneIndex, 0)
console.log(`  -> [PASS] 150 raw events projected to ${scenes.length} learning scenes (capped <= 15)`)

// [Test 3] R2 Dictionary Semantics, Trace, and Security Validation
console.log('[Test 3] Validating R2 Dictionary Execution, Membership, Mutation Trace & Security...')
const dictBuildCode = `def build_counts(items):
    counts = {}
    for item in items:
        if item in counts:
            counts[item] = counts[item] + 1
        else:
            counts[item] = 1
    return counts
`
const dictResult = runRestrictedPythonFunction(dictBuildCode, 'build_counts', { items: ['A', 'B', 'A'] })
assert.equal(dictResult.ok, true, `Dict execution failed: ${dictResult.error}`)
assert.deepEqual(dictResult.result, { A: 2, B: 1 })

// Empty dict test
const emptyDictResult = runRestrictedPythonFunction(dictBuildCode, 'build_counts', { items: [] })
assert.equal(emptyDictResult.ok, true)
assert.deepEqual(emptyDictResult.result, {})

// Key Error test (missing key access throws KEY_ERROR)
const missingKeyResult = runRestrictedPythonFunction(
  'def get_missing():\n    d = {"A": 1}\n    return d["MISSING"]\n',
  'get_missing'
)
assert.equal(missingKeyResult.ok, false)
assert.equal(missingKeyResult.code, 'KEY_ERROR')

// Dangerous key fail-closed tests
const protoLiteralResult = runRestrictedPythonFunction(
  'def proto_test():\n    d = {"__proto__": 1}\n    return d\n',
  'proto_test'
)
assert.equal(protoLiteralResult.ok, false)
assert.ok(['UNSUPPORTED_SYNTAX', 'SECURITY_ERROR'].includes(protoLiteralResult.code))

const protoArgResult = runRestrictedPythonFunction(
  'def arg_test(d):\n    return len(d)\n',
  'arg_test',
  { d: { constructor: 123 } }
)
assert.equal(protoArgResult.ok, false)
assert.equal(protoArgResult.code, 'SECURITY_ERROR')

// A dynamic key must not traverse an inherited JavaScript property during nested assignment.
const nestedPrototypeResult = runRestrictedPythonFunction(
  'def nested_write(d, key):\n    d[key]["POLLUTED"] = 1\n    return 1\n',
  'nested_write',
  { d: {}, key: 'constructor' }
)
assert.equal(nestedPrototypeResult.ok, false)
assert.equal(nestedPrototypeResult.code, 'SECURITY_ERROR')

// R2 intentionally supports string dictionary keys only; numeric list indices remain valid.
const numericDictKeyResult = runRestrictedPythonFunction(
  'def numeric_key():\n    d = {}\n    d[1] = "x"\n    return d\n',
  'numeric_key'
)
assert.equal(numericDictKeyResult.ok, false)
assert.equal(numericDictKeyResult.code, 'TYPE_ERROR')

const listAssignmentResult = runRestrictedPythonFunction(
  'def update_first(items):\n    items[0] = 9\n    return items\n',
  'update_first',
  { items: [1, 2] }
)
assert.equal(listAssignmentResult.ok, true)
assert.deepEqual(listAssignmentResult.result, [9, 2])

console.log('  -> [PASS] R2 Dictionary semantics, KEY_ERROR, and security fail-closed verified')

// [Test 4] Gate 7A: appendleft, pop/popleft semantics, and ordered-buffer evidence
console.log('[Test 4] Validating Gate 7A: appendleft, pop/popleft semantics & error contracts...')
const dequeCode = `from collections import deque
def test_deque():
    q = deque([10, 20])
    q.append(30)
    q.appendleft(5)
    first = q.popleft()
    last = q.pop()
    return {
        'items': q,
        'first': first,
        'last': last
    }
`
const dequeRes = runRestrictedPythonFunction(dequeCode, 'test_deque')
assert.equal(dequeRes.ok, true, `Deque execution failed: ${dequeRes.error}`)
assert.deepEqual(dequeRes.result.items, [10, 20])
assert.equal(dequeRes.result.first, 5)
assert.equal(dequeRes.result.last, 30)

// Evidence primitive includes appendleft
const dequeEvidence = buildEvidenceFromTrace(
  { primitives: ['ordered-buffer'] },
  dequeRes.traceEvents,
)
assert.ok(dequeEvidence.some((item) => item.primitive === 'ordered-buffer'), 'ordered-buffer evidence must be detected for deque operations')

// Empty pop / popleft must throw INDEX_ERROR
const emptyPopRes = runRestrictedPythonFunction('def empty_pop():\n    items = []\n    return items.pop()\n', 'empty_pop')
assert.equal(emptyPopRes.ok, false)
assert.equal(emptyPopRes.code, 'INDEX_ERROR')

const emptyPopleftRes = runRestrictedPythonFunction('from collections import deque\ndef empty_popleft():\n    q = deque([])\n    return q.popleft()\n', 'empty_popleft')
assert.equal(emptyPopleftRes.ok, false)
assert.equal(emptyPopleftRes.code, 'INDEX_ERROR')

// Positional pop(index) must throw UNSUPPORTED_SYNTAX
const posPopRes = runRestrictedPythonFunction('def pos_pop():\n    items = [1, 2]\n    return items.pop(0)\n', 'pos_pop')
assert.equal(posPopRes.ok, false)
assert.equal(posPopRes.code, 'UNSUPPORTED_SYNTAX')

// Arity checks
const badAppendRes = runRestrictedPythonFunction('def bad_append():\n    items = []\n    items.append(1, 2)\n', 'bad_append')
assert.equal(badAppendRes.ok, false)
assert.equal(badAppendRes.code, 'TYPE_ERROR')

const badAppendleftRes = runRestrictedPythonFunction('from collections import deque\ndef bad_appendleft():\n    q = deque([])\n    q.appendleft()\n', 'bad_appendleft')
assert.equal(badAppendleftRes.ok, false)
assert.equal(badAppendleftRes.code, 'TYPE_ERROR')

console.log('  -> [PASS] Gate 7A appendleft, pop/popleft, INDEX_ERROR, and arity contracts verified 100%')

console.log('\n=== Semantic Trace v2 Tests Passed 100%! ===\n')
