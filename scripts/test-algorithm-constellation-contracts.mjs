import assert from 'node:assert/strict'
import { validateProblemKernel } from '../src/components/AlgorithmConstellation/shared/contracts/problemKernelSchema.js'
import { AC_COND_001 } from '../src/components/AlgorithmConstellation/shared/problems/ac_cond_001.js'
import { createReplayDescriptor, validateReplayDescriptor, TRACE_SCHEMA_VERSION, RUNTIME_VERSION, INTERPRETER_VERSION } from '../src/components/AlgorithmConstellation/shared/contracts/eventReplaySchema.js'
import { calculateASI, validateAssistanceEvidence, ASI_METRIC_VERSION } from '../src/components/AlgorithmConstellation/shared/contracts/assistanceEvidenceSchema.js'
import { evaluateConstellationStars } from '../src/components/AlgorithmConstellation/shared/contracts/starEvidenceContract.js'
import { deriveVariantSeed, deriveAuthoritativeVariantSeed, createDeterministicRNG, GENERATOR_VERSION } from '../src/components/AlgorithmConstellation/shared/contracts/variantSeedContract.js'
import { GRANULAR_MISCONCEPTIONS, MISCONCEPTION_CATEGORIES } from '../src/components/AlgorithmConstellation/shared/taxonomy/misconceptionTaxonomy.js'
import { resolveSandboxLimits, sanitizeStdout, createExecutionGuard, SandboxLimitError } from '../src/components/AlgorithmConstellation/runtime/studentSandboxLimits.js'
import { projectRawToMeaningfulTrace, distillToLearningTrace } from '../src/components/AlgorithmConstellation/runtime/traceProjection/meaningfulStepProjector.js'
import { createAttemptRecord, updateProgressSummary, computeAdaptiveDelayedReturnHours, generateRewardIdempotencyKey } from '../src/components/AlgorithmConstellation/server/services/algorithmProgressService.js'

// Import Server-Authoritative Judge from functions/
import { evaluateAuthoritativeSubmission } from '../functions/algorithmConstellation/algorithmAuthoritativeJudge.cjs'
import { getPrivateProblemDefinition } from '../functions/algorithmConstellation/privateProblemCatalog.cjs'

console.log('=== Running Algorithm Constellation Hardened Invariant Tests ===')

// [Test 1] Public Problem Kernel Schema Validation & No Secret Leaks
console.log('[Test 1] Validating Public Problem Kernel Schema & AC-COND-001...')
const kernelErrors = validateProblemKernel(AC_COND_001)
assert.deepEqual(kernelErrors, [], 'AC-COND-001 must have 0 schema errors')
assert.equal(AC_COND_001.id, 'AC-COND-001')
assert.equal(AC_COND_001.shells.explorer.terms.switch1, '빨간 스위치')
assert.equal(AC_COND_001.shells.pro.terms.switch1, 's1')
assert.equal(AC_COND_001.modes.code.solutionCode, undefined, 'Public kernel MUST NOT contain solutionCode')

// DeepFreeze immutability test on Problem Kernel
assert.throws(() => {
  AC_COND_001.shells.explorer.story = 'HACKED'
}, /Cannot assign to read only property|read-only/)
console.log('  -> Public Problem Kernel validated and deeply frozen')

// [Test 2] Versioned Deterministic Replay Invariant (Cannot overwrite canonical runtime version)
console.log('[Test 2] Validating Versioned Deterministic Replay Contract...')
const replay = createReplayDescriptor({
  runId: 'run-101',
  problemId: 'AC-COND-001',
  problemVersion: 1,
  attemptFamilyId: 'attempt-fam-1',
  variantSeed: 12345678,
  codeHash: 'hash_abc123',
  initialWorldStateHash: 'world_init_001',
  runtimeVersion: 'HACKED_VERSION', // Attempting to overwrite
})
assert.equal(replay.runtimeVersion, RUNTIME_VERSION, 'createReplayDescriptor must enforce canonical RUNTIME_VERSION')
assert.equal(replay.traceSchemaVersion, TRACE_SCHEMA_VERSION)
assert.equal(replay.interpreterVersion, INTERPRETER_VERSION)
assert.deepEqual(validateReplayDescriptor(replay), [])

