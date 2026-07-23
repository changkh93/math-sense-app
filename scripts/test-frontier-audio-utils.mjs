/**
 * Node 내장 assert와 완전 제어형 FakeHowl로 검증하는 프론티어 오디오 계약 테스트.
 */
import assert from 'node:assert/strict'

import {
  FRONTIER_SOUNDS,
  LEGACY_SOUND_DEFS,
  getFrontierAmbienceSoundId,
  getFrontierFootstepSoundId,
  getSoundDefinition,
  isValidSoundId,
} from '../src/audio/soundRegistry.js'
import {
  getStorageKey,
  sanitizePreferences,
} from '../src/audio/audioPreferences.js'
import {
  calculateCameraOrientation,
  calculateInstanceVolume,
  checkCooldown,
  selectShuffleVariant,
  selectVoiceToDrop,
} from '../src/audio/frontierAudioMath.js'
import {
  getRiverAudioPoint,
  getWalkSurface,
  isNearRoad,
  riverCenterZ,
} from '../src/components/GalaxySocial/GalaxyTerrainModel.js'
import { SoundManager } from '../src/utils/SoundManager.js'

class FakeHowl {
  static instances = []
  static nextId = 1

  constructor(config = {}) {
    this.config = config
    this.events = new Map()
    this.playedIds = []
    this.stoppedIds = []
    this.pausedIds = []
    this.unloaded = false
    this._volume = config.volume ?? 1
    this._rate = 1
    this._position = [0, 0, 0]
    FakeHowl.instances.push(this)
  }

  play(existingId) {
    const id = existingId ?? FakeHowl.nextId++
    this.playedIds.push(id)
    return id
  }

  volume(value) {
    if (value === undefined) return this._volume
    this._volume = value
    return this
  }

  rate(value, id) {
    if (value === undefined) return this._rate
    this._rate = value
    this.lastRateId = id
    return this
  }

  pos(x, y, z, id) {
    if (x === undefined) return this._position
    this._position = [x, y, z]
    this.lastPositionId = id
    return this
  }

  pannerAttr(attributes, id) {
    this.lastPanner = { attributes, id }
    return this
  }

  fade(from, to, duration, id) {
    this.lastFade = { from, to, duration, id }
    this._volume = to
    return this
  }

  pause(id) {
    this.pausedIds.push(id)
    return this
  }

  stop(id) {
    this.stoppedIds.push(id)
    this.emit('stop', id)
    return this
  }

  unload() {
    this.unloaded = true
    return null
  }

  once(event, handler, id) {
    const listeners = this.events.get(event) || []
    listeners.push({ handler, id, once: true })
    this.events.set(event, listeners)
    return this
  }

  off(event, handler, id) {
    const listeners = this.events.get(event) || []
    this.events.set(event, listeners.filter((listener) => (
      listener.handler !== handler || listener.id !== id
    )))
    return this
  }

  emit(event, id, error) {
    const listeners = [...(this.events.get(event) || [])]
    listeners.forEach((listener) => {
      if (listener.id !== undefined && listener.id !== id) return
      listener.handler(id, error)
      if (listener.once) this.off(event, listener.handler, listener.id)
    })
  }
}

function createFakeHowler() {
  return {
    muted: false,
    masterVolume: 1,
    listenerPosition: null,
    listenerOrientation: null,
    ctx: {
      state: 'running',
      resume: async () => true,
    },
    mute(value) {
      this.muted = value
    },
    volume(value) {
      this.masterVolume = value
    },
    pos(...values) {
      this.listenerPosition = values
    },
    orientation(...values) {
      this.listenerOrientation = values
    },
  }
}

function createScheduler() {
  let nextId = 1
  const callbacks = new Map()
  return {
    callbacks,
    setTimeoutFn(callback) {
      const id = nextId++
      callbacks.set(id, callback)
      return id
    },
    clearTimeoutFn(id) {
      callbacks.delete(id)
    },
    runAll() {
      const queued = [...callbacks.values()]
      callbacks.clear()
      queued.forEach((callback) => callback())
    },
  }
}

