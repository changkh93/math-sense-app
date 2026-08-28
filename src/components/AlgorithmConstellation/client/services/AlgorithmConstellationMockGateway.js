/**
 * Mock Client Gateway for Local Development & Story Testing
 * Accurately judges code against problem invariants in dev mode.
 */

import { runRestrictedPythonFunction } from '../../runtime/restrictedPythonEvaluator.js'
import { runRestrictedPythonV2Function } from '../../runtime/restrictedPythonEvaluatorV2.js'

function evaluateSubmissionCode(problemId, code) {
  if (!code || typeof code !== 'string' || !code.trim()) {
    return { passed: false, error: '코드를 입력해 주세요.' }
  }

  if (problemId === 'AC-PAT-003') {
    const fnName = code.includes('def check_bridge(') ? 'check_bridge' : 'bridge_signal'
    const testCases = [
      { args: { time: 0 }, expected: true },
      { args: { time: 1 }, expected: false },
      { args: { time: 2 }, expected: false },
      { args: { time: 3 }, expected: true },
      { args: { time: 4 }, expected: false },
      { args: { time: 6 }, expected: true },
      { args: { time: 9 }, expected: true },
      { args: { time: 10 }, expected: false },
      { args: { time: 15 }, expected: true },
      { args: { time: 99 }, expected: true },
      { args: { time: 100 }, expected: false },
    ]
    try {
      for (const tc of testCases) {
        let actual
        try {
          actual = runRestrictedPythonFunction(code, fnName, tc.args)
        } catch {
          actual = runRestrictedPythonV2Function(code, fnName, tc.args)
        }
        if (Boolean(actual) !== tc.expected) {
          const displayActual = actual === null || actual === undefined ? 'None' : String(actual)
          return {
            passed: false,
            error: `time=${tc.args.time} 상황에서 예상 결과(${tc.expected})와 다릅니다 (실제: ${displayActual}).`,
          }
        }
      }
      return { passed: true }
    } catch (err) {
      return { passed: false, error: err.message || '코드 실행 중 오류가 발생했습니다.' }
    }
  }

  // Default: AC-COND-001
  const testCases = [
    { args: { s1: true, s2: true }, expected: true },
    { args: { s1: true, s2: false }, expected: false },
    { args: { s1: false, s2: true }, expected: false },
    { args: { s1: false, s2: false }, expected: false },
  ]
  try {
    for (const tc of testCases) {
      const actual = runRestrictedPythonFunction(code, 'check_gate', tc.args)
      if (Boolean(actual) !== tc.expected) {
        const displayActual = actual === null || actual === undefined ? 'None' : String(actual)
        return {
          passed: false,
          error: `s1=${tc.args.s1 ? 'True' : 'False'}, s2=${tc.args.s2 ? 'True' : 'False'} 상황에서 예상 결과(${tc.expected ? 'True' : 'False'})와 다릅니다 (실제: ${displayActual}).`,
        }
      }
    }
    return { passed: true }
  } catch (err) {
    return { passed: false, error: err.message || '코드 실행 중 오류가 발생했습니다.' }
  }
}

