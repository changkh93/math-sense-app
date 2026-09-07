import PythonWorker from './pythonWorld.worker.js?worker'

const LOAD_TIMEOUT_MS = 60_000
const LOAD_NOTICE_MS = 15_000
const RUN_TIMEOUT_MS = 10_000

function createAbortError(message = 'Python 실행이 중지되었습니다.') {
  const error = new Error(message)
  error.name = 'AbortError'
  return error
}

function runtimeError(message) {
  const error = new Error(message)
  error.name = 'PythonRuntimeError'
  return error
}

export default class PythonRuntimeClient {
  constructor({ onStatus } = {}) {
    this.onStatus = onStatus
    this.worker = null
    this.pending = new Map()
    this.nextRequestId = 1
    this.disposed = false
    this.generation = 0
    this.loadPromise = null
    this.load().catch(() => {})
  }

  createWorker() {
    this.worker = new PythonWorker()
    this.worker.addEventListener('message', this.handleMessage)
    this.worker.addEventListener('error', this.handleWorkerError)
    this.worker.addEventListener('messageerror', this.handleWorkerError)
  }

  handleMessage = (event) => {
    const message = event.data || {}
    // Only the current load request may declare readiness. Worker status messages
    // must not overwrite a slow-load notice or a newer connection's status.
    const pending = this.pending.get(message.requestId)
    if (!pending) return
    clearTimeout(pending.timeout)
    this.pending.delete(message.requestId)
    if (message.type === 'worker-error') {
      const error = runtimeError(message.error?.message || 'Python 엔진을 준비하지 못했습니다.')
      this.fail(error)
      pending.reject(error)
      return
    }
    pending.resolve(message.type === 'result' ? message.result : message)
  }

  handleWorkerError = (event) => {
    this.fail(runtimeError(event?.message || 'Python 엔진에 연결하지 못했습니다.'))
  }

  request(type, payload, timeoutMs) {
    if (this.disposed) return Promise.reject(createAbortError('Python 런타임이 종료되었습니다.'))
    const requestId = this.nextRequestId++
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId)
        if (type === 'load') {
          const error = runtimeError('Python 엔진 준비 시간이 초과되었습니다. 연결을 다시 시도해 주세요.')
          this.fail(error)
          reject(error)
        } else {
          const error = new Error('실행 제한 시간을 초과했습니다. 반복 조건을 확인해 주세요.')
          error.name = 'MissionLimitError'
          this.stop()
          reject(error)
        }
      }, timeoutMs)
      this.pending.set(requestId, { resolve, reject, timeout })
      try {
        this.worker.postMessage({ type, requestId, ...payload })
      } catch (error) {
        this.fail(runtimeError(error.message || 'Python 엔진에 요청을 전달하지 못했습니다.'))
      }
    })
  }

  load() {
    if (this.disposed) return Promise.reject(createAbortError())
    if (this.loadPromise) return this.loadPromise
    const generation = this.generation
    this.onStatus?.({ status: 'loading' })
    this.loadNotice = setTimeout(() => {
      if (generation === this.generation) this.onStatus?.({ status: 'slow' })
    }, LOAD_NOTICE_MS)
    try {
      if (!this.worker) this.createWorker()
    } catch (error) {
      const failure = runtimeError(error.message || 'Python 엔진을 시작하지 못했습니다.')
      this.fail(failure)
      return Promise.reject(failure)
    }
    const loading = this.request('load', {}, LOAD_TIMEOUT_MS).then(() => {
      if (generation !== this.generation || this.disposed) throw createAbortError()
      clearTimeout(this.loadNotice)
      this.onStatus?.({ status: 'ready' })
    }).catch((error) => {
      if (generation === this.generation && !this.disposed) this.fail(error)
      throw error
    })
    if (generation === this.generation) this.loadPromise = loading
    return loading
  }

  async run({ mission, code, inputValues }) {
    const generation = this.generation
    await this.load()
    if (generation !== this.generation || this.disposed) throw createAbortError()
    // The execution budget starts only after the engine has finished loading.
    return this.request('run', { mission, code, inputValues }, RUN_TIMEOUT_MS)
  }

  rejectAll(error) {
    this.pending.forEach((pending) => {
      clearTimeout(pending.timeout)
      pending.reject(error)
    })
    this.pending.clear()
  }

  disconnect(error) {
    this.generation += 1
    clearTimeout(this.loadNotice)
    this.rejectAll(error)
    this.loadPromise = null
    if (this.worker) {
      this.worker.removeEventListener('message', this.handleMessage)
      this.worker.removeEventListener('error', this.handleWorkerError)
      this.worker.removeEventListener('messageerror', this.handleWorkerError)
      this.worker.terminate()
      this.worker = null
    }
  }

  fail(error) {
    this.disconnect(error)
    if (!this.disposed) this.onStatus?.({ status: 'error', error })
  }

  stop(message) {
    this.disconnect(createAbortError(message))
    if (!this.disposed) this.load().catch(() => {})
  }

  dispose() {
    this.disposed = true
    this.disconnect(createAbortError('Python 런타임 화면을 닫았습니다.'))
  }
}
