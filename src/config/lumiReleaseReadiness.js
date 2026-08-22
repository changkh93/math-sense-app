/**
 * LUMI Protocol Release Readiness Manifest
 * Explicit, source-controlled gate approval state.
 * 
 * Rules:
 * 1. Default for all readiness flags is strictly false.
 * 2. Cannot be bypassed via localStorage, query string, or student input.
 * 3. Changing readiness requires human approval based on observed learning/technical evidence.
 */

export const LUMI_RELEASE_READINESS = Object.freeze({
  // 2026-08-22: 운영 중 관찰하며 개선하는 공개 베타로 전환.
  // 긴급 차단은 lumiFeatureFlags.js의 VITE_LUMI_STUDENT_BETA=false를 사용한다.
  gate2LearningApproved: true,
  gate3TacticalApproved: true,
  gate4ObjectCoreApproved: true,
  gate5FrontierApproved: true,
  act2To8ProductionReady: true,
  gate6FinalApproved: true,
})

export function isGateReady(gateName) {
  if (!gateName) return false
  const key = String(gateName).trim()
  return Boolean(LUMI_RELEASE_READINESS[key])
}
