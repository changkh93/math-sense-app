import { useEffect, useState } from 'react'
import { FRONTIER_GRAPHICS, FRONTIER_GRAPHICS_KEY, readFrontierGraphics } from '../components/GalaxySocial/frontierPerformance'

export function useFrontierGraphics() {
  const [mode, setMode] = useState(() => {
    try { return readFrontierGraphics(window.localStorage) } catch { return 'balanced' }
  })
  useEffect(() => {
    const sync = event => { if (Object.hasOwn(FRONTIER_GRAPHICS, event.detail)) setMode(event.detail) }
    window.addEventListener('frontier-graphics-change', sync)
    return () => window.removeEventListener('frontier-graphics-change', sync)
  }, [])
  const selectMode = value => {
    if (!Object.hasOwn(FRONTIER_GRAPHICS, value)) return
    setMode(value)
    try { localStorage.setItem(FRONTIER_GRAPHICS_KEY, value) } catch { /* private browsing */ }
    window.dispatchEvent(new window.CustomEvent('frontier-graphics-change', { detail: value }))
  }
  return { mode, budget: FRONTIER_GRAPHICS[mode], selectMode }
}
