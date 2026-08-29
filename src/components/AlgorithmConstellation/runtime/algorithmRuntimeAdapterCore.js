/**
 * Environment-neutral runtime adapter core.
 * The browser entrypoint supplies the Vite Worker; tests may inject a fake.
 */

export const RUNTIME_STATES = Object.freeze({
  UNLOADED: 'UNLOADED',
  BOOTING: 'BOOTING',
  READY: 'READY',
  RUNNING: 'RUNNING',
  TERMINATING: 'TERMINATING',
  RECREATING: 'RECREATING',
})

export function createAlgorithmRuntimeAdapterCore({ limits = {}, workerFactory } = {}) {
  if (typeof workerFactory !== 'function') {
    throw new TypeError('workerFactory must be provided to the runtime adapter core.')
  }

  let runtimeState = RUNTIME_STATES.UNLOADED
  let worker = null
  let sequence = 0
  const pending = new Map()

  function terminateWorker(reason = new Error('학생 코드 실행기가 다시 시작되었습니다.')) {
    if (worker) worker.terminate()
    worker = null
    for (const request of pending.values()) {
      clearTimeout(request.timeoutId)
      request.reject(reason)
    }
    pending.clear()
  }

  function bootWorker() {
    if (worker) return worker
    runtimeState = RUNTIME_STATES.BOOTING
    worker = workerFactory()
    if (!worker || typeof worker.addEventListener !== 'function' || typeof worker.postMessage !== 'function' || typeof worker.terminate !== 'function') {
      worker = null
      throw new TypeError('workerFactory returned an invalid Worker implementation.')
    }
    worker.addEventListener('message', (event) => {
      const request = pending.get(event.data?.requestId)
      if (!request) return
      pending.delete(event.data.requestId)
      clearTimeout(request.timeoutId)
      runtimeState = RUNTIME_STATES.READY
      if (event.data.error) {
        const error = new Error(event.data.error.message)
        error.code = event.data.error.code
        request.reject(error)
      } else {
        request.resolve(event.data.result)
      }
    })
    worker.addEventListener('error', () => {
      runtimeState = RUNTIME_STATES.RECREATING
      terminateWorker(new Error('학생 코드 실행기가 비정상 종료되어 다시 준비했습니다.'))
      bootWorker()
    })
    runtimeState = RUNTIME_STATES.READY
    return worker
  }

  async function runStudentCode({ code, entryFunction = 'check_gate', publicTests = [], traceConfig = {}, onEvent }) {
    runtimeState = RUNTIME_STATES.RUNNING
    try {
      const activeWorker = bootWorker()
      runtimeState = RUNTIME_STATES.RUNNING
      const requestId = `run_${++sequence}`
      const hardTimeoutMs = Math.max(250, Number(limits.maxExecutionMs || 1_500) + 250)
      const result = await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          pending.delete(requestId)
          runtimeState = RUNTIME_STATES.TERMINATING
          terminateWorker(new Error('실행 제한 시간을 초과해 안전하게 중단했습니다.'))
          bootWorker()
          reject(new Error('실행 제한 시간을 초과해 안전하게 중단했습니다.'))
        }, hardTimeoutMs)
        pending.set(requestId, { resolve, reject, timeoutId })
        activeWorker.postMessage({
          requestId,
          payload: { code, entryFunction, publicTests, limits, traceConfig },
        })
      })
      for (const event of result.rawEvents || []) onEvent?.(event)
      runtimeState = RUNTIME_STATES.READY
      return result
    } catch (error) {
      runtimeState = RUNTIME_STATES.READY
      return {
        ok: false,
        error: error.message,
        errorCode: error.code || (String(error.message).includes('제한 시간') ? 'TIMEOUT' : 'RUNTIME_ERROR'),
        stepCount: 0,
        testResults: [],
        rawEvents: [],
      }
    }
  }

  return {
    getState() {
      return runtimeState
    },
    runStudentCode,
    recreate() {
      runtimeState = RUNTIME_STATES.RECREATING
      terminateWorker()
      bootWorker()
    },
    dispose() {
      runtimeState = RUNTIME_STATES.TERMINATING
      terminateWorker()
      runtimeState = RUNTIME_STATES.UNLOADED
    },
  }
}
