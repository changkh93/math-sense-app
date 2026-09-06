import { useSyncExternalStore } from 'react'

const subscribe = notify => {
  document.addEventListener('visibilitychange', notify)
  return () => document.removeEventListener('visibilitychange', notify)
}
const isHidden = () => document.visibilityState === 'hidden'
const serverSnapshot = () => false

export function useFrontierRenderLoop(paused) {
  const hidden = useSyncExternalStore(subscribe, isHidden, serverSnapshot)
  // This must be a Canvas prop: an imperative setFrameloop in a child is
  // overwritten by Canvas.configure when the parent HUD renders again.
  return paused || hidden ? 'never' : 'always'
}
