import { normalizeRuntimeEvents } from './lumiEventNormalizer.js'

const EXECUTED_CALL_EVENT = Object.freeze({
  'lumi.wake': 'rover_woke',
  'lumi.move': 'rover_moved',
  'lumi.turn': 'rover_turned',
  'lumi.say': 'rover_spoke',
  'lumi.scan': 'rover_scanned',
  'lumi.collect': 'rover_collected',
  'lumi.charge': 'rover_charged',
})

function hasReachedSingleGoal(goal, finalState, runtimeResult = {}, mission = {}) {
  if (!goal) return false
  const rover = finalState?.rover || {}
  const events = normalizeRuntimeEvents(runtimeResult?.events || [])

  if (goal.type === 'awake') {
    return Boolean(rover.awake)
  }
  if (goal.type === 'position') {
    return Number(rover.x) === Number(goal.x)
      && Number(rover.y) === Number(goal.y)
  }
  if (goal.type === 'positionUnchanged') {
    const initialX = Number(goal.x ?? mission?.world?.rover?.x ?? 0)
    const initialY = Number(goal.y ?? mission?.world?.rover?.y ?? 0)
    return Number(rover.x) === initialX && Number(rover.y) === initialY
  }
  if (goal.type === 'noCollision') {
    return !events.some((event) => event.type === 'collision' || event.payload?.blocked)
  }
  if (goal.type === 'commandNotCalled') {
    const executedEventType = EXECUTED_CALL_EVENT[goal.call]
    return executedEventType ? !events.some((event) => event.type === executedEventType) : false
  }
  if (goal.type === 'eventOccurred') {
    return events.some((event) => event.type === goal.eventType)
  }
  if (goal.type === 'spokenMessage') {
    return events.some((event) => {
      if (event.type !== 'rover_spoke') return false
      const msg = String(event.payload?.message || '')
      return !goal.includes || msg.includes(goal.includes)
    })
  }
  if (goal.type === 'collectedCount') {
    return Number(finalState?.collectedCount || finalState?.inventory?.length || 0) >= Number(goal.count || 1)
  }
  if (goal.type === 'collectedIncludes') {
    return (finalState?.inventory || []).some((item) => item.id === goal.id)
  }
  if (goal.type === 'allSignalsCollected') {
    const remaining = (finalState?.objects || []).filter((item) => item.kind === 'signal' && !item.collected)
    return remaining.length === 0 && Number(finalState?.collectedCount || 0) > 0
  }
  if (goal.type === 'minimumEnergy') return Number(rover.energy || 0) >= Number(goal.value || 0)
  if (goal.type === 'stdoutIncludes') return String(runtimeResult.stdout || '').includes(String(goal.value || ''))
  return false
}

function hasReachedGoal(mission, runtimeResult) {
  const goals = Array.isArray(mission?.goals) && mission.goals.length > 0
    ? mission.goals
    : (mission?.goal ? [mission.goal] : [])
  if (goals.length === 0) return false
  return goals.every((goal) => hasReachedSingleGoal(goal, runtimeResult?.finalState, runtimeResult, mission))
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
  const understandingPassed = true
  const hasHiddenTests = (Array.isArray(mission?.hiddenVariants) && mission.hiddenVariants.length > 0)
    || (Array.isArray(mission?.transferVariants) && mission.transferVariants.length > 0)
  const robustnessPassed = hasHiddenTests ? hiddenPassed === true : null
  const transferPassed = hasHiddenTests ? robustnessPassed === true : null

  const cleared = worldGoalPassed
  const completed = worldGoalPassed && conceptPassed
  const understood = conceptPassed && understandingPassed
  const mastered = hasHiddenTests && worldGoalPassed && conceptPassed && robustnessPassed
  const nextUnlocked = worldGoalPassed

  let stars = 0
  if (worldGoalPassed) {
    stars = 1
    if (conceptPassed && understandingPassed) {
      stars = 2
      if (hasHiddenTests && robustnessPassed) {
        stars = 3
      }
    }
  }

  let message = '아직 임무 조건을 충족하지 못했습니다.'
  if (runtimeError) {
    message = runtimeError.friendlyMessage || runtimeError.message || 'Python 실행 중 오류가 발생했습니다.'
  } else if (!worldGoalPassed) {
    message = '루미가 아직 목표 상태에 도달하지 못했습니다. 월드와 마지막 위치/상태를 확인하세요.'
  } else if (!conceptPassed) {
    const missing = [...missingConcepts, ...missingCalls.map((call) => `${call} 호출`)]
    message = `월드 목표는 달성했지만 ${missing.join(', ')} 증거가 필요합니다. 2성을 위해 다시 도전해 보세요.`
  } else if (hasHiddenTests && !robustnessPassed) {
    message = '현재 항로는 성공했지만 변형/숨은 항로에서 멈춥니다. 고정 값 대신 변수/센서를 사용해 3성에 도전하세요.'
  } else if (hasHiddenTests) {
    message = '현재 항로와 변형 항로를 모두 통과했습니다! 3성 Mastered를 달성했습니다.'
  } else {
    message = '임무 성공! 프로토콜 코어가 정상 작동합니다.'
  }

  return {
    cleared,
    completed,
    understood,
    mastered,
    nextUnlocked,
    stars,
    worldGoalPassed,
    conceptPassed,
    understandingPassed,
    robustnessPassed,
    transferPassed,
    missingConcepts,
    missingCalls,
    message,
  }
}

export function translatePythonError(error = {}) {
  const type = String(error?.type || '')
  const linePrefix = error?.line ? `${error.line}번째 줄: ` : ''
  if (type === 'SyntaxError') return `${linePrefix}Python 문법을 다시 확인해 주세요. 괄호, 콜론(:), 따옴표가 빠지지 않았나요?`
  if (type === 'IndentationError') return `${linePrefix}들여쓰기 깊이가 맞지 않습니다. 명령 줄을 같은 간격(스페이스 4칸)으로 들여써 주세요.`
  if (type === 'NameError') return `${linePrefix}아직 만들어지지 않은 이름을 사용했습니다. 변수나 명령 이름의 철자를 확인하세요.`
  if (type === 'TypeError') return `${linePrefix}이 값에는 현재 명령을 사용할 수 없습니다. 숫자와 문자열의 종류를 확인하세요.`
  if (type === 'ValueError') return `${linePrefix}${error?.message || '값의 범위나 현재 월드 위치를 확인해 주세요.'}`
  if (type === 'PermissionError') return `${linePrefix}${error?.message || 'Mission Lab에서 허용되지 않는 명령입니다.'}`
  if (type === 'IndexError') return `${linePrefix}목록에 존재하지 않는 위치를 읽었습니다. 목록 길이와 번호를 확인하세요.`
  if (type === 'AttributeError') return `${linePrefix}이 객체에는 요청한 속성이 없습니다. 이름을 확인하세요.`
  if (type === 'MissionLimitError') return '명령이 너무 오래 반복되어 안전하게 실행을 멈췄습니다. 반복 조건과 횟수를 확인하세요.'
  return `${linePrefix}${error?.message || 'Python이 이 코드를 실행하지 못했습니다.'}`
}
