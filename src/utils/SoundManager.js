import { Howl, Howler } from 'howler'
import {
  LEGACY_SOUND_DEFS,
  FRONTIER_AUDIO_ASSETS_READY,
  getSoundDefinition,
} from '../audio/soundRegistry.js'
import {
  loadAudioPreferences,
  saveAudioPreferences,
  sanitizePreferences,
} from '../audio/audioPreferences.js'
import {
  checkCooldown,
  selectShuffleVariant,
  selectVoiceToDrop,
  calculateInstanceVolume,
} from '../audio/frontierAudioMath.js'

const GLOBAL_ONESHOT_LIMIT = 8
const GLOBAL_LOOP_LIMIT = 4

/**
 * SoundManager - 통합 오디오 관리자 (하위 호환 100% 보장 및 프론티어 오디오 엔진 확장)
 */
export class SoundManager {
  constructor({
    HowlClass = Howl,
    howler = Howler,
    windowRef = typeof window === 'undefined' ? null : window,
    documentRef = typeof document === 'undefined' ? null : document,
    frontierAssetsReady = FRONTIER_AUDIO_ASSETS_READY,
    random = Math.random,
    setTimeoutFn = (fn, delay) => (windowRef ? windowRef.setTimeout(fn, delay) : setTimeout(fn, delay)),
    clearTimeoutFn = (id) => (windowRef ? windowRef.clearTimeout(id) : clearTimeout(id)),
    eagerLegacy = Boolean(windowRef),
  } = {}) {
    this.HowlClass = HowlClass
    this.howler = howler
    this.windowRef = windowRef
    this.documentRef = documentRef
    this.frontierAssetsReady = frontierAssetsReady
    this.random = random
    this.setTimeoutFn = setTimeoutFn
    this.clearTimeoutFn = clearTimeoutFn

    // 레거시 하위 호환 상태
    this.sounds = {}
    this.soundVolumes = {}
    this.bgm = null
    this.isMuted = false
    this.sfxVolume = 0.2

    // 확장 상태
    this.currentScope = 'global'
    this.activeScopes = new Set(['global'])
    this.currentUid = null
    this.isGuest = true
    this.userBindingGeneration = 0

    // 인증 전에는 공용 기기에 남지 않는 sessionStorage guest 설정만 사용한다.
    this.preferences = loadAudioPreferences(null, true)

    // 논리 오디오 버스 볼륨
    this.busVolumes = {
      feedback: 1.0,
      ui: 1.0,
      frontierAmbience: 1.0,
      frontierSfx: 1.0,
    }

    // Ducking Map (key -> { busName: factor })
    this.activeDucks = new Map()

    // 404 및 디코딩 오류 상태 머신
    this.disabledSounds = new Set()
    this.failedSources = new Set()
    this.warnedErrors = new Set()

    // 쿨다운 및 셔플 인덱스
    this.cooldownMap = new Map()
    this.lastVariantIndices = new Map()
    this.nextVoiceId = 1

    // 활성 루프 및 보이스 트래킹
    this.activeLoops = new Map() // key -> { handle, soundId, howl, howlerId, baseVolume, busName, spatial, callVolume }
    this.activeVoices = new Map() // instanceId -> { id, soundId, priority, startTime, howl, howlerId }
    this.loopRequests = new Map()

    // Howl 캐시 (key: soundId:sourcesKey -> Howl)
    this.howlCache = new Map()
    this.howlMeta = new Map()

    // scope unload 경합 방지
    this.scopeUnloadTimers = new Map()
    this.scopeGenerations = new Map()
    this.lifecycleCleanups = []

    // 라이프사이클 및 unlock 상태
    this.isPageHidden = Boolean(documentRef?.hidden)
    this.unlocked = false

    // 초기화
    this.initLegacySounds(eagerLegacy)
    this.setupLifecycleListeners()
    this.applyPreferences()
  }

  /**
   * 레거시 효과음 맵 초기화 (100% 하위 호환)
   */
  initLegacySounds(eager = true) {
    Object.entries(LEGACY_SOUND_DEFS).forEach(([key, config]) => {
      this.soundVolumes[key] = config.baseVolume
      if (!eager) return
      const howl = this.getOrCreateHowl(key, config.sources, false)
      if (howl) this.sounds[key] = howl
    })
  }

