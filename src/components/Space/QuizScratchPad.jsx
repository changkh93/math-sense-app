import { useCallback, useEffect, useRef, useState } from 'react'

const PEN_WIDTH = 3.5
const ERASER_WIDTH = 28

export default function QuizScratchPad({ questionKey }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const drawingRef = useRef(false)
  const [tool, setTool] = useState('pen')

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    context.save()
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.restore()
  }, [])

  useEffect(() => {
    clearCanvas()
  }, [clearCanvas, questionKey])

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

  const getPoint = (event) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const configureContext = (context) => {
    context.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
    context.strokeStyle = '#ffffff'
    context.lineWidth = tool === 'eraser' ? ERASER_WIDTH : PEN_WIDTH
    context.lineCap = 'round'
    context.lineJoin = 'round'
  }

  const handlePointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.preventDefault()
    resizeCanvas()
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    const point = getPoint(event)
    configureContext(context)
    context.beginPath()
    context.moveTo(point.x, point.y)
    context.lineTo(point.x + 0.01, point.y + 0.01)
    context.stroke()
    drawingRef.current = true
    canvas.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event) => {
    if (!drawingRef.current) return
    event.preventDefault()
    const context = canvasRef.current.getContext('2d')
    const point = getPoint(event)
    configureContext(context)
    context.lineTo(point.x, point.y)
    context.stroke()
  }

  const stopDrawing = (event) => {
    if (!drawingRef.current) return
    drawingRef.current = false
    canvasRef.current.getContext('2d').closePath()
    if (canvasRef.current.hasPointerCapture(event.pointerId)) {
      canvasRef.current.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <aside className="quiz-scratchpad" aria-label="계산 메모장">
      <div className="quiz-scratchpad__header">
        <div>
          <strong>계산 메모</strong>
          <span>다음 문제에서 자동으로 지워집니다</span>
        </div>
        <div className="quiz-scratchpad__tools" role="toolbar" aria-label="계산 메모 도구">
          <button
            type="button"
            className={tool === 'pen' ? 'active' : ''}
            aria-pressed={tool === 'pen'}
            onClick={() => setTool('pen')}
          >
            ✎ 펜
          </button>
          <button
            type="button"
            className={tool === 'eraser' ? 'active' : ''}
            aria-pressed={tool === 'eraser'}
            onClick={() => setTool('eraser')}
          >
            ◇ 지우개
          </button>
          <button type="button" onClick={clearCanvas} aria-label="계산 메모 전체 지우기">
            전체 지우기
          </button>
        </div>
      </div>
      <div ref={containerRef} className="quiz-scratchpad__canvas-wrap">
        <canvas
          ref={canvasRef}
          className="quiz-scratchpad__canvas"
          aria-label="흰색 펜으로 계산할 수 있는 영역"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
        />
      </div>
    </aside>
  )
}
