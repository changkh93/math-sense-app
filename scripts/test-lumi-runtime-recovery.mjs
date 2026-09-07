import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const source = readFileSync('src/components/PythonWorld/runtime/PythonRuntimeClient.js', 'utf8')
  .replace(/^import PythonWorker.*\n/, '')
  .replace('export default class PythonRuntimeClient', 'globalThis.Client = class PythonRuntimeClient')
function setup({ throws = false } = {}) {
  let now = 0
  let next = 1
  const timers = new Map()
  const workers = []
  const statuses = []
  class Worker {
    constructor() { if (throws) throw new Error('blocked'); this.listeners = {}; this.sent = []; workers.push(this) }
    addEventListener(type, fn) { this.listeners[type] = fn }
    removeEventListener(type) { delete this.listeners[type] }
    postMessage(message) { this.sent.push(message) }
    terminate() { this.terminated = true }
    reply(type, requestId, extra = {}) { this.listeners.message?.({ data: { type, requestId, ...extra } }) }
  }
  const context = vm.createContext({ PythonWorker: Worker, setTimeout: (fn, ms) => { const id = next++; timers.set(id, { fn, at: now + ms }); return id }, clearTimeout: id => timers.delete(id) })
  vm.runInContext(source, context)
  const client = new context.Client({ onStatus: ({ status }) => statuses.push(status) })
  const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve() }
  const tick = async ms => {
    const until = now + ms
    while (true) {
      const due = [...timers].filter(([, v]) => v.at <= until).sort((a, b) => a[1].at - b[1].at)[0]
      if (!due) break
      now = due[1].at; timers.delete(due[0]); due[1].fn(); await flush()
    }
    now = until; await flush()
  }
  return { client, workers, statuses, timers, tick, flush }
}
{
  const h = setup()
  const worker = h.workers[0]
  const result = h.client.run({ code: 'pass' })
  assert.equal(h.client.load(), h.client.load(), 'deduplicate preloads')
  assert.equal(worker.sent.length, 1)
  await h.tick(14_999)
  assert.equal(h.statuses.at(-1), 'loading')
  await h.tick(1)
  assert.equal(h.statuses.at(-1), 'slow')
  worker.reply('status', undefined, { status: 'loading' })
  assert.equal(h.statuses.at(-1), 'slow')
  await h.tick(5_000)
  assert.equal(worker.sent.length, 1, 'no run deadline while loading')
  worker.reply('loaded', worker.sent[0].requestId)
  await h.flush()
  assert.equal(h.statuses.at(-1), 'ready')
  assert.equal(worker.sent[1].type, 'run')
  worker.reply('result', worker.sent[1].requestId, { result: { ok: true } })
  assert.equal((await result).ok, true)
  h.client.dispose()
  assert.equal(h.timers.size, 0)
}
{
  const h = setup()
  const outcome = h.client.run({ code: 'pass' }).catch(e => e)
  await h.tick(60_000)
  assert.equal((await outcome).name, 'PythonRuntimeError')
  assert.equal(h.statuses.at(-1), 'error')
  assert.equal(h.workers.length, 1, 'no automatic retry loop')
  assert.equal(h.workers[0].terminated, true)
  h.client.stop()
  h.workers[1].reply('loaded', h.workers[1].sent[0].requestId)
  await h.flush()
  assert.equal(h.statuses.at(-1), 'ready')
  h.client.dispose()
}
for (const action of ['stop', 'dispose']) {
  const h = setup()
  const outcome = h.client.run({ code: 'pass' }).catch(e => e)
  h.client[action]()
  await h.flush()
  assert.equal((await outcome).name, 'AbortError')
  assert.equal(h.workers[0].sent.some(m => m.type === 'run'), false)
  assert.notEqual(h.statuses.at(-1), 'error', 'old promise must not poison new status')
  h.client.dispose()
}
{
  const h = setup()
  h.workers[0].reply('loaded', h.workers[0].sent[0].requestId)
  await h.flush()
  const outcome = h.client.run({ code: 'while True: pass' }).catch(e => e)
  await h.flush()
  await h.tick(10_000)
  assert.equal((await outcome).name, 'MissionLimitError', 'real run still bounded')
  assert.equal(h.workers[0].terminated, true)
  h.client.dispose()
}
{
  const h = setup({ throws: true })
  await h.flush()
  assert.equal(h.statuses.at(-1), 'error')
  assert.equal(h.timers.size, 0)
  h.client.dispose()
}
{
  const h = setup()
  const outcome = h.client.run({ code: 'pass' }).catch(e => e)
  h.workers[0].reply('worker-error', h.workers[0].sent[0].requestId, { error: { message: 'CDN unavailable' } })
  assert.equal((await outcome).name, 'PythonRuntimeError')
  assert.equal(h.statuses.at(-1), 'error')
  h.client.dispose()
}
console.log('LUMI runtime lifecycle: slow load, queue, timeout, retry, stop/dispose, worker failure passed')
