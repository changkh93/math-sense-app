import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import vm from 'node:vm'

const read = name => fs.readFileSync(new URL(`../runtime/python-game-runner/${name}`, import.meta.url), 'utf8')
function fixture(withBridge = true) {
  let time = 100.75, sequence = 0
  const frames = new Map(), errors = [], nodes = []
  const node = () => {
    const value = { style: {}, attributes: {}, setAttribute(key, value) { this.attributes[key] = String(value) }, append() {}, replaceChildren() {}, remove() {}, querySelectorAll() { return [] } }
    nodes.push(value); return value
  }
  const canvas = node()
  const env = {
    performance: { now: () => time },
    document: { createElementNS: node, getElementById: () => canvas, body: node() },
    requestAnimationFrame: callback => { frames.set(++sequence, callback); return sequence },
    cancelAnimationFrame: id => frames.delete(id),
    console: { error: (...args) => errors.push(args.map(value => value?.message || value).join(' ')) },
    studioShowSurface() {}, studioTkTakeEvents: () => '[]', studioEmit: (type, text) => errors.push({ type, text }),
    studioVisualRun: null, studioTkCommand() {}, studioTkReset() {}, studioPlotRender() {}, studioPlotReset() {},
  }
  env.window = env
  vm.createContext(env)
  vm.runInContext(read('turtle-renderer.js'), env)
  if (withBridge) vm.runInContext(read('presentation-host.js'), env)
  const port = { postMessage() {}, close() {}, start() {} }
  if (withBridge) env.studioConnectPresentation(port)
  const command = value => env.studioTurtleCommand(JSON.stringify(value))
  return {
    env, errors, nodes,
    move(speed = 3) {
      command({ op: 'turtle', id: 1, x: 0, y: 0, heading: 0, scale: [1, 1], shape: 'classic', fill: 'black', color: 'black', visible: true })
      command({ op: 'move', id: 1, points: [[0, 0], [100, 0]], headings: [0, 0], pen: true, width: 1, color: 'black', speed })
    },
    remote(now) { time = now; port.onmessage({ data: { type: 'TICK' } }) },
    native(now, timestamp) { time = now; const [id, callback] = frames.entries().next().value; frames.delete(id); callback(timestamp) },
  }
}

test('native callbacks after display ticks use the same monotonic callback clock', () => {
  const f = fixture(), times = []
  f.env.requestAnimationFrame(time => { times.push(time); f.env.requestAnimationFrame(next => times.push(next)) })
  f.remote(100.75)
  f.native(101, 100) // A native frame timestamp can precede the synthetic tick.
  assert.deepEqual(times, [100.75, 101])
})

test('forward(100) survives a synthetic/native timing handoff and reaches its endpoint', () => {
  const f = fixture()
  f.move(); f.remote(100.75); f.native(101, 100); f.native(1000, 999)
  assert.deepEqual(f.errors, [])
  assert.equal(f.env.studioTurtleBusy(), false)
  assert.ok(f.nodes.some(node => node.attributes.transform === 'translate(100 0) rotate(0)'))
})

test('renderer alone clamps backwards timestamps instead of indexing points[-1]', () => {
  const f = fixture(false)
  f.move(); f.native(100.75, 100.75); f.native(101, 100); f.native(1000, 1000)
  assert.deepEqual(f.errors, [])
  assert.equal(f.env.studioTurtleBusy(), false)
})

test('repeated run resets and instant drawing remain valid', () => {
  const f = fixture()
  for (let i = 0; i < 20; i++) {
    f.env.studioTurtleReset(); f.move(i % 2 ? 0 : 3)
    f.remote(1000 + i * 2000)
    if (f.env.studioTurtleBusy()) { f.native(1001 + i * 2000, 999 + i * 2000); f.native(2000 + i * 2000, 1999 + i * 2000) }
    assert.deepEqual(f.errors, [])
    assert.equal(f.env.studioTurtleBusy(), false)
  }
})
