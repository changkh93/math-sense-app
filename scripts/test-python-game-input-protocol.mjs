import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

function runtime() {
  const html = readFileSync(new URL('../runtime/python-game-runner/index.html', import.meta.url), 'utf8')
  const source = html.slice(html.indexOf('window.config='), html.indexOf('</script>', html.indexOf('window.config=')))
  const events = [], listeners = {}, parent = {}, port = { postMessage: value => events.push(value), start() {} }
  const context = {
    parent, TextDecoder, Uint8Array, atob, performance, setInterval: () => 1, clearInterval() {},
    document: { addEventListener() {}, getElementById: () => ({ hidden: false, width: 100 }) },
    addEventListener: (type, callback) => { listeners[type] = callback },
    studioTurtleReset() {}, studioTkReset() {}, studioPlotReset() {},
  }
  context.window = context
  vm.runInNewContext(source, context)
  listeners.message({ source: parent, data: { type: 'CONNECT', protocolVersion: 2, sessionId: 'session' }, ports: [port] })
  context.studioActiveRun = 'run'
  const send = values => port.onmessage({ data: { protocolVersion: 2, sessionId: 'session', type: 'INPUT_RESPONSE', runId: 'run', requestId: '1', value: 'answer', ...values } })
  return { context, send, events }
}

test('Unicode prompts and answers survive the ASCII-only WASM bridge, including empty text', () => {
  const { context, send, events } = runtime()
  context.studioBeginInput('run', '1', Buffer.from('이름은? 🐢').toString('base64'))
  assert.equal(JSON.parse(events.at(-1).text).prompt, '이름은? 🐢')
  send({ value: '  왕새우 🐢 "\\  ' })
  const encoded = context.studioTakeInput('run', '1')
  assert.match(encoded, /^[\x00-\x7f]*$/)
  assert.equal(JSON.parse(encoded).value, '  왕새우 🐢 "\\  ')
  context.studioEndInput('run', '1')
  context.studioBeginInput('run', '2', '')
  send({ requestId: '2', value: '' })
  assert.equal(JSON.parse(context.studioTakeInput('run', '2')).value, '')
})

test('rejects wrong sessions, old runs/requests, oversized values and duplicate submissions', () => {
  const { context, send } = runtime()
  context.studioBeginInput('run', '1', '')
  for (const data of [{ sessionId: 'wrong' }, { protocolVersion: 1 }, { runId: 'old' }, { requestId: 'old' }, { value: 42 }, { value: 'a'.repeat(8193) }]) {
    send(data)
    assert.equal(context.studioTakeInput('run', '1'), '')
  }
  send({ value: 'first' })
  send({ value: 'duplicate' })
  assert.equal(JSON.parse(context.studioTakeInput('run', '1')).value, 'first')
  context.studioEndInput('run', '1')
  assert.equal(context.studioPendingInput, null)
  context.studioBeginInput('run', '2', '')
  context.studioEndInput('run', '1')
  send({ requestId: '1', value: 'stale' })
  assert.equal(context.studioTakeInput('run', '2'), '')
  context.studioResetPresentation()
  send({ requestId: '2' })
  assert.equal(context.studioPendingInput, null)
})
