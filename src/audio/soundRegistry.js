/**
 * soundRegistry.js
 * 아스트라 프론티어 및 앱 전역 사운드 의미 기반 카탈로그 (Sound Registry)
 */

/**
 * 기존 메타센스 UI 사운드 카탈로그 (공통 스키마 정규화)
 */
export const LEGACY_SOUND_DEFS = {
  correct: {
    sources: ['/sounds/correct.wav', '/sounds/correct.mp3'],
    scope: 'global',
    bus: 'feedback',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.2,
    priority: 100,
  },
  wrong: {
    sources: ['/metasense-promo/remote-sfx/error-buzz.wav', '/sounds/wrong.mp3'],
    scope: 'global',
    bus: 'feedback',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.2,
    priority: 100,
  },
  click: {
    sources: ['/sounds/click.wav', '/sounds/click.mp3'],
    scope: 'global',
    bus: 'ui',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.1,
    priority: 50,
  },
  levelUp: {
    sources: ['/sounds/levelup.wav', '/sounds/levelup.mp3'],
    scope: 'global',
    bus: 'feedback',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.2,
    priority: 100,
  },
  crystal: {
    sources: ['/sounds/crystal.mp3', '/sounds/crystal.wav'],
    scope: 'global',
    bus: 'feedback',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.08,
    priority: 70,
  },
  whoosh: {
    sources: ['/sounds/whoosh.wav', '/sounds/whoosh.mp3'],
    scope: 'global',
    bus: 'ui',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.06,
    priority: 60,
  },
  warp: {
    sources: ['/sounds/space_warp.wav'],
    scope: 'global',
    bus: 'ui',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.1,
    priority: 90,
  },
}

/**
 * 프론티어 사운드 카탈로그 (Semantic Sound Registry)
 */
export const FRONTIER_AUDIO_ASSETS_READY = import.meta.env?.VITE_FRONTIER_AUDIO_ASSETS_READY === 'true'

const createThemeAmbienceDefinition = (theme) => ({
  sources: [
    `/sounds/frontier/v1/ambience/themes/${theme}-bed.webm`,
    `/sounds/frontier/v1/ambience/themes/${theme}-bed.mp3`,
  ],
  scope: 'frontier',
  bus: 'frontierAmbience',
  kind: 'loop',
  spatial: false,
  baseVolume: 0.62,
  priority: 30,
  maxInstances: 1,
})