  /**
   * 탭 숨김/복귀 바인딩
   */
  setupLifecycleListeners() {
    const win = this.windowRef
    const doc = this.documentRef
    if (!win || !doc) return

    const handleVisibilityChange = () => {
      this.isPageHidden = Boolean(doc.hidden)
      this.reconcilePlaybackState()
    }
    const handlePageHide = () => {
      this.isPageHidden = true
      this.reconcilePlaybackState()
    }
    const handlePageShow = () => {
      this.isPageHidden = Boolean(doc.hidden)
      this.reconcilePlaybackState()
    }
    const handleOnline = () => this.retryFailedSounds()
    const handleFirstInteraction = () => {
      // iOS/Safari는 Bluetooth 전환·백그라운드 복귀 뒤 다시 interrupted가 될 수 있다.
      // 리스너를 유지하면 다음 실제 사용자 제스처에서 저비용으로 재확인할 수 있다.
      void this.unlock()
    }

    doc.addEventListener('visibilitychange', handleVisibilityChange)
    win.addEventListener('pagehide', handlePageHide)
    win.addEventListener('pageshow', handlePageShow)
    win.addEventListener('online', handleOnline)
    win.addEventListener('pointerdown', handleFirstInteraction, true)
    win.addEventListener('keydown', handleFirstInteraction, true)

    this.lifecycleCleanups.push(() => {
      doc.removeEventListener('visibilitychange', handleVisibilityChange)
      win.removeEventListener('pagehide', handlePageHide)
      win.removeEventListener('pageshow', handlePageShow)
      win.removeEventListener('online', handleOnline)
      win.removeEventListener('pointerdown', handleFirstInteraction, true)
      win.removeEventListener('keydown', handleFirstInteraction, true)
    })
  }

  /**
   * 브라우저 Autoplay Unlock
   */
  unlock() {
    const context = this.howler.ctx
    if (this.unlocked && (!context?.state || context.state === 'running')) {
      this.reconcilePlaybackState()
      return Promise.resolve(true)
    }

    const markUnlocked = () => {
      this.unlocked = true
      this.reconcilePlaybackState()
      return true
    }

    if (!context?.state) return Promise.resolve(markUnlocked())
    if (context.state === 'running') return Promise.resolve(markUnlocked())

    this.unlocked = false
    if (typeof context.resume !== 'function') return Promise.resolve(false)

    let resumeResult
    try {
      resumeResult = context.resume()
    } catch (err) {
      console.warn('[SoundManager] Autoplay unlock failed:', err)
      return Promise.resolve(false)
    }

    return Promise.resolve(resumeResult).then(() => {
      if (context.state !== 'running') return false
      return markUnlocked()
    }).catch((err) => {
      console.warn('[SoundManager] Autoplay unlock failed:', err)
      return false
    })
  }

  /**
   * 계정 및 UID 전환 바인딩
   * @param {string|null} uid
   * @param {boolean} [isGuest=false]
   */
  setUserBinding(uid, isGuest = false) {
    const normalizedUid = uid || null
    const normalizedGuest = Boolean(isGuest || !normalizedUid)
    if (this.currentUid === normalizedUid && this.isGuest === normalizedGuest) return

    // 인증 전환 중에도 현재 화면이 요청한 환경음은 새 사용자 설정으로 다시 시작한다.
    const desiredLoops = Array.from(this.loopRequests.values()).map((request) => ({
      ...request,
      position: Array.isArray(request.position) ? [...request.position] : request.position,
    }))
    this.userBindingGeneration += 1
    this.stopAllLoops(true)
    for (const voiceId of Array.from(this.activeVoices.keys())) this.stopVoice(voiceId)
    this.currentUid = normalizedUid
    this.isGuest = normalizedGuest
    this.preferences = loadAudioPreferences(normalizedUid, normalizedGuest)
    this.applyPreferences()
    desiredLoops.forEach((request) => {
      this.loopAt(request.soundId, request.position, {
        key: request.key,
        volumeMultiplier: request.callVolume,
      })
    })
  }

  /**
   * 사용자 선호 설정 조회
   */
  getPreferences() {
    return { ...this.preferences }
  }

  /**
   * 선호 설정 업데이트
   * @param {Partial<typeof this.preferences>} newPrefs
   */
  updatePreferences(newPrefs) {
    const reducedSpatialChanged = (
      typeof newPrefs?.reducedSpatial === 'boolean'
      && newPrefs.reducedSpatial !== this.preferences.reducedSpatial
    )
    this.preferences = sanitizePreferences({
      ...this.preferences,
      ...newPrefs,
      updatedAt: Date.now(),
    })
    saveAudioPreferences(this.currentUid, this.preferences, this.isGuest)
    this.applyPreferences()
    if (reducedSpatialChanged) this.restartSpatialLoops()
  }

  /**
   * 선호 설정을 실제 엔진 및 볼륨에 적용
   */
  applyPreferences() {
    this.busVolumes.frontierAmbience = this.clampVolume(this.preferences.ambience, 0.55)
    this.busVolumes.frontierSfx = this.clampVolume(this.preferences.action, 0.65)
    this.busVolumes.ui = this.clampVolume(this.preferences.ui, 0.45)
    this.busVolumes.feedback = this.clampVolume(this.preferences.ui, 0.45)
    this.recalculateLoopVolumes()
    this.reconcilePlaybackState()
  }