function evaluateTransferCode(problemId, transferCode) {
  if (!transferCode || typeof transferCode !== 'string' || !transferCode.trim()) {
    return { passed: false, error: '전이 문제를 풀기 위한 코드를 입력해 주세요.' }
  }

  if (problemId === 'AC-PAT-003') {
    const isCooling = transferCode.includes('def check_cooling(')
    const fnName = isCooling ? 'check_cooling' : 'frost_bridge_signal'
    const testCases = isCooling ? [
      { args: { time: 1 }, expected: true },
      { args: { time: 2 }, expected: false },
      { args: { time: 5 }, expected: true },
      { args: { time: 9 }, expected: true },
      { args: { time: 10 }, expected: false },
    ] : [
      { args: { time: 0 }, expected: true },
      { args: { time: 1 }, expected: false },
      { args: { time: 5 }, expected: true },
      { args: { time: 10 }, expected: true },
      { args: { time: 12 }, expected: false },
    ]

    try {
      for (const tc of testCases) {
        let actual
        try {
          actual = runRestrictedPythonFunction(transferCode, fnName, tc.args)
        } catch {
          actual = runRestrictedPythonV2Function(transferCode, fnName, tc.args)
        }
        if (Boolean(actual) !== tc.expected) {
          return { passed: false, error: `time=${tc.args.time} 상황에서 예상 결과와 다릅니다.` }
        }
      }
      return { passed: true }
    } catch (err) {
      return { passed: false, error: err.message }
    }
  }

  // AC-COND-001
  const isCanExit = transferCode.includes('def can_exit(')
  if (isCanExit) {
    const testCases = [
      { args: { suit_ready: true, oxygen_ok: true }, expected: true },
      { args: { suit_ready: true, oxygen_ok: false }, expected: false },
      { args: { suit_ready: false, oxygen_ok: true }, expected: false },
      { args: { suit_ready: false, oxygen_ok: false }, expected: false },
    ]
    try {
      for (const tc of testCases) {
        const actual = runRestrictedPythonFunction(transferCode, 'can_exit', tc.args)
        if (Boolean(actual) !== tc.expected) {
          return { passed: false, error: `suit_ready=${tc.args.suit_ready}, oxygen_ok=${tc.args.oxygen_ok} 상황에서 결과가 맞지 않습니다.` }
        }
      }
      return { passed: true }
    } catch (err) {
      return { passed: false, error: err.message }
    }
  }

  const testCases = [
    { args: { s1: true, s2: true, s3: true }, expected: true },
    { args: { s1: true, s2: true, s3: false }, expected: false },
    { args: { s1: true, s2: false, s3: true }, expected: false },
    { args: { s1: false, s2: false, s3: false }, expected: false },
  ]
  try {
    for (const tc of testCases) {
      const actual = runRestrictedPythonFunction(transferCode, 'check_mock_gate', tc.args)
      if (Boolean(actual) !== tc.expected) {
        return { passed: false, error: `s1=${tc.args.s1}, s2=${tc.args.s2}, s3=${tc.args.s3} 상황에서 결과가 맞지 않습니다.` }
      }
    }
    return { passed: true }
  } catch (err) {
    return { passed: false, error: err.message }
  }
}

