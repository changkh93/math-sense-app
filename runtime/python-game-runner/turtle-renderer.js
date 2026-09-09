// Runs only inside the opaque runner iframe. All text uses DOM textContent.
// Python owns positions/control flow; this queue animates the resulting commands.
(() => {
  const NS = 'http://www.w3.org/2000/svg'
  let svg, drawings, actors, title, frame = 0, queue = [], cursor = 0, animation = null
  let turtles = new Map(), fills = new Map()
  const element = (tag, attrs = {}) => {
    const node = document.createElementNS(NS, tag)
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value))
    return node
  }
  function surface() {
    if (!svg) {
      svg = element('svg', { id: 'turtle-canvas', role: 'img', 'aria-label': '거북이 그림', viewBox: '-400 -300 800 600', width: 800, height: 600 })
      Object.assign(svg.style, { maxWidth: '100%', maxHeight: '100%', background: 'white', display: 'block', overflow: 'hidden' })
      title = element('title'); title.textContent = '거북이 그림'
      drawings = element('g', { 'data-layer': 'drawing' })
      actors = element('g', { 'data-layer': 'turtles' })
      svg.append(title, drawings, actors)
      document.body.append(svg)
    }
    document.getElementById('canvas').style.display = 'none'
    return svg
  }
  const pointsString = points => points.map(([x, y]) => `${x},${-y}`).join(' ')
  const fontFamily = name => `${name === 'Ariel' ? 'Arial' : name}, "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`
  window.studioTurtleValidColor = value => /^(#[\da-f]{3,8}|[a-z]+)$/i.test(value)
    && !['inherit', 'initial', 'unset', 'revert', 'currentcolor', 'transparent'].includes(value)
    && CSS.supports('color', value)
  window.studioTurtleTextWidth = (text, family, size, style) => {
    const context = document.createElement('canvas').getContext('2d')
    context.font = `${style.includes('italic') ? 'italic ' : ''}${style.includes('bold') ? 'bold ' : ''}${size * 4 / 3}px ${fontFamily(family)}`
    return context.measureText(text).width
  }
  function clearSurface() {
    svg?.remove(); svg = drawings = actors = title = null
    turtles = new Map(); fills = new Map()
    document.getElementById('canvas').style.display = ''
  }
  window.studioTurtleReset = (preserve = false) => {
    cancelAnimationFrame(frame); frame = 0; queue = []; cursor = 0; animation = null
    if (!preserve) clearSurface()
  }
  window.studioTurtleBusy = () => cursor < queue.length || animation !== null
  window.studioTurtleCommand = encoded => {
    queue.push(JSON.parse(encoded))
    if (!frame) frame = requestAnimationFrame(tick)
  }
  function place(turtle) {
    turtle.node.setAttribute('transform', `translate(${turtle.x} ${-turtle.y}) rotate(${-turtle.heading})`)
  }
  function actor(command) {
    let turtle = turtles.get(command.id)
    if (!turtle) {
      turtle = { node: element('g', { 'data-turtle': command.id }) }
      turtles.set(command.id, turtle); actors.append(turtle.node)
    }
    Object.assign(turtle, { x: command.x, y: command.y, heading: command.heading })
    turtle.node.replaceChildren()
    const shape = command.shape
    const visual = element('g', { fill: command.fill, stroke: command.color, 'stroke-width': 1, transform: `scale(${command.scale[1]} ${command.scale[0]})` })
    if (shape === 'turtle') {
      visual.append(element('path', { d: 'M -7,-5 L -10,-9 L -5,-10 L -2,-6 M 3,-5 L 6,-10 L 10,-8 L 8,-3 M -7,5 L -10,9 L -5,10 L -2,6 M 3,5 L 6,10 L 10,8 L 8,3 M -10,0 L -14,0 L -9,2 Z' }))
      visual.append(element('ellipse', { cx: -1, cy: 0, rx: 10, ry: 7 }))
      visual.append(element('circle', { cx: 12, cy: 0, r: 4 }))
    } else if (shape === 'circle') visual.append(element('circle', { r: 10 }))
    else if (shape === 'square') visual.append(element('rect', { x: -10, y: -10, width: 20, height: 20 }))
    else if (shape !== 'blank') visual.append(element('path', { d: shape === 'triangle' ? 'M 12,0 L -8,-10 L -8,10 Z' : 'M 12,0 L -8,-6 L -4,0 L -8,6 Z' }))
    turtle.node.append(visual)
    turtle.node.style.display = command.visible ? '' : 'none'
    place(turtle)
  }
  function start(command, now) {
    surface()
    if (command.op === 'clear-screen') { clearSurface(); return }
    if (command.op === 'screen') {
      svg.setAttribute('width', command.width); svg.setAttribute('height', command.height)
      svg.setAttribute('viewBox', `${-command.width / 2} ${-command.height / 2} ${command.width} ${command.height}`)
      svg.style.background = command.color
    } else if (command.op === 'background') svg.style.background = command.color
    else if (command.op === 'title') { title.textContent = command.text; svg.setAttribute('aria-label', command.text) }
    else if (command.op === 'turtle') actor(command)
    else if (command.op === 'begin-fill') {
      const fill = element('polygon', { 'data-owner': command.id, fill: 'none' })
      drawings.append(fill); fills.set(command.key, fill)
    } else if (command.op === 'end-fill') {
      const fill = fills.get(command.key)
      if (fill) { fill.setAttribute('points', pointsString(command.points)); fill.setAttribute('fill', command.color); fills.delete(command.key) }
    } else if (command.op === 'write') {
      const text = element('text', { x: command.x, y: -command.y, fill: command.color, 'data-owner': command.id,
        'font-family': fontFamily(command.family), 'font-size': `${command.size}pt`,
        'font-weight': command.style.includes('bold') ? 'bold' : 'normal',
        'font-style': command.style.includes('italic') ? 'italic' : 'normal',
        'text-anchor': { left: 'start', center: 'middle', right: 'end' }[command.align] })
      text.textContent = command.text; drawings.append(text)
    } else if (command.op === 'dot') drawings.append(element('circle', { cx: command.x, cy: -command.y, r: command.size / 2, fill: command.color, 'data-owner': command.id }))
    else if (command.op === 'clear-turtle') {
      for (const node of drawings.querySelectorAll(`[data-owner="${command.id}"]`)) node.remove()
    } else if (command.op === 'move' || command.op === 'turn') {
      const turtle = turtles.get(command.id)
      if (!turtle) return
      let length = Math.abs(command.angle || 0), line = null
      if (command.op === 'move') {
        length = command.points.slice(1).reduce((sum, point, i) => sum + Math.hypot(point[0] - command.points[i][0], point[1] - command.points[i][1]), 0)
        if (command.pen && command.width > 0) {
          line = element('polyline', { fill: 'none', stroke: command.color, 'stroke-width': command.width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'data-owner': command.id })
          drawings.append(line)
        }
      }
      const duration = command.speed === 0 ? 0 : Math.min(1500, Math.max(16, length * 1000 / (command.speed * (command.op === 'turn' ? 180 : 120))))
      animation = { command, turtle, line, now, duration }
      advance(now)
    }
  }
  function advance(now) {
    if (!animation) return
    const { command, turtle, line, duration } = animation
    const progress = duration === 0 ? 1 : Math.min(1, (now - animation.now) / duration)
    if (command.op === 'turn') turtle.heading = command.start + command.angle * progress
    else {
      const index = Math.min(command.points.length - 2, Math.floor(progress * (command.points.length - 1)))
      const fraction = progress * (command.points.length - 1) - index
      const a = command.points[index], b = command.points[index + 1]
      turtle.x = a[0] + (b[0] - a[0]) * fraction
      turtle.y = a[1] + (b[1] - a[1]) * fraction
      turtle.heading = command.headings[index] + (command.headings[index + 1] - command.headings[index]) * fraction
      line?.setAttribute('points', pointsString([...command.points.slice(0, index + 1), [turtle.x, turtle.y]]))
    }
    place(turtle)
    if (progress === 1) animation = null
  }
  function tick(now) {
    frame = 0
    try {
      advance(now)
      const deadline = performance.now() + 6
      while (!animation && cursor < queue.length && performance.now() < deadline) start(queue[cursor++], now)
      if (window.studioTurtleBusy()) frame = requestAnimationFrame(tick)
      else { queue = []; cursor = 0 }
    } catch (error) {
      window.studioTurtleReset()
      window.studioEmit?.('ERROR', `거북이 그림을 표시하지 못했습니다: ${error.message}`)
      console.error('Turtle renderer:', error)
    }
  }
})()