  clampVolume(value, fallback = 1) {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return fallback
    return Math.max(0, Math.min(1, numeric))
  }

  isScopeActive(definition) {
    return definition?.scope === 'global' || this.activeScopes.has(definition?.scope)
  }

  isDefinitionAvailable(definition) {
    return definition?.scope !== 'frontier' || this.frontierAssetsReady
  }

  canPlayDefinition(definition) {
    return Boolean(
      definition
      && this.isScopeActive(definition)
      && this.isDefinitionAvailable(definition)
      && !this.isMuted
      && this.preferences.enabled
      && !this.isPageHidden
    )
  }

  reconcilePlaybackState() {
    const shouldMute = this.isMuted || !this.preferences.enabled || this.isPageHidden
    this.howler.mute(shouldMute)

    if (shouldMute || this.isPageHidden) {
      this.pauseAllLoops()
      return
    }

    this.resumeAllLoops()
    for (const [key, request] of this.loopRequests.entries()) {
      if (!this.activeLoops.has(key)) this.startLoopRequest(key, request)
    }
  }

  /**
   * 버스 볼륨 제어
   * @param {string} busName
   * @param {number} volume
   */
  setBusVolume(busName, volume) {
    if (this.busVolumes[busName] !== undefined) {
      this.busVolumes[busName] = this.clampVolume(volume, this.busVolumes[busName])
      this.recalculateLoopVolumes()
    }
  }

  /**
   * 오버레이 Ducking 적용
   */
  duck(key, busDucks) {
    const sanitizedDucks = Object.fromEntries(
      Object.entries(busDucks || {})
        .filter(([busName]) => this.busVolumes[busName] !== undefined)
        .map(([busName, factor]) => [busName, this.clampVolume(factor, 1)])
    )
    this.activeDucks.set(key, sanitizedDucks)
    this.recalculateLoopVolumes()
  }

  /**
   * 오버레이 Ducking 해제
   */
  unduck(key) {
    if (this.activeDucks.has(key)) {
      this.activeDucks.delete(key)
      this.recalculateLoopVolumes()
    }
  }

  /**
   * 버스별 Ducking 배율 구하기
   */
  getBusDuckFactor(busName) {
    let factor = 1.0
    for (const ducks of this.activeDucks.values()) {
      if (ducks[busName] !== undefined) {
        factor = Math.min(factor, ducks[busName])
      }
    }
    return factor
  }

  /**
   * Scope 진입
   */
  enterScope(scopeName) {
    const pendingTimer = this.scopeUnloadTimers.get(scopeName)
    if (pendingTimer !== undefined) {
      this.clearTimeoutFn(pendingTimer)
      this.scopeUnloadTimers.delete(scopeName)
    }
    this.scopeGenerations.set(scopeName, (this.scopeGenerations.get(scopeName) || 0) + 1)
    this.activeScopes.add(scopeName)
    this.currentScope = scopeName
    this.reconcilePlaybackState()
    return true
  }

  /**
   * Scope 이탈 및 정지
   */
  exitScope(scopeName, { unload = true, fadeOutMs = 800 } = {}) {
    this.activeScopes.delete(scopeName)
    const nextGeneration = (this.scopeGenerations.get(scopeName) || 0) + 1
    this.scopeGenerations.set(scopeName, nextGeneration)

    for (const [key, request] of Array.from(this.loopRequests.entries())) {
      const def = getSoundDefinition(request.soundId)
      if (def && def.scope === scopeName) {
        this.stopLoop(key, fadeOutMs)
      }
    }

    for (const [voiceId, voice] of Array.from(this.activeVoices.entries())) {
      if (voice.scope === scopeName) this.stopVoice(voiceId)
    }

    this.activeDucks.clear()
    if (this.currentScope === scopeName) {
      this.currentScope = Array.from(this.activeScopes).at(-1) || 'global'
    }

    const existingTimer = this.scopeUnloadTimers.get(scopeName)
    if (existingTimer !== undefined) this.clearTimeoutFn(existingTimer)

    if (unload) {
      const timer = this.setTimeoutFn(() => {
        this.scopeUnloadTimers.delete(scopeName)
        if (
          this.activeScopes.has(scopeName)
          || this.scopeGenerations.get(scopeName) !== nextGeneration
        ) {
          return
        }
        this.unloadScope(scopeName)
      }, Math.max(0, fadeOutMs) + 100)
      this.scopeUnloadTimers.set(scopeName, timer)
    }
  }

