/**
 * Problem Kernel Schema v1
 * Defines the canonical metadata, learning objectives, multi-tier shells, modes,
 * runtime budgets, evaluation contracts, and scaffolding policies for Algorithm Constellation.
 */

export const SHELL_TYPES = ['explorer', 'navigator', 'pro']
export const PROBLEM_MODES = ['observe', 'explore', 'arrange', 'complete', 'debug', 'code', 'optimize']

export function validateProblemKernel(kernel) {
  const errors = []
  if (!kernel || typeof kernel !== 'object') {
    return ['Problem kernel must be an object']
  }

  // 1. Identity
  if (!kernel.id || typeof kernel.id !== 'string') {
    errors.push('id is required and must be a string (e.g. AC-COND-001)')
  }
  if (typeof kernel.version !== 'number' || kernel.version < 1) {
    errors.push('version must be a positive number')
  }
  if (!kernel.identity?.studentTitle) {
    errors.push('identity must contain studentTitle')
  }

  // 2. Learning
  const learning = kernel.learning
  if (!learning) {
    errors.push('learning metadata is required')
  } else {
    if (!learning.objective) errors.push('learning.objective is required')
    if (!Array.isArray(learning.thinkingSkills) || learning.thinkingSkills.length === 0) {
      errors.push('learning.thinkingSkills must be a non-empty array')
    }
    if (!Array.isArray(learning.concepts) || learning.concepts.length === 0) {
      errors.push('learning.concepts must be a non-empty array')
    }
  }

  // 3. Shells
  if (!kernel.shells || typeof kernel.shells !== 'object') {
    errors.push('shells must be defined for explorer, navigator, and pro')
  } else {
    for (const shell of SHELL_TYPES) {
      if (!kernel.shells[shell]) {
        errors.push(`shells.${shell} is required`)
      }
    }
  }

  // 4. Modes
  if (!kernel.modes || typeof kernel.modes !== 'object') {
    errors.push('modes must define at least one supported problem mode')
  } else {
    const definedModes = Object.keys(kernel.modes)
    if (definedModes.length === 0) {
      errors.push('at least one mode must be configured')
    }
    for (const mode of definedModes) {
      if (!PROBLEM_MODES.includes(mode)) {
        errors.push(`invalid mode: ${mode}`)
      }
    }
  }

  // 5. Runtime
  const runtime = kernel.runtime
  if (!runtime) {
    errors.push('runtime configuration is required')
  } else {
    if (!runtime.worldModel) errors.push('runtime.worldModel is required')
    if (!runtime.limits || typeof runtime.limits !== 'object') {
      errors.push('runtime.limits is required')
    } else {
      if (typeof runtime.limits.maxExecutionMs !== 'number') errors.push('limits.maxExecutionMs must be a number')
      if (typeof runtime.limits.maxSteps !== 'number') errors.push('limits.maxSteps must be a number')
      if (typeof runtime.limits.maxRawEvents !== 'number') errors.push('limits.maxRawEvents must be a number')
      if (typeof runtime.limits.maxMeaningfulEvents !== 'number') errors.push('limits.maxMeaningfulEvents must be a number')
      if (typeof runtime.limits.maxOutputBytes !== 'number') errors.push('limits.maxOutputBytes must be a number')
    }
    if (!runtime.seedContract?.policy) {
      errors.push('runtime.seedContract.policy is required')
    }
  }

  // 6. Assessment & Stars
  const assessment = kernel.assessment
  if (!assessment) {
    errors.push('assessment configuration is required')
  } else {
    if (!assessment.completionEvidence?.resultStar) errors.push('assessment.completionEvidence.resultStar is required')
    if (!assessment.completionEvidence?.understandingStar) errors.push('assessment.completionEvidence.understandingStar is required')
    if (!assessment.completionEvidence?.transferStar) errors.push('assessment.completionEvidence.transferStar is required')
    if (!Array.isArray(assessment.publicTests)) errors.push('assessment.publicTests must be an array')
    if (!assessment.hiddenTestsRef) errors.push('assessment.hiddenTestsRef is required (reference to server judge)')
    if (!assessment.transferFamily) errors.push('assessment.transferFamily is required')
  }

  // 7. Scaffolding
  if (!kernel.scaffolding) {
    errors.push('scaffolding policy is required')
  }

  return errors
}

export function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  const propNames = Object.getOwnPropertyNames(obj)
  for (const name of propNames) {
    const value = obj[name]
    if (value && typeof value === 'object') {
      deepFreeze(value)
    }
  }
  return Object.freeze(obj)
}

export const validateProblemKernelSchema = validateProblemKernel

