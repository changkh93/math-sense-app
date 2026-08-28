/**
 * Stagnation Detector
 * Detects student struggle patterns to offer gentle scaffold suggestions.
 */

function lightweightCodeHash(code = '') {
  let hash = 2166136261
  for (let index = 0; index < code.length; index += 1) {
    hash ^= code.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}

export function createStagnationDetector({ now = Date.now } = {}) {
  let runHistory = []
  let lastCodeChangeAt = now()
  let lastCode = ''

  function recordCodeChange(code = '') {
    if (code !== lastCode) {
      lastCode = code
      lastCodeChangeAt = now()
    }
  }

  function recordRun({ code, testResults = [], error = null }) {
    const currentTime = now()
    recordCodeChange(code)

    const failedGroup = error
      ? `ERROR:${error}`
      : testResults.filter((test) => !test.passed).map((test) => test.id).sort().join('|') || 'NONE'
    const entry = {
      timestamp: currentTime,
      codeHash: lightweightCodeHash(code.trim()),
      passed: testResults.length > 0 && testResults.every((t) => t.passed),
      failedGroup,
    }

    runHistory.push(entry)
    if (runHistory.length > 10) runHistory.shift()

    // 1. 3 runs with identical code
    if (runHistory.length >= 3) {
      const lastThree = runHistory.slice(-3)
      if (lastThree.every((h) => !h.passed && h.codeHash === entry.codeHash)) {
        return {
          isStagnant: true,
          reason: 'repeated_identical_runs',
          message: '코드 변경 없이 실행이 반복되고 있습니다. 실험 모드를 통해 규칙을 다시 확인해 볼까요?',
          recommendedLevel: 2,
        }
      }
    }

    // 2. Same failure group 2 consecutive times
    if (runHistory.length >= 2) {
      const lastTwo = runHistory.slice(-2)
      if (!lastTwo[0].passed && !lastTwo[1].passed && lastTwo[0].failedGroup === lastTwo[1].failedGroup) {
        return {
          isStagnant: true,
          reason: 'consecutive_same_failure',
          message: '비슷한 위치에서 계속 막히고 있나요? 조건 스캔 힌트를 살펴보세요.',
          recommendedLevel: 1,
        }
      }
    }

    // 3. 90 seconds without code change and failed last run
    if (!entry.passed && currentTime - lastCodeChangeAt > 90_000) {
      return {
        isStagnant: true,
        reason: 'idle_struggle',
        message: '고민이 길어지고 있나요? 방향을 잡아주는 질문을 확인해 보세요.',
        recommendedLevel: 3,
      }
    }

    return { isStagnant: false }
  }

  function reset() {
    runHistory = []
    lastCodeChangeAt = now()
    lastCode = ''
  }

  return {
    recordRun,
    recordCodeChange,
    reset,
  }
}
