/**
 * Event Replay & Trace Schema v1
 * Defines versioned deterministic replay contracts and trace descriptors
 * for Time-Travel and Replay verification.
 */

import { deepFreeze } from './problemKernelSchema.js'

export const TRACE_SCHEMA_VERSION = 1
export const RUNTIME_VERSION = 'pyodide-0.27.0-lumi-v1'
export const INTERPRETER_VERSION = 'python-3.12.1-lumi'

export function validateReplayDescriptor(descriptor) {
  const errors = []
  if (!descriptor || typeof descriptor !== 'object') {
    return ['Replay descriptor must be an object']
  }

  const requiredFields = [
    'runId',
    'problemId',
    'problemVersion',
    'attemptFamilyId',
    'variantSeed',
    'generatorVersion',
    'codeHash',
    'runtimeVersion',
    'traceSchemaVersion',
    'interpreterVersion',
    'initialWorldStateHash',
  ]

  for (const field of requiredFields) {
    if (descriptor[field] === undefined || descriptor[field] === null || descriptor[field] === '') {
      errors.push(`Missing required replay field: ${field}`)
    }
  }

  if (typeof descriptor.problemVersion !== 'number' || descriptor.problemVersion < 1) {
    errors.push('problemVersion must be a positive integer')
  }
  if (typeof descriptor.generatorVersion !== 'number' || descriptor.generatorVersion < 1) {
    errors.push('generatorVersion must be a positive integer')
  }
  if (descriptor.traceSchemaVersion !== TRACE_SCHEMA_VERSION) {
    errors.push(`traceSchemaVersion mismatch: expected ${TRACE_SCHEMA_VERSION}, got ${descriptor.traceSchemaVersion}`)
  }
  if (descriptor.runtimeVersion !== RUNTIME_VERSION) {
    errors.push(`runtimeVersion mismatch: expected ${RUNTIME_VERSION}, got ${descriptor.runtimeVersion}`)
  }
  if (descriptor.interpreterVersion !== INTERPRETER_VERSION) {
    errors.push(`interpreterVersion mismatch: expected ${INTERPRETER_VERSION}, got ${descriptor.interpreterVersion}`)
  }

  return errors
}

export function createReplayDescriptor(data) {
  const descriptor = {
    ...data,
    traceSchemaVersion: TRACE_SCHEMA_VERSION,
    runtimeVersion: RUNTIME_VERSION,
    interpreterVersion: INTERPRETER_VERSION,
    generatorVersion: typeof data?.generatorVersion === 'number' ? data.generatorVersion : 1,
  }

  const errors = validateReplayDescriptor(descriptor)
  if (errors.length > 0) {
    throw new Error(`Invalid ReplayDescriptor: ${errors.join('; ')}`)
  }

  return deepFreeze(descriptor)
}

export function validateTraceEvent(event) {
  const errors = []
  if (!event || typeof event !== 'object') {
    return ['Trace event must be an object']
  }

  const eventType = event.eventType || event.type
  if (!eventType || typeof eventType !== 'string') errors.push('eventType must be a string')
  if (typeof event.stepIndex !== 'number') errors.push('stepIndex must be a number')
  if (event.stateDiff && typeof event.stateDiff !== 'object') errors.push('stateDiff must be an object when present')

  return errors
}
