/**
 * Generic Development Mock Gateway for Algorithm Constellation
 *
 * Invariants:
 * 1. ONLY active in DEV mode (import.meta.env.DEV).
 * 2. Implements the EXACT same interface as AlgorithmConstellationGateway.js.
 * 3. Stamped with `authoritative: false` to ensure dev tests never write to production ledger.
 */

import { runRestrictedPythonFunction, evaluatorError, matchesExpected } from '../../runtime/sharedPythonEvaluatorCore.js'
import { PUBLIC_KERNELS, AC_COND_001 } from '../../shared/problems/index.js'

const DEV_PROGRESS_STORAGE_KEY = 'msense_alg_dev_progress_v1'

function loadDevProgressLedger() {
  if (typeof window === 'undefined' || !window.localStorage) return new Map()
  try {
    const raw = window.localStorage.getItem(DEV_PROGRESS_STORAGE_KEY)
    if (!raw) return new Map()
    const parsed = JSON.parse(raw)
    return new Map(Object.entries(parsed))
  } catch {
    return new Map()
  }
}

function saveDevProgressLedger(ledger) {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    const obj = Object.fromEntries(ledger.entries())
    window.localStorage.setItem(DEV_PROGRESS_STORAGE_KEY, JSON.stringify(obj))
  } catch (err) {
    console.warn('Failed to persist dev progress ledger:', err)
  }
}

function evaluateGenericBaseCode(problemId, code) {
  if (!code || typeof code !== 'string' || !code.trim()) {
    return { passed: false, error: '코드를 입력해 주세요.' }
  }

  const kernel = PUBLIC_KERNELS[problemId] || AC_COND_001
  const entryFunction = kernel.modes?.code?.entryFunction || 'check_gate'
  const tests = kernel.assessment?.publicTests || []

  try {
    for (const tc of tests) {
      const res = runRestrictedPythonFunction(code, entryFunction, tc.inputs)
      if (!res.ok) {
        return { passed: false, error: res.error || '코드 실행 중 오류가 발생했습니다.' }
      }
      if (!matchesExpected(res.result, tc.expected)) {
        return {
          passed: false,
          error: `입력값 ${JSON.stringify(tc.inputs)}에 대한 실행 결과가 예상값(${JSON.stringify(tc.expected)})과 다릅니다 (실제값: ${JSON.stringify(res.result)}).`,
        }
      }
    }
    return { passed: true }
  } catch (err) {
    return { passed: false, error: err.message || '코드 실행 중 오류가 발생했습니다.' }
  }
}

