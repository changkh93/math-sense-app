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
