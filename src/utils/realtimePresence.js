export const PRESENCE_TTL_MS = 5 * 60 * 1000
export const PRESENCE_HEARTBEAT_MS = 2 * 60 * 1000

export function isFreshPresence(connection, now = Date.now()) {
  const updated = Number(connection?.updatedAt || connection?.updatedAtMs || 0)
  return Number.isFinite(updated) && updated > 0 && updated <= now + 60_000 && now - updated < PRESENCE_TTL_MS
}

const timestampLike = (value) => {
  const millis = Number(value || 0)
  return millis > 0 ? { toMillis: () => millis, toDate: () => new Date(millis) } : null
}

export function normalizeRealtimePresence(uid, value, now = Date.now()) {
  const connections = Object.values(value?.connections || {})
    .filter((connection) => connection && typeof connection === 'object' && isFreshPresence(connection, now))
    .sort((a, b) => Number(b.updatedAt || b.updatedAtMs || 0) - Number(a.updatedAt || a.updatedAtMs || 0))
  // A foreground tab wins over a more recently updated background tab.
  const active = connections.find(connection => connection.state === 'online')
    || connections.find(connection => connection.state === 'away')
  const lastSeenMs = Number(active?.updatedAt || active?.updatedAtMs || value?.lastSeenMs || 0)

  if (!active) {
    return {
      uid,
      liveStatus: {
        state: 'offline',
        lastUpdatedAt: timestampLike(lastSeenMs),
      },
    }
  }

  return {
    ...active,
    uid,
    liveStatus: {
      ...active,
      state: active.state || 'online',
      lastUpdatedAt: timestampLike(lastSeenMs),
      enteredAt: timestampLike(active.enteredAtMs || lastSeenMs),
    },
  }
}

// Count visible, recently confirmed sessions; away tabs are not current viewers.
export function getConnectedStudents(presenceByUid) {
  return Object.values(presenceByUid).filter(profile =>
    profile?.uid && profile.role !== 'admin' && profile.role !== 'parent'
    && profile.liveStatus?.state === 'online')
}

export function countStudentsByCrew(students) {
  const counts = {}
  for (const student of students) {
    if (student.crewId) counts[student.crewId] = (counts[student.crewId] || 0) + 1
  }
  return counts
}