export const FRONTIER_SOUNDS = {
  // --- 테마 및 구역 루프 (Ambience Loops) ---
  'frontier.music.background': {
    sources: [
      '/sounds/frontier/v1/sound/background-loop.mp3',
      '/sounds/frontier/v1/ambience/music/background-loop.mp3',
    ],
    scope: 'frontier',
    bus: 'frontierMusic',
    kind: 'loop',
    spatial: false,
    baseVolume: 0.62,
    priority: 20,
    maxInstances: 1,
  },
  'frontier.ambience.river': {
    sources: [
      '/sounds/frontier/v1/sound/water-stream.mp3',
      '/sounds/frontier/v1/ambience/river/river-loop.mp3',
    ],
    scope: 'frontier',
    bus: 'frontierAmbience',
    kind: 'loop',
    spatial: true,
    baseVolume: 0.44,
    priority: 40,
    maxInstances: 1,
    panner: {
      distanceModel: 'linear',
      refDistance: 2.5,
      maxDistance: 18,
      rolloffFactor: 1,
      panningModel: 'HRTF',
    },
  },
  'frontier.ambience.forest': {
    sources: [
      '/sounds/frontier/v1/sound/forest.mp3',
      '/sounds/frontier/v1/ambience/themes/forest-bed.mp3',
    ],
    scope: 'frontier',
    bus: 'frontierAmbience',
    kind: 'loop',
    spatial: true,
    baseVolume: 0.45,
    priority: 35,
    maxInstances: 2,
    panner: {
      distanceModel: 'linear',
      refDistance: 1.2,
      maxDistance: 5.0,
      rolloffFactor: 1.2,
      panningModel: 'HRTF',
    },
  },
  'frontier.ambience.ocean': createThemeAmbienceDefinition('ocean'),
  'frontier.ambience.crystal': createThemeAmbienceDefinition('crystal'),
  'frontier.ambience.desert': createThemeAmbienceDefinition('desert'),
  'frontier.ambience.mechanical': createThemeAmbienceDefinition('mechanical'),
  'frontier.ambience.ice': createThemeAmbienceDefinition('ice'),
  'frontier.ambience.landing': {
    sources: [
      '/sounds/frontier/v1/sound/base-hum.mp3',
      '/sounds/frontier/v1/ambience/landing/landing-hum.mp3',
    ],
    scope: 'frontier',
    bus: 'frontierAmbience',
    kind: 'loop',
    spatial: true,
    baseVolume: 0.13,
    priority: 35,
    maxInstances: 1,
    panner: {
      distanceModel: 'linear',
      refDistance: 2.0,
      maxDistance: 8.0,
      rolloffFactor: 1,
      panningModel: 'HRTF',
    },
  },

  // --- 발걸음 (Footsteps) ---
  'frontier.footstep.path': {
    variants: [
      ['/sounds/frontier/v1/footsteps/path-01.webm', '/sounds/frontier/v1/footsteps/path-01.mp3'],
      ['/sounds/frontier/v1/footsteps/path-02.webm', '/sounds/frontier/v1/footsteps/path-02.mp3'],
      ['/sounds/frontier/v1/footsteps/path-03.webm', '/sounds/frontier/v1/footsteps/path-03.mp3'],
    ],
    scope: 'frontier',
    bus: 'frontierSfx',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.23,
    cooldownMs: 90,
    maxInstances: 2,
    priority: 90,
    rateRange: [0.97, 1.03],
    selection: 'shuffle-no-repeat',
  },
  'frontier.footstep.bridgeWood': {
    variants: [
      ['/sounds/frontier/v1/footsteps/bridge-wood-01.webm', '/sounds/frontier/v1/footsteps/bridge-wood-01.mp3'],
      ['/sounds/frontier/v1/footsteps/bridge-wood-02.webm', '/sounds/frontier/v1/footsteps/bridge-wood-02.mp3'],
      ['/sounds/frontier/v1/footsteps/bridge-wood-03.webm', '/sounds/frontier/v1/footsteps/bridge-wood-03.mp3'],
    ],
    scope: 'frontier',
    bus: 'frontierSfx',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.24,
    cooldownMs: 90,
    maxInstances: 2,
    priority: 90,
    rateRange: [0.96, 1.04],
    selection: 'shuffle-no-repeat',
  },
  'frontier.footstep.landingMetal': {
    variants: [
      ['/sounds/frontier/v1/footsteps/metal-01.webm', '/sounds/frontier/v1/footsteps/metal-01.mp3'],
      ['/sounds/frontier/v1/footsteps/metal-02.webm', '/sounds/frontier/v1/footsteps/metal-02.mp3'],
      ['/sounds/frontier/v1/footsteps/metal-03.webm', '/sounds/frontier/v1/footsteps/metal-03.mp3'],
    ],
    scope: 'frontier',
    bus: 'frontierSfx',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.22,
    cooldownMs: 90,
    maxInstances: 2,
    priority: 90,
    rateRange: [0.97, 1.03],
    selection: 'shuffle-no-repeat',
  },
  'frontier.footstep.terrain.forest': {
    variants: [
      ['/sounds/frontier/v1/footsteps/forest-01.webm', '/sounds/frontier/v1/footsteps/forest-01.mp3'],
      ['/sounds/frontier/v1/footsteps/forest-02.webm', '/sounds/frontier/v1/footsteps/forest-02.mp3'],
      ['/sounds/frontier/v1/footsteps/forest-03.webm', '/sounds/frontier/v1/footsteps/forest-03.mp3'],
    ],
    scope: 'frontier',
    bus: 'frontierSfx',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.23,
    cooldownMs: 90,
    maxInstances: 2,
    priority: 90,
    rateRange: [0.97, 1.03],
    selection: 'shuffle-no-repeat',
  },

  // --- 충돌 (Collisions) ---
  'frontier.collision.soft': {
    sources: [
      '/sounds/frontier/v1/collisions/soft-01.webm',
      '/sounds/frontier/v1/collisions/soft-01.mp3',
    ],
    scope: 'frontier',
    bus: 'frontierSfx',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.2,
    cooldownMs: 500,
    maxInstances: 1,
    priority: 80,
  },
  'frontier.collision.metal': {
    sources: [
      '/sounds/frontier/v1/collisions/metal-01.webm',
      '/sounds/frontier/v1/collisions/metal-01.mp3',
    ],
    scope: 'frontier',
    bus: 'frontierSfx',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.22,
    cooldownMs: 500,
    maxInstances: 1,
    priority: 80,
  },
  'frontier.collision.wood': {
    sources: [
      '/sounds/frontier/v1/collisions/wood-01.webm',
      '/sounds/frontier/v1/collisions/wood-01.mp3',
    ],
    scope: 'frontier',
    bus: 'frontierSfx',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.22,
    cooldownMs: 500,
    maxInstances: 1,
    priority: 80,
  },
  'frontier.collision.stone': {
    sources: [
      '/sounds/frontier/v1/collisions/stone-01.webm',
      '/sounds/frontier/v1/collisions/stone-01.mp3',
    ],
    scope: 'frontier',
    bus: 'frontierSfx',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.22,
    cooldownMs: 500,
    maxInstances: 1,
    priority: 80,
  },
  'frontier.build.invalid': {
    sources: [
      '/sounds/frontier/v1/ui/build-invalid.webm',
      '/sounds/frontier/v1/ui/build-invalid.mp3',
    ],
    scope: 'frontier',
    bus: 'ui',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.35,
    cooldownMs: 500,
    maxInstances: 1,
    priority: 85,
    fallbackId: 'wrong',
    fallbackVolumeMultiplier: 2,
  },
  'frontier.interaction.water': {
    sources: [
      '/sounds/frontier/v1/interactions/water.webm',
      '/sounds/frontier/v1/interactions/water.mp3',
    ],
    scope: 'frontier',
    bus: 'frontierSfx',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.34,
    cooldownMs: 350,
    maxInstances: 1,
    priority: 75,
    fallbackId: 'click',
    fallbackVolumeMultiplier: 2.5,
  },
  'frontier.interaction.repair': {
    sources: [
      '/sounds/frontier/v1/interactions/repair.webm',
      '/sounds/frontier/v1/interactions/repair.mp3',
    ],
    scope: 'frontier',
    bus: 'frontierSfx',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.38,
    cooldownMs: 350,
    maxInstances: 1,
    priority: 80,
    fallbackId: 'click',
    fallbackVolumeMultiplier: 2.5,
  },
  'frontier.ui.interact': {
    sources: [
      '/sounds/frontier/v1/ui/interact.webm',
      '/sounds/frontier/v1/ui/interact.mp3',
    ],
    scope: 'frontier',
    bus: 'ui',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.38,
    cooldownMs: 90,
    maxInstances: 1,
    priority: 65,
    fallbackId: 'click',
    fallbackVolumeMultiplier: 2.5,
  },
  'frontier.ui.inspect': {
    sources: [
      '/sounds/frontier/v1/ui/inspect.webm',
      '/sounds/frontier/v1/ui/inspect.mp3',
    ],
    scope: 'frontier',
    bus: 'ui',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.36,
    cooldownMs: 90,
    maxInstances: 1,
    priority: 65,
    fallbackId: 'click',
    fallbackVolumeMultiplier: 2.5,
  },
  'frontier.daily.complete': {
    sources: [
      '/sounds/frontier/v1/interactions/daily-complete.webm',
      '/sounds/frontier/v1/interactions/daily-complete.mp3',
    ],
    scope: 'frontier',
    bus: 'frontierSfx',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.46,
    cooldownMs: 1200,
    maxInstances: 1,
    priority: 95,
    fallbackId: 'correct',
    fallbackVolumeMultiplier: 2,
  },
  'frontier.rover.complete': {
    sources: [
      '/sounds/frontier/v1/interactions/rover-complete.webm',
      '/sounds/frontier/v1/interactions/rover-complete.mp3',
    ],
    scope: 'frontier',
    bus: 'frontierSfx',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.5,
    cooldownMs: 1500,
    maxInstances: 1,
    priority: 100,
    fallbackId: 'levelUp',
    fallbackVolumeMultiplier: 2.2,
  },
  'frontier.mission.warning': {
    sources: [
      '/sounds/frontier/v1/ui/mission-warning.webm',
      '/sounds/frontier/v1/ui/mission-warning.mp3',
    ],
    scope: 'frontier',
    bus: 'ui',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.24,
    cooldownMs: 5000,
    maxInstances: 1,
    priority: 90,
    fallbackId: 'click',
    fallbackVolumeMultiplier: 2.5,
  },

  // --- 상호작용 및 피드백 (Interactions & Events) ---
  'frontier.pickup.collect': {
    sources: [
      '/sounds/frontier/v1/interactions/pickup.webm',
      '/sounds/frontier/v1/interactions/pickup.mp3',
    ],
    scope: 'frontier',
    bus: 'frontierSfx',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.42,
    cooldownMs: 80,
    maxInstances: 4,
    priority: 95,
    fallbackId: 'crystal',
    fallbackVolumeMultiplier: 3,
  },
  'frontier.mission.complete': {
    sources: [
      '/sounds/frontier/v1/missions/mission-complete.webm',
      '/sounds/frontier/v1/missions/mission-complete.mp3',
    ],
    scope: 'frontier',
    bus: 'frontierSfx',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.52,
    cooldownMs: 1500,
    maxInstances: 1,
    priority: 100,
    fallbackId: 'levelUp',
    fallbackVolumeMultiplier: 2.2,
  },
  'frontier.build.complete': {
    sources: [
      '/sounds/frontier/v1/interactions/build-complete.webm',
      '/sounds/frontier/v1/interactions/build-complete.mp3',
    ],
    scope: 'frontier',
    bus: 'frontierSfx',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.48,
    cooldownMs: 1000,
    maxInstances: 1,
    priority: 95,
    fallbackId: 'correct',
    fallbackVolumeMultiplier: 2,
  },
  'frontier.connection.softError': {
    sources: [
      '/sounds/frontier/v1/ui/soft-error.webm',
      '/sounds/frontier/v1/ui/soft-error.mp3',
    ],
    scope: 'frontier',
    bus: 'ui',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.3,
    cooldownMs: 1000,
    maxInstances: 1,
    priority: 85,
    fallbackId: 'wrong',
    fallbackVolumeMultiplier: 2,
  },
}

