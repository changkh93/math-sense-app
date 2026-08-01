export function planAstraBuilderServerHydration({
  localRevision = 0,
  localSyncedRevision = 0,
  localBlockCount = 0,
  localServerRevision = null,
  localServerDirty = false,
  remoteRevision = 0,
} = {}) {
  const knownLocalBase = Number.isInteger(localServerRevision)
    ? localServerRevision
    : null
  const localDirty = Number(localRevision) !== Number(localSyncedRevision)
    || localServerDirty === true
    || (knownLocalBase === null && Number(localBlockCount) > 0)

  if (!localDirty) return 'server'
  if (knownLocalBase !== null && knownLocalBase !== remoteRevision) return 'conflict'
  if (knownLocalBase === null && remoteRevision > 0) return 'conflict'
  return 'local'
}

export function getAstraBuilderRetryDelay(
  previousDelay = 0,
  initialDelay = 15_000,
  maxDelay = 120_000,
) {
  const initial = Math.max(1_000, Number(initialDelay) || 15_000)
  const maximum = Math.max(initial, Number(maxDelay) || 120_000)
  const previous = Math.max(0, Number(previousDelay) || 0)
  return Math.min(maximum, previous > 0 ? previous * 2 : initial)
}
