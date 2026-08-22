/**
 * LUMI Protocol Feature Flags
 * Student beta is open by default so learners can exercise every implemented slice.
 * Set VITE_LUMI_STUDENT_BETA=false for an emergency global kill switch.
 */

import { LUMI_RELEASE_READINESS } from './lumiReleaseReadiness.js'

const env = typeof import.meta !== 'undefined' ? import.meta.env : undefined
export const LUMI_STUDENT_BETA_ENABLED = env?.VITE_LUMI_STUDENT_BETA !== 'false'

// Gate 1: Object Trace learning slice
export const LUMI_OBJECT_SPIKE_ENABLED =
  LUMI_STUDENT_BETA_ENABLED

// Gate 2: Object Learning slice
export const LUMI_OBJECT_LEARNING_PILOT_ENABLED =
  LUMI_STUDENT_BETA_ENABLED && LUMI_RELEASE_READINESS.gate2LearningApproved

// Gate 3: Tactical Simulation slice
export const LUMI_TACTICAL_PILOT_ENABLED =
  LUMI_STUDENT_BETA_ENABLED &&
  LUMI_RELEASE_READINESS.gate2LearningApproved

// Gate 4: Object Core Production Course Candidate (Requires Gate 3 Approval)
export const LUMI_OBJECT_CORE_CANDIDATE_ENABLED =
  LUMI_STUDENT_BETA_ENABLED &&
  LUMI_RELEASE_READINESS.gate3TacticalApproved

// Gate 5: Object Frontier Optional Exploration
export const LUMI_OBJECT_FRONTIER_ENABLED =
  LUMI_STUDENT_BETA_ENABLED &&
  LUMI_RELEASE_READINESS.gate4ObjectCoreApproved

// Gate 6: Lost Light Final (Requires Gate 4 Approval + ACT 2~8 Production Ready + Gate 6 Final Approval)
export const LUMI_LOST_LIGHT_FINAL_ENABLED =
  LUMI_STUDENT_BETA_ENABLED &&
  LUMI_RELEASE_READINESS.gate4ObjectCoreApproved &&
  LUMI_RELEASE_READINESS.act2To8ProductionReady &&
  LUMI_RELEASE_READINESS.gate6FinalApproved
