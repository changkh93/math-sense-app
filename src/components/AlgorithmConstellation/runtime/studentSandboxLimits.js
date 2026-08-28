/**
 * Student Sandbox Limits & Execution Guard
 * Enforces strict bounded numeric limits and provides execution guard helpers.
 */

export const HARD_LIMIT_BOUNDS = Object.freeze({
  maxExecutionMs: { min: 100, max: 5000, default: 1500 },
  maxSteps: { min: 100, max: 100_000, default: 50_000 },
  maxRawEvents: { min: 10, max: 10_000, default: 3000 },
  maxMeaningfulEvents: { min: 5, max: 1000, default: 300 },
  maxOutputBytes: { min: 256, max: 64 * 1024, default: 16 * 1024 },
  maxMemoryBytes: { min: 1024 * 1024, max: 128 * 1024 * 1024, default: 64 * 1024 * 1024 },
})

export const DEFAULT_SANDBOX_LIMITS = Object.freeze({
  maxExecutionMs: HARD_LIMIT_BOUNDS.maxExecutionMs.default,
  maxSteps: HARD_LIMIT_BOUNDS.maxSteps.default,
  maxRawEvents: HARD_LIMIT_BOUNDS.maxRawEvents.default,
  maxMeaningfulEvents: HARD_LIMIT_BOUNDS.maxMeaningfulEvents.default,
  maxOutputBytes: HARD_LIMIT_BOUNDS.maxOutputBytes.default,
  maxMemoryBytes: HARD_LIMIT_BOUNDS.maxMemoryBytes.default,
})

function sanitizeNumericLimit(key, value) {
  const bounds = HARD_LIMIT_BOUNDS[key]
  if (!bounds) return value

  if (value === undefined || value === null) {
    return bounds.default
  }

  if (typeof value !== 'number' || !Number.isFinite(value) || Number.isNaN(value) || value <= 0) {
    throw new Error(`Invalid sandbox limit for ${key}: ${value}. Must be a positive finite number.`)
  }

  const rounded = Math.floor(value)
  if (rounded < bounds.min) return bounds.min
  if (rounded > bounds.max) return bounds.max
  return rounded
}

export function resolveSandboxLimits(kernelLimits = {}) {
  if (kernelLimits === null || typeof kernelLimits !== 'object') {
    throw new Error('kernelLimits must be an object')
  }

  const resolved = {
    maxExecutionMs: sanitizeNumericLimit('maxExecutionMs', kernelLimits.maxExecutionMs),
    maxSteps: sanitizeNumericLimit('maxSteps', kernelLimits.maxSteps),
    maxRawEvents: sanitizeNumericLimit('maxRawEvents', kernelLimits.maxRawEvents),
    maxMeaningfulEvents: sanitizeNumericLimit('maxMeaningfulEvents', kernelLimits.maxMeaningfulEvents),
    maxOutputBytes: sanitizeNumericLimit('maxOutputBytes', kernelLimits.maxOutputBytes),
    maxMemoryBytes: sanitizeNumericLimit('maxMemoryBytes', kernelLimits.maxMemoryBytes),
  }

  return Object.freeze(resolved)
}

export class SandboxLimitError extends Error {
  constructor(message, limitType) {
    super(message)
    this.name = 'SandboxLimitError'
    this.limitType = limitType
  }
}

export function sanitizeStdout(stdout, maxBytes = DEFAULT_SANDBOX_LIMITS.maxOutputBytes) {
  if (typeof stdout !== 'string') return ''
  const encoder = new TextEncoder()
  const bytes = encoder.encode(stdout)
  if (bytes.length <= maxBytes) return stdout

  const truncatedSlice = bytes.slice(0, maxBytes)
  const decoder = new TextDecoder('utf-8', { fatal: false })
  return `${decoder.decode(truncatedSlice)}\n... [출력이 ${maxBytes} 바이트를 초과하여 일부가 생략되었습니다]`
}

/**
 * Creates an execution budget guard to track steps and output in real time.
 */
export function createExecutionGuard(customLimits = {}) {
  const limits = resolveSandboxLimits(customLimits)
  let stepCount = 0
  let rawEventCount = 0
  let outputByteCount = 0
  let terminated = false

  return {
    limits,
    incrementStep(n = 1) {
      if (terminated) throw new SandboxLimitError('Execution already terminated', 'TERMINATED')
      stepCount += n
      if (stepCount > limits.maxSteps) {
        terminated = true
        throw new SandboxLimitError(`최대 연산 단계(${limits.maxSteps} steps)를 초과했습니다. 무한 루프 여부를 확인하세요.`, 'MAX_STEPS')
      }
      return stepCount
    },
    trackEvent() {
      rawEventCount++
      if (rawEventCount > limits.maxRawEvents) {
        terminated = true
        throw new SandboxLimitError(`최대 트레이스 이벤트 상한(${limits.maxRawEvents})을 초과했습니다.`, 'MAX_EVENTS')
      }
      return rawEventCount
    },
    trackOutput(text) {
      if (typeof text === 'string') {
        outputByteCount += new TextEncoder().encode(text).length
        if (outputByteCount > limits.maxOutputBytes) {
          terminated = true
          throw new SandboxLimitError(`출력 크기 제한(${limits.maxOutputBytes} bytes)을 초과했습니다.`, 'MAX_OUTPUT')
        }
      }
      return outputByteCount
    },
    isTerminated() {
      return terminated
    },
  }
}
