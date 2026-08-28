/**
 * Deterministic Trace and Replay Hasher
 */

export function fnv1aHash(str) {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function computeTraceHash(canonicalEvents = []) {
  const serialized = canonicalEvents
    .map((e) => `${e.stepIndex}:${e.eventType}:${e.sourceLine}:${JSON.stringify(e.stateDiff)}:${JSON.stringify(e.worldDiff)}`)
    .join('|')
  return fnv1aHash(serialized)
}

export function computeReplayDescriptorHash(descriptor = {}) {
  const keys = Object.keys(descriptor).sort()
  const serialized = keys.map((k) => `${k}=${descriptor[k]}`).join('&')
  return fnv1aHash(serialized)
}