export function createAlgorithmConstellationMockGateway({
  mockProgress = null,
} = {}) {
  let attemptState = 'STARTED'
  let currentProblemId = 'AC-COND-001'
  let masteryEligible = true
  const assistanceHistory = []

  return {
    async startAttempt({ problemId = 'AC-COND-001', problemVersion = 1, intent = 'learn' }) {
      currentProblemId = problemId
      attemptState = 'STARTED'
      masteryEligible = intent !== 'ai_research'
      return {
        attemptId: `mock_att_${Date.now()}`,
        publicVariant: { seed: 1001 },
        replayDescriptor: { problemId, problemVersion, generatorVersion: 1 },
        policy: { rankMode: intent, assistanceAllowed: !['independent_return', 'arena'].includes(intent) },
        progress: mockProgress || {
          problemId,
          bestStars: 0,
          masteryStatus: 'unstarted',
          nextReturnAt: null,
        },
      }
    },

    async recordAssistance({ eventId, source, stage, scaffoldLevel, answerExposure = 'none' }) {
      assistanceHistory.push({ eventId, source, stage, scaffoldLevel, answerExposure })
      if (source === 'external-ai' || scaffoldLevel >= 5 || answerExposure === 'full') masteryEligible = false
      return { ok: true, rankEligible: source !== 'external-ai', masteryEligible }
    },

    async submitBase({ code }) {
      const evalResult = evaluateSubmissionCode(currentProblemId, code)
      const passed = evalResult.passed
      attemptState = passed ? 'BASE_PASSED' : 'BASE_SUBMITTED'

      return {
        status: passed ? 'passed' : 'failed',
        resultStar: passed,
        error: evalResult.error || null,
        testGroups: [{ group: 'all_conditions', passed: passed ? 4 : 0, total: 4 }],
        understandingChallenge: passed ? {
          challengeId: currentProblemId === 'AC-PAT-003' ? 'uc_pat_01' : 'uc_cond_01',
          type: currentProblemId === 'AC-PAT-003' ? 'modulo_cycle_prediction' : 'truth_table_completion',
          prompt: currentProblemId === 'AC-PAT-003'
            ? '신호 다리가 3초 주기로 열릴 때, 다음 시간에 다리가 열리는지(True) 닫히는지(False) 선택하세요.'
            : 's1 and s2 조건식에 대한 다음 상황의 결과를 15초 내에 예측해 보세요.',
          questions: currentProblemId === 'AC-PAT-003' ? [
            { id: 'q1', text: '시간: 9초 (9 % 3 == 0)' },
            { id: 'q2', text: '시간: 10초 (10 % 3 == 1)' },
          ] : [
            { id: 'q1', text: 's1=False, s2=True 일 때 s1 and s2 의 결과는?' },
            { id: 'q2', text: 's1=True, s2=True 일 때 s1 and s2 의 결과는?' },
          ],
        } : null,
        nextAction: passed ? 'understanding_check' : 'retry_code',
      }
    },

    async submitUnderstanding({ answers }) {
      const isCorrect = answers && Object.keys(answers).length > 0
      attemptState = isCorrect ? 'UNDERSTANDING_PASSED' : attemptState
      return {
        passed: isCorrect,
        understandingStar: isCorrect,
        nextAction: isCorrect ? 'transfer_challenge' : 'retry_understanding',
      }
    },

    async issueTransfer({ attemptId }) {
      attemptState = 'TRANSFER_ISSUED'
      return {
        challengeToken: `mock_token_${attemptId}`,
        transferChallenge: {
          transferChallengeId: `${currentProblemId}-T1`,
          title: currentProblemId === 'AC-PAT-003' ? '4초 주기 냉각 장치' : '우주선 외부 탐사 허가',
          description: currentProblemId === 'AC-PAT-003'
            ? '냉각 장치가 4초 주기(time % 4 == 1)로 1초, 5초, 9초에 가동됩니다. 현재 시간(time)에 냉각 장치가 가동(True)하는지 판단하세요.'
            : '우주복이 준비되었고(suit_ready), 산소가 충분할 때(oxygen_ok)만 안전하게 외부로 나갈 수(True) 있습니다.',
          entryFunction: currentProblemId === 'AC-PAT-003' ? 'check_cooling' : 'can_exit',
          starterCode: currentProblemId === 'AC-PAT-003'
            ? 'def check_cooling(time):\n    # 4초 주기(1, 5, 9, 13...) 가동 조건을 완성해 보세요.\n    pass\n'
            : 'def can_exit(suit_ready, oxygen_ok):\n    # 발견한 규칙을 새로운 상황에 적용해 보세요.\n    pass\n',
        },
      }
    },

    async submitTransfer({ transferCode }) {
      const evalResult = evaluateTransferCode(currentProblemId, transferCode)
      const passed = evalResult.passed
      attemptState = passed ? 'FINALIZED' : 'TRANSFER_SUBMITTED'

      return {
        passed,
        stars: passed ? 3 : 2,
        error: evalResult.error || null,
        starDetails: { star1_result: true, star2_understanding: true, star3_transfer: passed },
        masteryStatus: passed && masteryEligible ? 'mastered' : 'pending_independent_return',
        nextReturnAt: passed && masteryEligible ? null : Date.now() + 24 * 3600 * 1000,
      }
    },

    async getProgress({ problemId }) {
      return mockProgress || {
        problemId,
        bestStars: 0,
        masteryStatus: 'unstarted',
        nextReturnAt: null,
      }
    },
  }
}
