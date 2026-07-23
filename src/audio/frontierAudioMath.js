/**
 * frontierAudioMath.js
 * 프론티어 순수 수학, 보이스 드롭/쿨다운/셔플 계산 및 공용 지형 판정 모듈
 */

/**
 * 쿨다운 체크 헬퍼
 * @param {Map<string, number>} cooldownMap 
 * @param {string} soundId 
 * @param {number} cooldownMs 
 * @param {number} now 
 * @returns {boolean} 재생 가능 여부
 */
export function checkCooldown(cooldownMap, soundId, cooldownMs, now) {
  if (!cooldownMs || cooldownMs <= 0) return true

  if (!cooldownMap.has(soundId)) {
    cooldownMap.set(soundId, now)
    return true
  }

  const lastTime = cooldownMap.get(soundId)
  if (now >= lastTime && now - lastTime < cooldownMs) {
    return false
  }

  cooldownMap.set(soundId, now)
  return true
}

/**
 * Shuffle-No-Repeat 변형 선택
 * @param {Array} variants 
 * @param {number} lastIndex 
 * @returns {{ variant: any, index: number }}
 */
export function selectShuffleVariant(variants, lastIndex = -1, random = Math.random) {
  if (!Array.isArray(variants) || variants.length === 0) {
    return { variant: null, index: -1 }
  }
  if (variants.length === 1) {
    return { variant: variants[0], index: 0 }
  }

  let nextIndex
  do {
    nextIndex = Math.floor(random() * variants.length)
  } while (nextIndex === lastIndex)

  return { variant: variants[nextIndex], index: nextIndex }
}

/**
 * 보이스 초과 시 희생시킬 낮은 우선순위 보이스 탐색
 * @param {Array<{ id: string, priority: number, startTime: number }>} activeVoices 
 * @param {number} newPriority 
 * @returns {string|null} 드롭할 Voice ID (없으면 null)
 */
export function selectVoiceToDrop(activeVoices, newPriority) {
  if (!Array.isArray(activeVoices) || activeVoices.length === 0) {
    return null
  }

  // 우선순위가 더 낮은 보이스 중 가장 오래된 보이스 선정
  let candidate = null

  for (const voice of activeVoices) {
    if (voice.priority < newPriority) {
      if (!candidate || voice.priority < candidate.priority || 
         (voice.priority === candidate.priority && voice.startTime < candidate.startTime)) {
        candidate = voice
      }
    }
  }

  return candidate ? candidate.id : null
}

/**
 * 최종 재생 볼륨 계산
 * @param {number} baseVolume - soundDefinition의 baseVolume
 * @param {number} busVolume - bus의 현재 볼륨 (0.0 ~ 1.0)
 * @param {number} [callVolume=1.0] - 호출 시 넘겨준 볼륨 배율
 * @param {boolean} [isQuietMode=false] - 조용한 모드 여부
 * @param {string} [busName='frontierSfx']
 * @returns {number}
 */
export function calculateInstanceVolume(baseVolume, busVolume, callVolume = 1.0, isQuietMode = false, busName = 'frontierSfx') {
  let quietFactor = 1.0
  if (isQuietMode) {
    if (busName === 'frontierSfx' || busName === 'ui' || busName === 'feedback') {
      quietFactor = 0.4
    } else if (busName === 'frontierAmbience') {
      quietFactor = 0.8
    }
  }

  const vol = baseVolume * busVolume * callVolume * quietFactor
  return Math.max(0, Math.min(1, vol))
}

/**
 * 카메라 Quaternion 기반 직교 forward / up 백터 연산
 * @param {{ x: number, y: number, z: number, w: number }} quat 
 * @returns {{ forward: [number, number, number], up: [number, number, number] }}
 */
export function calculateCameraOrientation(quat) {
  const { x, y, z, w } = quat

  // forward = (0, 0, -1) rotated by quat
  const fx = -2 * (x * z + w * y)
  const fy = -2 * (y * z - w * x)
  const fz = -1 + 2 * (x * x + y * y)

  // up = (0, 1, 0) rotated by quat
  const ux = 2 * (x * y - w * z)
  const uy = 1 - 2 * (x * x + z * z)
  const uz = 2 * (y * z + w * x)

  const fLen = Math.hypot(fx, fy, fz) || 1
  const uLen = Math.hypot(ux, uy, uz) || 1

  const clean = (v) => (Math.abs(v) < 1e-9 ? 0 : v)

  return {
    forward: [clean(fx / fLen), clean(fy / fLen), clean(fz / fLen)],
    up: [clean(ux / uLen), clean(uy / uLen), clean(uz / uLen)],
  }
}

import { getWalkSurface, getRiverAudioPoint } from '../components/GalaxySocial/GalaxyTerrainModel.js'

export { getWalkSurface, getRiverAudioPoint }
