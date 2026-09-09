import { useEffect, useRef, useState } from 'react'

const DEFAULTS = { files: 210, editorShare: 0.48, console: 190, mobileEditor: 430 }
const GAP = 6
const clamp = (value, min, max) => Math.max(min, Math.min(value, Math.max(min, max)))
function readLayout(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key))
    return Object.fromEntries(Object.entries(DEFAULTS).map(([name, fallback]) => [name, Number.isFinite(saved?.[name]) ? saved[name] : fallback]))
  } catch { return DEFAULTS }
}

export default function useStudioLayout(uid, ready, previewRef) {
  const storageKey = `metasense-game-studio-layout:${uid}`
  const [sizes, setSizes] = useState(() => readLayout(storageKey))
  const [bounds, setBounds] = useState({ width: 1200, previewHeight: 700, mobile: false })
  const [dragging, setDragging] = useState(null)
  const workspaceRef = useRef(null)
  const dragRef = useRef(null)
  useEffect(() => {
    if (!ready) return undefined
    const workspace = workspaceRef.current, preview = previewRef.current
    const measure = () => {
      const next = { width: workspace.clientWidth, previewHeight: preview.clientHeight, mobile: window.matchMedia('(max-width: 800px)').matches }
      setBounds(previous => Object.keys(next).every(key => previous[key] === next[key]) ? previous : next)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(workspace); observer.observe(preview)
    window.addEventListener('resize', measure)
    measure()
    return () => { observer.disconnect(); window.removeEventListener('resize', measure) }
  }, [ready, previewRef])
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(sizes)) } catch { /* Resizing remains available without storage. */ }
  }, [sizes, storageKey])
  useEffect(() => {
    const end = () => { dragRef.current = null; setDragging(null) }
    window.addEventListener('blur', end)
    return () => window.removeEventListener('blur', end)
  }, [])

  const minFile = bounds.mobile ? 90 : 120
  const maxFile = Math.max(minFile, Math.min(480, bounds.width - (bounds.mobile ? 170 + GAP : 500 + GAP * 2)))
  const files = clamp(sizes.files, minFile, maxFile)
  const remaining = Math.max(1, bounds.width - files - GAP * 2)
  const editor = clamp(remaining * sizes.editorShare, 240, remaining - 260)
  const editorShare = editor / remaining
  const maxConsole = Math.max(90, bounds.previewHeight - 42 - 160 - GAP)
  const consoleHeight = clamp(sizes.console, 90, maxConsole)
  const mobileEditor = clamp(sizes.mobileEditor, 280, 900)
  const limits = {
    files: { min: minFile, max: maxFile, value: files, orientation: 'vertical', label: '파일 탐색기 너비 조절' },
    editor: bounds.mobile
      ? { min: 280, max: 900, value: mobileEditor, orientation: 'horizontal', label: '소스코드 영역 높이 조절' }
      : { min: 240, max: Math.max(240, remaining - 260), value: editor, orientation: 'vertical', label: '소스코드와 게임 화면 너비 조절' },
    console: { min: 90, max: maxConsole, value: consoleHeight, orientation: 'horizontal', label: '출력·오류 영역 높이 조절' },
  }
  const change = (name, value) => {
    const limit = limits[name]
    value = clamp(value, limit.min, limit.max)
    setSizes(previous => ({ ...previous, [name === 'editor' ? (bounds.mobile ? 'mobileEditor' : 'editorShare') : name]: name === 'editor' && !bounds.mobile ? value / remaining : value }))
  }
  const endDrag = event => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null; setDragging(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  const separator = name => {
    const limit = limits[name]
    return {
      role: 'separator', tabIndex: 0,
      'aria-label': limit.label, 'aria-orientation': limit.orientation,
      'aria-valuemin': Math.round(limit.min), 'aria-valuemax': Math.round(limit.max), 'aria-valuenow': Math.round(limit.value),
      title: '끌어서 크기 조절 · 두 번 클릭하면 기본 크기',
      className: `pgs-splitter pgs-splitter-${name} ${dragging === name ? 'is-dragging' : ''}`,
      onPointerDown: event => {
        if (event.button !== 0) return
        event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId)
        dragRef.current = { name, pointerId: event.pointerId, start: limit.orientation === 'vertical' ? event.clientX : event.clientY, value: limit.value }
        setDragging(name)
      },
      onPointerMove: event => {
        const drag = dragRef.current
        if (!drag || drag.name !== name || drag.pointerId !== event.pointerId) return
        const position = limit.orientation === 'vertical' ? event.clientX : event.clientY
        change(name, drag.value + (position - drag.start) * (name === 'console' ? -1 : 1))
      },
      onPointerUp: endDrag, onPointerCancel: endDrag, onLostPointerCapture: endDrag,
      onDoubleClick: () => setSizes(previous => ({ ...previous, ...(name === 'editor' ? { editorShare: DEFAULTS.editorShare, mobileEditor: DEFAULTS.mobileEditor } : { [name]: DEFAULTS[name] }) })),
      onKeyDown: event => {
        const negative = limit.orientation === 'vertical' ? 'ArrowLeft' : 'ArrowUp'
        const positive = limit.orientation === 'vertical' ? 'ArrowRight' : 'ArrowDown'
        if (![negative, positive, 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        const delta = (event.shiftKey ? 40 : 16) * (event.key === negative ? -1 : 1) * (name === 'console' ? -1 : 1)
        change(name, event.key === 'Home' ? limit.min : event.key === 'End' ? limit.max : limit.value + delta)
      },
    }
  }
  return {
    workspaceRef, separator, dragging,
    style: { '--pgs-files-width': `${files}px`, '--pgs-editor-share': `${editorShare}fr`, '--pgs-preview-share': `${1 - editorShare}fr`, '--pgs-console-height': `${consoleHeight}px`, '--pgs-mobile-editor-height': `${mobileEditor}px` },
  }
}
