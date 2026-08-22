/**
 * LUMI Tactical Selectors (Pure Module)
 */

export function selectTacticalEntities(tacticalState) {
  return Object.values(tacticalState?.entities || {})
}

export function selectRestoredEntityCount(tacticalState) {
  return tacticalState?.restoredCount || 0
}

export function selectIsAllRestored(tacticalState) {
  return Boolean(tacticalState?.allRestored)
}

export function selectActiveTargetEntity(tacticalState) {
  if (!tacticalState?.activeTargetEntityId) return null
  return tacticalState.entities?.[tacticalState.activeTargetEntityId] || null
}
