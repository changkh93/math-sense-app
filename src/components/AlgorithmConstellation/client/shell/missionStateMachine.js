/**
 * Algorithm Mission State Machine
 * Client experience state machine orchestrating 10-step student lifecycle.
 */

export const MISSION_STATES = Object.freeze({
  BRIEFING: 'BRIEFING',
  OBSERVE: 'OBSERVE',
  EXPLORE: 'EXPLORE',
  CODE: 'CODE',
  RUN_SUCCESS: 'RUN_SUCCESS',
  UNDERSTANDING_CHECK: 'UNDERSTANDING_CHECK',
  TRANSFER_CHALLENGE: 'TRANSFER_CHALLENGE',
  COMPLETE: 'COMPLETE',
})

const ALLOWED_CLIENT_TRANSITIONS = {
  [MISSION_STATES.BRIEFING]: [MISSION_STATES.OBSERVE, MISSION_STATES.EXPLORE, MISSION_STATES.CODE],
  [MISSION_STATES.OBSERVE]: [MISSION_STATES.EXPLORE, MISSION_STATES.CODE, MISSION_STATES.UNDERSTANDING_CHECK, MISSION_STATES.TRANSFER_CHALLENGE, MISSION_STATES.COMPLETE],
  [MISSION_STATES.EXPLORE]: [MISSION_STATES.OBSERVE, MISSION_STATES.CODE, MISSION_STATES.UNDERSTANDING_CHECK, MISSION_STATES.TRANSFER_CHALLENGE, MISSION_STATES.COMPLETE],
  [MISSION_STATES.CODE]: [MISSION_STATES.RUN_SUCCESS, MISSION_STATES.OBSERVE, MISSION_STATES.EXPLORE, MISSION_STATES.UNDERSTANDING_CHECK, MISSION_STATES.TRANSFER_CHALLENGE, MISSION_STATES.COMPLETE],
  [MISSION_STATES.RUN_SUCCESS]: [MISSION_STATES.UNDERSTANDING_CHECK, MISSION_STATES.CODE, MISSION_STATES.OBSERVE, MISSION_STATES.EXPLORE, MISSION_STATES.TRANSFER_CHALLENGE, MISSION_STATES.COMPLETE],
  [MISSION_STATES.UNDERSTANDING_CHECK]: [MISSION_STATES.TRANSFER_CHALLENGE, MISSION_STATES.CODE, MISSION_STATES.OBSERVE, MISSION_STATES.EXPLORE, MISSION_STATES.COMPLETE],
  [MISSION_STATES.TRANSFER_CHALLENGE]: [MISSION_STATES.COMPLETE, MISSION_STATES.CODE, MISSION_STATES.OBSERVE, MISSION_STATES.EXPLORE, MISSION_STATES.UNDERSTANDING_CHECK],
  [MISSION_STATES.COMPLETE]: [MISSION_STATES.BRIEFING, MISSION_STATES.CODE, MISSION_STATES.OBSERVE, MISSION_STATES.EXPLORE, MISSION_STATES.TRANSFER_CHALLENGE],
}

export function createMissionStateMachine({ initialMode = 'observe', initialState, onTransition } = {}) {
  let currentState = Object.values(MISSION_STATES).includes(initialState)
    ? initialState
    : initialMode === 'code' ? MISSION_STATES.CODE : MISSION_STATES.OBSERVE
  const history = [currentState]

  function transition(toState, payload = {}) {
    if (!MISSION_STATES[toState]) {
      throw new Error(`Invalid target mission state: ${toState}`)
    }

    const allowed = ALLOWED_CLIENT_TRANSITIONS[currentState] || []
    if (!allowed.includes(toState) && currentState !== toState) {
      throw new Error(`Illegal mission state transition: ${currentState} -> ${toState}`)
    }

    currentState = toState
    history.push(toState)
    onTransition?.({ state: currentState, history: [...history], payload })
    return currentState
  }

  return {
    getState() {
      return currentState
    },
    getHistory() {
      return [...history]
    },
    transition,
    reset(startMode = 'observe') {
      currentState = startMode === 'code' ? MISSION_STATES.CODE : MISSION_STATES.OBSERVE
      history.length = 0
      history.push(currentState)
      return currentState
    },
  }
}
