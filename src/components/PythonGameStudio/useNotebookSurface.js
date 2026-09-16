import { useLayoutEffect } from 'react'

// Keep the iframe in its original DOM position: reparenting it reloads Python.
// Align it with a cell slot in the same native scroll container.
export default function useNotebookSurface(preview, slot, enabled, expanded) {
  useLayoutEffect(() => {
    const pane = preview.current
    if (!enabled || !pane) return
    if (expanded) return
    const position = () => {
      if (!slot?.isConnected) {
        pane.setAttribute('style', 'position:fixed;left:0;top:0;width:800px;height:600px;opacity:0;pointer-events:none;z-index:-1')
        pane.setAttribute('inert', '')
        pane.setAttribute('aria-hidden', 'true')
        return
      }
      const scroller = slot.closest('.pgs-main-panes')
      const rect = slot.getBoundingClientRect()
      const viewport = scroller.getBoundingClientRect()
      const visible = rect.bottom > viewport.top && rect.top < viewport.bottom
      // The iframe and cells share a native scroll container. They move together
      // in the compositor, so scrolling cannot leave an iframe over another cell.
      pane.setAttribute('style', visible
        ? `position:absolute;left:${rect.left - viewport.left + scroller.scrollLeft}px;top:${rect.top - viewport.top + scroller.scrollTop}px;width:${rect.width}px;height:${rect.height}px;opacity:1;pointer-events:auto;z-index:2`
        : `position:absolute;left:0;top:${scroller.scrollTop}px;width:${rect.width}px;height:${rect.height}px;opacity:0;pointer-events:none;z-index:-1`)
      pane.toggleAttribute('inert', !visible)
      pane.setAttribute('aria-hidden', String(!visible))
    }
    position()
    const observer = new ResizeObserver(position)
    const mutation = new MutationObserver(position)
    if (slot) {
      observer.observe(slot)
      observer.observe(slot.closest('.pgs-main-panes'))
      mutation.observe(slot.closest('.pgs-notebook'), { childList: true, subtree: true, characterData: true })
    }
    window.addEventListener('resize', position)
    document.addEventListener('scroll', position, true)
    window.visualViewport?.addEventListener('resize', position)
    return () => {
      observer.disconnect(); mutation.disconnect()
      window.removeEventListener('resize', position)
      document.removeEventListener('scroll', position, true)
      window.visualViewport?.removeEventListener('resize', position)
      pane.removeAttribute('style')
      pane.removeAttribute('inert')
      pane.removeAttribute('aria-hidden')
    }
  }, [preview, slot, enabled, expanded])
}
