/**
 * Production Client Gateway for LUMI Algorithm Constellation
 * STRICT SECURITY INVARIANT:
 * Connects ONLY to Firebase Callable Cloud Functions.
 * Zero automatic mock fallback in production. Fail-closed on network/server errors.
 */

import { getFunctions, httpsCallable } from 'firebase/functions'

export function createAlgorithmConstellationGateway(firebaseApp) {
  const functions = getFunctions(firebaseApp, 'asia-northeast3')

  const callables = {
    startAttemptCallable: httpsCallable(functions, 'startAlgorithmAttempt'),
    recordAssistanceCallable: httpsCallable(functions, 'recordAlgorithmAssistance'),
    submitBaseCallable: httpsCallable(functions, 'submitAlgorithmBase'),
    submitUnderstandingCallable: httpsCallable(functions, 'submitUnderstandingEvidence'),
    issueTransferCallable: httpsCallable(functions, 'issueTransferChallenge'),
    submitTransferCallable: httpsCallable(functions, 'submitAlgorithmTransfer'),
    getProgressCallable: httpsCallable(functions, 'getAlgorithmProgress'),
  }

  return {
    async startAttempt({ problemId, problemVersion = 1, shell = 'explorer', intent = 'learn', requestId }) {
      const response = await callables.startAttemptCallable({ problemId, problemVersion, shell, intent, requestId })
      return response.data
    },

    async recordAssistance({ attemptId, eventId, source, stage, scaffoldLevel = 0, answerExposure = 'none' }) {
      const response = await callables.recordAssistanceCallable({
        attemptId,
        eventId,
        source,
        stage,
        scaffoldLevel,
        answerExposure,
      })
      return response.data
    },

    async submitBase({ attemptId, submissionId, code }) {
      const response = await callables.submitBaseCallable({ attemptId, submissionId, code })
      return response.data
    },

    async submitUnderstanding({ attemptId, challengeId, answers }) {
      const response = await callables.submitUnderstandingCallable({ attemptId, challengeId, answers })
      return response.data
    },

    async issueTransfer({ attemptId }) {
      const response = await callables.issueTransferCallable({ attemptId })
      return response.data
    },

    async submitTransfer({ attemptId, challengeToken, transferCode }) {
      const response = await callables.submitTransferCallable({ attemptId, challengeToken, transferCode })
      return response.data
    },

    async getProgress({ problemId }) {
      const response = await callables.getProgressCallable({ problemId })
      return response.data
    },
  }
}