// Invalid descriptor with non-matching version
const invalidReplay = { ...replay, runtimeVersion: 'INVALID_V2' }
assert.equal(validateReplayDescriptor(invalidReplay).length > 0, true)
console.log('  -> Versioned replay descriptor strictly verified')

// [Test 3] Assistance Evidence & ASI Calculation (v1)
console.log('[Test 3] Validating Assistance Evidence & ASI Derivation...')
const evidence1 = {
  source: 'hint',
  stage: 'implementation',
  scaffoldLevel: 2,
  answerExposure: 'partial',
  usedAt: Date.now(),
}
assert.deepEqual(validateAssistanceEvidence(evidence1), [])
assert.deepEqual(validateAssistanceEvidence({
  source: 'solution-review',
  stage: 'implementation',
  scaffoldLevel: 6,
  answerExposure: 'full',
  usedAt: Date.now(),
}), [])

const asiResult = calculateASI({
  evidences: [evidence1],
  delayedIndependenceSuccess: true,
  transferSuccessRate: 1.0,
  recoveryQualityRate: 1.0,
})
assert.equal(asiResult.asiMetricVersion, ASI_METRIC_VERSION)
assert.equal(asiResult.asi >= 0 && asiResult.asi <= 100, true)
console.log(`  -> Calculated ASI: ${asiResult.asi} (Version: ${asiResult.asiMetricVersion})`)

// [Test 4] 3-Star Micro-Evidence & Transfer Evaluation
console.log('[Test 4] Validating 3-Star Micro-Evidence Contract...')
const starEvalFull = evaluateConstellationStars({
  resultEvidence: { publicTestsPassed: true, hiddenTestsPassed: true },
  understandingEvidence: { type: 'truth_table_completion', passed: true },
  transferEvidence: { transferFamily: 'condition-decomposition', passed: true },
})
assert.equal(starEvalFull.stars, 3)
assert.equal(starEvalFull.details.star1_result, true)
assert.equal(starEvalFull.details.star2_understanding, true)
assert.equal(starEvalFull.details.star3_transfer, true)

// [Test 5] Variant Seed & HMAC Equivalence
console.log('[Test 5] Validating Variant Seed & PRNG Equivalence...')
const seed1 = deriveVariantSeed({ studentKey: 'stu_10', problemId: 'AC-COND-001', attemptFamilyId: 'fam_a' })
const seed2 = deriveVariantSeed({ studentKey: 'stu_10', problemId: 'AC-COND-001', attemptFamilyId: 'fam_a' })
assert.equal(seed1, seed2)

const authSeed1 = deriveAuthoritativeVariantSeed({ serverSecret: 'secret_key', studentKey: 'stu_10', problemId: 'AC-COND-001' })
const authSeed2 = deriveAuthoritativeVariantSeed({ serverSecret: 'secret_key', studentKey: 'stu_10', problemId: 'AC-COND-001' })
assert.equal(authSeed1, authSeed2, 'Authoritative HMAC seeds must match with same secret')

const rngA = createDeterministicRNG(seed1)
const seqA = [rngA(), rngA(), rngA()]
const rngB = createDeterministicRNG(seed1)
const seqB = [rngB(), rngB(), rngB()]
assert.deepEqual(seqA, seqB)
console.log('  -> Deterministic PRNG and authoritative seed verified')

// [Test 6] Granular Misconception Taxonomy
console.log('[Test 6] Validating Misconception Taxonomy...')
assert.equal(Object.keys(MISCONCEPTION_CATEGORIES).length, 8)
assert.equal(GRANULAR_MISCONCEPTIONS['COND-AND-OR-01'].category, 'COND')
console.log('  -> Misconception taxonomy verified')

