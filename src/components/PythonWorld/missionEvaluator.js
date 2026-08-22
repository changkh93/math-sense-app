import { normalizeRuntimeEvents } from './lumiEventNormalizer.js'
import { reduceExecutionTraceState } from './executionTraceReducer.js'
import { evaluateTacticalGoal } from './tacticalGoalEvaluators.js'

const EXECUTED_CALL_EVENT = Object.freeze({
  'lumi.wake': 'rover_woke',
  'lumi.move': 'rover_moved',
  'lumi.turn': 'rover_turned',
  'lumi.say': 'rover_spoke',
  'lumi.scan': 'rover_scanned',
  'lumi.collect': 'rover_collected',
  'lumi.charge': 'rover_charged',
})

function buildEvaluationContext(runtimeResult, mission) {
  const events = normalizeRuntimeEvents(runtimeResult?.events || [])
  const execTrace = reduceExecutionTraceState(events)
  const finalState = runtimeResult?.finalState || {}
  const rover = finalState.rover || {}
  const concepts = new Set(runtimeResult?.conceptsUsed || [])
  const calls = new Set(runtimeResult?.callsUsed || [])
  const stdout = String(runtimeResult?.stdout || '')
  const systemObjects = runtimeResult?.systemObjects || {}

  return {
    events,
    execTrace,
    finalState,
    rover,
    concepts,
    calls,
    stdout,
    systemObjects,
    mission,
  }
}

function getInstanceAttributeTransition(event, attribute) {
  if (event?.type !== 'memory_changed') return null
  const before = event.payload?.before || event.before
  const after = event.payload?.after || event.after
  if (before?.kind !== 'python_instance' || after?.kind !== 'python_instance') return null
  const beforeId = before.id || before.instanceId
  const afterId = after.id || after.instanceId
  if (!beforeId || beforeId !== afterId) return null

  const beforeValue = before.publicAttributes?.[attribute]
  const afterValue = after.publicAttributes?.[attribute]
  if (beforeValue === afterValue) return null

  return {
    instanceId: afterId,
    beforeValue,
    afterValue,
    frameId: event.frameId || event.payload?.frameId || 'main',
  }
}

function getMethodFrames(events, methodName = null) {
  return events.filter((event) => {
    const kind = event.payload?.callableKind || event.callableKind
    const fnName = event.payload?.functionName || event.functionName
    if (event.type !== 'frame_entered' || kind !== 'method') return false
    if (methodName && fnName !== methodName) return false
    return true
  })
}

