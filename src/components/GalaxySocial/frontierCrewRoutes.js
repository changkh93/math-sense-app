// Navigation only. Admission and every help/reward action remain server-authorized.
export function canVisitCrewRoute(route, currentUid) {
  return Boolean(
    route?.uid &&
    route.uid !== currentUid &&
    !route.blocked &&
    route.visitMode === 'crew',
  )
}

export function getCrewGates(worldRadius = 20) {
  const radius = Number.isFinite(worldRadius) ? Math.max(20, worldRadius) : 20
  return [
    {
      id: 'crew-sea-gate',
      kind: 'crew-gate',
      actionId: 'crew',
      label: '바다 항로 · 크루 성도 열기',
      position: [radius + 9, -2, 0],
      interactionRadius: 4,
      color: '#60dddb',
    },
    {
      id: 'crew-sky-gate',
      kind: 'crew-gate',
      actionId: 'crew',
      label: '하늘 항로 · 크루 성도 열기',
      position: [0, 10, -radius - 6],
      interactionRadius: 4,
      color: '#f6ca79',
    },
  ]
}

const HELP_TASKS = {
  friend_greenhouse: '온실 물주기',
  starflower_garden: '별꽃 정원 돌보기',
  observatory: '관측소 정비 돕기',
  expedition_beacon: '원정 비콘 수리 돕기',
  signal_plaza: '응원 신호 남기기',
}

export function getCrewHelpTasks(layout = []) {
  return (Array.isArray(layout) ? layout : [])
    .filter(
      (item) => item?.instanceId && !item.locked && HELP_TASKS[item.itemId],
    )
    .slice(0, 5)
    .map((item) => ({ item, label: HELP_TASKS[item.itemId] }))
}

// One requested world, never a preloaded second scene. Cancellation invalidates the
// result; it does not pretend to cancel a callable already executing on the server.
export function createCrewTravelController() {
  let active = null
  return {
    isBusy() {
      return active !== null
    },
    cancel() {
      active = null
    },
    async run({ uid, request, commit, fail, settle }) {
      if (active) return false
      const token = { uid }
      active = token
      try {
        const result = await request(uid)
        if (active !== token) return false
        commit(result)
        return true
      } catch (error) {
        if (active === token) fail(error)
        return false
      } finally {
        if (active === token) {
          active = null
          settle()
        }
      }
    },
  }
}
