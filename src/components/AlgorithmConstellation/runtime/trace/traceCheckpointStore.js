/**
 * Trace Checkpoint Store
 * Stores snapshot checkpoints every N (default 25) steps for O(1) random seeking.
 */

export const CHECKPOINT_INTERVAL = 25

export function buildCheckpointStore(canonicalEvents = [], initialWorldState = {}, interval = CHECKPOINT_INTERVAL) {
  const checkpoints = new Map()

  let currentState = {}
  let currentWorld = { ...initialWorldState }

  // Initial checkpoint at step 0
  checkpoints.set(0, {
    stepIndex: 0,
    stateSnapshot: { ...currentState },
    worldSnapshot: { ...currentWorld },
  })

  canonicalEvents.forEach((evt, idx) => {
    // Apply stateDiff and worldDiff
    currentState = { ...currentState, ...evt.stateDiff }
    currentWorld = { ...currentWorld, ...evt.worldDiff }

    const stepIndex = evt.stepIndex ?? idx + 1

    if (stepIndex > 0 && stepIndex % interval === 0) {
      checkpoints.set(stepIndex, {
        stepIndex,
        stateSnapshot: { ...currentState },
        worldSnapshot: { ...currentWorld },
      })
    }
  })

  return {
    getNearestCheckpoint(targetStep) {
      let candidate = 0
      for (const step of checkpoints.keys()) {
        if (step <= targetStep && step > candidate) {
          candidate = step
        }
      }
      return checkpoints.get(candidate) || checkpoints.get(0)
    },
    getAllCheckpoints() {
      return Array.from(checkpoints.values())
    },
  }
}