  /**
   * 같은 컴포넌트에서 행성/플레이 세션만 바뀔 때 이전 one-shot 응답을 무효화한다.
   * 환경음 요청은 보존한다.
   */
  invalidateScopeVoices(scopeName) {
    this.scopeGenerations.set(scopeName, (this.scopeGenerations.get(scopeName) || 0) + 1)
    for (const [voiceId, voice] of Array.from(this.activeVoices.entries())) {
      if (voice.scope === scopeName) this.stopVoice(voiceId)
    }
  }

  unloadScope(scopeName) {
    for (const [cacheKey, meta] of Array.from(this.howlMeta.entries())) {
      if (meta.scope !== scopeName) continue
      this.cleanupVoicesForHowl(meta.howl)
      try { meta.howl.unload() } catch (err) { void err }
      this.howlCache.delete(cacheKey)
      this.howlMeta.delete(cacheKey)
    }
  }

  /**
   * 로드 실패는 현재 후보를 캐시에서 제거하고 안전하게 무음 처리한다.
   * variant가 있는 사운드는 실패한 variant를 다음 선택에서 제외한다.
   */
  handleLoadError(soundId, sources, error, howl = null, cacheKey = '') {
    const sourcesKey = Array.isArray(sources) ? sources.join('|') : String(sources)
    const failedVoices = howl
      ? Array.from(this.activeVoices.values()).filter((voice) => (
        voice.howl === howl && voice.soundId === soundId
      ))
      : []
    this.failedSources.add(`${soundId}:${sourcesKey}`)
    if (howl) {
      this.cleanupVoicesForHowl(howl)
      for (const [key, loopInfo] of Array.from(this.activeLoops.entries())) {
        if (loopInfo.howl !== howl) continue
        this.activeLoops.delete(key)
      }
      try { howl.unload() } catch (err) { void err }
    }
    if (cacheKey && this.howlCache.get(cacheKey) === howl) {
      this.howlCache.delete(cacheKey)
      this.howlMeta.delete(cacheKey)
    }

    const def = getSoundDefinition(soundId)
    if (!def) {
      this.disabledSounds.add(soundId)
      return
    }

    const allSources = []
    if (def.sources) allSources.push(def.sources)
    if (def.variants) allSources.push(...def.variants)

    const allFailed = allSources.every((srcArr) => this.failedSources.has(`${soundId}:${srcArr.join('|')}`))
    if (allFailed) {
      const newlyDisabled = !this.disabledSounds.has(soundId)
      const canFallbackForCurrentVoice = failedVoices.some((voice) => (
        this.isScopeActive(def)
        && voice.scopeGeneration === (this.scopeGenerations.get(voice.scope) || 0)
        && voice.userBindingGeneration === this.userBindingGeneration
      ))
      this.disabledSounds.add(soundId)
      if (!this.warnedErrors.has(soundId)) {
        console.warn(`[SoundManager] All sources failed for [${soundId}]:`, error || '404/Decode Error')
        this.warnedErrors.add(soundId)
      }
      if (newlyDisabled && def.kind === 'oneshot' && canFallbackForCurrentVoice) {
        this.playFallback(soundId, def, { bypassCooldown: true })
      }
    }
  }

  handlePlayError(soundId, howlerId, error, howl = null) {
    if (howl) {
      for (const [voiceId, voice] of Array.from(this.activeVoices.entries())) {
        if (voice.howl === howl && voice.howlerId === howlerId) {
          this.activeVoices.delete(voiceId)
        }
      }
      for (const [key, loopInfo] of Array.from(this.activeLoops.entries())) {
        if (loopInfo.howl === howl && loopInfo.howlerId === howlerId) {
          // loopRequests는 유지해 다음 unlock/reconcile에서 안전하게 재시도한다.
          this.activeLoops.delete(key)
        }
      }
    }
    if (!this.warnedErrors.has(`play_${soundId}`)) {
      console.warn(`[SoundManager] Play error for [${soundId}]:`, error)
      this.warnedErrors.add(`play_${soundId}`)
    }
  }

  retryFailedSounds() {
    this.disabledSounds.clear()
    this.failedSources.clear()
    for (const warnedKey of Array.from(this.warnedErrors)) {
      if (!String(warnedKey).startsWith('play_')) this.warnedErrors.delete(warnedKey)
    }
    this.reconcilePlaybackState()
  }

