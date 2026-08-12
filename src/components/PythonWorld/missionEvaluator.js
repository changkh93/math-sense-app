function hasReachedSingleGoal(goal, finalState, runtimeResult = {}) {
  if (!goal || !finalState?.rover) return false
  if (goal.type === 'position') {
    return Number(finalState.rover.x) === Number(goal.x)
      && Number(finalState.rover.y) === Number(goal.y)
  }
  if (goal.type === 'collectedCount') {
    return Number(finalState.collectedCount || finalState.inventory?.length || 0) >= Number(goal.count || 1)
  }
  if (goal.type === 'collectedIncludes') {
    return (finalState.inventory || []).some((item) => item.id === goal.id)
  }
  if (goal.type === 'allSignalsCollected') {
    const remaining = (finalState.objects || []).filter((item) => item.kind === 'signal' && !item.collected)
    return remaining.length === 0 && Number(finalState.collectedCount || 0) > 0
  }
  if (goal.type === 'minimumEnergy') return Number(finalState.rover.energy || 0) >= Number(goal.value || 0)
  if (goal.type === 'stdoutIncludes') return String(runtimeResult.stdout || '').includes(String(goal.value || ''))
  return false
}

function hasReachedGoal(mission, runtimeResult) {
  const goals = Array.isArray(mission?.goals) && mission.goals.length > 0
    ? mission.goals
    : [mission?.goal]
  return goals.every((goal) => hasReachedSingleGoal(goal, runtimeResult?.finalState, runtimeResult))
}

function getMissingConcepts(mission, conceptsUsed = []) {
  const used = new Set(Array.isArray(conceptsUsed) ? conceptsUsed : [])
  const required = Array.isArray(mission?.conceptEvidence?.mustUse)
    ? mission.conceptEvidence.mustUse
    : []
  return required.filter((concept) => !used.has(concept))
}

function getConceptEvidence(mission, runtimeResult = {}) {
  const evidence = mission?.conceptEvidence || {}
  const concepts = new Set(runtimeResult.conceptsUsed || [])
  const calls = new Set(runtimeResult.callsUsed || [])
  const missingConcepts = getMissingConcepts(mission, runtimeResult.conceptsUsed)
  const mustUseAny = Array.isArray(evidence.mustUseAny) ? evidence.mustUseAny : []
  if (mustUseAny.length > 0 && !mustUseAny.some((concept) => concepts.has(concept))) {
    missingConcepts.push(`다음 중 하나: ${mustUseAny.join(', ')}`)
  }
  const missingCalls = (Array.isArray(evidence.mustCall) ? evidence.mustCall : [])
    .filter((call) => !calls.has(call))
  return { missingConcepts, missingCalls }
}

export function evaluateMissionRun(mission, runtimeResult, hiddenPassed = null) {
  const runtimeError = runtimeResult?.error || null
  const worldGoalPassed = !runtimeError && hasReachedGoal(mission, runtimeResult)
  const { missingConcepts, missingCalls } = getConceptEvidence(mission, runtimeResult)
  const conceptPassed = !runtimeError && missingConcepts.length === 0 && missingCalls.length === 0
  const hasHiddenTests = Array.isArray(mission?.hiddenVariants) && mission.hiddenVariants.length > 0
  const robustnessPassed = hasHiddenTests ? hiddenPassed === true : null
  const completed = worldGoalPassed && conceptPassed
  const stars = completed
    ? 1 + (conceptPassed ? 1 : 0) + (hasHiddenTests && robustnessPassed ? 1 : 0)
    : 0

  let message = '아직 임무 조건을 충족하지 못했습니다.'
  if (runtimeError) {
    message = runtimeError.friendlyMessage || runtimeError.message || 'Python 실행 중 오류가 발생했습니다.'
  } else if (!worldGoalPassed) {
    message = '루미가 아직 파란 비콘에 도착하지 못했습니다. 월드와 마지막 위치를 확인하세요.'
  } else if (!conceptPassed) {
    const missing = [...missingConcepts, ...missingCalls.map((call) => `${call} 호출`)]
    message = `${missing.join(', ')} 증거가 필요합니다. 같은 임무를 다시 해결해 보세요.`
  } else if (hasHiddenTests && !robustnessPassed) {
    message = '현재 항로는 성공했지만 비콘 위치가 바뀌면 멈춥니다. 고정 숫자 대신 거리 변수를 사용해 보세요.'
  } else if (hasHiddenTests) {
    message = '현재 항로와 숨은 항로를 모두 통과했습니다. 반복 자동화 프로토콜이 안정화되었습니다.'
  } else {
    message = '임무 성공! 실행 타임라인에서 반복 변수와 루미의 위치 변화를 확인해 보세요.'
  }

  return {
    completed,
    stars,
    worldGoalPassed,
    conceptPassed,
    robustnessPassed,
    missingConcepts,
    missingCalls,
    message,
  }
}

export function translatePythonError(error = {}) {
  const type = String(error?.type || '')
  const linePrefix = error?.line ? `${error.line}번째 줄: ` : ''
  if (type === 'SyntaxError') return `${linePrefix}Python 문법을 다시 확인해 주세요. 괄호, 콜론(:), 따옴표가 빠지지 않았나요?`
  if (type === 'IndentationError') return `${linePrefix}들여쓰기 깊이가 맞지 않습니다. 반복할 줄을 같은 간격으로 들여써 주세요.`
  if (type === 'NameError') return `${linePrefix}아직 만들어지지 않은 이름을 사용했습니다. 변수와 함수 이름의 철자를 확인하세요.`
  if (type === 'TypeError') return `${linePrefix}이 값에는 현재 명령을 사용할 수 없습니다. 숫자와 문자열의 종류를 확인하세요.`
  if (type === 'ValueError') return `${linePrefix}${error?.message || '값의 범위나 현재 월드 위치를 확인해 주세요.'}`
  if (type === 'PermissionError') return `${linePrefix}${error?.message || 'Mission Lab에서 허용되지 않는 명령입니다.'}`
  if (type === 'IndexError') return `${linePrefix}목록에 존재하지 않는 위치를 읽었습니다. 목록 길이와 인덱스를 확인하세요.`
  if (type === 'AttributeError') return `${linePrefix}이 객체에는 요청한 속성이 없습니다. API 패널에서 이름을 확인하세요.`
  if (type === 'MissionLimitError') return '명령이 너무 오래 반복되어 안전하게 실행을 멈췄습니다. 반복 조건과 횟수를 확인하세요.'
  return `${linePrefix}${error?.message || 'Python이 이 코드를 실행하지 못했습니다.'}`
}
