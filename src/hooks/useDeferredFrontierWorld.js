import { useEffect, useState } from 'react'

// Keep the first briefing entirely DOM-only. Paint its close action before
// importing/constructing the world. Later overlays preserve the existing scene.
export function useDeferredFrontierWorld(canStart) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (ready || !canStart) return undefined
    let timer
    const frame = window.requestAnimationFrame(() => {
      timer = window.setTimeout(() => setReady(true), 0)
    })
    return () => { window.cancelAnimationFrame(frame); window.clearTimeout(timer) }
  }, [canStart, ready])
  return ready
}