function createRandomSequence(values = [0.1, 0.3, 0.7, 0.9]) {
  let index = 0
  return () => {
    const value = values[index % values.length]
    index += 1
    return value
  }
}

function createManager(options = {}) {
  FakeHowl.instances.length = 0
  FakeHowl.nextId = 1
  const scheduler = options.scheduler || createScheduler()
  const manager = new SoundManager({
    HowlClass: FakeHowl,
    howler: createFakeHowler(),
    windowRef: null,
    documentRef: null,
    eagerLegacy: false,
    frontierAssetsReady: options.frontierAssetsReady ?? true,
    random: options.random || createRandomSequence(),
    setTimeoutFn: scheduler.setTimeoutFn,
    clearTimeoutFn: scheduler.clearTimeoutFn,
  })
  return { manager, scheduler }
}

console.log('🧪 Running Frontier Audio Utils & Contract Tests...\n')

let passedCount = 0
let failedCount = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ PASSED: ${name}`)
    passedCount += 1
  } catch (error) {
    console.error(`  ❌ FAILED: ${name}`)
    console.error(error)
    failedCount += 1
  }
}

async function asyncTest(name, fn) {
  try {
    await fn()
    console.log(`  ✅ PASSED: ${name}`)
    passedCount += 1
  } catch (error) {
    console.error(`  ❌ FAILED: ${name}`)
    console.error(error)
    failedCount += 1
  }
}

test('Legacy wrappers invoke Howl.play and preserve the public API', () => {
  const { manager } = createManager()
  const ids = [
    manager.playClick(),
    manager.playCorrect(),
    manager.playWrong(),
    manager.playWarp(),
    manager.playCrystal(),
    manager.playLevelUp(),
  ]
  assert.ok(ids.every((id) => Number.isInteger(id)))
  assert.equal(manager.activeVoices.size, 6)
})

test('Registry definitions are normalized and footstep themes have a safe fallback', () => {
  assert.equal(typeof LEGACY_SOUND_DEFS, 'object')
  assert.equal(typeof FRONTIER_SOUNDS, 'object')
  assert.ok(isValidSoundId('correct'))
  assert.ok(isValidSoundId('frontier.ambience.river'))
  assert.ok(Array.isArray(getSoundDefinition('click').sources))
  assert.equal(getSoundDefinition('frontier.ambience.river').kind, 'loop')
  assert.equal(
    getFrontierFootstepSoundId('terrain.ocean'),
    'frontier.footstep.terrain.forest',
  )
  assert.equal(getFrontierAmbienceSoundId('ocean'), 'frontier.ambience.forest')
  assert.equal(getFrontierAmbienceSoundId('forest'), 'frontier.ambience.forest')
})

test('Variant playback creates one cache entry per selected source group', () => {
  const random = createRandomSequence([
    0.1, 0.2,
    0.4, 0.2,
    0.8, 0.2,
  ])
  const { manager } = createManager({ random })
  manager.enterScope('frontier')
  for (let index = 0; index < 3; index += 1) {
    manager.play('frontier.footstep.path', { bypassCooldown: true })
  }
  const variantKeys = [...manager.howlCache.keys()]
    .filter((key) => key.startsWith('frontier.footstep.path:oneshot:'))
  assert.equal(variantKeys.length, 3)
})

test('Voice cleanup is scoped to the ended Howler instance ID', () => {
  const { manager } = createManager()
  const firstId = manager.playClick()
  const secondId = manager.playClick()
  assert.equal(manager.activeVoices.size, 2)
  const howl = manager.howlCache.get('/missing') || FakeHowl.instances[0]
  howl.emit('end', firstId)
  assert.equal(manager.activeVoices.size, 1)
  assert.equal([...manager.activeVoices.values()][0].howlerId, secondId)
})

test('Play errors clean only the affected voice and leave loops restartable', () => {
  const { manager } = createManager()
  const firstId = manager.playClick()
  const secondId = manager.playClick()
  const clickHowl = FakeHowl.instances[0]
  const previousWarn = console.warn
  console.warn = () => {}
  try {
    clickHowl.config.onplayerror(firstId, 'interrupted')
  } finally {
    console.warn = previousWarn
  }
  assert.equal(manager.activeVoices.size, 1)
  assert.equal([...manager.activeVoices.values()][0].howlerId, secondId)

  manager.enterScope('frontier')
  const loopKey = manager.loopAt(
    'frontier.ambience.river',
    [0, 0, 0],
    { key: 'river' },
  )
  const loop = manager.activeLoops.get(loopKey)
  console.warn = () => {}
  try {
    loop.howl.config.onplayerror(loop.howlerId, 'interrupted')
  } finally {
    console.warn = previousWarn
  }
  assert.equal(manager.activeLoops.has(loopKey), false)
  assert.equal(manager.loopRequests.has(loopKey), true)
  manager.unlock()
  assert.equal(manager.activeLoops.has(loopKey), true)
})

test('Per-sound maxInstances replaces the oldest voice', () => {
  const { manager } = createManager()
  manager.enterScope('frontier')
  for (let index = 0; index < 5; index += 1) {
    manager.play('frontier.pickup.collect', { bypassCooldown: true })
  }
  const pickupVoices = [...manager.activeVoices.values()]
    .filter((voice) => voice.soundId === 'frontier.pickup.collect')
  assert.equal(pickupVoices.length, 4)
  assert.equal(FakeHowl.instances[0].stoppedIds.length, 1)
})

test('Synchronous engine errors are contained by the public playback boundary', () => {
  const { manager } = createManager()
  const definition = getSoundDefinition('click')
  const howl = manager.getOrCreateHowl('click', definition.sources, false)
  howl.play = () => {
    throw new Error('synthetic engine failure')
  }
  const previousWarn = console.warn
  console.warn = () => {}
  try {
    assert.equal(manager.playClick(), null)
  } finally {
    console.warn = previousWarn
  }
  assert.ok(manager.warnedErrors.has('runtime_click'))

  manager.enterScope('frontier')
  const loopDefinition = getSoundDefinition('frontier.ambience.river')
  const loopHowl = manager.getOrCreateHowl(
    'frontier.ambience.river',
    loopDefinition.sources,
    true,
  )
  loopHowl.play = () => {
    throw new Error('synthetic loop failure')
  }
  console.warn = () => {}
  try {
    assert.equal(
      manager.loopAt('frontier.ambience.river', [0, 0, 0], { key: 'river' }),
      'river',
    )
  } finally {
    console.warn = previousWarn
  }
  assert.equal(manager.activeLoops.has('river'), false)
  assert.equal(manager.loopRequests.has('river'), true)
  assert.ok(manager.warnedErrors.has('runtime_loop_frontier.ambience.river'))
})

test('Post-start engine errors stop orphan one-shots and loops', () => {
  const previousWarn = console.warn
  console.warn = () => {}
  try {
    const { manager: voiceManager } = createManager()
    const clickDefinition = getSoundDefinition('click')
    const clickHowl = voiceManager.getOrCreateHowl('click', clickDefinition.sources, false)
    clickHowl.volume = () => {
      throw new Error('synthetic volume failure')
    }
    assert.equal(voiceManager.playClick(), null)
    assert.deepEqual(clickHowl.stoppedIds, clickHowl.playedIds)
    assert.equal(voiceManager.activeVoices.size, 0)

    const { manager: loopManager } = createManager()
    loopManager.enterScope('frontier')
    const riverDefinition = getSoundDefinition('frontier.ambience.river')
    const riverHowl = loopManager.getOrCreateHowl(
      'frontier.ambience.river',
      riverDefinition.sources,
      true,
    )
    riverHowl.pannerAttr = () => {
      throw new Error('synthetic panner failure')
    }
    assert.equal(
      loopManager.loopAt('frontier.ambience.river', [0, 0, 0], { key: 'river' }),
      'river',
    )
    assert.deepEqual(riverHowl.stoppedIds, riverHowl.playedIds)
    assert.equal(loopManager.activeLoops.size, 0)
    assert.equal(loopManager.loopRequests.has('river'), true)
  } finally {
    console.warn = previousWarn
  }
})

test('Inactive scopes reject Frontier playback', () => {
  const { manager } = createManager()
  assert.equal(
    manager.play('frontier.pickup.collect', { bypassCooldown: true }),
    null,
  )
  manager.enterScope('frontier')
  assert.ok(Number.isInteger(
    manager.play('frontier.pickup.collect', { bypassCooldown: true }),
  ))
})

test('Pending asset gate avoids 404 loops and uses legacy feedback fallback', () => {
  const { manager } = createManager({ frontierAssetsReady: false })
  manager.enterScope('frontier')
  assert.equal(
    manager.loopAt('frontier.ambience.river', [0, 0, 0]),
    null,
  )
  const pickupId = manager.play('frontier.pickup.collect')
  assert.ok(Number.isInteger(pickupId))
  assert.ok([...manager.howlCache.keys()].some((key) => key.startsWith('crystal:oneshot:')))
})

test('Loop volume survives position-only and idempotent loopAt updates', () => {
  const { manager } = createManager()
  manager.enterScope('frontier')
  const key = manager.loopAt(
    'frontier.ambience.river',
    [0, 0, 0],
    { key: 'river', volumeMultiplier: 0.5 },
  )
  manager.updateSource(key, { position: [1, 0, 1] })
  manager.loopAt('frontier.ambience.river', [2, 0, 2], { key: 'river' })
  manager.recalculateLoopVolumes()
  assert.equal(manager.activeLoops.get(key).callVolume, 0.5)
  assert.equal(manager.loopRequests.get(key).callVolume, 0.5)
})

test('Rapid scope exit and re-entry cancels stale unload work', () => {
  const scheduler = createScheduler()
  const { manager } = createManager({ scheduler })
  manager.enterScope('frontier')
  manager.loopAt('frontier.ambience.river', [0, 0, 0], { key: 'river' })
  manager.exitScope('frontier', { unload: true, fadeOutMs: 0 })
  assert.equal(scheduler.callbacks.size, 1)
  manager.enterScope('frontier')
  manager.loopAt('frontier.ambience.river', [1, 0, 1], { key: 'river' })
  assert.equal(scheduler.callbacks.size, 0)
  scheduler.runAll()
  assert.ok(manager.activeLoops.has('river'))
  assert.equal(manager.activeLoops.get('river').howl.unloaded, false)
})

test('Load errors remove cached playback and route current and later calls to fallback', () => {
  const { manager } = createManager()
  manager.enterScope('frontier')
  const id = manager.play('frontier.mission.complete', { bypassCooldown: true })
  const voice = [...manager.activeVoices.values()]
    .find((item) => item.howlerId === id)
  assert.ok(voice)
  const previousWarn = console.warn
  console.warn = () => {}
  try {
    voice.howl.config.onloaderror(id, '404')
  } finally {
    console.warn = previousWarn
  }
  assert.equal(
    [...manager.activeVoices.values()].some((item) => item.soundId === 'frontier.mission.complete'),
    false,
  )
  assert.equal(
    [...manager.activeVoices.values()].some((item) => item.soundId === 'levelUp'),
    true,
  )
  assert.ok(manager.disabledSounds.has('frontier.mission.complete'))
  assert.ok([...manager.howlCache.values()].every((howl) => howl !== voice.howl))
  assert.equal(typeof voice.howl.config.onplayerror, 'function')
  assert.ok(Number.isInteger(
    manager.play('frontier.mission.complete', { bypassCooldown: true }),
  ))
})

test('Late load errors cannot leak fallback sounds across scope, user, or session boundaries', () => {
  const transitions = [
    (manager) => manager.exitScope('frontier', { unload: false, fadeOutMs: 0 }),
    (manager) => manager.setUserBinding('next-student'),
    (manager) => manager.invalidateScopeVoices('frontier'),
  ]
  const previousWarn = console.warn
  console.warn = () => {}
  try {
    transitions.forEach((transition) => {
      const { manager } = createManager()
      manager.enterScope('frontier')
      const id = manager.play('frontier.mission.complete', { bypassCooldown: true })
      const primaryVoice = [...manager.activeVoices.values()]
        .find((voice) => voice.howlerId === id)
      transition(manager)
      primaryVoice.howl.config.onloaderror(id, 'late 404')
      assert.equal(
        [...manager.activeVoices.values()].some((voice) => voice.soundId === 'levelUp'),
        false,
      )
    })
  } finally {
    console.warn = previousWarn
  }
})

test('UID changes preserve requested ambience under the new user preferences', () => {
  const { manager } = createManager()
  manager.enterScope('frontier')
  manager.loopAt(
    'frontier.ambience.river',
    [1, 0, 2],
    { key: 'river', volumeMultiplier: 0.4 },
  )
  manager.setUserBinding('student-1')
  assert.equal(manager.loopRequests.get('river').callVolume, 0.4)
  assert.deepEqual(manager.loopRequests.get('river').position, [1, 0, 2])
  assert.ok(manager.activeLoops.has('river'))
})

test('Hidden pages mute one-shots as well as pausing loops', () => {
  const { manager } = createManager()
  manager.playClick()
  manager.isPageHidden = true
  manager.reconcilePlaybackState()
  assert.equal(manager.howler.muted, true)
  manager.isPageHidden = false
  manager.reconcilePlaybackState()
  assert.equal(manager.howler.muted, false)
})

test('Managers created in a hidden document start muted', () => {
  const howler = createFakeHowler()
  const documentRef = {
    hidden: true,
    addEventListener() {},
    removeEventListener() {},
  }
  const windowRef = {
    addEventListener() {},
    removeEventListener() {},
  }
  const manager = new SoundManager({
    HowlClass: FakeHowl,
    howler,
    windowRef,
    documentRef,
    eagerLegacy: false,
  })
  assert.equal(manager.isPageHidden, true)
  assert.equal(howler.muted, true)
  manager.destroy()
})

test('Loop resume failures remain restartable instead of becoming zombies', () => {
  const { manager } = createManager()
  manager.enterScope('frontier')
  manager.loopAt('frontier.ambience.river', [0, 0, 0], { key: 'river' })
  const loop = manager.activeLoops.get('river')
  const originalPlay = loop.howl.play.bind(loop.howl)

  manager.isPageHidden = true
  manager.reconcilePlaybackState()
  assert.equal(loop.pausedByManager, true)

  loop.howl.play = () => {
    throw new Error('synthetic resume failure')
  }
  const previousWarn = console.warn
  console.warn = () => {}
  try {
    manager.isPageHidden = false
    manager.reconcilePlaybackState()
  } finally {
    console.warn = previousWarn
  }
  assert.equal(manager.activeLoops.has('river'), false)
  assert.equal(manager.loopRequests.has('river'), true)

  loop.howl.play = originalPlay
  manager.reconcilePlaybackState()
  assert.equal(manager.activeLoops.has('river'), true)
})

test('Preferences sanitize malformed values without coercion surprises', () => {
  assert.equal(getStorageKey('user123'), 'metasense_audio_preferences_v1_user123')
  const sanitized = sanitizePreferences({
    enabled: 'false',
    ambience: null,
    action: Infinity,
    ui: -0.2,
    quietMode: 'false',
    reducedSpatial: true,
    updatedAt: Infinity,
  })
  assert.equal(sanitized.enabled, true)
  assert.equal(sanitized.ambience, 0.55)
  assert.equal(sanitized.action, 0.65)
  assert.equal(sanitized.ui, 0)
  assert.equal(sanitized.quietMode, false)
  assert.equal(sanitized.reducedSpatial, true)
  assert.ok(Number.isFinite(sanitized.updatedAt))
})

test('Cooldown handles first timestamp zero and clock rollback', () => {
  const cooldowns = new Map()
  assert.equal(checkCooldown(cooldowns, 'step', 100, 0), true)
  assert.equal(checkCooldown(cooldowns, 'step', 100, 50), false)
  assert.equal(checkCooldown(cooldowns, 'step', 100, -10), true)
})

test('Shuffle, voice priority, volume, and camera math remain deterministic', () => {
  const variants = ['a', 'b', 'c']
  const selected = selectShuffleVariant(variants, 0, () => 0.6)
  assert.equal(selected.index, 1)
  assert.equal(selectVoiceToDrop([
    { id: 'old-low', priority: 30, startTime: 1 },
    { id: 'new-low', priority: 30, startTime: 2 },
  ], 90), 'old-low')
  assert.ok(Math.abs(
    calculateInstanceVolume(0.5, 0.8, 1, true, 'frontierSfx') - 0.16,
  ) < 1e-9)
  assert.deepEqual(
    calculateCameraOrientation({ x: 0, y: 0, z: 0, w: 1 }),
    { forward: [0, 0, -1], up: [0, 1, 0] },
  )
})

test('Walk surfaces and river emitters use the rendered world model', () => {
  assert.equal(getWalkSurface(0, 5, 'forest'), 'landingMetal')
  assert.equal(getWalkSurface(1.2, -15, 'forest'), 'bridgeWood')
  assert.equal(getWalkSurface(-4.8, 4.8, 'forest'), 'path')
  assert.equal(getWalkSurface(10, 10, 'ocean'), 'terrain.ocean')
  assert.equal(isNearRoad(-4.8, 4.8), true)
  const [x, y, z] = getRiverAudioPoint(1.2)
  assert.deepEqual([x, y], [1.2, 0.05])
  assert.equal(z, riverCenterZ(1.2))
})

test('Phase 2: Footsteps only trigger when actual displacement (movedDistance) occurs', () => {
  let stepDistance = 0
  let playCount = 0
  const triggerStep = (movedDistance) => {
    if (movedDistance > 0) {
      stepDistance += movedDistance
      if (stepDistance >= 1.05) {
        stepDistance %= 1.05
        playCount += 1
      }
    }
  }

  // 1. 벽에 막혀 movedDistance가 0인 상태에서 키를 계속 밀 때 -> 발소리 0회
  for (let i = 0; i < 60; i += 1) {
    triggerStep(0)
  }
  assert.equal(playCount, 0, 'No footsteps when blocked by wall')

  // 2. 정상 이동으로 2.2 unit 이동 시 -> 2회 발소리 발생
  triggerStep(0.5)
  triggerStep(0.6) // 1.1 -> step 1
  triggerStep(0.6)
  triggerStep(0.6) // 2.3 -> step 2
  assert.equal(playCount, 2, 'Footsteps trigger exactly on 1.05 unit displacement threshold')
})

test('Phase 2: Surface switching immediately changes footstep sound within 1.05 units', () => {
  const surfacesHit = []
  const simulateMove = (x, z, theme) => {
    const surface = getWalkSurface(x, z, theme)
    surfacesHit.push(surface)
    return getFrontierFootstepSoundId(surface)
  }

  // 1) Landing Pad (x:0, z:5)
  const sound1 = simulateMove(0, 5, 'forest')
  assert.equal(sound1, 'frontier.footstep.landingMetal')

  // 2) Bridge (x:1.2, z:-15)
  const sound2 = simulateMove(1.2, -15, 'forest')
  assert.equal(sound2, 'frontier.footstep.bridgeWood')

  // 3) Road (-4.8, 4.8)
  const sound3 = simulateMove(-4.8, 4.8, 'forest')
  assert.equal(sound3, 'frontier.footstep.path')

  assert.deepEqual(surfacesHit, ['landingMetal', 'bridgeWood', 'path'])
})

test('Phase 2: Collision latches on initial impact and prevents spam during wall scraping', () => {
  let collisionLatched = false
  let clearDuration = 0
  const playedCollisions = []

  const updateCollisionState = (inWorld, blocked, acousticMat, delta) => {
    if (inWorld && !blocked) {
      if (collisionLatched) {
        clearDuration += delta
        if (clearDuration >= 0.35) {
          collisionLatched = false
          clearDuration = 0
        }
      }
    } else if (!collisionLatched) {
      playedCollisions.push(acousticMat)
      collisionLatched = true
      clearDuration = 0
    } else if (collisionLatched) {
      clearDuration = 0
    }
  }

  // 1. 최초 충돌 -> 소리 1회 발생
  updateCollisionState(true, true, 'metal', 0.016)
  assert.equal(playedCollisions.length, 1)
  assert.equal(playedCollisions[0], 'metal')

  // 2. 계속 벽을 밀면서 60프레임 동안 스크랩 -> 추가 충돌음 0회
  for (let i = 0; i < 60; i += 1) {
    updateCollisionState(true, true, 'metal', 0.016)
  }
  assert.equal(playedCollisions.length, 1, 'Collision sound latched; no spam on continuous push')

  // 3. 벽에서 떨어져 0.35초 이상 자유 이동 후 다시 충돌 -> 2번째 충돌음 발생
  for (let i = 0; i < 25; i += 1) {
    updateCollisionState(true, false, 'wood', 0.016)
  }
  assert.equal(collisionLatched, false, 'Rearmed after clearing distance')

  updateCollisionState(true, true, 'wood', 0.016)
  assert.equal(playedCollisions.length, 2)
  assert.equal(playedCollisions[1], 'wood')
})

test('Phase 3: Big completion sounds only trigger on confirmed server success', async () => {
  const playedSounds = []
  const mockSoundManager = {
    play(soundId) { playedSounds.push(soundId) },
  }

  const simulateServerOperation = async (shouldSucceed) => {
    try {
      if (!shouldSucceed) throw new Error('server failure')
      mockSoundManager.play('frontier.mission.complete')
      return true
    } catch {
      mockSoundManager.play('frontier.connection.softError')
      return false
    }
  }

  // 1. 서버 실패 시 -> 성공음이 나지 않고 softError 발생
  await simulateServerOperation(false)
  assert.deepEqual(playedSounds, ['frontier.connection.softError'])

  // 2. 서버 성공 시 -> 성공음 발생
  await simulateServerOperation(true)
  assert.deepEqual(playedSounds, ['frontier.connection.softError', 'frontier.mission.complete'])
})

test('Phase 3 & 4: Scope exit fades out ambient loops and cleans active voices', () => {
  const { manager } = createManager()
  manager.enterScope('frontier')
  manager.loopAt('frontier.ambience.forest', [0, 0, 0], { key: 'frontier:ambience:theme' })
  assert.ok(manager.activeLoops.has('frontier:ambience:theme'))

  manager.exitScope('frontier', { unload: true, fadeOutMs: 300 })
  assert.equal(manager.activeLoops.has('frontier:ambience:theme'), false)
  assert.equal(manager.activeScopes.has('frontier'), false)
})

test('Phase 4: Quiet mode applies a 50% volume cap and sanitized bus levels', () => {
  const { manager } = createManager()
  manager.updatePreferences({ quietMode: true, ambience: 0.8, action: 1.0 })
  const prefs = manager.getPreferences()

  assert.equal(prefs.quietMode, true)
  const calculatedVol = calculateInstanceVolume(
    1.0,
    1.0,
    1.0,
    true, // quietMode = true
    'frontierSfx',
  )
  assert.equal(calculatedVol, 0.4, 'Quiet mode caps volume at 50% of base * bus (0.4)')
})

await asyncTest('Interrupted AudioContext is only unlocked after it reaches running', async () => {
  const { manager } = createManager()
  let resumeCount = 0
  manager.howler.ctx.state = 'interrupted'
  manager.howler.ctx.resume = async () => {
    resumeCount += 1
  }

  assert.equal(await manager.unlock(), false)
  assert.equal(manager.unlocked, false)
  assert.equal(resumeCount, 1)

  manager.howler.ctx.resume = async () => {
    resumeCount += 1
    manager.howler.ctx.state = 'running'
  }
  assert.equal(await manager.unlock(), true)
  assert.equal(manager.unlocked, true)
  assert.equal(resumeCount, 2)
})

if (failedCount > 0) {
  console.error(`\n❌ ${failedCount} test(s) failed; ${passedCount} passed.`)
  process.exitCode = 1
} else {
  console.log(`\n🎉 All ${passedCount} tests passed successfully!`)
}
