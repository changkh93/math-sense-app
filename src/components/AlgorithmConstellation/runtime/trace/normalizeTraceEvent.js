/**
 * Canonical Trace Event Normalizer
 * Enforces single eventType schema across all layers:
 * { stepIndex, eventType, sourceLine, stateDiff, worldDiff, metadata }
 */

export function normalizeTraceEvent(rawEvent, fallbackStepIndex = 0) {
  if (!rawEvent || typeof rawEvent !== 'object') {
    return {
      stepIndex: fallbackStepIndex,
      runtimeStepIndex: fallbackStepIndex,
      eventType: 'unknown',
      statementId: null,
      sourceSpan: { startLine: null, startColumn: null, endLine: null, endColumn: null },
      sourceLine: null,
      stateDiff: {},
      worldDiff: {},
      metadata: {},
    }
  }

  const eventType = rawEvent.eventType || rawEvent.type || 'unknown'
  const runtimeStepIndex = typeof rawEvent.runtimeStepIndex === 'number'
    ? rawEvent.runtimeStepIndex
    : typeof rawEvent.stepIndex === 'number'
      ? rawEvent.stepIndex
      : fallbackStepIndex
  const stepIndex = runtimeStepIndex
  const sourceSpan = rawEvent.sourceSpan && typeof rawEvent.sourceSpan === 'object'
    ? { ...rawEvent.sourceSpan }
    : {
        startLine: rawEvent.sourceLine ?? rawEvent.line ?? null,
        startColumn: null,
        endLine: rawEvent.sourceLine ?? rawEvent.line ?? null,
        endColumn: null,
      }
  const sourceLine = sourceSpan.startLine

  const stateDiff = Array.isArray(rawEvent.stateDiff)
    ? rawEvent.stateDiff.map((item) => ({ ...item }))
    : rawEvent.stateDiff && typeof rawEvent.stateDiff === 'object'
      ? { ...rawEvent.stateDiff }
      : {}
  const worldDiff = rawEvent.worldDiff && typeof rawEvent.worldDiff === 'object' ? { ...rawEvent.worldDiff } : {}

  // Extract variables or boolean states into stateDiff if provided at top-level
  if (!Array.isArray(stateDiff) && rawEvent.varName && rawEvent.value !== undefined) {
    stateDiff[rawEvent.varName] = rawEvent.value
  }
  if (!Array.isArray(stateDiff) && rawEvent.s1 !== undefined) stateDiff.s1 = rawEvent.s1
  if (!Array.isArray(stateDiff) && rawEvent.s2 !== undefined) stateDiff.s2 = rawEvent.s2

  if (rawEvent.gateOpen !== undefined) worldDiff.gateOpen = rawEvent.gateOpen
  if (rawEvent.action) worldDiff.action = rawEvent.action

  const metadata = rawEvent.metadata && typeof rawEvent.metadata === 'object' ? { ...rawEvent.metadata } : {}
  if (rawEvent.repeatCount) metadata.repeatCount = rawEvent.repeatCount
  if (rawEvent.condition) metadata.condition = rawEvent.condition

  return {
    stepIndex,
    runtimeStepIndex,
    eventType,
    statementId: rawEvent.statementId || null,
    sourceSpan,
    sourceLine,
    frame: rawEvent.frame && typeof rawEvent.frame === 'object' ? { ...rawEvent.frame } : null,
    stateDiff,
    worldDiff,
    metadata,
  }
}