export function createAlgorithmConstellationMockGateway() {
  const attempts = new Map()
  const attemptIdsByRequest = new Map()
  let attemptSequence = 0

  return {
    async startAttempt({ problemId, problemVersion = 1, shell = 'explorer', intent = 'learn', requestId }) {
      const requestKey = `${problemId}:${problemVersion}:${intent}:${requestId || ''}`
      const existingAttemptId = attemptIdsByRequest.get(requestKey)
      if (existingAttemptId) return attempts.get(existingAttemptId)
      const attemptId = `mock_attempt_${problemId}_${Date.now()}_${++attemptSequence}`
      const session = {
        attemptId,
        problemId,
        problemVersion,
        shell,
        intent,
        requestId,
        startedAt: new Date().toISOString(),
        authoritative: false,
        policy: {
          assistanceAllowed: !['independent_return', 'arena'].includes(intent),
          arenaMode: intent === 'arena',
          maxHints: 3,
          answerExposureAllowed: intent !== 'arena',
        },
        progress: {
          bestStars: 0,
          masteryStatus: 'not_started',
        },
        assistanceHistory: [],
        issuedUnderstandingChallenge: null,
        activeTransferChallenge: null,
      }
      attempts.set(attemptId, session)
      attemptIdsByRequest.set(requestKey, attemptId)
      return session
    },

    async recordAssistance({ attemptId, eventId, source, stage, scaffoldLevel = 0, answerExposure = 'none' }) {
      const session = attempts.get(attemptId)
      if (!session) throw evaluatorError('INVALID_SESSION', 'Attempt session not found')
      if (!session.policy.assistanceAllowed && source !== 'integrity-focus') {
        throw evaluatorError('FAILED_PRECONDITION', '현재 탐사에서는 도움을 사용할 수 없습니다.')
      }
      if (session.assistanceHistory.some((event) => event.eventId === eventId)) {
        return { ok: true, registered: false }
      }

      session.assistanceHistory.push({
        eventId,
        source,
        stage,
        scaffoldLevel,
        answerExposure,
        recordedAt: new Date().toISOString(),
      })
      return { ok: true, registered: true }
    },

    async submitBase({ attemptId, submissionId, code }) {
      const session = attempts.get(attemptId)
      if (!session) throw evaluatorError('INVALID_SESSION', 'Attempt session not found')

      const evalRes = evaluateGenericBaseCode(session.problemId, code)
      const kernel = PUBLIC_KERNELS[session.problemId] || AC_COND_001

      const understandingChallenge = evalRes.passed
        ? kernel.assessment?.understandingChallenges?.[0] || {
            challengeId: `uc_${session.problemId}_mock`,
            type: 'trace_understanding',
            prompt: `${kernel.identity?.studentTitle}의 핵심 실행 규칙을 확인하세요.`,
            codeSnippet: code,
            questions: [
              {
                id: 'q1',
                text: '작성한 코드가 문제에서 요구하는 상태 변환 순서를 올바르게 따르고 있나요?',
                options: [
                  { value: 'true', label: '예 (참)' },
                  { value: 'false', label: '아니오 (거짓)' },
                ],
                expected: 'true',
              },
            ],
          }
        : null

      session.issuedUnderstandingChallenge = understandingChallenge

      if (evalRes.passed && session?.problemId) {
        const ledger = loadDevProgressLedger()
        const existing = ledger.get(session.problemId) || {}
        ledger.set(session.problemId, {
          ...existing,
          problemId: session.problemId,
          bestStars: Math.max(existing.bestStars || 0, 1),
          masteryStatus: existing.masteryStatus || 'in_progress',
        })
        saveDevProgressLedger(ledger)
      }

      return {
        ok: true,
        submissionId: submissionId || `sub_${Date.now()}`,
        resultStar: evalRes.passed,
        publicPassed: evalRes.passed,
        hiddenPassed: evalRes.passed,
        stars: evalRes.passed ? 1 : 0,
        understandingChallenge,
        error: evalRes.error || null,
        status: evalRes.passed ? 'passed' : 'failed',
        authoritative: false,
      }
    },

    async submitUnderstanding({ attemptId, challengeId, answers }) {
      const session = attempts.get(attemptId)
      if (!session) throw evaluatorError('INVALID_SESSION', 'Attempt session not found')
      const kernel = PUBLIC_KERNELS[session.problemId] || AC_COND_001
      const challenges = kernel.assessment?.understandingChallenges || []
      const activeChallenge = challenges.find((c) => c.challengeId === challengeId) || session.issuedUnderstandingChallenge

      let passed = false
      if (activeChallenge && activeChallenge.questions && answers) {
        passed = activeChallenge.questions.every((q) => {
          const studentAns = answers?.[q.id]
          if (typeof q.expected === 'boolean') {
            const norm = studentAns === true || studentAns === 'true' || studentAns === 'True'
            return norm === q.expected
          }
          return String(studentAns ?? '').trim() === String(q.expected ?? '').trim()
        })
      }

      if (passed && session?.problemId) {
        const ledger = loadDevProgressLedger()
        const existing = ledger.get(session.problemId) || {}
        ledger.set(session.problemId, {
          ...existing,
          problemId: session.problemId,
          bestStars: Math.max(existing.bestStars || 0, 2),
          masteryStatus: existing.masteryStatus || 'in_progress',
        })
        saveDevProgressLedger(ledger)
      }

      return {
        ok: true,
        passed,
        understandingStar: passed,
        stars: passed ? 2 : 1,
        error: passed ? null : '이해 확인 문제의 답안이 일치하지 않습니다.',
        authoritative: false,
      }
    },

    async issueTransfer({ attemptId }) {
      const session = attempts.get(attemptId)
      if (!session) throw evaluatorError('INVALID_SESSION', 'Attempt session not found')
      const kernel = PUBLIC_KERNELS[session.problemId] || AC_COND_001
      const kernelTransfer = kernel.assessment?.transferChallenges?.[0]

      const transferChallenge = kernelTransfer || {
        transferChallengeId: `tc_${session.problemId}_mock`,
        title: `[새로운 상황 적용] ${kernel.identity?.studentTitle}`,
        prompt: `[새로운 상황 적용] ${kernel.identity?.studentTitle}의 원리를 적용해 보세요.`,
        entryFunction: kernel.modes?.code?.entryFunction || 'check_gate',
        starterCode: kernel.modes?.code?.starterCode || `def ${kernel.modes?.code?.entryFunction || 'check_gate'}():\n    pass\n`,
        testCases: kernel.assessment?.publicTests || [],
      }
      session.activeTransferChallenge = transferChallenge

      return {
        ok: true,
        challengeToken: `mock_transfer_token_${session.problemId}_${Date.now()}`,
        transferChallenge,
      }
    },

    async submitTransfer({ attemptId, transferCode }) {
      const session = attempts.get(attemptId)
      if (!session) throw evaluatorError('INVALID_SESSION', 'Attempt session not found')

      if (!transferCode || typeof transferCode !== 'string' || !transferCode.trim()) {
        return {
          ok: true,
          passed: false,
          transferStar: false,
          stars: 2,
          error: '전이 미션 코드를 입력해 주세요.',
          authoritative: false,
        }
      }

      const challenge = session.activeTransferChallenge
      const entryFunction = challenge?.entryFunction || 'check_gate'
      const tests = challenge?.testCases || []

      let passed = true
      let firstError = null

      for (const tc of tests) {
        try {
          const res = runRestrictedPythonFunction(transferCode, entryFunction, tc.inputs)
          if (!res.ok || !matchesExpected(res.result, tc.expected)) {
            passed = false
            firstError = `전이 테스트 불일치 (입력: ${JSON.stringify(tc.inputs)})`
            break
          }
        } catch (err) {
          passed = false
          firstError = err.message || '전이 코드 실행 오류'
          break
        }
      }

      if (passed && session?.problemId) {
        const ledger = loadDevProgressLedger()
        const existing = ledger.get(session.problemId) || {}
        ledger.set(session.problemId, {
          ...existing,
          problemId: session.problemId,
          bestStars: Math.max(existing.bestStars || 0, 3),
          masteryStatus: 'preview_only',
        })
        saveDevProgressLedger(ledger)
      }

      return {
        ok: true,
        passed,
        transferStar: passed,
        stars: passed ? 3 : 2,
        masteryStatus: 'preview_only',
        authoritative: false,
        previewMode: true,
        error: passed ? null : firstError,
      }
    },

    async getProgress({ problemId } = {}) {
      const ledger = loadDevProgressLedger()
      if (problemId && problemId !== 'all') {
        return ledger.get(problemId) || {
          problemId,
          bestStars: 0,
          masteryStatus: 'not_started',
        }
      }
      return Object.fromEntries(ledger.entries())
    },
  }
}