/**
 * 아직 전용 테마 발걸음이 없는 경우 공용 자연 지형음을 사용한다.
 * 자산이 추가되면 registry ID만 추가하면 호출부 수정 없이 자동 전환된다.
 */
export function getFrontierFootstepSoundId(surface) {
  const candidate = `frontier.footstep.${surface}`
  return FRONTIER_SOUNDS[candidate]
    ? candidate
    : 'frontier.footstep.terrain.forest'
}

/**
 * 테마 전용 ambience가 준비되면 자동 선택하고, 그 전에는 중립 자연음을 사용한다.
 */
export function getFrontierAmbienceSoundId(theme) {
  const candidate = `frontier.ambience.${theme}`
  return FRONTIER_SOUNDS[candidate]
    ? candidate
    : 'frontier.ambience.forest'
}

/**
 * 카탈로그 키 유효성 검사 헬퍼
 * @param {string} soundId 
 * @returns {boolean}
 */
export function isValidSoundId(soundId) {
  return Boolean(LEGACY_SOUND_DEFS[soundId] || FRONTIER_SOUNDS[soundId])
}

/**
 * 카탈로그 정의 조회 헬퍼
 * @param {string} soundId 
 * @returns {Object|null}
 */
export function getSoundDefinition(soundId) {
  return FRONTIER_SOUNDS[soundId] || LEGACY_SOUND_DEFS[soundId] || null
}
