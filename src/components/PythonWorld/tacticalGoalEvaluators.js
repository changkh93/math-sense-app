/**
 * LUMI Tactical Goal Evaluators (Pure Module)
 */

import { projectTacticalEvents } from './lumiTacticalEventProjector.js'
import { reduceTacticalState } from './lumiTacticalReducer.js'

export function evaluateTacticalGoal(goal, ctx) {
  const { execTrace, events, mission } = ctx
  const requiredAttributes = mission?.tacticalProjection?.requiredAttributes || []
  const instances = Object.values(execTrace.instances || {}).filter((instance) => (
    requiredAttributes.every((name) => instance.publicAttributes?.[name] !== undefined)
  ))

  if (goal.type === 'distinctInstanceCountEquals') {
    return instances.length === Number(goal.count)
  }

  if (goal.type === 'methodCalledOnEveryInstance') {
    const methodName = goal.methodName || 'purify_signal'
    const methodFrames = events.filter((e) => {
      const isMethod = e.type === 'frame_entered' && (e.payload?.callableKind === 'method' || e.callableKind === 'method')
      const name = e.payload?.functionName || e.functionName
      return isMethod && name === methodName
    })

    const calledReceiverIds = new Set(
      methodFrames.map((e) => e.payload?.receiverInstanceId || e.receiverInstanceId).filter(Boolean)
    )

    if (instances.length === 0) return false
    return instances.every((inst) => calledReceiverIds.has(inst.id || inst.instanceId))
  }

  if (goal.type === 'instancesCollectedInSequence') {
    const variables = Object.values(execTrace.variables || {})
    return variables.some((value) => (
      Array.isArray(value) &&
      value.length === instances.length &&
      value.every((item) => item?.kind === 'python_instance')
    ))
  }

  if (goal.type === 'attributeChangedInsideReceiverMethod') {
    const methodName = goal.methodName || 'purify_signal'
    const attr = goal.attribute || 'corruption'
    const methodFrames = events.filter((e) => {
      const isMethod = e.type === 'frame_entered' && (e.payload?.callableKind === 'method' || e.callableKind === 'method')
      const name = e.payload?.functionName || e.functionName
      return isMethod && name === methodName
    })
    const methodFrameIds = new Set(methodFrames.map((e) => e.payload?.frameId || e.frameId))

    const transitions = events.filter((e) => {
      if (e.type !== 'memory_changed') return false
      const frameId = e.payload?.frameId || e.frameId
      if (!methodFrameIds.has(frameId)) return false
      const before = e.payload?.before || e.before
      const after = e.payload?.after || e.after
      if (!before || !after) return false
      return before.publicAttributes?.[attr] !== after.publicAttributes?.[attr]
    })

    return transitions.length > 0
  }

  if (goal.type === 'allInstancesAttributeSatisfy') {
    const attr = goal.attribute || 'corruption'
    const lte = goal.lte !== undefined ? Number(goal.lte) : 0
    if (instances.length === 0) return false
    return instances.every((inst) => {
      const val = inst.publicAttributes?.[attr]
      return val !== undefined && Number(val) <= lte
    })
  }

  if (goal.type === 'allEntitiesRestored') {
    const tacticalEvents = projectTacticalEvents(events, mission)
    const tacticalState = reduceTacticalState(tacticalEvents)
    return Boolean(tacticalState.allRestored)
  }

  return false
}
