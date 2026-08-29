/**
 * Meaningful Step Projector & Trace 3-Tier Layer
 * Projects Raw Execution Events -> Meaningful Events -> Learning Trace Scenes (12~30 scenes).
 */

export const DEFAULT_LEARNING_SCENE_TARGET = Object.freeze({
  min: 12,
  max: 30,
})

export function getEventType(event) {
  if (!event || typeof event !== 'object') return ''
  return event.eventType || event.type || ''
}

export function isMeaningfulEvent(event) {
  if (!event || typeof event !== 'object') return false
  const type = getEventType(event)

  // Filter internal runtime hooks
  if (type.startsWith('sys_') || type.startsWith('__')) return false

  // Essential cognitive events: variable assignments, condition branches, data structure operations, world actions
  const MEANINGFUL_TYPES = [
    'function-enter',
    'statement-enter',
    'assignment',
    'branch-decision',
    'loop-iteration',
    'container-mutation',
    'function-return',
    'runtime-error',
    'public-test-result',
    'trace-truncated',
    'line',
    'var_change',
    'condition_eval',
    'signal_eval',
    'queue_push',
    'queue_pop',
    'stack_push',
    'stack_pop',
    'set_add',
    'list_append',
    'world_action',
    'switch_toggle',
    'return',
    'error',
  ]

  return MEANINGFUL_TYPES.includes(type) || Boolean(event.isMeaningful)
}

/**
 * Projects raw events into Meaningful Events stream with Run-Length / Loop compression.
 */
export function projectRawToMeaningfulTrace(rawEvents = [], maxEvents = 300) {
  const meaningful = []
  let previousEvent = null
  let repeatCount = 0

  for (const raw of rawEvents) {
    if (!isMeaningfulEvent(raw)) continue
    const type = getEventType(raw)

    // Detect tight repetitive variable loop updates (RLE compression)
    if (
      previousEvent &&
      getEventType(previousEvent) === type &&
      (previousEvent.sourceLine ?? previousEvent.line) === (raw.sourceLine ?? raw.line) &&
      previousEvent.statementId === raw.statementId &&
      ['statement-enter', 'loop-iteration'].includes(type)
    ) {
      repeatCount++
      previousEvent.repeatCount = repeatCount
      previousEvent.latestValue = raw.value ?? raw.latestValue
      continue
    }

    repeatCount = 0
    const cloned = {
      ...raw,
      eventType: type,
      type,
      meaningfulIndex: meaningful.length,
    }
    meaningful.push(cloned)
    previousEvent = cloned

    if (meaningful.length >= maxEvents) {
      meaningful.push({
        eventType: 'trace_truncated',
        type: 'trace_truncated',
        meaningfulIndex: meaningful.length,
        message: '더 많은 단계가 생략되었습니다.',
      })
      break
    }
  }

  return meaningful
}

/**
 * Distills Meaningful Events into 12~30 high-impact Learning Trace Scenes for students.
 */
export function distillToLearningTrace(meaningfulEvents = [], target = DEFAULT_LEARNING_SCENE_TARGET) {
  const total = meaningfulEvents.length
  if (total === 0) return []

  if (total <= target.max) {
    return meaningfulEvents.map((evt, index) => ({
      ...evt,
      eventType: getEventType(evt),
      type: getEventType(evt),
      sceneIndex: index,
      isScene: true,
    }))
  }

  // 1. Identify key decision indices
  const keyIndices = new Set([0, total - 1])

  meaningfulEvents.forEach((evt, idx) => {
    const type = getEventType(evt)
    if (
      type === 'error' ||
      type === 'world_action' ||
      type === 'switch_toggle' ||
      type === 'condition_eval' ||
      type.includes('pop') ||
      type.includes('push') ||
      type.includes('set')
    ) {
      keyIndices.add(idx)
    }
  })

  // 2. If key scenes are fewer than target.min, evenly sample from all events to reach target.min
  const desiredMin = Math.min(target.min, total)
  if (keyIndices.size < desiredMin) {
    const step = (total - 1) / (desiredMin - 1)
    for (let i = 0; i < desiredMin; i++) {
      keyIndices.add(Math.round(i * step))
    }
  }

  // 3. Sort indices
  let sortedIndices = Array.from(keyIndices).sort((a, b) => a - b)

  // 4. If key scenes exceed target.max, downsample evenly while keeping 0, total-1 and error
  if (sortedIndices.length > target.max) {
    const criticalIndices = new Set([0, total - 1])
    sortedIndices.forEach((idx) => {
      if (getEventType(meaningfulEvents[idx]) === 'error') {
        criticalIndices.add(idx)
      }
    })

    const stride = Math.ceil(sortedIndices.length / target.max)
    const sampled = sortedIndices.filter(
      (idx, pos) => pos % stride === 0 || criticalIndices.has(idx)
    )
    sortedIndices = Array.from(new Set(sampled)).sort((a, b) => a - b)
  }

  return sortedIndices.map((idx, sceneIdx) => {
    const evt = meaningfulEvents[idx]
    const type = getEventType(evt)
    return {
      ...evt,
      eventType: type,
      type,
      sceneIndex: sceneIdx,
      sourceStepIndex: evt.runtimeStepIndex ?? evt.stepIndex ?? idx,
      isScene: true,
    }
  })
}
