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
assert.equal(scenes[scenes.length - 1].sceneIndex, scenes.length - 1)
console.log(`  -> [PASS] 150 raw events projected to ${scenes.length} learning scenes (capped <= 15)`)

console.log('\n=== Semantic Trace v2 Tests Passed 100%! ===\n')
