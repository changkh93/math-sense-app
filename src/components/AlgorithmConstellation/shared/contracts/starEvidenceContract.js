/**
 * 3-Star Micro-Evidence Contract
 * Defines objective evaluation rules for the 3 Constellation Stars:
 * ★ 항로 발견 (Result Star): Public + Hidden correctness
 * ★★ 신호 이해 (Understanding Star): Objective micro-evidence (Prediction / Truth table / Cause point)
 * ★★★ 항로 검증 (Transfer Star): Fresh transfer variant success
 */

export const MICRO_EVIDENCE_TYPES = [
  'branch_prediction',
  'state_prediction',
  'truth_table_completion',
  'timeline_error_cause_selection',
  'counterexample_selection',
  'strategy_tradeoff_choice',
]

export function validateStarEvidenceContract({ resultEvidence, understandingEvidence, transferEvidence }) {
  const errors = []

  // 1. Result Star Validation
  if (!resultEvidence || typeof resultEvidence !== 'object') {
    errors.push('resultEvidence is required')
  } else {
    if (typeof resultEvidence.publicTestsPassed !== 'boolean') errors.push('resultEvidence.publicTestsPassed must be boolean')
    if (typeof resultEvidence.hiddenTestsPassed !== 'boolean') errors.push('resultEvidence.hiddenTestsPassed must be boolean')
  }

  // 2. Understanding Star Validation
  if (!understandingEvidence || typeof understandingEvidence !== 'object') {
    errors.push('understandingEvidence is required')
  } else {
    if (!MICRO_EVIDENCE_TYPES.includes(understandingEvidence.type)) {
      errors.push(`Invalid understanding evidence type: ${understandingEvidence.type}`)
    }
    if (typeof understandingEvidence.passed !== 'boolean') {
      errors.push('understandingEvidence.passed must be boolean')
    }
  }

  // 3. Transfer Star Validation
  if (!transferEvidence || typeof transferEvidence !== 'object') {
    errors.push('transferEvidence is required')
  } else {
    if (!transferEvidence.transferFamily) errors.push('transferEvidence.transferFamily is required')
    if (typeof transferEvidence.passed !== 'boolean') errors.push('transferEvidence.passed must be boolean')
  }

  return errors
}

export function evaluateConstellationStars({ resultEvidence, understandingEvidence, transferEvidence }) {
  const star1 = Boolean(resultEvidence?.publicTestsPassed && resultEvidence?.hiddenTestsPassed)
  const star2 = Boolean(star1 && understandingEvidence?.passed)
  const star3 = Boolean(star1 && star2 && transferEvidence?.passed)

  let starCount = 0
  if (star1) starCount = 1
  if (star2) starCount = 2
  if (star3) starCount = 3

  return {
    stars: starCount,
    details: {
      star1_result: star1,
      star2_understanding: star2,
      star3_transfer: star3,
    },
  }
}
