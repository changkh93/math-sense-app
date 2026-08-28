/**
 * Variant Seed & PRNG Equivalence Contract
 * Ensures reproducible problem variations per student attempt family and generator version,
 * separating public practice replay seeds from HMAC-derived authoritative evaluation seeds.
 */

export const GENERATOR_VERSION = 1

/**
 * Generates a 32-bit deterministic integer seed for client-side practice and replay.
 */
export function deriveVariantSeed({
  studentKey = 'anonymous',
  problemId,
  attemptFamilyId = 'default',
  generatorVersion = GENERATOR_VERSION,
  salt = 'msense_practice_v1',
}) {
  if (!problemId) throw new Error('problemId is required to derive variant seed')
  const compound = `${salt}:${studentKey}:${problemId}:${attemptFamilyId}:g${generatorVersion}`
  let hash = 0x811c9dc5
  for (let i = 0; i < compound.length; i++) {
    hash ^= compound.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/**
 * Server HMAC seed derivation helper for official Arena / Field tests.
 * Can be run in Node.js / Cloud Functions.
 */
export function deriveAuthoritativeVariantSeed({
  serverSecret,
  studentKey,
  problemId,
  attemptFamilyId = 'official',
  generatorVersion = GENERATOR_VERSION,
}) {
  if (!serverSecret) throw new Error('serverSecret is required for authoritative seed')
  if (!studentKey || !problemId) throw new Error('studentKey and problemId are required')

  const compound = `${studentKey}:${problemId}:${attemptFamilyId}:g${generatorVersion}`
  let h1 = 0xdeadbeef ^ serverSecret.length
  let h2 = 0x41c6ce57 ^ serverSecret.length

  const full = `${serverSecret}:${compound}`
  for (let i = 0; i < full.length; i++) {
    const ch = full.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  return (h1 >>> 0)
}

/**
 * Deterministic pseudo-random number generator (Mulberry32)
 */
export function createDeterministicRNG(seed) {
  let a = seed >>> 0
  return function next() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
