const timestampLike = (value) => {
  const millis = Number(value || 0)
  return millis > 0 ? { toMillis: () => millis, toDate: () => new Date(millis) } : null
}

export function normalizeRealtimePresence(uid, value) {
  const connections = Object.values(value?.connections || {})
    .filter((connection) => connection && typeof connection === 'object')
    .sort((a, b) => Number(b.updatedAtMs || 0) - Number(a.updatedAtMs || 0))
  // A foreground tab wins over a more recently updated background tab.
  const active = connections.find(connection => !connection.state || connection.state === 'online')
    || connections.find(connection => connection.state === 'away')
  const lastSeenMs = Number(active?.updatedAtMs || value?.lastSeenMs || 0)

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

// RTDB connections are removed by onDisconnect; their age is not a heartbeat.
export function getConnectedStudents(presenceByUid) {
  return Object.values(presenceByUid).filter(profile =>
    profile?.uid && profile.role !== 'admin' && profile.role !== 'parent'
    && ['online', 'away'].includes(profile.liveStatus?.state))
}

export function countStudentsByCrew(students) {
  const counts = {}
  for (const student of students) {
    if (student.crewId) counts[student.crewId] = (counts[student.crewId] || 0) + 1
  }
  return counts
}
