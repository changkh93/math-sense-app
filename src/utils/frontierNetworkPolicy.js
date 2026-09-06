// Keep the 30-second play lease checkpoint and 15-second peer expiry unchanged.
export const PLAY_CHECKPOINT_INTERVAL_MS = 30_000
export const PLAY_CHECKPOINT_BURST_MS = 5_000
export const PRESENCE_HEARTBEAT_MS = 5_000

export function positionPatch(previous, next) {
  return Object.fromEntries(Object.entries(next).filter(([key, value]) => previous?.[key] !== value))
}

export function needsPresenceHeartbeat(now, lastPositionWrite) {
  return now - lastPositionWrite >= PRESENCE_HEARTBEAT_MS
}
