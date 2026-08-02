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

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return undefined

    const resizeCanvas = () => {
      const { width, height } = container.getBoundingClientRect()
      if (!width || !height) return

      const previous = document.createElement('canvas')
      previous.width = canvas.width
      previous.height = canvas.height
      if (previous.width && previous.height) {
        previous.getContext('2d')?.drawImage(canvas, 0, 0)
      }

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.round(width * pixelRatio))
      canvas.height = Math.max(1, Math.round(height * pixelRatio))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      const context = canvas.getContext('2d')
      if (previous.width && previous.height) {
        context.drawImage(previous, 0, 0, previous.width, previous.height, 0, 0, canvas.width, canvas.height)
      }
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      context.lineCap = 'round'
      context.lineJoin = 'round'
    }

    resizeCanvas()
    const observer = new ResizeObserver(resizeCanvas)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

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
