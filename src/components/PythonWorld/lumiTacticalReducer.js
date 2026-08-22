/**
 * LUMI Tactical State Reducer (Pure Module)
 * Deterministically reduces tactical events up to a targetSeq/tacticalSeq.
 */

export function createInitialTacticalState() {
  return {
    entities: {},
    activeTargetEntityId: null,
    restoredCount: 0,
    totalCount: 0,
    lastPulse: null,
    allRestored: false,
  }
}

export function reduceTacticalState(tacticalEvents = [], targetSeq = Infinity) {
  const state = createInitialTacticalState()

  for (const ev of tacticalEvents) {
    if (ev.sourceSeq !== null && ev.sourceSeq > targetSeq) break
    const payload = ev.payload || {}

    switch (ev.type) {
      case 'entity_materialized': {
        const entityId = payload.entityId
        state.entities[entityId] = {
          entityId,
          instanceId: payload.instanceId,
          className: payload.className,
          binding: payload.binding,
          name: payload.name,
          corruption: payload.corruption ?? 20,
          maxVal: payload.maxVal ?? 20,
          state: 'DETECTED',
        }
        state.totalCount = Object.keys(state.entities).length
        break
      }

      case 'entity_targeted': {
        state.activeTargetEntityId = payload.entityId
        if (state.entities[payload.entityId] && state.entities[payload.entityId].state === 'DETECTED') {
          state.entities[payload.entityId].state = 'TARGETED'
        }
        break
      }

      case 'pulse_emitted': {
        state.lastPulse = {
          entityId: payload.entityId,
          methodName: payload.methodName,
          tacticalSeq: ev.tacticalSeq,
        }
        if (state.entities[payload.entityId] && state.entities[payload.entityId].state !== 'RESTORED') {
          state.entities[payload.entityId].state = 'PURIFIED'
        }
        break
      }

      case 'entity_attribute_changed': {
        const entity = state.entities[payload.entityId]
        if (entity && payload.attribute === 'corruption') {
          entity.corruption = Number(payload.after)
        }
        break
      }

      case 'entity_restored': {
        const entity = state.entities[payload.entityId]
        if (entity) {
          entity.state = 'RESTORED'
          entity.corruption = 0
        }
        break
      }

      default:
        break
    }
  }

  const entityList = Object.values(state.entities)
  state.restoredCount = entityList.filter((e) => e.state === 'RESTORED').length
  state.allRestored = entityList.length > 0 && state.restoredCount === entityList.length

  return state
}