  /**
   * Howl 인스턴스 구하기 (Variant 및 Sources 기반 캐시 키 분리)
   */
  getOrCreateHowl(soundId, sources, isLoop = false) {
    if (!Array.isArray(sources) || sources.length === 0) return null
    const sourcesKey = sources.join('|')
    const failedKey = `${soundId}:${sourcesKey}`
    if (this.failedSources.has(failedKey)) return null

    const cacheKey = `${soundId}:${isLoop ? 'loop' : 'oneshot'}:${sourcesKey}`

    if (this.howlCache.has(cacheKey)) {
      return this.howlCache.get(cacheKey)
    }

    let howl = null
    howl = new this.HowlClass({
      src: sources,
      loop: isLoop,
      onloaderror: (id, err) => this.handleLoadError(soundId, sources, err, howl, cacheKey),
      onplayerror: (id, err) => this.handlePlayError(soundId, id, err, howl),
    })

    this.howlCache.set(cacheKey, howl)
    this.howlMeta.set(cacheKey, {
      soundId,
      scope: getSoundDefinition(soundId)?.scope || 'global',
      sources: [...sources],
      isLoop,
      howl,
    })
    return howl
  }

  getAvailableVariantGroups(soundId, definition) {
    const groups = definition.variants?.length
      ? definition.variants
      : definition.sources?.length
        ? [definition.sources]
        : []
    return groups.filter((sources) => (
      !this.failedSources.has(`${soundId}:${sources.join('|')}`)
    ))
  }

  cleanupVoicesForHowl(howl) {
    for (const [voiceId, voice] of Array.from(this.activeVoices.entries())) {
      if (voice.howl === howl) this.activeVoices.delete(voiceId)
    }
  }

  stopVoice(voiceId) {
    const voice = this.activeVoices.get(voiceId)
    if (!voice) return
    this.activeVoices.delete(voiceId)
    try { voice.howl.stop(voice.howlerId) } catch (err) { void err }
  }

  enforceVoiceLimits(soundId, definition) {
    const maxInstances = Math.max(1, Number(definition.maxInstances) || GLOBAL_ONESHOT_LIMIT)
    const sameSoundVoices = Array.from(this.activeVoices.values())
      .filter((voice) => voice.soundId === soundId)
      .sort((a, b) => a.startTime - b.startTime)

    while (sameSoundVoices.length >= maxInstances) {
      const oldest = sameSoundVoices.shift()
      this.stopVoice(oldest.id)
    }

    if (this.activeVoices.size < GLOBAL_ONESHOT_LIMIT) return true

    const dropId = selectVoiceToDrop(
      Array.from(this.activeVoices.values()),
      definition.priority ?? 50,
    )
    if (!dropId) return false
    this.stopVoice(dropId)
    return true
  }

  playFallback(soundId, definition, options = {}) {
    const visited = new Set(Array.isArray(options.__fallbackVisited) ? options.__fallbackVisited : [])
    if (visited.has(soundId)) return null
    visited.add(soundId)

    const fallbackId = definition?.fallbackId
    if (!fallbackId || visited.has(fallbackId)) return null
    return this.play(fallbackId, {
      ...options,
      __fallbackVisited: Array.from(visited),
    })
  }

  /**
   * 의미 기반 음원 및 레거시 효과음 재생 (Oneshot)
   * @param {string} soundId
   * @param {Object} [options]
   * @param {number} [options.volumeMultiplier=1]
   * @returns {number|null} howlerId
   */
  play(soundId, options = {}) {
    try {
      return this.playInternal(soundId, options)
    } catch (error) {
      const warningKey = `runtime_${soundId}`
      if (!this.warnedErrors.has(warningKey)) {
        console.warn(`[SoundManager] Runtime playback error for [${soundId}]:`, error)
        this.warnedErrors.add(warningKey)
      }
      return null
    }
  }