function hasReachedSingleGoal(goal, ctx) {
  if (!goal) return false
  const { events, execTrace, finalState, rover, stdout, mission } = ctx

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
  if (goal.type === 'commentedOutCall') {
    // Verifies dangerous command was disabled and NOT executed
    const executedEventType = EXECUTED_CALL_EVENT[goal.call]
    const executed = executedEventType ? events.some((event) => event.type === executedEventType && (!goal.argument || event.payload?.distance === goal.argument)) : false
    return !executed
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
  if (goal.type === 'stdoutIncludes') return stdout.includes(String(goal.value || ''))

  // Variables & Memory Goals
  if (goal.type === 'variableDefined') {
    return execTrace.variables[goal.name] !== undefined || events.some((e) => e.type === 'memory_changed' && e.payload?.name === goal.name)
  }
  if (goal.type === 'variableValueEquals') {
    const currentVal = execTrace.variables[goal.name]
    return currentVal === goal.value
  }
  if (goal.type === 'variableChanged') {
    const memEvents = events.filter((e) => e.type === 'memory_changed' && e.payload?.name === goal.name)
    if (memEvents.length === 0) return false
    const lastChange = memEvents[memEvents.length - 1]
    const hasMutated = lastChange.payload?.before !== lastChange.payload?.after
    if (!hasMutated) return false
    if (goal.expectedFinal !== undefined) {
      return lastChange.payload?.after === goal.expectedFinal || execTrace.variables[goal.name] === goal.expectedFinal
    }
    return true
  }

  // Object Core & Execution Trace Goals (Runtime Evidence)
  if (goal.type === 'inspectSystemObject') {
    const sysObj = ctx.systemObjects?.[goal.objectName || 'lumi']
    if (!sysObj) return false
    if (goal.className && sysObj.className !== goal.className) return false
    return true
  }
  if (goal.type === 'classCountAtLeast') {
    return Object.keys(execTrace.classes).length >= Number(goal.count || 1)
  }
  if (goal.type === 'classDefined') {
    return Boolean(execTrace.classes[goal.className])
  }
  if (goal.type === 'classHasMethod') {
    const classes = Object.values(execTrace.classes).filter((cls) => (
      !goal.className || cls.name === goal.className
    ))
    return classes.some((cls) => (cls.methods || []).some((m) => (typeof m === 'string' ? m === goal.methodName : m.name === goal.methodName)))
  }
  if (goal.type === 'distinctInstanceCount' || goal.type === 'instanceCountEquals') {
    return Object.keys(execTrace.instances).length === Number(goal.count || 0)
  }
  if (goal.type === 'instanceCount' || goal.type === 'instanceCountAtLeast') {
    return Object.keys(execTrace.instances).length >= Number(goal.count || 0)
  }
  if (goal.type === 'allInstancesHaveAttribute') {
    const instances = Object.values(execTrace.instances)
    if (instances.length === 0) return false
    return instances.every((inst) => inst.publicAttributes?.[goal.attribute] !== undefined)
  }
  if (goal.type === 'allInstancesAttributeEquals') {
    const instances = Object.values(execTrace.instances).filter((inst) => (
      !goal.className || inst.className === goal.className
    ))
    return instances.length > 0 && instances.every((inst) => (
      inst.publicAttributes?.[goal.attribute] === goal.value
    ))
  }
  if (goal.type === 'composedInstanceAttribute') {
    return Object.values(execTrace.instances).some((inst) => {
      if (goal.className && inst.className !== goal.className) return false
      const nested = inst.publicAttributes?.[goal.attribute]
      if (nested?.kind !== 'python_instance') return false
      return !goal.composedClassName || nested.className === goal.composedClassName
    })
  }
  if (goal.type === 'nestedInstanceAttributeEquals') {
    return Object.values(execTrace.instances).some((inst) => {
      if (goal.className && inst.className !== goal.className) return false
      const nested = inst.publicAttributes?.[goal.attribute]
      if (nested?.kind !== 'python_instance') return false
      return nested.publicAttributes?.[goal.nestedAttribute] === goal.value
    })
  }
  if (goal.type === 'allInstancesInitializedAttribute') {
    const instances = Object.values(execTrace.instances).filter((inst) => (
      !goal.className || inst.className === goal.className
    ))
    if (instances.length === 0) return false

    const frames = getMethodFrames(events, goal.methodName || '__init__')
    const frameById = new Map(frames.map((event) => [
      event.payload?.frameId || event.frameId,
      event.payload?.receiverInstanceId || null,
    ]))
    const initializedInstanceIds = new Set()

    events.forEach((event) => {
      const transition = getInstanceAttributeTransition(event, goal.attribute)
      if (!transition || !frameById.has(transition.frameId)) return
      const receiverId = frameById.get(transition.frameId)
      if (receiverId !== transition.instanceId) return
      if (transition.beforeValue === undefined && transition.afterValue !== undefined) {
        initializedInstanceIds.add(transition.instanceId)
      }
    })

    return instances.every((inst) => initializedInstanceIds.has(inst.id))
  }
  if (goal.type === 'runtimeMethodCalled' || goal.type === 'methodCalled') {
    return events.some((ev) => {
      if (ev.type !== 'frame_entered' || ev.payload?.callableKind !== 'method') return false
      if (goal.methodName && ev.payload?.functionName !== goal.methodName) return false
      return true
    })
  }
  if (goal.type === 'anyInstanceAttributeEquals') {
    return Object.values(execTrace.instances).some((inst) => {
      if (goal.className && inst.className !== goal.className) return false
      return inst.publicAttributes[goal.attribute] === goal.value
    })
  }
  if (goal.type === 'instanceAttributeEquals') {
    return Object.values(execTrace.instances).some((inst) => {
      if (goal.binding && !inst.bindings.includes(goal.binding)) return false
      if (goal.className && inst.className !== goal.className) return false
      return inst.publicAttributes[goal.attribute] === goal.value
    })
  }
  if (goal.type === 'instancesHaveDistinctState') {
    const instances = Object.values(execTrace.instances).filter((inst) => {
      return !goal.className || inst.className === goal.className
    })
    if (instances.length < 2) return false
    const attr = goal.attribute || 'integrity'
    const values = instances.map((inst) => inst.publicAttributes[attr])
    const uniqueValues = new Set(values)
    return uniqueValues.size > 1
  }
  if (goal.type === 'onlyTargetInstanceAttributeChanged') {
    const instances = Object.values(execTrace.instances)
    if (instances.length === 0) return false
    const target = goal.targetBinding
      ? instances.find((inst) => inst.bindings.includes(goal.targetBinding))
      : (goal.targetInstanceId ? instances.find((inst) => (inst.id || inst.instanceId) === goal.targetInstanceId) : instances[0])
    if (!target) return false
    const targetId = target.id || target.instanceId

    const methodFrames = getMethodFrames(events, goal.methodName || null)
    const matchingTargetFrames = methodFrames.filter((event) => (
      (event.payload?.receiverInstanceId || event.receiverInstanceId) === targetId
    ))

    if (goal.requireMethodReceiverMatch && matchingTargetFrames.length === 0) {
      return false
    }

    if (goal.requireMethodReceiverMatch || goal.methodName) {
      const targetFrameIds = new Set(matchingTargetFrames.map((event) => (
        event.payload?.frameId || event.frameId
      )))
      const targetTransitions = events
        .map((event) => getInstanceAttributeTransition(event, goal.attribute))
        .filter((transition) => (
          transition &&
          transition.instanceId === targetId &&
          targetFrameIds.has(transition.frameId)
        ))

      const expectedTransitionOccurred = targetTransitions.some((transition) => (
        (goal.expectedBefore === undefined || transition.beforeValue === goal.expectedBefore) &&
        (goal.expectedAfter === undefined || transition.afterValue === goal.expectedAfter)
      ))
      if (!expectedTransitionOccurred) return false

      if (goal.expectedChangedInstanceCount !== undefined) {
        const nonInitMethodFrames = methodFrames.filter((event) => (
          (event.payload?.functionName || event.functionName) !== '__init__' &&
          (!goal.methodName || (event.payload?.functionName || event.functionName) === goal.methodName)
        ))
        const methodFrameById = new Map(nonInitMethodFrames.map((event) => [
          event.payload?.frameId || event.frameId,
          event.payload?.receiverInstanceId || event.receiverInstanceId || null,
        ]))
        const changedInstanceIds = new Set()
        events.forEach((event) => {
          const transition = getInstanceAttributeTransition(event, goal.attribute)
          if (!transition || !methodFrameById.has(transition.frameId)) return
          if (goal.expectedBefore !== undefined && transition.beforeValue !== goal.expectedBefore) return
          if (goal.expectedAfter !== undefined && transition.afterValue !== goal.expectedAfter) return
          const receiverId = methodFrameById.get(transition.frameId)
          if (receiverId === transition.instanceId) changedInstanceIds.add(transition.instanceId)
        })
        if (changedInstanceIds.size !== Number(goal.expectedChangedInstanceCount)) return false
      }
    }

    const targetVal = target.publicAttributes[goal.attribute]
    if (goal.expectedAfter !== undefined && targetVal !== goal.expectedAfter) {
      return false
    }
    if (goal.expectedValue !== undefined && targetVal !== goal.expectedValue) {
      return false
    }

    const others = instances.filter((inst) => (inst.id || inst.instanceId) !== targetId)
    if (goal.unchangedOthers && others.length > 0) {
      if (goal.expectedBefore !== undefined) {
        if (others.some((o) => o.publicAttributes[goal.attribute] !== goal.expectedBefore)) {
          return false
        }
      } else if (others.some((o) => o.publicAttributes[goal.attribute] === targetVal)) {
        return false
      }
    }
    return true
  }

  // Tactical Goal Dispatch (Gate 3)
  if (
    goal.type === 'distinctInstanceCountEquals' ||
    goal.type === 'instancesCollectedInSequence' ||
    goal.type === 'methodCalledOnEveryInstance' ||
    goal.type === 'attributeChangedInsideReceiverMethod' ||
    goal.type === 'allInstancesAttributeSatisfy' ||
    goal.type === 'allEntitiesRestored'
  ) {
    return evaluateTacticalGoal(goal, ctx)
  }

  return false
}

function hasReachedGoal(mission, runtimeResult) {
  const goals = Array.isArray(mission?.goals) && mission.goals.length > 0
    ? mission.goals
    : (mission?.goal ? [mission.goal] : [])
  if (goals.length === 0) return false
  const ctx = buildEvaluationContext(runtimeResult, mission)
  return goals.every((goal) => hasReachedSingleGoal(goal, ctx))
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

  const missingMustUse = Array.isArray(evidence.mustUse)
    ? evidence.mustUse.filter((concept) => !concepts.has(concept))
    : []

  const missingMustCall = Array.isArray(evidence.mustCall)
    ? evidence.mustCall.filter((call) => !calls.has(call))
    : []

  const passed = missingMustUse.length === 0 && missingMustCall.length === 0

  return {
    passed,
    missingMustUse,
    missingMustCall,
    conceptsUsed: Array.from(concepts),
    callsUsed: Array.from(calls),
  }
}

export function evaluateMissionAttempt({
  mission,
  runtimeResult,
  variantResults = [],
  hintLevel = 0,
}) {
  const worldGoalPassed = hasReachedGoal(mission, runtimeResult)
  const conceptEvidence = getConceptEvidence(mission, runtimeResult)
  const basePassed = worldGoalPassed && conceptEvidence.passed

  const requiredVariants = Array.isArray(mission?.hiddenVariants) ? mission.hiddenVariants : []
  const hasVariants = requiredVariants.length > 0
  const variantsEvaluated = Array.isArray(variantResults) && variantResults.length > 0

  let transferPassed = true
  if (hasVariants) {
    if (!variantsEvaluated || variantResults.length < requiredVariants.length) {
      transferPassed = false
    } else {
      transferPassed = requiredVariants.every((variant, index) => {
        const result = variantResults[index]
        if (!result || result.error) return false
        const variantMission = { ...mission, ...variant }
        const reached = hasReachedGoal(variantMission, result)
        const conceptsOk = getConceptEvidence(variantMission, result).passed
        return reached && conceptsOk
      })
    }
  }

  const passed = basePassed && (!hasVariants || transferPassed)

  let stars = 0
  if (basePassed) {
    stars = 1
    if (hintLevel === 0) stars += 1
    if (hasVariants && transferPassed) stars += 1
  }

  const score = stars === 3 ? 100 : stars === 2 ? 80 : stars === 1 ? 60 : 0
  const mastered = stars === 3

  const goalEvaluation = getDetailedGoalEvaluation(mission, runtimeResult)
  const failureReason = goalEvaluation.failureReason || (conceptEvidence.missingMustUse?.length > 0 ? `필수 개념 미사용: ${conceptEvidence.missingMustUse.join(', ')}` : '')
  const message = passed
    ? '축하합니다! 미션의 모든 조건을 성공적으로 달성했습니다.'
    : (failureReason ? `${failureReason}` : '미션 완료 조건을 다시 확인해 보세요.')

  return {
    passed,
    basePassed,
    worldGoalPassed,
    conceptPassed: conceptEvidence.passed,
    transferPassed,
    missingConcepts: conceptEvidence.missingMustUse,
    missingCalls: conceptEvidence.missingMustCall,
    stars,
    score,
    mastered,
    hintsUsed: hintLevel,
    goalDetails: goalEvaluation.goals,
    failureReason,
    message,
  }
}

export function getDetailedGoalEvaluation(mission, runtimeResult) {
  const goals = Array.isArray(mission?.goals) && mission.goals.length > 0
    ? mission.goals
    : (mission?.goal ? [mission.goal] : [])
  if (goals.length === 0) return { goals: [], failureReason: '' }

  const ctx = buildEvaluationContext(runtimeResult, mission)
  const instances = Object.values(ctx.execTrace.instances || {})

  let firstFailureReason = ''
  const evaluatedGoals = goals.map((goal) => {
    const passed = hasReachedSingleGoal(goal, ctx)
    let label = goal.label || ''
    let hint = ''

    if (goal.type === 'inspectSystemObject') {
      label = label || `시스템 객체 ${goal.objectName || 'lumi'} (${goal.className || 'Rover'}) 정체 관찰`
      if (!passed) hint = `${goal.objectName || 'lumi'} 객체의 정체를 print(type(${goal.objectName || 'lumi'}))로 확인하세요.`
    } else if (goal.type === 'classCountAtLeast') {
      label = label || `클래스(설계도) ${goal.count || 1}개 정의`
      if (!passed) hint = `class Drone: 형태로 클래스 설계도를 정의하세요.`
    } else if (goal.type === 'instanceCountEquals') {
      label = label || `인스턴스(실체) ${goal.count}개 생성`
      if (!passed) hint = `현재 생성된 인스턴스: ${instances.length}개 (목표: ${goal.count}개)`
    } else if (goal.type === 'distinctInstanceCount') {
      label = label || `독립된 인스턴스 ${goal.count}개 생성`
      if (!passed) hint = `현재 생성된 인스턴스: ${instances.length}개 (목표: ${goal.count}개)`
    } else if (goal.type === 'classHasMethod') {
      label = label || `${goal.className || '클래스'}에 ${goal.methodName} 메서드 정의`
      if (!passed) hint = `클래스 내부에 def ${goal.methodName}(self, ...): 메서드를 작성하세요.`
    } else if (goal.type === 'allInstancesHaveAttribute') {
      label = label || `모든 인스턴스에 '${goal.attribute}' 속성 저장`
      if (!passed) {
        const foundAttrs = instances.flatMap((i) => Object.keys(i.publicAttributes || {}))
        const uniqueFound = Array.from(new Set(foundAttrs))
        hint = uniqueFound.length > 0
          ? `'${goal.attribute}' 속성이 없습니다. (현재 발견된 속성: [${uniqueFound.join(', ')}] → self.${goal.attribute} 오타 확인)`
          : `self.${goal.attribute} = ${goal.attribute} 코드를 작성하여 속성을 저장하세요.`
      }
    } else if (goal.type === 'allInstancesInitializedAttribute') {
      label = label || `__init__ 내부에서 '${goal.attribute}' 속성 초기화`
      if (!passed) hint = `__init__ 생성자 함수 내부에서 self.${goal.attribute} = ${goal.attribute}를 대입하세요.`
    } else if (goal.type === 'instancesHaveDistinctState') {
      label = label || `인스턴스마다 서로 다른 '${goal.attribute}' 값 설정`
      if (!passed) hint = `생성할 때 서로 다른 ${goal.attribute} 값을 인자로 넘겨주세요.`
    } else if (goal.type === 'runtimeMethodCalled') {
      label = label || `${goal.methodName || '지정'} 메서드 호출`
      if (!passed) hint = `${goal.methodName}() 메서드를 호출하세요.`
    } else if (goal.type === 'classDefined') {
      label = label || `${goal.className || '클래스'} 정의`
      if (!passed) hint = `class ${goal.className || '클래스'}: 형태로 정의하세요.`
    } else if (goal.type === 'instanceAttributeEquals') {
      label = label || `${goal.binding || '인스턴스'}의 ${goal.attribute} 속성 = ${goal.value}`
      if (!passed) hint = `${goal.binding || '인스턴스'}의 ${goal.attribute} 값이 ${goal.value}가 되도록 하세요.`
    } else if (goal.type === 'tile') {
      label = label || `목표 좌표 (${goal.x}, ${goal.y}) 도달`
      if (!passed) hint = `LUMI를 좌표 (${goal.x}, ${goal.y})로 이동시키세요.`
    } else if (goal.type === 'inventory') {
      label = label || `아이템 수집`
      if (!passed) hint = `목표 아이템을 수집하세요.`
    } else if (goal.type === 'awake') {
      label = label || `LUMI 탐사 로봇 기상 (wake)`
      if (!passed) hint = `lumi.wake()를 호출하여 로봇을 깨우세요.`
    }

    if (!passed && !firstFailureReason && hint) {
      firstFailureReason = hint
    }

    return {
      type: goal.type,
      label: label || goal.type,
      passed,
      hint: passed ? undefined : hint,
    }
  })

  return {
    goals: evaluatedGoals,
    failureReason: firstFailureReason,
  }
}

export function evaluateMissionRun(mission, runtimeResult, hiddenPassed = null) {
  const worldGoalPassed = hasReachedGoal(mission, runtimeResult)
  const conceptEvidence = getConceptEvidence(mission, runtimeResult)
  const basePassed = worldGoalPassed && conceptEvidence.passed

  const requiredVariants = Array.isArray(mission?.hiddenVariants) ? mission.hiddenVariants : []
  const hasVariants = requiredVariants.length > 0
  const transferPassed = hasVariants ? (hiddenPassed === true) : true
  const passed = basePassed && (!hasVariants || transferPassed)

  let stars = 0
  if (basePassed) {
    stars = 1
    if (hasVariants && transferPassed) stars = 3
    else if (!hasVariants) stars = 2
  }

  const goalEvaluation = getDetailedGoalEvaluation(mission, runtimeResult)
  const failureReason = goalEvaluation.failureReason || (conceptEvidence.missingMustUse?.length > 0 ? `필수 개념 미사용: ${conceptEvidence.missingMustUse.join(', ')}` : '')
  const message = passed
    ? '축하합니다! 미션의 모든 조건을 성공적으로 달성했습니다.'
    : (failureReason ? `${failureReason}` : '미션 완료 조건을 다시 확인해 보세요.')

  return {
    passed,
    basePassed,
    worldGoalPassed,
    conceptPassed: conceptEvidence.passed,
    transferPassed,
    missingConcepts: conceptEvidence.missingMustUse,
    missingCalls: conceptEvidence.missingMustCall,
    stars,
    score: stars === 3 ? 100 : stars === 2 ? 80 : stars === 1 ? 60 : 0,
    mastered: stars === 3,
    cleared: passed,
    completed: passed,
    goalDetails: goalEvaluation.goals,
    failureReason,
    message,
  }
}

export function translatePythonError(error) {
  if (!error) return ''
  const message = error.message || String(error)
  const type = error.type || ''
  if (type === 'SyntaxError') return '문법 오류: 괄호나 따옴표, 콜론(:)의 짝이 맞는지 확인하세요.'
  if (type === 'IndentationError') return '들여쓰기 오류: 줄 앞의 공백(스페이스 4칸)을 확인하세요.'
  if (type === 'NameError') return `이름 오류: 정의되지 않은 변수나 명령입니다 (${message}).`
  if (type === 'TypeError') return `자료형 오류: ${message}`
  if (type === 'MissionLimitError') return message
  if (type === 'PermissionError') return message
  return message
}

export {
  hasReachedGoal,
  getMissingConcepts,
  getConceptEvidence,
}
