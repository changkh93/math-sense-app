/**
 * Algorithm Progress & Attempt Service
 * Manages mutable progress summaries, immutable attempt logs,
 * adaptive delayed returns, and idempotent rewards.
 */

import { calculateASI } from '../../shared/contracts/assistanceEvidenceSchema.js'
import { deepFreeze } from '../../shared/contracts/problemKernelSchema.js'

export function computeAdaptiveDelayedReturnHours({
  highestScaffoldUsed = 0,
  hasExternalAiAssist = false,
  transferPassed = true,
}) {
  if (hasExternalAiAssist) return 24 // External AI assist requires 24h+ delayed return
  if (!transferPassed) return 24    // Transfer failed -> retry tomorrow
  if (highestScaffoldUsed >= 2) return 48 // Scaffold/Parsons used -> 48h
  if (highestScaffoldUsed === 1) return 24 // Minor hint used -> 24h
  return 0 // Independent direct mastery -> no mandatory quick return
}

export function createAttemptRecord({
  attemptId,
  userId,
  problemId,
  problemVersion = 1,
  mode = 'code',
  variantSeed,
  codeHash,
  assistanceEvidences = [],
  externalAiPromptCopied = false,
  evaluationResult = {},
  timestamp = Date.now(),
}) {
  const clonedEvidences = JSON.parse(JSON.stringify(assistanceEvidences || []))
  const clonedStarDetails = JSON.parse(JSON.stringify(evaluationResult.starDetails || {}))
  const clonedGroupSummaries = JSON.parse(JSON.stringify(evaluationResult.testGroupSummaries || []))

  const record = {
    attemptId,
    userId,
    problemId,
    problemVersion,
    mode,
    variantSeed,
    codeHash,
    assistanceEvidences: clonedEvidences,
    externalAiPromptCopied: Boolean(externalAiPromptCopied),
    stars: evaluationResult.stars || 0,
    starDetails: clonedStarDetails,
    testGroupSummaries: clonedGroupSummaries,
    rankEligible: !externalAiPromptCopied,
    timestamp,
  }

  return deepFreeze(record)
}

export function updateProgressSummary({
  currentProgress = {},
  attemptRecord,
}) {
  const previousBestStars = currentProgress.bestStars || 0
  const isAiAttempt = Boolean(attemptRecord.externalAiPromptCopied)

  // Star count is recorded, but mastery status depends on whether AI assistance was used
  const newStars = Math.max(previousBestStars, attemptRecord.stars)

  const highestScaffold = (attemptRecord.assistanceEvidences || []).reduce(
    (max, e) => Math.max(max, e.scaffoldLevel ?? 0),
    0
  )

  const delayedHours = computeAdaptiveDelayedReturnHours({
    highestScaffoldUsed: highestScaffold,
    hasExternalAiAssist: isAiAttempt,
    transferPassed: attemptRecord.starDetails?.star3_transfer ?? false,
  })

  const nextReturnAt = delayedHours > 0 ? attemptRecord.timestamp + delayedHours * 3600 * 1000 : null

  // Mastery status policy:
  // If AI prompt was copied, mastery is deferred (pending_independent_return) even with 3 stars!
  let masteryStatus = currentProgress.masteryStatus || 'unstarted'
  if (isAiAttempt) {
    masteryStatus = 'pending_independent_return'
  } else if (newStars === 3 && highestScaffold <= 1) {
    masteryStatus = 'mastered'
  } else if (newStars > 0) {
    masteryStatus = 'in_progress'
  }

  // Derive ASI
  const asiResult = calculateASI({
    evidences: attemptRecord.assistanceEvidences,
    delayedIndependenceSuccess: currentProgress.independentReturnCompleted ?? false,
    transferSuccessRate: attemptRecord.starDetails?.star3_transfer ? 1.0 : 0.0,
    recoveryQualityRate: attemptRecord.stars >= 2 ? 1.0 : 0.5,
  })

  const updated = {
    problemId: attemptRecord.problemId,
    bestStars: newStars,
    starDetails: {
      star1_result: Boolean(currentProgress.starDetails?.star1_result || attemptRecord.starDetails?.star1_result),
      star2_understanding: Boolean(currentProgress.starDetails?.star2_understanding || attemptRecord.starDetails?.star2_understanding),
      star3_transfer: Boolean(currentProgress.starDetails?.star3_transfer || attemptRecord.starDetails?.star3_transfer),
    },
    masteryStatus,
    currentASI: asiResult.asi,
    asiMetricVersion: asiResult.asiMetricVersion,
    nextReturnAt,
    lastAttemptAt: attemptRecord.timestamp,
    attemptCount: (currentProgress.attemptCount || 0) + 1,
  }

  return deepFreeze(updated)
}

export function generateRewardIdempotencyKey({
  userId,
  problemId,
  rewardType = 'exploration',
  cycle = 1,
}) {
  return `reward:${userId}:${problemId}:${rewardType}:c${cycle}`
}