// [Test 7] Sandbox Limits Bounds & Execution Guard Enforcement
console.log('[Test 7] Validating Sandbox Limits Bounds & Guard...')
const validLimits = resolveSandboxLimits({ maxExecutionMs: 2000 })
assert.equal(validLimits.maxExecutionMs, 2000)

// Invalid limits rejection
assert.throws(() => resolveSandboxLimits({ maxExecutionMs: -500 }), /positive finite number/)
assert.throws(() => resolveSandboxLimits({ maxSteps: Infinity }), /positive finite number/)

// Execution Guard Step Budget Enforcement (min bound is 100)
const guard = createExecutionGuard({ maxSteps: 100 })
for (let i = 0; i < 100; i++) {
  guard.incrementStep(1)
}
assert.throws(() => guard.incrementStep(1), (err) => err instanceof SandboxLimitError && err.limitType === 'MAX_STEPS')

// Execution Guard Output Budget Enforcement (min bound is 256)
const outGuard = createExecutionGuard({ maxOutputBytes: 256 })
assert.throws(() => outGuard.trackOutput('A'.repeat(300)), (err) => err instanceof SandboxLimitError && err.limitType === 'MAX_OUTPUT')
console.log('  -> Sandbox limits bounded validation and guard execution verified')

// [Test 8] Trace 3-Tier Layer (Raw -> Meaningful -> Learning Trace with eventType)
console.log('[Test 8] Validating Trace 3-Tier Projection with eventType...')
const rawEvents = []
for (let i = 0; i < 40; i++) {
  rawEvents.push({
    eventType: i % 5 === 0 ? 'condition_eval' : 'line',
    line: i + 1,
    condition: `cond_${i}`,
  })
}
const meaningful = projectRawToMeaningfulTrace(rawEvents)
const learningTrace = distillToLearningTrace(meaningful, { min: 12, max: 30 })

assert.equal(learningTrace.length >= 12 && learningTrace.length <= 30, true, `Learning trace should have 12~30 scenes, got ${learningTrace.length}`)
assert.equal(learningTrace.some((s) => s.eventType === 'condition_eval'), true, 'condition_eval scenes must be preserved')
console.log(`  -> 40 raw events -> ${meaningful.length} meaningful -> ${learningTrace.length} learning scenes (Target: 12~30)`)

// [Test 9] Authoritative Server Judge with the Phase-2 restricted Python subset
console.log('[Test 9] Validating Authoritative Server Judge with restricted Python execution...')
const privateDef = getPrivateProblemDefinition('AC-COND-001', 1)

// Official Python Solution
const officialPython = privateDef.officialSolutionCode
const transferPython = `def can_exit(suit_ready, oxygen_ok):\n    return bool(suit_ready and oxygen_ok)\ndef check_gate_3(s1, s2, s3):\n    return bool(s1 and s2 and s3)\n`

const judgeResult = evaluateAuthoritativeSubmission({
  problemId: 'AC-COND-001',
  problemVersion: 1,
  studentPythonCode: officialPython,
  entryFunction: 'check_gate',
  understandingAnswer: {
    type: 'truth_table_completion',
    answers: { s1_true_s2_true: true, s1_true_s2_false: false },
  },
  transferPythonCode: transferPython,
  publicTests: AC_COND_001.assessment.publicTests,
})

assert.equal(judgeResult.stars, 3)
assert.equal(judgeResult.publicPassed, true)
assert.equal(judgeResult.hiddenPassed, true)
assert.equal(judgeResult.understandingPassed, true)
assert.equal(judgeResult.transferPassed, true)

// Intended wrong solution: s1 or s2 (COND-AND-OR-01) -> MUST FAIL hidden tests!
const wrongSolution = privateDef.intendedWrongSolutions[0].code
const wrongJudgeResult = evaluateAuthoritativeSubmission({
  problemId: 'AC-COND-001',
  problemVersion: 1,
  studentPythonCode: wrongSolution,
  entryFunction: 'check_gate',
  understandingAnswer: {
    type: 'truth_table_completion',
    answers: { s1_true_s2_true: true, s1_true_s2_false: true }, // Incorrect truth table
  },
  publicTests: AC_COND_001.assessment.publicTests,
})

