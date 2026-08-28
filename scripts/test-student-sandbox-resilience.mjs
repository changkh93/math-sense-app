import assert from 'assert'
import fs from 'fs'
import {
  executeRestrictedPublicTests,
  runRestrictedPythonFunction,
} from '../src/components/AlgorithmConstellation/runtime/restrictedPythonEvaluator.js'
import { createTraceReplayEngine } from '../src/components/AlgorithmConstellation/runtime/trace/traceReplayEngine.js'
import { computeTraceHash, computeReplayDescriptorHash } from '../src/components/AlgorithmConstellation/runtime/trace/traceHasher.js'

console.log('\n=== Running Student RUN Isolation & Trace Replay Tests ===')

const publicTests = [
  { id: 'p1', inputs: { s1: true, s2: true }, expected: true },
  { id: 'p2', inputs: { s1: true, s2: false }, expected: false },
]
const validCode = 'def check_gate(s1, s2):\n    return bool(s1 and s2)\n'

console.log('[Test 1] Restricted evaluator supports the mission grammar...')
assert.equal(runRestrictedPythonFunction(validCode, 'check_gate', { s1: true, s2: true }), true)
assert.equal(runRestrictedPythonFunction(validCode, 'check_gate', { s1: true, s2: false }), false)
const codeWithKoreanComments = `# 두 스위치(s1, s2)가 모두 True일 때만 True를 반환하세요.
def check_gate(s1, s2):
    # 여기에 코드를 작성하세요.
    return s1 and s2
`
assert.equal(runRestrictedPythonFunction(codeWithKoreanComments, 'check_gate', { s1: true, s2: true }), true)
assert.equal(runRestrictedPythonFunction(codeWithKoreanComments, 'check_gate', { s1: true, s2: false }), false)

console.log('[Test 2] Unsupported and executable JavaScript/Python escape syntax fails closed...')
for (const unsafeCode of [
  'import os\ndef check_gate(s1, s2):\n    return True',
  'def check_gate(s1, s2):\n    return globalThis.process',
  'def check_gate(s1, s2):\n    return s1.__class__',
  'def check_gate(s1, s2):\n    while True:\n        pass',
]) {
  assert.throws(
    () => runRestrictedPythonFunction(unsafeCode, 'check_gate', { s1: true, s2: true }),
    /지원하지|허용되지|Python|문장/
  )
}

console.log('[Test 3] Public test execution emits canonical trace events...')
const runResult = executeRestrictedPublicTests({ code: validCode, publicTests })
assert.equal(runResult.ok, true)
assert.equal(runResult.allPassed, true)
assert.equal(runResult.rawEvents.length, publicTests.length)
assert(runResult.rawEvents.every((event) => Number.isInteger(event.stepIndex) && event.stateDiff && event.worldDiff))
assert.throws(
  () => executeRestrictedPublicTests({ code: validCode, publicTests, limits: { maxSteps: 1 } }),
  /스텝 한도/
)

console.log('[Test 4] Browser runtime is structurally isolated in a terminable Worker...')
const workerSource = fs.readFileSync('src/components/AlgorithmConstellation/runtime/algorithmWorld.worker.js', 'utf8')
const adapterSource = fs.readFileSync('src/components/AlgorithmConstellation/runtime/algorithmRuntimeAdapter.js', 'utf8')
assert(workerSource.includes("self.addEventListener('message'"))
assert(adapterSource.includes("algorithmWorld.worker.js?worker"))
assert(adapterSource.includes('.terminate()'))

console.log('[Test 5] Replay checkpoints and hashes remain deterministic...')
const replayEngine = createTraceReplayEngine({
  rawEvents: runResult.rawEvents,
  initialWorldState: { gateOpen: false },
  checkpointInterval: 1,
})
assert.equal(replayEngine.getTotalSteps(), runResult.rawEvents.length)
assert(replayEngine.seekToStep(1).state)
const traceHash1 = computeTraceHash(replayEngine.getCanonicalEvents())
const traceHash2 = computeTraceHash(replayEngine.getCanonicalEvents())
assert.equal(traceHash1, traceHash2)
assert.equal(computeReplayDescriptorHash({ problemId: 'AC-COND-001', version: 1, seed: 1001 }).length, 8)

console.log('\n=== Student RUN Isolation & Trace Replay Tests Passed ===\n')
