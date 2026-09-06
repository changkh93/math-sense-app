import { useLayoutEffect, useRef, useState } from 'react'
import { createCrewTravelController } from '../components/GalaxySocial/frontierCrewRoutes'

export function useFrontierCrewTravel({
  identityKey,
  request,
  onArrive,
  onError,
}) {
  const controller = useRef(null)
  if (controller.current === null)
    controller.current = createCrewTravelController()
  const [state, setState] = useState({ identityKey, trip: null })
  if (state.identityKey !== identityKey) setState({ identityKey, trip: null })
  const pending = state.identityKey === identityKey ? state.trip : null
  const setPending = (trip) => setState({ identityKey, trip })
  useLayoutEffect(() => {
    const current = controller.current
    return () => current.cancel()
  }, [identityKey])
  const cancel = () => {
    controller.current.cancel()
    setPending(null)
  }
  const start = (uid, name) => {
    if (controller.current.isBusy()) return
    setPending({ uid, name })
    void controller.current.run({
      uid,
      request,
      commit: onArrive,
      fail: onError,
      settle: () => setPending(null),
    })
  }
  return { pending, start, cancel }
}
