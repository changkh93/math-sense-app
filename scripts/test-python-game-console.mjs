import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import vm from 'node:vm'

const html = await readFile(new URL('../runtime/python-game-runner/index.html', import.meta.url), 'utf8')
const source = html.match(/<script id="studio-console-policy">([\s\S]*?)<\/script>/)[1]
function runner() {
  const calls = []
  const console = Object.fromEntries(['log', 'info', 'debug', 'warn', 'error'].map(level => [level, (...args) => calls.push([level, ...args])]))
  const window = { config: { cdn: 'https://pygame-web.github.io/archives/0.9/', quiet: false } }
  vm.runInNewContext(source, { window, console })
  return { calls, console, window }
}

test('routine bootstrap dumps and only known caught sandbox probes are quiet', () => {
  const { calls, console, window } = runner()
  console.log('script?', '', '', '', 'large bootstrap script')
  console.log(JSON.stringify(window.config))
  console.log('config.quiet =', false)
  console.warn('VM.postrun End')
  console.warn('\n\n== FLAGS : is_mobile(false) dev=false debug_user=false debug_mobile=false ==\n')
  console.warn('NO ume unlocker, safari ==', false)
  console.log('cross_file.fetch', 200)
  console.error('PyMain: BrowserFS not found')
  for (const [property, type] of [['hash', 'Location'], ['blanker', 'Window']]) {
    console.warn('FIXME:', { name: 'SecurityError', message: `Failed to read a named property '${property}' from '${type}': Blocked a frame with origin "null" from accessing a cross-origin frame.` })
  }
  assert.deepEqual(calls, [])
})

test('unknown logs, network failures, Python tracebacks and actual runtime errors survive', () => {
  const { calls, console } = runner()
  const inputs = [
    ['log', 'hello World'], ['info', 'diagnostic'], ['debug', 'new message'],
    ['warn', 'Cannot play before user interaction, will retry'],
    ['error', 'VM.postrun: error:', new Error('failed')],
    ['error', 'uncaught :', new Error('unhandled')],
    ['log', 'cross_file.fetch', 404], ['log', 'cross_file.fetch', 500],
    ['error', 'cross_file.error :', new Error('offline')],
    ['log', 'Traceback (most recent call last):\nValueError: test'],
    ['error', 'FIXME:', { name: 'SecurityError', message: 'Storage blocked' }],
    ['error', { name: 'SecurityError', message: "Failed to read a named property 'hash' from 'Location': Blocked a frame" }],
    ['log', '{"cdn":"student data"}'],
  ]
  for (const [level, ...args] of inputs) console[level](...args)
  assert.deepEqual(calls, inputs)
})

test('developers can re-enable full diagnostics without affecting another console', () => {
  const a = runner(), b = runner()
  a.window.studioSetRuntimeDiagnostics(true)
  a.console.log('script?', 'details')
  b.console.log('script?', 'details')
  assert.equal(a.calls.length, 1)
  assert.equal(b.calls.length, 0)
  a.window.studioSetRuntimeDiagnostics(false)
  a.console.log('script?', 'details')
  assert.equal(a.calls.length, 1)
})

test('unexpected config data cannot break console logging', () => {
  const { calls, console, window } = runner()
  window.config.circular = window.config
  console.log('{"cdn":"future config"}')
  assert.equal(calls.length, 1)
})
