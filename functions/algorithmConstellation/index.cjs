/**
 * Production Firebase Callable entrypoint for LUMI Algorithm Constellation.
 * All mutable state is durable and all domain failures are normalized here.
 */

const { createCallableOrchestrator } = require('./callableOrchestrator.cjs')
const { createFirestoreAlgorithmStore } = require('./algorithmProgressLedger.cjs')

const ERROR_CODES = Object.freeze({
  UNAUTHENTICATED: 'unauthenticated',
  PERMISSION_DENIED: 'permission-denied',
  INVALID_ARGUMENT: 'invalid-argument',
  NOT_FOUND: 'not-found',
  FAILED_PRECONDITION: 'failed-precondition',
  ALREADY_EXISTS: 'already-exists',
  RESOURCE_EXHAUSTED: 'resource-exhausted',
  JUDGE_UNAVAILABLE: 'unavailable',
})

module.exports = function createAlgorithmConstellationFunctions({ functions, admin, regionalFunctions }) {
  if (!functions || !admin || !regionalFunctions) {
    throw new Error('Firebase Functions, Admin, and regionalFunctions are required')
  }

  const store = createFirestoreAlgorithmStore({
    db: admin.firestore(),
    FieldValue: admin.firestore.FieldValue,
  })
  const handlers = createCallableOrchestrator({ store })

  // No warm instance is reserved: this vertical slice favors low idle cost.
  const secureCallable = regionalFunctions.runWith({
    maxInstances: 3,
    memory: '256MB',
    timeoutSeconds: 30,
    secrets: ['GUEST_ABUSE_HASH_SECRET'],
    enforceAppCheck: true,
  })

  function callable(handler) {
    return secureCallable.https.onCall(async (data, context) => {
      try {
        return await handler(data, context)
      } catch (error) {
        if (error instanceof functions.https.HttpsError) throw error
        const code = ERROR_CODES[error?.code] || 'internal'
        const safeMessage = code === 'internal'
          ? '알고리즘 채점 서비스에서 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
          : error.message
        console.error('Algorithm Constellation callable failed', {
          code: error?.code || 'INTERNAL',
          message: error?.message,
          uid: context?.auth?.uid || null,
        })
        throw new functions.https.HttpsError(code, safeMessage)
      }
    })
  }

  return {
    startAlgorithmAttempt: callable(handlers.handleStartAlgorithmAttempt),
    recordAlgorithmAssistance: callable(handlers.handleRecordAlgorithmAssistance),
    submitAlgorithmBase: callable(handlers.handleSubmitAlgorithmBase),
    submitUnderstandingEvidence: callable(handlers.handleSubmitUnderstandingEvidence),
    issueTransferChallenge: callable(handlers.handleIssueTransferChallenge),
    submitAlgorithmTransfer: callable(handlers.handleSubmitAlgorithmTransfer),
    getAlgorithmProgress: callable(handlers.handleGetAlgorithmProgress),
  }
}
