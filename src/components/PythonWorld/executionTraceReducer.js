/**
 * LUMI Execution Trace Reducer
 * Pure, deterministic reducer managing Python program execution state:
 * - Variables & Snapshots
 * - Classes & Methods registry
 * - Distinct Instances & Aliased Variable Bindings
 * - Call Stack Frames (function / method)
 * - Active Self Reference for playhead-driven highlighting
 */

import {
  selectClassRegistrations,
  selectInstanceCreations,
} from './executionTraceSelectors.js'

export function createInitialExecutionTraceState() {
  return {
    variables: {},
    classes: {},
    instances: {},
    callStack: [],
    activeFrameId: 'main',
    activeSelfRef: null,
  }
}

export function reduceExecutionTraceState(normalizedEvents = [], targetSeq = Infinity) {
  const state = createInitialExecutionTraceState()
  const visibleEvents = []

  for (const event of normalizedEvents) {
    if (event.seq > targetSeq) break
    visibleEvents.push(event)

    const payload = event.payload || {}

    switch (event.type) {
      case 'frame_entered': {
        const frameInfo = {
          frameId: payload.frameId || `frame_${event.seq}`,
          callableKind: payload.callableKind || 'function',
          functionName: payload.functionName || '<anonymous>',
          receiverInstanceId: payload.receiverInstanceId || null,
        }
        state.callStack.push(frameInfo)
        state.activeFrameId = frameInfo.frameId
        state.activeSelfRef = frameInfo.receiverInstanceId
        break
      }

      case 'frame_exited': {
        if (state.callStack.length > 0) {
          state.callStack.pop()
        }
        if (state.callStack.length > 0) {
          const top = state.callStack[state.callStack.length - 1]
          state.activeFrameId = top.frameId
          state.activeSelfRef = top.receiverInstanceId
        } else {
          state.activeFrameId = 'main'
          state.activeSelfRef = null
        }
        break
      }

      case 'line_entered': {
        if (payload.variables) {
          state.variables = { ...state.variables, ...payload.variables }
        }
        if (payload.activeFrameId) {
          state.activeFrameId = payload.activeFrameId
        }
        if (payload.receiverInstanceId !== undefined) {
          state.activeSelfRef = payload.receiverInstanceId
        }
        break
      }

      case 'memory_changed': {
        if (payload.name) {
          state.variables = {
            ...state.variables,
            [payload.name]: payload.after,
          }
        }
        if (payload.receiverInstanceId) {
          state.activeSelfRef = payload.receiverInstanceId
        }
        break
      }

      default:
        break
    }
  }

  // Object identity, current bindings, and attribute state must be reconstructed
  // from event order. Rebuilding them from the accumulated variable bag mixes
  // method locals such as `self` with stale module snapshots and can roll a
  // mutated instance back to an older value.
  state.classes = Object.fromEntries(
    selectClassRegistrations(visibleEvents).map((registeredClass) => [
      registeredClass.className,
      {
        name: registeredClass.className,
        methods: registeredClass.methods || [],
      },
    ])
  )
  state.instances = Object.fromEntries(
    selectInstanceCreations(visibleEvents).map((instance) => [
      instance.instanceId,
      {
        id: instance.instanceId,
        className: instance.className,
        primaryBinding: instance.primaryBinding,
        bindings: [...instance.bindings],
        publicAttributes: { ...(instance.publicAttributes || {}) },
      },
    ])
  )

  return state
}