  playInternal(soundId, options = {}) {
    if (typeof options === 'number') options = { volumeMultiplier: options }
    if (this.isMuted || !this.preferences.enabled || this.isPageHidden) return null

    const def = getSoundDefinition(soundId)
    if (!def) return null
    if (!this.isScopeActive(def)) return null
    if (this.disabledSounds.has(soundId)) {
      return this.playFallback(soundId, def, options)
    }
    if (!this.isDefinitionAvailable(def)) {
      return this.playFallback(soundId, def, options)
    }

    // 쿨다운 검사
    const now = Date.now()
    if (!options.bypassCooldown && !checkCooldown(this.cooldownMap, soundId, def.cooldownMs, now)) {
      return null
    }

    // 변형(Variant) 선택
    const availableGroups = this.getAvailableVariantGroups(soundId, def)
    if (availableGroups.length === 0) {
      this.disabledSounds.add(soundId)
      return this.playFallback(soundId, def, options)
    }

    let sources = availableGroups[0]
    if (def.variants && availableGroups.length > 1) {
      const lastIdx = this.lastVariantIndices.get(soundId) ?? -1
      const lastVariant = def.variants[lastIdx]
      const availableLastIndex = lastVariant ? availableGroups.indexOf(lastVariant) : -1
      const { variant } = selectShuffleVariant(
        availableGroups,
        availableLastIndex,
        this.random,
      )
      this.lastVariantIndices.set(soundId, def.variants.indexOf(variant))
      sources = variant
    }

    if (!sources || sources.length === 0) return null

    if (!this.enforceVoiceLimits(soundId, def)) return null

    const howl = this.getOrCreateHowl(soundId, sources, false)
    if (!howl) return null

    // 볼륨 계산
    const busVol = this.busVolumes[def.bus] ?? 1.0
    const duckFactor = this.getBusDuckFactor(def.bus)
    const finalVol = calculateInstanceVolume(
      def.baseVolume,
      busVol * duckFactor,
      options.volumeMultiplier ?? 1.0,
      this.preferences.quietMode,
      def.bus
    )

    let howlerId = null
    let voiceInstanceId = null
    let cleanup = null
    try {
      howlerId = howl.play()
      if (howlerId === null || howlerId === undefined) return null
      howl.volume(finalVol, howlerId)

      if (def.rateRange) {
        const [minR, maxR] = def.rateRange
        const rate = minR + this.random() * (maxR - minR)
        howl.rate(rate, howlerId)
      }

      // Voice Tracking
      voiceInstanceId = `${soundId}_${this.nextVoiceId++}`
      this.activeVoices.set(voiceInstanceId, {
        id: voiceInstanceId,
        soundId,
        scope: def.scope,
        priority: def.priority ?? 50,
        startTime: Date.now(),
        howl,
        howlerId,
        scopeGeneration: this.scopeGenerations.get(def.scope) || 0,
        userBindingGeneration: this.userBindingGeneration,
      })

      cleanup = () => {
        this.activeVoices.delete(voiceInstanceId)
        howl.off?.('end', cleanup, howlerId)
        howl.off?.('stop', cleanup, howlerId)
        howl.off?.('loaderror', cleanup, howlerId)
        howl.off?.('playerror', cleanup, howlerId)
      }
      howl.once('end', cleanup, howlerId)
      howl.once('stop', cleanup, howlerId)
      howl.once('loaderror', cleanup, howlerId)
      howl.once('playerror', cleanup, howlerId)

      return howlerId
    } catch (error) {
      if (voiceInstanceId) this.activeVoices.delete(voiceInstanceId)
      if (cleanup && howlerId !== null && howlerId !== undefined) {
        howl.off?.('end', cleanup, howlerId)
        howl.off?.('stop', cleanup, howlerId)
        howl.off?.('loaderror', cleanup, howlerId)
        howl.off?.('playerror', cleanup, howlerId)
      }
      if (howlerId !== null && howlerId !== undefined) {
        try { howl.stop(howlerId) } catch (stopError) { void stopError }
      }
      throw error
    }
  }

  /**
   * Spatial Loop 재생 (Idempotent)
   * @param {string} soundId
   * @param {[number, number, number]} position
   * @param {Object} options
   * @param {string} options.key - 루프 고유 키
   * @param {number} [options.volumeMultiplier=1.0]
   * @returns {string} handle Key
   */
  loopAt(soundId, position, options = {}) {
    try {
      return this.loopAtInternal(soundId, position, options)
    } catch (error) {
      const warningKey = `runtime_loop_${soundId}`
      if (!this.warnedErrors.has(warningKey)) {
        console.warn(`[SoundManager] Runtime loop error for [${soundId}]:`, error)
        this.warnedErrors.add(warningKey)
      }
      return null
    }
  }

  loopAtInternal(soundId, position, options = {}) {
    const key = options.key || `loop:${soundId}`
    const def = getSoundDefinition(soundId)
    if (!def || def.kind !== 'loop') return null
    if (!this.isScopeActive(def) || !this.isDefinitionAvailable(def)) return null

    const previousRequest = this.loopRequests.get(key)
    const hasExplicitVolume = Object.prototype.hasOwnProperty.call(options, 'volumeMultiplier')
    const callVol = hasExplicitVolume
      ? this.clampVolume(options.volumeMultiplier, previousRequest?.callVolume ?? 1)
      : previousRequest?.callVolume ?? 1
    const nextPosition = Array.isArray(position)
      ? [...position]
      : previousRequest?.position

    const request = {
      key,
      soundId,
      position: nextPosition,
      callVolume: callVol,
    }
    this.loopRequests.set(key, request)

    if (this.activeLoops.has(key)) {
      this.updateSource(key, {
        ...(nextPosition ? { position: nextPosition } : {}),
        ...(hasExplicitVolume ? { volume: callVol } : {}),
      })
      return key
    }

    if (!this.canPlayDefinition(def) || this.disabledSounds.has(soundId)) return key
    return this.startLoopRequest(key, request)
  }

