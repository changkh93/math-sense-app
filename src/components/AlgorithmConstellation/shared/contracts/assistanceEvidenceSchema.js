/**
 * Structured Assistance Evidence Schema & ASI (Autonomy Growth Index) Calculator
 * Separates raw immutable assistance events from calculated autonomy metrics.
 */

export const ASI_METRIC_VERSION = 1
export const MAX_SCAFFOLD_LEVEL = 6

export const ASSISTANCE_SOURCES = [
  'hint',
  'parsons',
  'micro-repair',
  'solution-review',
  'external-ai',
]

export const ASSISTANCE_STAGES = [
  'problem-reading',
  'strategy',
  'implementation',
  'debugging',
]

export const ANSWER_EXPOSURES = ['none', 'partial', 'full', 'unknown']

export function validateAssistanceEvidence(item) {
  const errors = []
  if (!item || typeof item !== 'object') {
    return ['Assistance evidence must be an object']
  }

  if (!ASSISTANCE_SOURCES.includes(item.source)) {
    errors.push(`Invalid assistance source: ${item.source}`)
  }
  if (!ASSISTANCE_STAGES.includes(item.stage)) {
    errors.push(`Invalid assistance stage: ${item.stage}`)
  }
  if (!Number.isInteger(item.scaffoldLevel) || item.scaffoldLevel < 0 || item.scaffoldLevel > MAX_SCAFFOLD_LEVEL) {
    errors.push(`scaffoldLevel must be an integer from 0 to ${MAX_SCAFFOLD_LEVEL}`)
  }
  if (!ANSWER_EXPOSURES.includes(item.answerExposure)) {
    errors.push(`Invalid answer exposure: ${item.answerExposure}`)
  }
  if (!item.usedAt) {
    errors.push('usedAt timestamp is required')
  }

  return errors
}

/**
 * Calculates the Autonomy Growth Index (ASI) from raw assistance evidence and transfer signals.
 * ASI = 100 * (0.25 * best_autonomy + 0.35 * delayed_independence + 0.25 * transfer_independence + 0.15 * recovery_quality)
 * Range: 0 ~ 100
 */
export function calculateASI({
  evidences = [],
  delayedIndependenceSuccess = false,
  transferSuccessRate = 0,
  recoveryQualityRate = 1,
  version = ASI_METRIC_VERSION,
} = {}) {
  // 1. Calculate best autonomy score (0 to 1)
  // ASI v1 reaches minimum autonomy at level 4; stronger levels 5/6 remain clamped to 0.
  let bestScaffoldLevel = 0
  if (evidences.length > 0) {
    const minLevelUsed = Math.min(...evidences.map((e) => e.scaffoldLevel ?? 0))
    bestScaffoldLevel = minLevelUsed
  }
  // If external-ai was copied in this attempt, treat answerExposure as unknown (scaffoldLevel considered at least 3)
  const hasExternalAi = evidences.some((e) => e.source === 'external-ai')
  if (hasExternalAi && bestScaffoldLevel < 3) {
    bestScaffoldLevel = 3
  }

  const bestAutonomyScore = Math.max(0, Math.min(1, 1 - bestScaffoldLevel / 4))
  const delayedIndependenceScore = delayedIndependenceSuccess ? 1.0 : 0.0
  const transferIndependenceScore = Math.max(0, Math.min(1, transferSuccessRate))
  const recoveryQualityScore = Math.max(0, Math.min(1, recoveryQualityRate))

  const rawASI =
    100 *
    (0.25 * bestAutonomyScore +
      0.35 * delayedIndependenceScore +
      0.25 * transferIndependenceScore +
      0.15 * recoveryQualityScore)

  return {
    asi: Math.round(rawASI * 10) / 10,
    asiMetricVersion: version,
    components: {
      bestAutonomyScore,
      delayedIndependenceScore,
      transferIndependenceScore,
      recoveryQualityScore,
    },
  }
}
