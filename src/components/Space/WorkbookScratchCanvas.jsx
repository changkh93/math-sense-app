import { useCallback, useEffect, useRef } from 'react'

const PEN_WIDTH = 3
const ERASER_WIDTH = 24
// A press must move at least this many CSS pixels before we commit to drawing.
// Anything under that is treated as a tap and forwarded to the element beneath,
// leaving no ink on the canvas (no erase/restore pass needed).
const STROKE_START_DELTA_PX = 4

/**
 * Drawing overlay canvas for the smart workbook.
 *
 * - In `select` mode (or when `interactionLocked` is true, e.g. a keypad/popup is open)
 *   the canvas is click-through so inputs/choices/widgets work normally.
 * - In `pen`/`eraser` mode the canvas captures pointer events. The stroke is drawn
 *   lazily: nothing is painted until the pointer moves past STROKE_START_DELTA_PX, so a
 *   simple tap leaves no mark and is forwarded to the .wb-element directly beneath it.
 * - For performance, drawing data is NOT exported on every stroke. The parent reads it
 *   on demand via the imperative `__workbookScratchGetData` handle (e.g. right before a
 *   page change). Per-page data is restored from `initialData` when it changes.
 */
export default function WorkbookScratchCanvas({
  tool = 'select',
  penColor = '#ef4444',
  pageIndex = 0,
  initialData = null,
  interactionLocked = false,
  className = '',
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const downPointRef = useRef(null) // non-null while a pointer is pressed
  const strokeStartedRef = useRef(false) // becomes true once we commit to drawing
  const toolRef = useRef(tool)
  const penColorRef = useRef(penColor)
  const interactionLockedRef = useRef(interactionLocked)

  useEffect(() => { toolRef.current = tool }, [tool])
  useEffect(() => { penColorRef.current = penColor }, [penColor])
  useEffect(() => { interactionLockedRef.current = interactionLocked }, [interactionLocked])

  const getPoint = (event) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const configureContext = useCallback((context) => {
    const activeTool = toolRef.current
    context.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over'
    context.strokeStyle = penColorRef.current
    context.lineWidth = activeTool === 'eraser' ? ERASER_WIDTH : PEN_WIDTH
    context.lineCap = 'round'
    context.lineJoin = 'round'
  }, [])

  const isDrawingAllowed = () => toolRef.current !== 'select' && !interactionLockedRef.current

  // Resizes the backing store to match the container in device pixels, preserving any
  // existing drawing. Returns true when the backing store actually changed.
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return false

    const { width, height } = container.getBoundingClientRect()
    if (!width || !height) return false

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    const nextWidth = Math.max(1, Math.round(width * pixelRatio))
    const nextHeight = Math.max(1, Math.round(height * pixelRatio))
    if (canvas.width === nextWidth && canvas.height === nextHeight) return false

    const previous = document.createElement('canvas')
    previous.width = canvas.width
    previous.height = canvas.height
    if (previous.width && previous.height) {
      previous.getContext('2d')?.drawImage(canvas, 0, 0)
    }

    canvas.width = nextWidth
    canvas.height = nextHeight

    const context = canvas.getContext('2d')
    if (previous.width && previous.height) {
      context.drawImage(previous, 0, 0, previous.width, previous.height, 0, 0, nextWidth, nextHeight)
    }
    context.setTransform(nextWidth / width, 0, 0, nextHeight / height, 0, 0)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    return true
  }, [])

  const handlePointerDown = (event) => {
    if (!isDrawingAllowed()) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.preventDefault()
    resizeCanvas()
    downPointRef.current = getPoint(event)
    strokeStartedRef.current = false
    canvasRef.current.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event) => {
    if (!isDrawingAllowed() || downPointRef.current == null) return
    const point = getPoint(event)

    if (!strokeStartedRef.current) {
      // Wait until the press clearly becomes a drag before painting anything.
      const dx = point.x - downPointRef.current.x
      const dy = point.y - downPointRef.current.y
      if (Math.hypot(dx, dy) < STROKE_START_DELTA_PX) return
      const context = canvasRef.current.getContext('2d')
      configureContext(context)
      context.beginPath()
      context.moveTo(downPointRef.current.x, downPointRef.current.y)
      context.lineTo(point.x, point.y)
      context.stroke()
      strokeStartedRef.current = true
      return
    }

    event.preventDefault()
    const context = canvasRef.current.getContext('2d')
    configureContext(context)
    context.lineTo(point.x, point.y)
    context.stroke()
  }

  const handlePointerUp = (event) => {
    const canvas = canvasRef.current
    if (!canvas || downPointRef.current == null) return
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }

    if (!strokeStartedRef.current) {
      // Tap (never crossed the drag threshold): forward the click, no ink to clean up.
      forwardClickToElement(event.clientX, event.clientY)
    } else {
      canvas.getContext('2d').closePath()
      // Data is exported on demand by the parent (page navigation), not per stroke.
    }
    downPointRef.current = null
    strokeStartedRef.current = false
  }

  const forwardClickToElement = (clientX, clientY) => {
    const canvas = canvasRef.current
    if (!canvas || typeof document === 'undefined' || !document.elementsFromPoint) return
    const candidates = document.elementsFromPoint(clientX, clientY)
    for (const el of candidates) {
      if (el === canvas) continue
      if (el.classList?.contains('wb-element')) {
        try {
          el.click()
        } catch (error) {
          console.warn('WorkbookScratchCanvas click passthrough failed', error)
        }
        return
      }
    }
  }

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.save()
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.restore()
  }, [])

  const getDataURL = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return ''
    try {
      return canvas.toDataURL('image/png')
    } catch (error) {
      console.warn('WorkbookScratchCanvas data export failed', error)
      return ''
    }
  }, [])

  // Expose imperative clear/data handles to the parent via the canvas DOM node, so the
  // toolbar buttons and page-navigation flush can read the bitmap without prop threading.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    canvas.__workbookScratchClear = clearCanvas
    canvas.__workbookScratchGetData = getDataURL
    return () => {
      delete canvas.__workbookScratchClear
      delete canvas.__workbookScratchGetData
    }
  }, [clearCanvas, getDataURL])

  // Keep the canvas pointer-events and cursor in sync with the active tool / lock state.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const blocked = !isDrawingAllowed()
    canvas.style.pointerEvents = blocked ? 'none' : 'auto'
    canvas.style.cursor = blocked
      ? 'default'
      : tool === 'pen' ? 'crosshair' : 'cell'
  }, [tool, interactionLocked])

  // Resize the canvas to fit the page image whenever the container size changes.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    let resizeFrame = 0
    const scheduleResize = () => {
      window.cancelAnimationFrame(resizeFrame)
      resizeFrame = window.requestAnimationFrame(() => resizeCanvas())
    }

    scheduleResize()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleResize)
    observer?.observe(container)
    window.addEventListener('resize', scheduleResize)
    window.addEventListener('orientationchange', scheduleResize)
    document.addEventListener('fullscreenchange', scheduleResize)

    return () => {
      window.cancelAnimationFrame(resizeFrame)
      observer?.disconnect()
      window.removeEventListener('resize', scheduleResize)
      window.removeEventListener('orientationchange', scheduleResize)
      document.removeEventListener('fullscreenchange', scheduleResize)
    }
  }, [resizeCanvas])

  // Restore a saved page image when the page index changes (navigation). Keying on
  // pageIndex (not just initialData) guarantees the canvas is wiped and repainted on every
  // navigation, even when two pages happen to share an identical (or both empty) data URL.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    resizeCanvas()
    const context = canvas.getContext('2d')
    context.save()
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.restore()

    if (!initialData) return undefined

    let cancelled = false
    const image = new Image()
    image.onload = () => {
      if (cancelled || !canvasRef.current) return
      const ctx = canvasRef.current.getContext('2d')
      const rect = canvasRef.current.getBoundingClientRect()
      ctx.save()
      ctx.setTransform(canvasRef.current.width / rect.width, 0, 0, canvasRef.current.height / rect.height, 0, 0)
      ctx.clearRect(0, 0, rect.width, rect.height)
      ctx.drawImage(image, 0, 0, rect.width, rect.height)
      ctx.restore()
    }
    image.src = initialData
    return () => { cancelled = true }
  }, [pageIndex, initialData, resizeCanvas])

  return (
    <div ref={containerRef} className={`workbook-scratch-canvas ${className}`.trim()}>
      <canvas
        ref={canvasRef}
        className="workbook-scratch-canvas__surface"
        aria-label="워크북 판서 캔버스"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        // Swallow the synthesized click so it never bubbles up to the workbook area's
        // onClick (which dismisses the keypad/choice popup we just opened via passthrough).
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  )
}