  startLoopRequest(key, request) {
    try {
      return this.startLoopRequestInternal(key, request)
    } catch (error) {
      const soundId = request?.soundId || 'unknown'
      const warningKey = `runtime_loop_${soundId}`
      if (!this.warnedErrors.has(warningKey)) {
        console.warn(`[SoundManager] Runtime loop error for [${soundId}]:`, error)
        this.warnedErrors.add(warningKey)
      }
      this.activeLoops.delete(key)
      return key
    }
  }

  startLoopRequestInternal(key, request) {
    if (!request || this.activeLoops.has(key)) return key
    const def = getSoundDefinition(request.soundId)
    if (!this.canPlayDefinition(def) || this.disabledSounds.has(request.soundId)) return key

    const sameSoundCount = Array.from(this.activeLoops.values())
      .filter((loop) => loop.soundId === request.soundId)
      .length
    const maxInstances = Math.max(1, Number(def.maxInstances) || GLOBAL_LOOP_LIMIT)
    if (sameSoundCount >= maxInstances || this.activeLoops.size >= GLOBAL_LOOP_LIMIT) {
      this.loopRequests.delete(key)
      return null
    }

    const howl = this.getOrCreateHowl(request.soundId, def.sources, true)
    if (!howl) return key

    let howlerId = null
    try {
      howlerId = howl.play()
      if (howlerId === null || howlerId === undefined) return key

      const spatial = Boolean(def.spatial && !this.preferences.reducedSpatial)
      if (spatial && def.panner) howl.pannerAttr(def.panner, howlerId)
      if (spatial && request.position) {
        howl.pos(request.position[0], request.position[1], request.position[2], howlerId)
      }

      const busVol = this.busVolumes[def.bus] ?? 1.0
      const duckFactor = this.getBusDuckFactor(def.bus)
      const finalVol = calculateInstanceVolume(
        def.baseVolume,
        busVol * duckFactor,
        request.callVolume,
        this.preferences.quietMode,
        def.bus
      )

      howl.volume(finalVol, howlerId)

      // Call Volume(원본 gain)을 보존
      this.activeLoops.set(key, {
        handle: key,
        soundId: request.soundId,
        howl,
        howlerId,
        baseVolume: def.baseVolume,
        busName: def.bus,
        spatial,
        callVolume: request.callVolume,
        pausedByManager: false,
      })

      return key
    } catch (error) {
      this.activeLoops.delete(key)
      if (howlerId !== null && howlerId !== undefined) {
        try { howl.stop(howlerId) } catch (stopError) { void stopError }
      }
      throw error
    }
  }

  /**
   * Spatial Loop 소스 위치 및 볼륨 동적 갱신 (원본 callVolume 보존)
   */
  updateSource(key, updates = {}) {
    const request = this.loopRequests.get(key)
    if (request) {
      if (updates.volume !== undefined) {
        request.callVolume = this.clampVolume(updates.volume, request.callVolume)
      }
      if (updates.position) request.position = [...updates.position]
    }

    const loopInfo = this.activeLoops.get(key)
    if (!loopInfo) return

    const { howl, howlerId, baseVolume, busName } = loopInfo

    if (updates.volume !== undefined) {
      loopInfo.callVolume = this.clampVolume(updates.volume, loopInfo.callVolume)
    }

    if (updates.position && loopInfo.spatial) {
      const [x, y, z] = updates.position
      howl.pos(x, y, z, howlerId)
    }
    const busVol = this.busVolumes[busName] ?? 1.0
    const duckFactor = this.getBusDuckFactor(busName)
    const finalVol = calculateInstanceVolume(
      baseVolume,
      busVol * duckFactor,
      loopInfo.callVolume,
      this.preferences.quietMode,
      busName
    )

    howl.volume(finalVol, howlerId)
  }

  /**
   * 특정 루프 fade-out 및 정지
   */
  stopLoop(key, fadeMs = 600, { keepRequest = false } = {}) {
    const loopInfo = this.activeLoops.get(key)
    if (!keepRequest) this.loopRequests.delete(key)
    if (!loopInfo) return

    const { howl, howlerId } = loopInfo
    this.activeLoops.delete(key)

    if (fadeMs > 0) {
      howl.fade(howl.volume(howlerId), 0, fadeMs, howlerId)
      this.setTimeoutFn(() => {
        try { howl.stop(howlerId) } catch (err) { void err }
      }, fadeMs + 50)
    } else {
      try { howl.stop(howlerId) } catch (err) { void err }
    }
  }

