import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { presentationWindowSize, presentationWindowPosition, presentationSizeLabel } from '../src/components/PythonGameStudio/presentationWindow.mjs'

test('native game sizing includes toolbar and browser chrome, capped by screen', () => {
  const metrics = { innerWidth: 1120, innerHeight: 780, outerWidth: 1136, outerHeight: 818, availWidth: 1920, availHeight: 1080, headerHeight: 42 }
  assert.deepEqual(presentationWindowSize(1200, 700, metrics), { width: 1216, height: 780 })
  assert.deepEqual(presentationWindowSize(3000, 2000, metrics), { width: 1920, height: 1080 })
  for (const width of [0, -1, Infinity, NaN, '1200', 20000]) assert.equal(presentationWindowSize(width, 700, metrics), null)
})

test('label reflects real rendered scale, including manually resized windows', () => {
  assert.equal(presentationSizeLabel(1200, 700, 1200, 700), '1200 × 700 · 원본 크기')
  assert.equal(presentationSizeLabel(1200, 700, 960, 560), '1200 × 700 · 화면에 맞춤 80%')
})

test('move a low popup inside the monitor before growing; support negative monitor coordinates', () => {
  assert.deepEqual(presentationWindowPosition({ width: 1200, height: 862 }, { screenX: 100, screenY: 126, availWidth: 1512, availHeight: 949, availLeft: 0, availTop: 0 }), { left: 100, top: 87 })
  assert.deepEqual(presentationWindowPosition({ width: 1200, height: 862 }, { screenX: -1000, screenY: 200, availWidth: 1512, availHeight: 949, availLeft: -1512, availTop: 25 }), { left: -1200, top: 112 })
})

test('first game frame requests focus once; resize reports scale without stealing focus', () => {
  const listeners = {}, reports = [], messages = [], resets = []
  let focusCount = 0
  const canvas = { width: 1200, height: 700, style: {}, getContext: () => ({ drawImage() {} }), getBoundingClientRect: () => ({ width: 1120, height: 653.33 }), focus: () => focusCount++, addEventListener() {} }
  class Bitmap { constructor() { this.width = 1200; this.height = 700 } close() {} }
  const port = { postMessage: data => messages.push(data), start() {} }
  const window = { addEventListener: (name, callback) => { listeners[name] = callback }, studioTkTakeEvents: () => '[]', studioTurtleReset: preserve => resets.push(preserve) }
  vm.runInNewContext(readFileSync(new URL('../runtime/python-game-runner/presentation-client.js', import.meta.url), 'utf8'), {
    window, document: { body: { dataset: {} }, getElementById: id => id === 'canvas' ? canvas : { style: {} } },
    parent: { postMessage: data => reports.push(data) }, ImageBitmap: Bitmap,
    requestAnimationFrame() {}, cancelAnimationFrame() {}, setInterval() {}, clearInterval() {},
  })
  listeners.message({ data: { type: 'DISPLAY_CONNECT', token: '__PRESENTATION_TOKEN__' }, ports: [port] })
  port.onmessage({ data: { type: 'SURFACE', id: 'canvas' } })
  port.onmessage({ data: { type: 'FRAME', bitmap: new Bitmap() } })
  assert.equal(reports.length, 1); assert.equal(reports[0].focus, true)
  port.onmessage({ data: { type: 'SURFACE', id: 'canvas' } }) // pygame.display.update repeats this every frame.
  port.onmessage({ data: { type: 'FRAME', bitmap: new Bitmap() } })
  assert.equal(reports.length, 1)
  listeners.resize()
  assert.equal(reports.at(-1).focus, false)
  listeners.message({ data: { type: 'DISPLAY_FOCUS', token: 'wrong-token' }, ports: [] })
  assert.equal(focusCount, 0)
  listeners.message({ data: { type: 'DISPLAY_FOCUS', token: '__PRESENTATION_TOKEN__' }, ports: [] })
  assert.equal(focusCount, 1)
  assert.equal(messages.filter(message => message.type === 'FRAME_ACK').length, 2)
  port.onmessage({ data: { type: 'CALL', name: 'studioTurtleReset', args: [true] } })
  assert.deepEqual(resets, []) // Keep pending display strokes on successful engine exit.
  port.onmessage({ data: { type: 'CALL', name: 'studioTurtleReset', args: [false] } })
  assert.deepEqual(resets, [false]) // Explicit stop/new run still clears the drawing.
})
