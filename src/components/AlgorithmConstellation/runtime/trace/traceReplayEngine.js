/**
 * Trace Replay Engine
 * Provides deterministic time-travel seeking and state reconstruction.
 */

import { buildCheckpointStore } from './traceCheckpointStore.js'
import { normalizeTraceEvent } from './normalizeTraceEvent.js'

export function createTraceReplayEngine({
  rawEvents = [],
  initialWorldState = {},
  checkpointInterval = 25,
} = {}) {
  const canonicalEvents = rawEvents.map((e, idx) => normalizeTraceEvent(e, idx + 1))
  const checkpointStore = buildCheckpointStore(canonicalEvents, initialWorldState, checkpointInterval)

  function seekToStep(targetStep) {
    if (targetStep < 0) targetStep = 0
    if (canonicalEvents.length === 0) {
      return {
        stepIndex: 0,
        currentEvent: null,
        state: {},
        world: { ...initialWorldState },
      }
    }

    const nearestCheckpoint = checkpointStore.getNearestCheckpoint(targetStep)
    let state = { ...nearestCheckpoint.stateSnapshot }
    let world = { ...nearestCheckpoint.worldSnapshot }
    let currentEvent = null

    // Forward diff from checkpoint to targetStep
    for (const evt of canonicalEvents) {
      if (evt.stepIndex > nearestCheckpoint.stepIndex && evt.stepIndex <= targetStep) {
        state = { ...state, ...evt.stateDiff }
        world = { ...world, ...evt.worldDiff }
        currentEvent = evt
      }
    }

    return {
      stepIndex: targetStep,
      currentEvent,
      state,
      world,
    }
  }

  return {
    getCanonicalEvents() {
      return [...canonicalEvents]
    },
    getTotalSteps() {
      return canonicalEvents.length
    },
    seekToStep,
  }
}