assert.equal(wrongJudgeResult.hiddenPassed, false, 'Intended wrong solution MUST fail hidden tests!')
assert.equal(wrongJudgeResult.stars, 0, 'Failed hidden test gives 0 result stars')

// [Test 10] Progress vs Attempt Storage Separation & AI Mastery Policy
console.log('[Test 10] Validating Progress & Attempt Data Separation & AI Mastery Policy...')

// 1. Parsons Attempt (scaffoldLevel: 2) -> 3 stars achieved, but requires independent return -> in_progress
const parsonsAttempt = createAttemptRecord({
  attemptId: 'att_001',
  userId: 'user_alpha',
  problemId: 'AC-COND-001',
  variantSeed: seed1,
  codeHash: 'hash_123',
  assistanceEvidences: [evidence1], // scaffoldLevel: 2
  externalAiPromptCopied: false,
  evaluationResult: judgeResult,
})
assert.equal(parsonsAttempt.rankEligible, true)
assert.equal(parsonsAttempt.stars, 3)

// Attempt record is deeply frozen
assert.throws(() => {
  parsonsAttempt.starDetails.star1_result = false
}, /Cannot assign to read only property|read-only/)

const parsonsProgress = updateProgressSummary({
  currentProgress: {},
  attemptRecord: parsonsAttempt,
})
assert.equal(parsonsProgress.bestStars, 3)
assert.equal(parsonsProgress.masteryStatus, 'in_progress', 'Attempt with scaffoldLevel >= 2 remains in_progress until independent return')
assert.equal(computeAdaptiveDelayedReturnHours({ highestScaffoldUsed: 2 }), 48)

// 2. Independent Return Attempt (scaffoldLevel: 0, no assistance) -> converts to mastered!
const independentAttempt = createAttemptRecord({
  attemptId: 'att_002',
  userId: 'user_alpha',
  problemId: 'AC-COND-001',
  variantSeed: seed1,
  codeHash: 'hash_123_independent',
  assistanceEvidences: [], // 0 assistance
  externalAiPromptCopied: false,
  evaluationResult: judgeResult,
})
const masteredProgress = updateProgressSummary({
  currentProgress: parsonsProgress,
  attemptRecord: independentAttempt,
})
assert.equal(masteredProgress.bestStars, 3)
assert.equal(masteredProgress.masteryStatus, 'mastered', 'Independent attempt achieves full mastery!')

// 3. AI Attempt: 3 stars achieved but AI prompt was copied -> masteryStatus MUST be pending_independent_return
const aiAttempt = createAttemptRecord({
  attemptId: 'att_003',
  userId: 'user_beta',
  problemId: 'AC-COND-001',
  variantSeed: seed1,
  codeHash: 'hash_456',
  assistanceEvidences: [{ source: 'external-ai', stage: 'strategy', scaffoldLevel: 3, answerExposure: 'unknown', usedAt: Date.now() }],
  externalAiPromptCopied: true,
  evaluationResult: judgeResult,
})
assert.equal(aiAttempt.rankEligible, false, 'AI prompt copied attempt must not be rank eligible')

const aiProgress = updateProgressSummary({
  currentProgress: {},
  attemptRecord: aiAttempt,
})
assert.equal(aiProgress.bestStars, 3)
assert.equal(aiProgress.masteryStatus, 'pending_independent_return', 'AI assisted attempt must withhold mastery until independent return!')
assert.equal(computeAdaptiveDelayedReturnHours({ hasExternalAiAssist: true }), 24)

console.log('  -> AI mastery withholding policy, independent return lifecycle, and deep immutability verified')

console.log('\n=== All Hardened Architecture & Contract Tests Passed 100%! ===\n')
