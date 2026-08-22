const LOAD_TIMEOUT_MS = 60_000
const RUN_TIMEOUT_MS = 6_000

function createAbortError(message = 'Python 실행이 중지되었습니다.') {
  const error = new Error(message)
  error.name = 'AbortError'
  return error
}

export default class PythonRuntimeClient {
  constructor({ onStatus } = {}) {
    this.onStatus = onStatus
    this.worker = null
    this.pending = new Map()
    this.nextRequestId = 1
    this.disposed = false
    this.createWorker()
  }

  createWorker() {
    if (this.disposed) return
    this.worker = new Worker(new URL('./pythonWorld.worker.js', import.meta.url), { type: 'module' })
    this.worker.addEventListener('message', this.handleMessage)
    this.worker.addEventListener('error', this.handleWorkerError)
  }

  handleMessage = (event) => {
    const message = event.data || {}
    if (message.type === 'status') {
      this.onStatus?.(message)
      return
    }
    const pending = this.pending.get(message.requestId)
    if (!pending) return
    clearTimeout(pending.timeout)
    this.pending.delete(message.requestId)
    if (message.type === 'worker-error') {
      const error = new Error(message.error?.message || 'Python 런타임 오류')
      error.name = message.error?.type || 'RuntimeError'
      pending.reject(error)
      return
    }
    pending.resolve(message.type === 'result' ? message.result : message)
  }

  handleWorkerError = (event) => {
    const error = new Error(event?.message || 'Python Worker를 불러오지 못했습니다.')
    this.rejectAll(error)
    this.onStatus?.({ status: 'error', error })
  }

  request(type, payload = {}, timeoutMs = RUN_TIMEOUT_MS) {
    if (this.disposed) return Promise.reject(createAbortError('Python 런타임이 종료되었습니다.'))
    if (!this.worker) this.createWorker()
    const requestId = this.nextRequestId++
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId)
        this.stop('실행 제한 시간을 초과해 안전하게 중지했습니다.')
        const error = new Error('실행 제한 시간을 초과했습니다. 반복 조건을 확인해 주세요.')
        error.name = 'MissionLimitError'
        reject(error)
      }, timeoutMs)
      this.pending.set(requestId, { resolve, reject, timeout })
      this.worker.postMessage({ type, requestId, ...payload })
    })
  }

  load() {
    return this.request('load', {}, LOAD_TIMEOUT_MS)
  }

  run({ mission, code, inputValues }) {
    return this.request('run', { mission, code, inputValues }, RUN_TIMEOUT_MS)
  }

  rejectAll(error) {
    this.pending.forEach((pending) => {
      clearTimeout(pending.timeout)
      pending.reject(error)
    })
    this.pending.clear()
  }

  stop(message) {
    this.rejectAll(createAbortError(message))
    if (this.worker) {
      this.worker.removeEventListener('message', this.handleMessage)
      this.worker.removeEventListener('error', this.handleWorkerError)
      this.worker.terminate()
      this.worker = null
    }
    if (!this.disposed) {
      this.onStatus?.({ status: 'stopped' })
      this.createWorker()
    }
  }

  dispose() {
    this.disposed = true
    this.rejectAll(createAbortError('Python 런타임 화면을 닫았습니다.'))
    if (this.worker) {
      this.worker.removeEventListener('message', this.handleMessage)
      this.worker.removeEventListener('error', this.handleWorkerError)
      this.worker.terminate()
      this.worker = null
    }
  }
}
