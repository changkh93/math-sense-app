const activeIds = (access = {}, allowedStatuses) => Object.entries(access || {})
  .filter(([id, status]) => Boolean(id) && allowedStatuses.has(status))
  .map(([id]) => id)
  .sort();

const sameStringSet = (left = [], right = []) => {
  const normalizedLeft = Array.from(new Set(left.filter(id => typeof id === 'string'))).sort();
  const normalizedRight = Array.from(new Set(right.filter(id => typeof id === 'string'))).sort();
  return normalizedLeft.length === normalizedRight.length
    && normalizedLeft.every((id, index) => id === normalizedRight[index]);
};

const getTimestampRevision = (value) => {
  return value?.toMillis?.() ?? value?.seconds ?? value ?? null;
};

export const getAccessSyncRevision = (userData = {}) => (
  getTimestampRevision(userData?.accessClaimsSyncedAt)
);

export const isAccessClaimSyncReady = (userData = {}) => {
  const syncedRevision = getAccessSyncRevision(userData);
  const updatedRevision = getTimestampRevision(userData?.accessUpdatedAt);
  return syncedRevision != null
    && (updatedRevision == null || syncedRevision >= updatedRevision);
};

export const areAccessClaimsCurrent = (userData, accessClaims) => {
  if (!userData || !accessClaims || accessClaims.version < 1) return true;

  const expectedCourses = activeIds(userData.clusterAccess, new Set(['active']));
  const expectedRegions = activeIds(userData.regionAccess, new Set(['active', 'completed']));

  return sameStringSet(expectedCourses, accessClaims.courses)
    && sameStringSet(expectedRegions, accessClaims.regions);
};
