// Keep Python in its original opaque iframe; popups receive presentation only.
(() => {
  let port = null, pendingFrame = false, tkEvents = [], lastCapture = 0
  // Chrome suspends native rAF in an occluded editor window. The visible
  // display supplies ticks over its private port, without restarting Python.
  const requestFrame = window.requestAnimationFrame.bind(window), cancelFrame = window.cancelAnimationFrame.bind(window)
  const callbacks = new Map()
  let frameId = 0, lastFrame = 0
  window.requestAnimationFrame = callback => {
    const id = ++frameId
    const native = requestFrame(() => {
      if (!callbacks.has(id)) return
      // Native rAF timestamps describe the rendering frame, not callback time.
      // They can precede a synthetic tick delivered via MessagePort. Use the
      // same monotonic clock in both paths so animations never run backwards.
      const time = performance.now()
      callbacks.delete(id); lastFrame = time; callback(time)
    })
    callbacks.set(id, { callback, native }); return id
  }
  window.cancelAnimationFrame = id => { const entry = callbacks.get(id); if (entry) cancelFrame(entry.native); callbacks.delete(id) }
  function tick() {
    const time = performance.now()
    if (time - lastFrame > 16) {
      lastFrame = time
      const batch = [...callbacks.entries()]
      for (const [id, entry] of batch) {
        if (!callbacks.has(id)) continue
        cancelFrame(entry.native); callbacks.delete(id); entry.callback(time)
      }
    }
    if (time - lastCapture > 32) { lastCapture = time; capture() }
  }
  const remoteKeys = new Map()
  const post = (message, transfer = []) => port?.postMessage(message, transfer)
  for (const name of ['studioTurtleCommand', 'studioTurtleReset', 'studioTkCommand', 'studioTkReset', 'studioPlotRender', 'studioPlotReset']) {
    const original = window[name]
    window[name] = (...args) => { const result = original(...args); post({ type: 'CALL', name, args }); return result }
  }
  const takeTk = window.studioTkTakeEvents
  window.studioTkTakeEvents = () => { const events = [...JSON.parse(takeTk()), ...tkEvents]; tkEvents = []; return JSON.stringify(events) }
  const show = window.studioShowSurface
  window.studioShowSurface = id => { show(id); post({ type: 'SURFACE', id }) }
  const key = (type, data) => {
    const event = new KeyboardEvent(type, { ...data, bubbles: true, cancelable: true })
    for (const name of ['keyCode', 'which']) Object.defineProperty(event, name, { value: data.keyCode })
    document.getElementById('canvas').dispatchEvent(event)
  }
  window.studioDisconnectPresentation = () => {
    port?.close(); port = null; pendingFrame = false
    for (const data of remoteKeys.values()) key('keyup', data)
    remoteKeys.clear(); tkEvents = []
  }
  window.studioConnectPresentation = next => {
    window.studioDisconnectPresentation(); port = next
    port.onmessage = ({ data }) => {
      if (data?.type === 'DISPLAY_READY') window.studioEmit('PRESENTATION_READY')
      if (data?.type === 'TICK') tick()
      if (data?.type === 'FRAME_ACK') pendingFrame = false
      if (data?.type === 'KEY' && ['keydown', 'keyup'].includes(data.event) && typeof data.key === 'string') {
        if (data.event === 'keydown') window.studioResumeAudio?.()
        if (data.event === 'keydown') remoteKeys.set(data.code, data)
        else remoteKeys.delete(data.code)
        key(data.event, data)
      }
      if (data?.type === 'RELEASE_KEYS') { for (const value of remoteKeys.values()) key('keyup', value); remoteKeys.clear() }
      if (data?.type === 'TK' && Array.isArray(data.events)) tkEvents.push(...data.events.filter(value => typeof value === 'string' || Number.isInteger(value)).slice(0, 64 - tkEvents.length))
      if (data?.type === 'MOUSE' && ['mousedown', 'mouseup', 'mousemove'].includes(data.event)) {
        if (data.event === 'mousedown') window.studioResumeAudio?.()
        const canvas = document.getElementById('canvas'), rect = canvas.getBoundingClientRect()
        const x = Math.max(0, Math.min(1, Number(data.x) || 0)), y = Math.max(0, Math.min(1, Number(data.y) || 0))
        canvas.dispatchEvent(new MouseEvent(data.event, { bubbles: true, cancelable: true, clientX: rect.left + x * rect.width, clientY: rect.top + y * rect.height, button: data.button, buttons: data.buttons }))
      }
    }
    port.start()
  }
  // One transferable frame in flight: never build a queue in a slow window.
  async function capture() {
      const canvas = document.getElementById('canvas')
      if (!port || pendingFrame || canvas.style.display === 'none' || !window.studioVisualRun) return
      const target = port; pendingFrame = true
      try {
        const bitmap = await createImageBitmap(canvas)
        if (port !== target) { bitmap.close(); return }
        post({ type: 'FRAME', bitmap }, [bitmap])
      } catch { pendingFrame = false }
  }
})()
