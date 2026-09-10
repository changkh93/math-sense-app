// Native controls + SVG in the existing opaque runner. No host DOM or network access.
(() => {
  const NS = 'http://www.w3.org/2000/svg'
  let host, panel, grid, title, events = []
  const widgets = new Map(), images = new Map()
  const svg = name => document.createElementNS(NS, name)
  const color = value => String(value).replace(/\s+/g, '')
  const size = value => Math.max(0, Math.min(8192, Number(value) || 0))
  function fit() {
    if (!host) return
    panel.style.transform = ''
    const scale = Math.min(1, innerWidth / Math.max(1, panel.offsetWidth), innerHeight / Math.max(1, panel.offsetHeight))
    panel.style.transform = `scale(${scale})`
  }
  function reset() {
    host?.remove(); host = panel = grid = title = null
    widgets.clear(); images.clear(); events = []
  }
  window.studioTkReset = reset
  window.studioTkTakeEvents = () => { const value = JSON.stringify(events); events = []; return value }
  window.addEventListener('resize', fit)
  function root() {
    reset()
    host = document.createElement('div'); host.id = 'tk-root'
    host.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#080f20;z-index:1'
    panel = document.createElement('section'); panel.setAttribute('aria-label', 'Python tkinter 창')
    panel.style.cssText = 'flex:none;width:max-content;height:max-content;transform-origin:center;background:#d9d9d9;color:black'
    title = document.createElement('div'); title.style.cssText = 'padding:6px 12px;background:#182438;color:white;font:14px system-ui'
    title.textContent = 'tk'
    grid = document.createElement('div'); grid.style.cssText = 'display:grid;align-items:center;justify-items:center;width:max-content'
    panel.append(title, grid); host.append(panel); document.body.append(host)
  }
  function font(node, value) {
    const parts = Array.isArray(value) ? value : [value, 12]
    node.style.fontFamily = String(parts[0] || 'Arial')
    // Tk positive sizes are points; negative sizes are pixels.
    const n = Number(parts[1]) || 12
    node.style.fontSize = `${Math.abs(n)}${n < 0 ? 'px' : 'pt'}`
    const style = parts.slice(2).join(' ')
    node.style.fontWeight = style.includes('bold') ? 'bold' : 'normal'
    node.style.fontStyle = style.includes('italic') ? 'italic' : 'normal'
  }
  function itemConfig(item, values) {
    Object.assign(item.options, values)
    const options = item.options, node = item.node, anchor = options.anchor === 'center' ? '' : (options.anchor || '')
    node.style.display = options.state === 'hidden' ? 'none' : ''
    if (item.kind === 'image') {
      const image = images.get(options.image)
      if (!image) return
      node.setAttribute('href', image.url)
      node.setAttribute('width', image.width); node.setAttribute('height', image.height)
      node.setAttribute('x', item.x - (anchor.includes('w') ? 0 : anchor.includes('e') ? image.width : image.width / 2))
      node.setAttribute('y', item.y - (anchor.includes('n') ? 0 : anchor.includes('s') ? image.height : image.height / 2))
    } else {
      node.textContent = String(options.text ?? '')
      node.setAttribute('fill', color(options.fill || 'black'))
      node.setAttribute('text-anchor', anchor.includes('w') ? 'start' : anchor.includes('e') ? 'end' : 'middle')
      node.setAttribute('dominant-baseline', anchor.includes('n') ? 'hanging' : anchor.includes('s') ? 'auto' : 'central')
      if (options.font) font(node, options.font)
    }
  }
  function configure(widget, values) {
    Object.assign(widget.options, values)
    const o = widget.options, node = widget.node
    if (o.bg !== undefined) node.style.backgroundColor = color(o.bg)
    if (o.padx !== undefined) node.style.paddingLeft = node.style.paddingRight = `${size(o.padx)}px`
    if (o.pady !== undefined) node.style.paddingTop = node.style.paddingBottom = `${size(o.pady)}px`
    if (o.highlightthickness !== undefined) node.style.outlineWidth = `${size(o.highlightthickness)}px`
    if (widget.kind === 'Canvas') {
      const width = size(o.width ?? 378), height = size(o.height ?? 265)
      node.setAttribute('width', width); node.setAttribute('height', height)
      node.setAttribute('viewBox', `0 0 ${width} ${height}`)
    } else if (widget.kind === 'Button') {
      node.disabled = o.state === 'disabled'
      if (o.font) font(node, o.font)
      if (o.fg) node.style.color = color(o.fg)
      if (o.highlightbackground && !o.bg) node.style.backgroundColor = color(o.highlightbackground)
      if ('image' in values || 'text' in values) {
        node.replaceChildren()
        const image = images.get(o.image)
        if (image) {
          const img = document.createElement('img'); img.src = image.url; img.width = image.width; img.height = image.height; img.alt = String(o.text || '이미지 버튼')
          img.style.display = 'block'; node.append(img)
        } else node.textContent = String(o.text || '')
      }
    }
  }
  window.studioTkCommand = encoded => {
    const c = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(encoded), ch => ch.charCodeAt(0))))
    if (c.op === 'root') { root(); return }
    if (c.op === 'destroy') { reset(); return }
    if (c.op === 'image') {
      images.set(c.id, { url: `data:image/png;base64,${c.data}`, width: c.width, height: c.height }); return
    }
    if (!grid) return
    if (c.op === 'title') title.textContent = c.text
    else if (c.op === 'widget') {
      const node = c.kind === 'Canvas' ? svg('svg') : document.createElement('button')
      node.dataset.tkWidget = c.id
      if (c.kind === 'Button') {
        node.type = 'button'
        node.style.cssText = 'font:13px Arial;border:1px solid #999;border-radius:0;padding:2px;color:black;cursor:pointer;background:#d9d9d9'
        node.addEventListener('click', () => { if (!node.disabled && events.length < 64) events.push(c.id) })
      }
      node.style.display = 'none'; grid.append(node)
      widgets.set(c.id, { node, kind: c.kind, options: {}, items: new Map() })
    } else if (c.op === 'config') {
      configure(c.id === 'root' ? { node: grid, options: {} } : widgets.get(c.id), c.values)
    } else {
      const widget = widgets.get(c.id)
      if (!widget) return
      if (c.op === 'grid') {
        const o = c.values, node = widget.node
        node.style.display = ''
        node.style.gridRow = `${(o.row || 0) + 1} / span ${o.rowspan || 1}`
        node.style.gridColumn = `${(o.column || 0) + 1} / span ${o.columnspan || 1}`
        node.style.margin = `${size(o.pady)}px ${size(o.padx)}px`
        node.style.justifySelf = o.sticky?.includes('w') ? 'start' : o.sticky?.includes('e') ? 'end' : 'center'
      } else if (c.op === 'item') {
        const node = svg(c.kind); node.dataset.tkItem = c.key; node.setAttribute('x', c.x); node.setAttribute('y', c.y)
        widget.node.append(node); widget.items.set(c.key, { node, kind: c.kind, x: c.x, y: c.y, options: {} })
      } else if (c.op === 'itemconfig') itemConfig(widget.items.get(c.key), c.values)
    }
    fit()
  }
})()
