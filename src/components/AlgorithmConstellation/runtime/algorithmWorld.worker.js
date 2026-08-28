import { executeRestrictedPublicTests } from './restrictedPythonEvaluator.js'

self.addEventListener('message', (event) => {
  const { requestId, payload } = event.data || {}
  if (!requestId || !payload) return
  try {
    const result = executeRestrictedPublicTests(payload)
    self.postMessage({ requestId, result })
  } catch (error) {
    self.postMessage({
      requestId,
      error: {
        code: error?.code || 'RUNTIME_ERROR',
        message: error?.message || '학생 코드 실행에 실패했습니다.',
      },
    })
  }
})
