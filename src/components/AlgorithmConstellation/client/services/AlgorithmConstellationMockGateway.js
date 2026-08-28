/**
 * Generic Development Mock Gateway for Algorithm Constellation
 *
 * Invariants:
 * 1. ONLY active in DEV mode (import.meta.env.DEV).
 * 2. Evaluates submissions against public problem kernels.
 * 3. Stamped with `authoritative: false` to ensure dev tests never write to production ledger.
 */

import { runRestrictedPythonFunction, evaluatorError } from '../../runtime/restrictedPythonEvaluator.js'
import { matchesExpected } from '../../runtime/sharedPythonEvaluatorCore.js'
import { AC_COND_001 } from '../../shared/problems/ac_cond_001.js'
import { AC_COND_002 } from '../../shared/problems/ac_cond_002.js'
import { AC_PAT_003 } from '../../shared/problems/ac_pat_003.js'
import { AC_PAT_004 } from '../../shared/problems/ac_pat_004.js'
import { AC_SEQ_005 } from '../../shared/problems/ac_seq_005.js'
import { AC_NAV_005 } from '../../shared/problems/ac_nav_005.js'
import { AC_NAV_006 } from '../../shared/problems/ac_nav_006.js'

const PUBLIC_KERNELS = {
  'AC-COND-001': AC_COND_001,
  'AC-COND-002': AC_COND_002,
  'AC-PAT-003': AC_PAT_003,
  'AC-PAT-004': AC_PAT_004,
  'AC-SEQ-005': AC_SEQ_005,
  'AC-NAV-005': AC_NAV_005,
  'AC-NAV-006': AC_NAV_006,
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
      const actual = runRestrictedPythonFunction(code, entryFunction, tc.inputs)
      if (!matchesExpected(actual, tc.expected)) {
        return {
          passed: false,
          error: `입력값 ${JSON.stringify(tc.inputs)}에 대한 실행 결과가 예상값(${JSON.stringify(tc.expected)})과 다릅니다 (실제값: ${JSON.stringify(actual)}).`,
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

  return {
    async startAttemptSession({ problemId, problemVersion = 1, shell = 'explorer', mode = 'practice' }) {
      const sessionId = `mock_session_${problemId}_${Date.now()}`
      const kernel = PUBLIC_KERNELS[problemId] || AC_COND_001
      const session = {
        sessionId,
        problemId,
        problemVersion,
        shell,
        mode,
        startedAt: new Date().toISOString(),
        authoritative: false,
        policy: {
          assistanceAllowed: true,
          arenaMode: mode === 'arena',
          maxHints: 3,
        },
      }
      attempts.set(sessionId, session)
      return { ok: true, session, kernel }
    },

    async submitBaseSolution({ sessionId, studentPythonCode, understandingEvidence = null }) {
      const session = attempts.get(sessionId)
      if (!session) throw evaluatorError('INVALID_SESSION', 'Attempt session not found')

      const evalRes = evaluateGenericBaseCode(session.problemId, studentPythonCode)
      return {
        ok: true,
        passed: evalRes.passed,
        resultStar: evalRes.passed,
        authoritative: false,
        error: evalRes.error || null,
        status: evalRes.passed ? 'passed' : 'failed',
      }
    },

    async requestTransferChallenge({ sessionId }) {
      const session = attempts.get(sessionId)
      if (!session) throw evaluatorError('INVALID_SESSION', 'Attempt session not found')
      const kernel = PUBLIC_KERNELS[session.problemId] || AC_COND_001

      return {
        ok: true,
        transferChallenge: {
          transferChallengeId: `tc_${session.problemId}_dev`,
          entryFunction: kernel.modes?.code?.entryFunction || 'check_gate',
          prompt: `${kernel.identity?.studentTitle} 변형 전이 미션에 도전하세요.`,
          starterCode: kernel.modes?.code?.starterCode || `def ${kernel.modes?.code?.entryFunction || 'check_gate'}():\n    pass\n`,
        },
      }
    },

    async submitTransferChallenge({ sessionId, transferCode }) {
      const session = attempts.get(sessionId)
      if (!session) throw evaluatorError('INVALID_SESSION', 'Attempt session not found')

      const evalRes = evaluateGenericBaseCode(session.problemId, transferCode)
      return {
        ok: true,
        passed: evalRes.passed,
        transferStar: evalRes.passed,
        authoritative: false,
        error: evalRes.error || null,
      }
    },
  }
}
