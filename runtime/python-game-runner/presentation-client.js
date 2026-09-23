// A display-only sandbox, with no Python download or project-file access.
(() => {
  let port, frame = 0, firstFrame = true, lastSize = '', surface = null
  const canvas = document.getElementById('canvas'), context = canvas.getContext('2d')
  function reportViewport(focus = false) {
    if (canvas.style.display === 'none') return
    const rect = canvas.getBoundingClientRect()
    parent.postMessage({ type: 'DISPLAY_VIEWPORT', token: '__PRESENTATION_TOKEN__', width: canvas.width, height: canvas.height, renderedWidth: rect.width, renderedHeight: rect.height, focus }, '*')
  }
  window.addEventListener('resize', () => reportViewport())
  window.studioShowSurface = id => {
    document.getElementById('start').hidden = true
    for (const name of ['canvas', 'turtle-canvas', 'tk-root', 'plot-root']) {
      const node = document.getElementById(name)
      if (node) node.style.display = name === id ? (id === 'tk-root' ? 'flex' : 'block') : 'none'
    }
    if (id === 'canvas' && surface !== id) firstFrame = true
    surface = id
  }
  const allowed = new Set(['studioTurtleCommand', 'studioTurtleReset', 'studioTkCommand', 'studioTkReset', 'studioPlotRender', 'studioPlotReset'])
  const hello = setInterval(() => { if (!port) parent.postMessage({ type: 'DISPLAY_HELLO' }, '*') }, 100)
  window.addEventListener('message', event => {
    // The sender is the editor/opener, not this iframe's popup parent. Use a
    // per-display capability; the isolated Python iframe cannot read this token.
    if (event.data?.token !== '__PRESENTATION_TOKEN__') return
    if (event.data?.type === 'DISPLAY_FOCUS') { canvas.focus({ preventScroll: true }); return }
    if (event.data?.type !== 'DISPLAY_CONNECT' || !event.ports[0]) return
    port?.close(); port = event.ports[0]; clearInterval(hello)
    port.onmessage = ({ data }) => {
      document.body.dataset.displayState = data?.type || 'unknown'
      if (data?.type === 'CALL' && allowed.has(data.name) && Array.isArray(data.args)) {
        // The engine and this display animate independently. A successful
        // engine shutdown must not discard this window's still-pending strokes.
        // Explicit stop/new run still sends reset(false) and cancels them.
        if (data.name === 'studioTurtleReset' && data.args[0] === true) return
        if (data.name.endsWith('Reset')) firstFrame = true
        window[data.name](...data.args)
      }
      if (data?.type === 'SURFACE' && ['canvas', 'turtle-canvas', 'tk-root', 'plot-root'].includes(data.id)) window.studioShowSurface(data.id)
      if (data?.type === 'FRAME' && data.bitmap instanceof ImageBitmap) {
        if (canvas.width !== data.bitmap.width) canvas.width = data.bitmap.width
        if (canvas.height !== data.bitmap.height) canvas.height = data.bitmap.height
        context.drawImage(data.bitmap, 0, 0); data.bitmap.close(); port.postMessage({ type: 'FRAME_ACK' })
        const size = `${canvas.width}x${canvas.height}`
        if (firstFrame || size !== lastSize) { reportViewport(firstFrame); firstFrame = false; lastSize = size }
      }
    }
    port.start(); document.body.dataset.displayState = 'connected'; port.postMessage({ type: 'DISPLAY_READY' })
  })
  for (const type of ['keydown', 'keyup']) window.addEventListener(type, event => {
    if (canvas.style.display === 'none') return
    event.preventDefault()
    port?.postMessage({ type: 'KEY', event: type, key: event.key, code: event.code, keyCode: event.keyCode, repeat: event.repeat, shiftKey: event.shiftKey, ctrlKey: event.ctrlKey, altKey: event.altKey, metaKey: event.metaKey })
  })
  window.addEventListener('blur', () => port?.postMessage({ type: 'RELEASE_KEYS' }))
  for (const type of ['mousedown', 'mouseup', 'mousemove']) canvas.addEventListener(type, event => {
    const rect = canvas.getBoundingClientRect(); canvas.focus()
    port?.postMessage({ type: 'MOUSE', event: type, x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height, button: event.button, buttons: event.buttons })
  })
  function tick() {
    port?.postMessage({ type: 'TICK' })
    const events = JSON.parse(window.studioTkTakeEvents())
    if (events.length) port?.postMessage({ type: 'TK', events })
    frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
  window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); port?.close() })
})()