  pauseAllLoops() {
    for (const loopInfo of this.activeLoops.values()) {
      if (loopInfo.pausedByManager) continue
      try { loopInfo.howl.pause(loopInfo.howlerId) } catch (err) { void err }
      loopInfo.pausedByManager = true
    }
  }

  resumeAllLoops() {
    for (const loopInfo of this.activeLoops.values()) {
      const def = getSoundDefinition(loopInfo.soundId)
      if (!loopInfo.pausedByManager || !this.canPlayDefinition(def)) continue
      try {
        const resumedId = loopInfo.howl.play(loopInfo.howlerId)
        if (resumedId === null || resumedId === undefined) {
          throw new Error('Howler did not resume the requested loop instance.')
        }
        loopInfo.pausedByManager = false
      } catch (error) {
        // handlePlayError가 activeLoops만 제거하고 loopRequests는 보존한다.
        // 현재 reconcile의 다음 단계 또는 다음 제스처에서 새 ID로 재시도된다.
        this.handlePlayError(
          loopInfo.soundId,
          loopInfo.howlerId,
          error,
          loopInfo.howl,
        )
      }
    }
  }

  stopAllLoops(immediate = false) {
    for (const key of Array.from(this.loopRequests.keys())) {
      this.stopLoop(key, immediate ? 0 : 600)
    }
  }

  restartSpatialLoops() {
    for (const [key, request] of Array.from(this.loopRequests.entries())) {
      const def = getSoundDefinition(request.soundId)
      if (!def?.spatial) continue
      this.stopLoop(key, 0, { keepRequest: true })
      this.startLoopRequest(key, request)
    }
  }

  /**
   * 활성 루프 볼륨 일괄 재계산 (callVolume 보존 계산)
   */
  recalculateLoopVolumes() {
    for (const loopInfo of this.activeLoops.values()) {
      const { howl, howlerId, baseVolume, busName, callVolume } = loopInfo
      const busVol = this.busVolumes[busName] ?? 1.0
      const duckFactor = this.getBusDuckFactor(busName)
      const finalVol = calculateInstanceVolume(
        baseVolume,
        busVol * duckFactor,
        callVolume,
        this.preferences.quietMode,
        busName
      )
      howl.volume(finalVol, howlerId)
    }
  }

  /**
   * 3D Listener 위치 및 방향 설정
   */
  setListenerTransform({ position, forward, up }) {
    if (!position || !forward || !up) return
    if (!this.frontierAssetsReady || this.preferences.reducedSpatial) return

    try {
      this.howler.pos(position[0], position[1], position[2])
      this.howler.orientation(forward[0], forward[1], forward[2], up[0], up[1], up[2])
    } catch (err) {
      console.warn('[SoundManager] Listener transform error:', err)
    }
  }

  // --- 기존 하위 호환 메서드 ---
  playCorrect(volumeMultiplier = 1) {
    return this.play('correct', { volumeMultiplier })
  }

  playWrong(volumeMultiplier = 1) {
    return this.play('wrong', { volumeMultiplier })
  }

  playClick() {
    return this.play('click')
  }

  playCrystal() {
    return this.play('crystal')
  }

  playLevelUp() {
    return this.play('levelUp')
  }

  playWarp() {
    return this.play('warp')
  }

  toggleMute() {
    this.isMuted = !this.isMuted
    this.reconcilePlaybackState()
    return this.isMuted
  }

  setVolume(volume) {
    this.howler.volume(this.clampVolume(volume, 1))
  }

  destroy() {
    this.stopAllLoops(true)
    for (const voiceId of Array.from(this.activeVoices.keys())) this.stopVoice(voiceId)
    for (const timer of this.scopeUnloadTimers.values()) this.clearTimeoutFn(timer)
    this.scopeUnloadTimers.clear()
    this.lifecycleCleanups.splice(0).forEach((cleanup) => cleanup())
    for (const meta of this.howlMeta.values()) {
      try { meta.howl.unload() } catch (err) { void err }
    }
    this.howlCache.clear()
    this.howlMeta.clear()
  }

  getDebugStatus() {
    return {
      unlocked: this.unlocked,
      currentScope: this.currentScope,
      activeScopes: Array.from(this.activeScopes),
      disabledSounds: Array.from(this.disabledSounds),
      activeLoopsCount: this.activeLoops.size,
      activeVoicesCount: this.activeVoices.size,
      pendingLoopsCount: this.loopRequests.size,
      howlCacheSize: this.howlCache.size,
      frontierAssetsReady: this.frontierAssetsReady,
      failedSources: Array.from(this.failedSources),
      busVolumes: { ...this.busVolumes },
      preferences: { ...this.preferences },
    }
  }
}

// 싱글톤 인스턴스
const soundManager = new SoundManager()

export default soundManager
