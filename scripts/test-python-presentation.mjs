import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { buildPresentationDocument } from '../runtime/python-game-runner/document.mjs'

const read = name => readFileSync(new URL(`../runtime/python-game-runner/${name}`, import.meta.url), 'utf8')
const calls = ['studioTurtleCommand', 'studioTurtleReset', 'studioTkCommand', 'studioTkReset', 'studioPlotRender', 'studioPlotReset']
function fixture() {
  const emitted = [], local = [], nativeFrames = new Map(), events = []
  let sequence = 0, now = 0
  const canvas = { style: {}, getBoundingClientRect: () => ({ left: 10, top: 20, width: 640, height: 480 }), dispatchEvent: event => events.push(event) }
  const window = { studioVisualRun: 'run-1', studioShowSurface: id => local.push(['surface', id]), studioTkTakeEvents: () => '[]', studioEmit: type => emitted.push(type) }
  window.requestAnimationFrame = fn => { nativeFrames.set(++sequence, fn); return sequence }
  window.cancelAnimationFrame = id => nativeFrames.delete(id)
  for (const name of calls) window[name] = (...args) => local.push([name, ...args])
  const sandbox = { window, performance: { now: () => now }, document: { getElementById: () => canvas }, createImageBitmap: async () => ({ close() {} }), KeyboardEvent: class { constructor(type, data) { Object.assign(this, data, { type }) } }, MouseEvent: class { constructor(type, data) { Object.assign(this, data, { type }) } } }
  vm.runInNewContext(read('presentation-host.js'), sandbox)
  const port = () => ({ messages: [], postMessage(value) { this.messages.push(value) }, start() {}, close() { this.closed = true } })
  return { window, local, emitted, nativeFrames, events, port, tick: async port => { now += 34; port.onmessage({ data: { type: 'TICK' } }); await new Promise(setImmediate) } }
}

test('display HTML has renderers but no Python/WASM download or network authority', () => {
  const html = buildPresentationDocument(read('index.html'), read('turtle-renderer.js'), read('tkinter-renderer.js'), read('plot-renderer.js'), read('presentation-client.js'))
  assert.doesNotMatch(html, /pythons\.js|cpython312|text\/python|unsafe-eval|connect-src https/)
  assert.match(html, /default-src 'none'/)
  assert.match(html, /__PRESENTATION_TOKEN__/)
})

test('closing and reconnecting a display retains local rendering and stops old work', () => {
  const f = fixture(), first = f.port(), second = f.port()
  f.window.studioConnectPresentation(first)
  assert.deepEqual(f.emitted, []) // Wait for the actual display acknowledgement.
  first.onmessage({ data: { type: 'DISPLAY_READY' } })
  assert.deepEqual(f.emitted, ['PRESENTATION_READY'])
  f.window.studioTurtleCommand('forward')
  assert.equal(first.messages.at(-1).name, 'studioTurtleCommand')
  f.window.studioDisconnectPresentation()
  assert.equal(first.closed, true)
  f.window.studioTurtleCommand('still-local')
  assert.deepEqual(f.local.at(-1), ['studioTurtleCommand', 'still-local'])
  f.window.studioConnectPresentation(second)
  f.window.studioPlotRender(1, 'png')
  assert.equal(second.messages.at(-1).name, 'studioPlotRender')
})

test('pygame frame transfer uses bounded backpressure', async () => {
  const f = fixture(), port = f.port(); f.window.studioConnectPresentation(port)
  await f.tick(port); await f.tick(port)
  assert.equal(port.messages.filter(x => x.type === 'FRAME').length, 1)
  port.onmessage({ data: { type: 'FRAME_ACK' } }); await f.tick(port)
  assert.equal(port.messages.filter(x => x.type === 'FRAME').length, 2)
})

test('display ticks resume occluded editor frames exactly once and honor cancellation', async () => {
  const f = fixture(), port = f.port(); f.window.studioConnectPresentation(port)
  let runs = 0
  f.window.requestAnimationFrame(() => { runs++ })
  const cancelled = f.window.requestAnimationFrame(() => { runs += 100 })
  f.window.cancelAnimationFrame(cancelled)
  await f.tick(port); await f.tick(port)
  assert.equal(runs, 1); assert.equal(f.nativeFrames.size, 0)
})

test('keyboard release, scaled mouse coordinates and Tk events survive display boundary', () => {
  const f = fixture(), port = f.port(); f.window.studioConnectPresentation(port)
  port.onmessage({ data: { type: 'KEY', event: 'keydown', code: 'ArrowRight', key: 'ArrowRight', keyCode: 39 } })
  port.onmessage({ data: { type: 'MOUSE', event: 'mousedown', x: .5, y: .5, button: 0 } })
  assert.equal(f.events[0].keyCode, 39)
  assert.equal(f.events[1].clientX, 330); assert.equal(f.events[1].clientY, 260)
  port.onmessage({ data: { type: 'TK', events: ['button-1'] } })
  assert.equal(f.window.studioTkTakeEvents(), '["button-1"]')
  assert.equal(f.window.studioTkTakeEvents(), '[]')
  f.window.studioDisconnectPresentation()
  assert.equal(f.events.at(-1).type, 'keyup')
})
