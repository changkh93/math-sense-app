import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { collection, doc, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { deleteObject, getDownloadURL, ref as createStorageRef, uploadBytes } from 'firebase/storage'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import {
  ArrowLeft,
  Backpack,
  Bot,
  Building2,
  Camera,
  Check,
  ChevronRight,
  CircleUserRound,
  Compass,
  Cpu,
  DoorOpen,
  Droplets,
  Egg,
  Eye,
  Flower2,
  Gem,
  Gift,
  Globe2,
  Hammer,
  HeartHandshake,
  Home,
  Leaf,
  LockKeyhole,
  Map,
  MapPin,
  MessageCircle,
  Orbit,
  Package,
  Palette,
  Pickaxe,
  Radio,
  RadioTower,
  Rocket,
  Route,
  Satellite,
  SatelliteDish,
  ScanLine,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Sprout,
  Star,
  SunMedium,
  Telescope,
  TimerReset,
  Trees,
  Users,
  Waves,
  Warehouse,
  Wrench,
  X,
  Zap,
} from 'lucide-react'
import { db, functions, storage } from '../../firebase'
import { useGalaxyWorldPresence } from '../../hooks/useGalaxyWorldPresence'
import {
  GALAXY_ABILITIES,
  GALAXY_PLAY_STYLES,
  GALAXY_THEMES,
  MATERIAL_LABELS,
  formatGalaxyRoverRemainingTime,
  formatGalaxyTime,
  getGalaxyRoverStatus,
  getMissionCooldown,
} from '../../utils/galaxyGame'
import { compressImage } from '../../utils/storageUtils'
import GalaxyObjectDialog from './GalaxyObjectDialog'
import GalaxyRoverPanel from './GalaxyRoverPanel'
import { BUILD_RADIUS, isBridgeDeck, isRiverWater, terrainSlope } from './GalaxyTerrainModel'
import GalaxyWorld3D, { StructurePreview3D } from './GalaxyWorld3D'
import './MetaGalaxy.css'

const callGalaxy = (name, payload = {}) => httpsCallable(functions, name)(payload).then((result) => result.data)

const createOperationId = () => globalThis.crypto?.randomUUID?.()
  || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`

const VISIT_MESSAGES = [
  '새로운 풍경이 정말 멋져!',
  '다음 탐사도 같이 가자!',
  '정원을 조금 돌보고 갔어.',
  '이 행성의 색 조합이 좋아!',
]

const THEME_ICONS = {
  forest: Trees,
  ocean: Waves,
  crystal: Gem,
  desert: SunMedium,
  mechanical: Cpu,
  ice: Snowflake,
}

const STYLE_ICONS = {
  decorate: Palette,
  explore: Compass,
  collect: Package,
  cooperate: HeartHandshake,
  photo: Camera,
}

const ABILITY_ICONS = {
  detection: ScanLine,
  endurance: TimerReset,
  precision: MapPin,
  pioneering: Sprout,
  communication: Radio,
  piloting: Rocket,
  construction: Hammer,
}

const ABILITY_EFFECTS = {
  detection: 'Lv.4부터 성운 생태 항로의 바이오 섬유를 1개 더 회수합니다.',
  endurance: '연속 학습 기록이 길어질수록 항해 지속력 등급이 성장합니다.',
  precision: 'Lv.4부터 고대 정거장의 수정 유리를 1개 더 복원합니다.',
  pioneering: '주간 성장 기록을 행성 개척 등급으로 보존합니다.',
  communication: '도움과 질문 기록을 교신 공명 등급으로 보존합니다.',
  piloting: 'Lv.4부터 혜성 구조 항로의 합금을 1개 더 회수합니다.',
  construction: '학습으로 모은 누적 광석이 대형 건조 등급을 높입니다.',
}

const ITEM_ICONS = {
  star_lamp: Star,
  lumen_tree: Trees,
  crystal_pond: Droplets,
  rover_bay: Wrench,
  observatory: Telescope,
  friend_greenhouse: HeartHandshake,
  prism_pathlight: Route,
  starflower_garden: Flower2,
  creature_habitat: Egg,
  signal_plaza: RadioTower,
  expedition_beacon: SatelliteDish,
  route_gateway: Orbit,
  starter_dome: Building2,
  wild_sprout: Sprout,
}

const EVENT_ICONS = {
  water: Droplets,
  repair: Wrench,
  feed: Sprout,
  admire: Sparkles,
  relay: Rocket,
}

const MATERIAL_ICONS = {
  stardust: Sparkles,
  biofiber: Leaf,
  crystalGlass: Gem,
  alloy: Package,
}

const DAILY_EVENT_ICONS = {
  lumen_bloom: Leaf,
  crystal_rain: Gem,
  signal_blackout: RadioTower,
  meteor_debris: Package,
}

const STRUCTURE_VISIT_ACTIONS = {
  starter_dome: { actionId: 'repair', label: '개척자 돔 점검 미션' },
  lumen_tree: { actionId: 'water', label: '이 객체에 물주기 미션' },
  crystal_pond: { actionId: 'water', label: '물가 생태 돌보기 미션' },
  friend_greenhouse: { actionId: 'water', label: '공동 온실 물주기 미션' },
  starflower_garden: { actionId: 'water', label: '별꽃 정원 물주기 미션' },
  wild_sprout: { actionId: 'water', label: '루멘 새싹 물주기 미션' },
  rover_bay: { actionId: 'repair', label: '로버 정비소 수리 미션' },
  observatory: { actionId: 'repair', label: '관측 장치 수리 미션' },
  expedition_beacon: { actionId: 'repair', label: '원정 비콘 수리 미션' },
  prism_pathlight: { actionId: 'repair', label: '프리즘 길잡이 점검 미션' },
  creature_habitat: { actionId: 'feed', label: '루미 생명체 돌보기 미션' },
}

const getStructureVisitAction = (itemId) => STRUCTURE_VISIT_ACTIONS[itemId]
  || { actionId: 'admire', label: '이 객체에 감탄 신호 남기기' }

const OBJECT_FALLBACK_CATALOG = {
  starter_dome: {
    name: '개척자 돔',
    description: '아스트라 프론티어에 처음 도착한 탐험가의 귀환 거점입니다.',
    effect: '행성의 중심과 안전한 귀환 지점을 표시합니다.',
  },
  wild_sprout: {
    name: '루멘 새싹',
    description: '직접 심어 행성의 흙에서 자라기 시작한 작은 발광 식물입니다.',
    effect: '행성의 생태 기억과 정원 활력을 보여줍니다.',
  },
}

const BUILD_ITEM_STORIES = {
  star_lamp: {
    overline: '첫 귀환의 빛',
    promise: '밤의 착륙장을 밝혀 친구가 가장 먼저 발견하는 랜드마크가 됩니다.',
    effect: '행성의 귀환 광장에 빛과 방향성을 더합니다.',
    set: '별빛 정착 세트',
  },
  lumen_tree: {
    overline: '살아 있는 풍경',
    promise: '시간이 흐를수록 빛을 머금는 나무로 생태 구역의 중심을 만듭니다.',
    effect: '친구가 물주기 신호를 남길 수 있는 생태 지점을 만듭니다.',
    set: '루멘 생태 세트',
  },
  crystal_pond: {
    overline: '전시하고 싶은 장소',
    promise: '행성의 하늘빛을 비추는 연못으로 사진 명소와 휴식 공간을 만듭니다.',
    effect: '수정 지형의 시각적 밀도와 생태 구역의 분위기를 높입니다.',
    set: '프리즘 정원 세트',
  },
  rover_bay: {
    overline: '새로운 놀이의 출발점',
    promise: '탐사 로버가 돌아와 정비를 받는 기지를 세워 원정의 목적지를 만듭니다.',
    effect: '장거리 로버 원정 시간을 8시간에서 6시간으로 단축합니다.',
    set: '개척 탐사 세트',
  },
  observatory: {
    overline: '행성의 대표 실루엣',
    promise: '먼 성운을 바라보는 높은 관측소로 친구에게 보여줄 랜드마크를 세웁니다.',
    effect: '고대 정거장과 성운 항로를 상징하는 탐사 거점을 만듭니다.',
    set: '심우주 관측 세트',
  },
  friend_greenhouse: {
    overline: '친구가 머무는 이유',
    promise: '방문한 친구가 직접 돌보고 흔적을 남길 수 있는 공동 온실입니다.',
    effect: '물주기와 귀환 신호가 자연스럽게 이어지는 소셜 거점을 만듭니다.',
    set: '항로 우정 세트',
  },
}

const FALLBACK_BUILD_STORY = {
  overline: '새로운 행성 기억',
  promise: '빈 공간을 나만의 이야기와 친구에게 보여줄 풍경으로 바꿉니다.',
  effect: '행성의 개척도를 높이고 새로운 동선을 만듭니다.',
  set: '아스트라 개척 세트',
}

const MENU_META = {
  rover: { overline: 'OFFLINE EXPEDITION', title: '루미 로버 원정 관제', Icon: Satellite },
  build: { overline: 'PLANET CONSTRUCTION', title: '욕망을 여는 건설 설계소', Icon: Hammer },
  neighbors: { overline: 'CONNECTED ROUTES', title: '이웃 항로 은하 지도', Icon: Route },
  logs: { overline: 'RETURN SIGNALS', title: '귀환 신호 타임라인', Icon: Radio },
  passport: { overline: 'EXPLORER IDENTITY', title: '탐험가 패스포트', Icon: CircleUserRound },
}

function ThemeGlyph({ themeId, size = 18, ...props }) {
  const Icon = THEME_ICONS[themeId] || Globe2
  return <Icon size={size} aria-hidden="true" {...props} />
}

function StyleGlyph({ styleId, size = 15 }) {
  const Icon = STYLE_ICONS[styleId] || Star
  return <Icon size={size} aria-hidden="true" />
}

function trapDialogFocus(event) {
  if (event.key !== 'Tab') return
  const dialog = event.currentTarget.querySelector('[role="dialog"]')
  if (!dialog) return
  const focusable = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])')]
    .filter((element) => element.getAttribute('aria-hidden') !== 'true')
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  } else if (!dialog.contains(document.activeElement)) {
    event.preventDefault()
    first.focus()
  }
}

function GalaxyLoading() {
  return (
    <div className="galaxy-loading" role="status">
      <span className="galaxy-loader-orbit"><i /></span>
      <strong>아스트라 프론티어로 워프 중</strong>
      <small>학습 보급과 행성 지형을 동기화하고 있습니다.</small>
    </div>
  )
}

function GalaxyLoadError({ message, onRetry }) {
  return (
    <div className="meta-galaxy frontier-immersive">
      <div className="galaxy-loading" role="alert" aria-live="assertive" aria-atomic="true">
        <span className="frontier-empty-icon"><RadioTower size={30} aria-hidden="true" /></span>
        <strong>행성 신호를 연결하지 못했습니다</strong>
        <small>{message || '은하 통신이 잠시 끊어졌습니다.'}</small>
        <button type="button" className="galaxy-primary-btn" onClick={onRetry}>
          <Radio size={17} aria-hidden="true" /> 행성 신호 다시 연결
        </button>
      </div>
    </div>
  )
}

function MaterialStrip({ materials = {}, compact = false }) {
  return (
    <div className={`galaxy-material-strip${compact ? ' compact' : ''}`} aria-label="게임 재료">
      {Object.entries(MATERIAL_LABELS).map(([id, label]) => {
        const Icon = MATERIAL_ICONS[id] || Package
        return (
          <span key={id} title={label}>
            {compact ? <Icon size={14} aria-hidden="true" /> : <i className={`material-dot ${id}`} />}
            {!compact && label}
            <strong>{Number(materials[id] || 0)}</strong>
          </span>
        )
      })}
    </div>
  )
}

function PassportEditor({ planet, onSave, busy }) {
  const [form, setForm] = useState(() => ({
    planetName: planet?.planetName || '',
    tagline: planet?.tagline || '',
    theme: planet?.theme || 'forest',
    playStyles: planet?.playStyles || [],
    visitMode: planet?.visitMode || 'crew',
  }))

  const toggleStyle = (style) => {
    setForm((current) => {
      const active = current.playStyles.includes(style)
      if (!active && current.playStyles.length >= 3) return current
      return { ...current, playStyles: active ? current.playStyles.filter((id) => id !== style) : [...current.playStyles, style] }
    })
  }

  return (
    <form className="galaxy-passport-editor" onSubmit={(event) => { event.preventDefault(); onSave(form) }}>
      <label>
        <span>행성 이름</span>
        <input value={form.planetName} maxLength={30} onChange={(event) => setForm({ ...form, planetName: event.target.value })} />
      </label>
      <label>
        <span>방문자에게 보여줄 한마디</span>
        <input value={form.tagline} maxLength={80} onChange={(event) => setForm({ ...form, tagline: event.target.value })} />
      </label>
      <fieldset>
        <legend>행성 기후</legend>
        <div className="passport-choice-grid themes">
          {Object.entries(GALAXY_THEMES).map(([id, theme]) => (
            <button type="button" key={id} className={form.theme === id ? 'active' : ''} onClick={() => setForm({ ...form, theme: id })}>
              <ThemeGlyph themeId={id} size={16} />
              {theme.label}
              {form.theme === id && <Check size={14} aria-hidden="true" />}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>나의 게임 취향 · 최대 3개</legend>
        <div className="passport-choice-grid">
          {Object.entries(GALAXY_PLAY_STYLES).map(([id, style]) => (
            <button type="button" key={id} className={form.playStyles.includes(id) ? 'active' : ''} onClick={() => toggleStyle(id)}>
              <StyleGlyph styleId={id} />
              {style.label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="passport-visit-toggle">
        <span>
          <strong>크루 도움 행동 허용</strong>
          <small>같은 크루 친구가 월드를 둘러보고 안전한 도움 신호를 남길 수 있어요.</small>
        </span>
        <input type="checkbox" checked={form.visitMode === 'crew'} onChange={(event) => setForm({ ...form, visitMode: event.target.checked ? 'crew' : 'private' })} />
      </label>
      <button className="galaxy-primary-btn" type="submit" disabled={busy === 'passport'}>
        {busy === 'passport' ? '기록 중…' : '패스포트 저장'}
      </button>
    </form>
  )
}

function BriefingCard({ Icon, overline, title, detail, accent = false }) {
  return (
    <article className={`frontier-briefing-card${accent ? ' frontier-briefing-card--objective' : ''}`}>
      <span className="frontier-briefing-icon">{createElement(Icon, { size: 20, 'aria-hidden': true })}</span>
      <div>
        <small>{overline}</small>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
    </article>
  )
}

function getConnectionSummary(neighbor, events) {
  if (Number.isFinite(Number(neighbor.routeLevel))) {
    const connectionXp = Math.max(0, Number(neighbor.connectionXp || 0))
    const nextLevelXp = Math.max(1, Number(neighbor.nextLevelXp || 1))
    return {
      signalCount: Math.max(0, Number(neighbor.interactionCount || 0)),
      level: Math.min(5, Math.max(1, Number(neighbor.routeLevel || 1))),
      percent: Number(neighbor.routeLevel || 1) >= 5 ? 100 : Math.min(100, Math.round((connectionXp / nextLevelXp) * 100)),
    }
  }
  const signalCount = events.filter((event) => event.actorId === neighbor.uid).length
  const level = Math.min(5, 1 + Math.floor(signalCount / 2))
  const percent = Math.min(100, 16 + signalCount * 14 + Math.max(1, Number(neighbor.shipHullTier || 1)) * 3)
  return { signalCount, level, percent }
}

export default function MetaGalaxy({ user, userData, onBack }) {
  const [home, setHome] = useState(null)
  const [targetUid, setTargetUid] = useState(user?.uid || '')
  const [menu, setMenu] = useState('')
  const [arrivalOpen, setArrivalOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedStructureId, setSelectedStructureId] = useState('')
  const [objectDialogOpen, setObjectDialogOpen] = useState(false)
  const [selectedBuildItem, setSelectedBuildItem] = useState('')
  const [focusedBuildItemId, setFocusedBuildItemId] = useState('')
  const [visitMessage, setVisitMessage] = useState(VISIT_MESSAGES[0])
  const [missionPartnerUid, setMissionPartnerUid] = useState('')
  const [nowMs, setNowMs] = useState(Date.now())
  const noticeTimerRef = useRef(null)
  const actionLockRef = useRef('')
  const arrivalCloseRef = useRef(null)
  const menuCloseRef = useRef(null)
  const objectDialogCloseRef = useRef(null)
  const restoreFocusRef = useRef(null)
  const activeOverlayRef = useRef('')
  const isOwner = targetUid === user?.uid
  const overlayReady = !loading && Boolean(home)
  const sendSpeechRequest = useCallback((payload) => callGalaxy('sendGalaxyWorldSpeech', payload), [])
  const liveSessionEnabled = Boolean(
    overlayReady
    && home?.liveSession?.granted
    && home.liveSession.roomOwnerUid === targetUid
    && Number(home.liveSession.expiresAtMs || 0) > nowMs + Number(home.serverClockOffsetMs || 0),
  )
  const {
    remotePlayers,
    ownSpeech,
    isConnected: liveConnected,
    presenceError,
    updatePosition: updateLivePosition,
    sendSpeech,
  } = useGalaxyWorldPresence({
    enabled: liveSessionEnabled,
    roomOwnerUid: targetUid,
    uid: user?.uid || '',
    displayName: home?.liveSession?.displayName || home?.ownPlanet?.ownerName || userData?.publicDisplayName || userData?.name || '탐사원',
    sendSpeechRequest,
  })

  const loadHome = useCallback(async (nextTargetUid = user?.uid, { quiet = false } = {}) => {
    if (!user?.uid) {
      setLoading(false)
      return
    }
    if (!quiet) setLoading(true)
    setError('')
    try {
      const clientSentAtMs = Date.now()
      const data = await callGalaxy('openGalaxyHome', { targetUid: nextTargetUid })
      const clientReceivedAtMs = Date.now()
      const serverClockOffsetMs = Number.isFinite(Number(data?.serverNowMs))
        ? Number(data.serverNowMs) - Math.round((clientSentAtMs + clientReceivedAtMs) / 2)
        : 0
      setHome({ ...data, serverClockOffsetMs })
      setTargetUid(nextTargetUid || user.uid)
    } catch (err) {
      setError(err?.message || '행성 신호를 불러오지 못했습니다.')
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [user?.uid])

  useEffect(() => { loadHome(user?.uid) }, [loadHome, user?.uid])

  useEffect(() => {
    if (!user?.uid) return undefined
    return onSnapshot(doc(db, 'galaxyPlanets', user.uid), (snapshot) => {
      if (!snapshot.exists()) return
      const nextOwnPlanet = { id: snapshot.id, ...snapshot.data() }
      setHome((current) => current ? {
        ...current,
        ownPlanet: nextOwnPlanet,
        ...(targetUid === user.uid ? { planet: nextOwnPlanet } : {}),
      } : current)
    }, (snapshotError) => setError(snapshotError?.message || '내 행성의 실시간 신호가 끊어졌습니다.'))
  }, [targetUid, user?.uid])

  useEffect(() => {
    if (!targetUid || targetUid === user?.uid) return undefined
    return onSnapshot(doc(db, 'galaxyPlanets', targetUid), (snapshot) => {
      if (!snapshot.exists()) return
      const nextPlanet = { id: snapshot.id, ...snapshot.data() }
      setHome((current) => current ? { ...current, planet: nextPlanet } : current)
    }, (snapshotError) => setError(snapshotError?.message || '이웃 행성의 실시간 신호가 끊어졌습니다.'))
  }, [targetUid, user?.uid])

  useEffect(() => {
    if (!user?.uid) return undefined
    return onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (!snapshot.exists()) return
      const nextWallet = Math.max(0, Number(snapshot.data()?.crystals || 0))
      setHome((current) => current ? { ...current, wallet: nextWallet } : current)
    })
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) return undefined
    const eventQuery = query(collection(db, 'galaxyPlanets', user.uid, 'visitEvents'), orderBy('createdAt', 'desc'), limit(30))
    return onSnapshot(eventQuery, (snapshot) => {
      const events = snapshot.docs.map((eventDoc) => ({
        id: eventDoc.id,
        ...eventDoc.data(),
        createdAt: eventDoc.data()?.createdAt?.toDate?.()?.toISOString?.() || '',
      }))
      setHome((current) => current ? { ...current, events } : current)
    }, (snapshotError) => setError(snapshotError?.message || '귀환 신호를 실시간으로 불러오지 못했습니다.'))
  }, [user?.uid])

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 15000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!home?.liveSession?.granted || home.liveSession.roomOwnerUid !== targetUid || !user?.uid) return undefined
    let cancelled = false
    const renew = async () => {
      try {
        const result = await callGalaxy('renewGalaxyWorldSession', { roomOwnerUid: targetUid })
        if (cancelled || !result?.liveSession) return
        setHome((current) => current && current.liveSession?.roomOwnerUid === targetUid
          ? { ...current, liveSession: result.liveSession }
          : current)
      } catch (renewError) {
        console.warn('Failed to renew galaxy live session', renewError)
      }
    }
    const timer = window.setInterval(renew, 2 * 60 * 1000)
    const handleFocus = () => {
      const estimatedServerNowMs = Date.now() + Number(home.serverClockOffsetMs || 0)
      if (Number(home.liveSession.expiresAtMs || 0) - estimatedServerNowMs < 90 * 1000) renew()
    }
    window.addEventListener('focus', handleFocus)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', handleFocus)
    }
  }, [home?.liveSession?.expiresAtMs, home?.liveSession?.granted, home?.liveSession?.roomOwnerUid, home?.serverClockOffsetMs, targetUid, user?.uid])

  useEffect(() => () => window.clearTimeout(noticeTimerRef.current), [])

  useEffect(() => {
    const nextOverlay = overlayReady ? (objectDialogOpen ? 'object' : arrivalOpen ? 'arrival' : menu ? 'menu' : '') : ''
    const previousOverlay = activeOverlayRef.current
    let frameId = 0

    if (nextOverlay && !previousOverlay) {
      const activeElement = document.activeElement
      restoreFocusRef.current = activeElement && typeof activeElement.focus === 'function' ? activeElement : null
    }

    activeOverlayRef.current = nextOverlay
    if (nextOverlay) {
      frameId = window.requestAnimationFrame(() => {
        const closeButton = nextOverlay === 'object'
          ? objectDialogCloseRef.current
          : nextOverlay === 'arrival'
            ? arrivalCloseRef.current
            : menuCloseRef.current
        closeButton?.focus()
      })
    } else if (previousOverlay) {
      const previousFocus = restoreFocusRef.current
      restoreFocusRef.current = null
      frameId = window.requestAnimationFrame(() => {
        if (previousFocus?.isConnected) previousFocus.focus()
      })
    }

    return () => window.cancelAnimationFrame(frameId)
  }, [arrivalOpen, menu, objectDialogOpen, overlayReady])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      if (objectDialogOpen) {
        setObjectDialogOpen(false)
        setSelectedStructureId('')
      }
      else if (arrivalOpen) setArrivalOpen(false)
      else if (menu) setMenu('')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [arrivalOpen, menu, objectDialogOpen])

  const planet = home?.planet || {}
  const ownPlanet = home?.ownPlanet || {}
  const events = useMemo(() => home?.events || [], [home?.events])
  const neighbors = home?.neighbors || []
  const catalog = home?.catalog || {}
  const planetLayout = Array.isArray(planet.layout) ? planet.layout : []
  const selectedObject = selectedStructureId
    ? planetLayout.find((item) => item?.instanceId === selectedStructureId) || null
    : null
  const selectedObjectCatalog = selectedObject
    ? catalog[selectedObject.itemId] || OBJECT_FALLBACK_CATALOG[selectedObject.itemId] || {}
    : {}
  const selectedObjectMission = selectedObject ? getStructureVisitAction(selectedObject.itemId) : null
  const dailyEvent = isOwner ? home?.dailyEvent || null : null
  const dailyEventPending = dailyEvent?.status === 'pending'
  const unreadCount = events.filter((event) => !event.seen).length
  const wallet = Math.max(0, Number(home?.wallet ?? userData?.crystals ?? 0))
  const galaxyNowMs = nowMs + Number(home?.serverClockOffsetMs || 0)

  useEffect(() => {
    if (!objectDialogOpen || selectedObject) return
    setObjectDialogOpen(false)
    setSelectedStructureId('')
  }, [objectDialogOpen, selectedObject])

  useEffect(() => {
    if (!isOwner || !dailyEvent?.expiresAtMs || !user?.uid) return undefined
    const serverAdjustedNowMs = Date.now() + Number(home?.serverClockOffsetMs || 0)
    const refreshDelayMs = Math.max(1000, Number(dailyEvent.expiresAtMs) - serverAdjustedNowMs + 1200)
    const timer = window.setTimeout(() => loadHome(user.uid, { quiet: true }), refreshDelayMs)
    return () => window.clearTimeout(timer)
  }, [dailyEvent?.dayKey, dailyEvent?.expiresAtMs, home?.serverClockOffsetMs, isOwner, loadHome, user?.uid])

  const missionCooldown = getMissionCooldown(ownPlanet.lastMissionAtMs, galaxyNowMs)
  const currentTheme = GALAXY_THEMES[planet.theme] || GALAXY_THEMES.forest
  const ownTheme = GALAXY_THEMES[ownPlanet.theme] || GALAXY_THEMES.forest
  const ownLayout = Array.isArray(ownPlanet.layout) ? ownPlanet.layout : []
  const roverExpedition = ownPlanet.roverExpedition || null
  const roverStatus = getGalaxyRoverStatus(roverExpedition, galaxyNowMs)
  const roverReadyAtMs = Number(roverExpedition?.returnsAtMs || roverExpedition?.readyAtMs || 0)
  const roverRemainingLabel = formatGalaxyRoverRemainingTime(Math.max(0, roverReadyAtMs - galaxyNowMs))
  const hasRoverBay = ownLayout.some((item) => item?.itemId === 'rover_bay' && item?.locked !== true)
  const hasExpeditionBeacon = ownLayout.some((item) => item?.itemId === 'expedition_beacon' && item?.locked !== true)
  const roverStatusLabel = roverStatus === 'ready'
    ? '귀환 상자 수신하기'
    : roverStatus === 'active'
      ? `귀환 ${roverRemainingLabel}`
      : roverStatus === 'claimed'
        ? '다음 원정 준비'
        : '장거리 원정 준비'
  const builtCount = ownLayout.filter((item) => !item.locked && item.itemId !== 'wild_sprout').length
  const catalogEntries = Object.entries(catalog)
  const effectiveFocusedBuildItemId = focusedBuildItemId && catalog[focusedBuildItemId] ? focusedBuildItemId : catalogEntries[0]?.[0] || ''
  const focusedBuildItem = catalog[effectiveFocusedBuildItemId]
  const focusedBuildStoryBase = BUILD_ITEM_STORIES[effectiveFocusedBuildItemId] || FALLBACK_BUILD_STORY
  const focusedBuildStory = focusedBuildItem ? {
    ...focusedBuildStoryBase,
    promise: focusedBuildItem.description || focusedBuildStoryBase.promise,
    effect: focusedBuildItem.effect || focusedBuildStoryBase.effect,
    set: focusedBuildItem.setName || focusedBuildStoryBase.set,
  } : focusedBuildStoryBase

  const todayObjective = useMemo(() => {
    if (isOwner && roverStatus === 'ready') return {
      id: 'rover-return',
      eyebrow: '오늘의 최우선 귀환 임무',
      title: '로버 귀환 상자를 열어 발견물을 확인하세요',
      detail: '서버에 보존된 원정 재료와 새로운 발견 기록을 한 번만 안전하게 수령합니다.',
      progress: 1,
      total: 1,
      action: 'rover',
    }
    if (unreadCount > 0) return {
      id: 'signals',
      eyebrow: '오늘의 귀환 임무',
      title: `새 신호 ${unreadCount}개를 확인하세요`,
      detail: '친구가 남긴 도움과 메시지를 확인하면 새로운 항로의 다음 행동이 열립니다.',
      progress: 0,
      total: unreadCount,
      action: 'logs',
    }
    if (dailyEventPending) return {
      id: 'daily-event',
      eyebrow: '밤사이 발생한 행성 사건',
      title: dailyEvent.title || '행성 현장에 새로운 변화가 감지됐어요',
      detail: dailyEvent.detail || '미니맵의 빛나는 사건 표식을 따라가 현장을 안정시켜 주세요.',
      progress: 0,
      total: 1,
      action: 'daily-event',
    }
    if (builtCount === 0 && wallet >= 25) return {
      id: 'first-build',
      eyebrow: '오늘의 개척 임무',
      title: '행성의 첫 랜드마크를 건설하세요',
      detail: '시설 하나가 생기면 친구가 기억할 장소와 다음 꾸미기 동선이 시작됩니다.',
      progress: 0,
      total: 1,
      action: 'build',
    }
    if (isOwner && ['idle', 'claimed'].includes(roverStatus)) return {
      id: 'rover-dispatch',
      eyebrow: '오늘의 장거리 원정',
      title: '밤사이 탐사할 로버 항로를 선택하세요',
      detail: `지금 출항하면 ${hasRoverBay ? '6시간' : '8시간'} 뒤 재료와 발견 기록이 귀환합니다. 게임을 닫아도 원정은 계속됩니다.`,
      progress: 0,
      total: 1,
      action: 'rover',
    }
    if (missionCooldown.ready) return {
      id: 'field-expedition',
      eyebrow: '오늘의 현장 탐사',
      title: '탐사 관문에서 신호 조각 5개를 회수하세요',
      detail: '원하는 항로를 선택하고 월드 곳곳의 조각을 모아 희귀 건설 재료를 확보하세요.',
      progress: 0,
      total: 5,
      action: 'world',
    }
    if (isOwner && roverStatus === 'active') return {
      id: 'rover-active',
      eyebrow: '장거리 원정 진행 중',
      title: `로버가 ${roverRemainingLabel} 돌아옵니다`,
      detail: '원정이 진행되는 동안 행성을 건설하거나 이웃 항로에 도움 신호를 남겨보세요.',
      progress: 0,
      total: 1,
      action: 'rover',
    }
    return {
      id: 'route-care',
      eyebrow: '오늘의 항로 임무',
      title: isOwner ? '행성을 돌보고 다음 귀환을 준비하세요' : '친구의 행성에 도움 신호를 남기세요',
      detail: isOwner ? `현장 탐사 관문 재충전까지 ${missionCooldown.label}` : '가까운 생태·시설 지점에서 안전한 도움 행동을 남길 수 있습니다.',
      progress: 0,
      total: 1,
      action: isOwner ? 'build' : 'world',
    }
  }, [builtCount, dailyEvent?.detail, dailyEvent?.title, dailyEventPending, hasRoverBay, isOwner, missionCooldown.label, missionCooldown.ready, roverRemainingLabel, roverStatus, unreadCount, wallet])

  const overnightSummary = useMemo(() => {
    if (dailyEventPending) return `${dailyEvent.title} ${dailyEvent.detail || '현장의 신호를 따라가 오늘의 변화를 해결해 주세요.'}`
    if (dailyEvent?.status === 'completed') return `${dailyEvent.title || '오늘의 행성 사건'}을 해결해 행성의 흐름이 다시 안정됐습니다.`
    const latestEvent = events[0]
    if (latestEvent) return `${latestEvent.actorName || '이웃 탐사원'}이 ${latestEvent.actionLabel || '새 신호'} 기록을 남겼습니다.`
    const visitCount = Math.max(0, Number(ownPlanet.stats?.visits || 0))
    return visitCount > 0
      ? `지금까지 ${visitCount}명의 탐사원이 이 행성의 기억을 지나갔습니다.`
      : '첫 방문 신호를 기다리며 귀환등이 조용히 항로를 밝히고 있습니다.'
  }, [dailyEvent?.detail, dailyEvent?.status, dailyEvent?.title, dailyEventPending, events, ownPlanet.stats?.visits])

  const flash = useCallback((message) => {
    setNotice(message)
    window.clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = window.setTimeout(() => setNotice(''), 3600)
  }, [])

  const runAction = useCallback(async (key, fn, successMessage) => {
    if (actionLockRef.current) return null
    actionLockRef.current = key
    setBusy(key)
    setError('')
    try {
      const result = await fn()
      if (successMessage) flash(typeof successMessage === 'function' ? successMessage(result) : successMessage)
      return result
    } catch (err) {
      setError(err?.message || '프론티어 통신 중 문제가 발생했습니다.')
      return null
    } finally {
      if (actionLockRef.current === key) actionLockRef.current = ''
      setBusy((current) => current === key ? '' : current)
    }
  }, [flash])

  const openObjectDialog = useCallback((item) => {
    if (!item?.instanceId) return
    setSelectedStructureId(item.instanceId)
    setSelectedBuildItem('')
    setMenu('')
    setArrivalOpen(false)
    setObjectDialogOpen(true)
  }, [])

  const closeObjectDialog = useCallback(() => {
    setObjectDialogOpen(false)
    setSelectedStructureId('')
  }, [])

  const visitNeighbor = async (neighborUid) => {
    setSelectedStructureId('')
    setObjectDialogOpen(false)
    setSelectedBuildItem('')
    setMenu('')
    await loadHome(neighborUid)
  }

  const saveGalaxyObject = async ({ name, description, worldX, worldZ, rotation, imageFile, removeImage }) => {
    if (!isOwner || !selectedObject?.instanceId) return null
    const numericWorldX = Number(worldX)
    const numericWorldZ = Number(worldZ)
    const currentWorldX = (Number(selectedObject.x || 50) - 50) / 3
    const currentWorldZ = (Number(selectedObject.y || 50) - 50) / 3
    const positionChanged = Math.hypot(numericWorldX - currentWorldX, numericWorldZ - currentWorldZ) > .01
    if (
      !Number.isFinite(numericWorldX) || !Number.isFinite(numericWorldZ)
      || (positionChanged && (
        Math.hypot(numericWorldX, numericWorldZ) > BUILD_RADIUS
        || isRiverWater(numericWorldX, numericWorldZ)
        || isBridgeDeck(numericWorldX, numericWorldZ)
        || terrainSlope(numericWorldX, numericWorldZ) > .42
      ))
    ) {
      flash('객체는 강·다리·급경사를 피해 행성의 평평한 건설 구역 안에 배치해 주세요.')
      return null
    }
    const instanceId = selectedObject.instanceId
    let uploadedImageRef = null
    let nextImageUrl = removeImage ? '' : selectedObject.imageUrl || ''
    let nextImagePath = removeImage ? '' : selectedObject.imagePath || ''

    const result = await runAction(
      `object:update:${instanceId}`,
      async () => {
        if (imageFile) {
          let compressed = await compressImage(imageFile, { maxWidth: 1200, quality: .82 })
          if (compressed.size > 2 * 1024 * 1024) compressed = await compressImage(imageFile, { maxWidth: 900, quality: .68 })
          if (compressed.size > 2 * 1024 * 1024) throw new Error('이미지를 2MB 이하로 줄인 뒤 다시 첨부해 주세요.')
          nextImagePath = `galaxy-objects/${user.uid}/${instanceId}/${createOperationId()}.jpg`
          uploadedImageRef = createStorageRef(storage, nextImagePath)
          await uploadBytes(uploadedImageRef, compressed, { contentType: 'image/jpeg' })
          nextImageUrl = await getDownloadURL(uploadedImageRef)
        }
        return callGalaxy('updateGalaxyItem', {
          instanceId,
          name,
          description,
          ...(positionChanged ? { x: 50 + numericWorldX * 3, y: 50 + numericWorldZ * 3 } : {}),
          rotation: Number(rotation),
          imageUrl: nextImageUrl,
          imagePath: nextImagePath,
        })
      },
      '객체 정보와 위치를 저장했습니다.',
    )

    if (!result) {
      if (uploadedImageRef) deleteObject(uploadedImageRef).catch(() => {})
      return null
    }

    const updatedItem = result.item || {
      ...selectedObject,
      name,
      description,
      x: 50 + numericWorldX * 3,
      y: 50 + numericWorldZ * 3,
      rotation: Number(rotation),
      imageUrl: nextImageUrl,
      imagePath: nextImagePath,
    }
    setHome((current) => {
      if (!current) return current
      const updateLayout = (targetPlanet = {}) => ({
        ...targetPlanet,
        layout: (Array.isArray(targetPlanet.layout) ? targetPlanet.layout : []).map((entry) => entry.instanceId === instanceId ? updatedItem : entry),
      })
      const nextOwnPlanet = updateLayout(current.ownPlanet)
      return { ...current, ownPlanet: nextOwnPlanet, planet: targetUid === user.uid ? nextOwnPlanet : current.planet }
    })
    return result
  }

  const deleteGalaxyObject = async (item = selectedObject) => {
    if (!isOwner || !item?.instanceId) return null
    const instanceId = item.instanceId
    const result = await runAction(
      `object:delete:${instanceId}`,
      () => callGalaxy('deleteGalaxyItem', { instanceId }),
      `${item.name || '객체'}를 행성에서 삭제했습니다.`,
    )
    if (!result) return null
    setHome((current) => {
      if (!current) return current
      const removeFromLayout = (targetPlanet = {}) => ({
        ...targetPlanet,
        layout: (Array.isArray(targetPlanet.layout) ? targetPlanet.layout : []).filter((entry) => entry.instanceId !== instanceId),
      })
      const nextOwnPlanet = removeFromLayout(current.ownPlanet)
      return { ...current, ownPlanet: nextOwnPlanet, planet: targetUid === user.uid ? nextOwnPlanet : current.planet }
    })
    closeObjectDialog()
    return result
  }

  const buildItemAt = async (worldX, worldZ) => {
    if (!selectedBuildItem || !isOwner) return
    const itemId = selectedBuildItem
    const operationId = createOperationId()
    const result = await runAction(`build:${itemId}`, () => callGalaxy('buildGalaxyItem', {
      itemId,
      operationId,
      x: 50 + Number(worldX || 0) * 3,
      y: 50 + Number(worldZ || 0) * 3,
    }), (buildResult) => `${buildResult?.placed?.name || '새 시설'}을 이곳에 건설했습니다.`)
    if (!result) return
    setHome((current) => {
      if (!current) return current
      const currentOwnPlanet = current.ownPlanet || {}
      const currentLayout = Array.isArray(currentOwnPlanet.layout) ? currentOwnPlanet.layout : []
      const nextLayout = result.placed && !currentLayout.some((item) => item.instanceId === result.placed.instanceId)
        ? [...currentLayout, result.placed]
        : currentLayout
      const nextOwnPlanet = {
        ...currentOwnPlanet,
        layout: nextLayout,
        materials: result.materials || currentOwnPlanet.materials || {},
      }
      return {
        ...current,
        wallet: Number.isFinite(Number(result.wallet)) ? Number(result.wallet) : current.wallet,
        ownPlanet: nextOwnPlanet,
        planet: targetUid === user?.uid ? nextOwnPlanet : current.planet,
      }
    })
    setSelectedBuildItem('')
  }

  const performVisitAction = async (actionId, node = null) => {
    const result = await runAction(
      `visit:${actionId}`,
      () => callGalaxy('performGalaxyVisitAction', {
        targetUid,
        actionId,
        message: visitMessage,
        ...(node?.id ? { nodeId: node.id, position: node.position } : {}),
      }),
      (result) => result?.rewarded ? '도움이 기록되고 별가루 1개를 발견했습니다.' : '친구의 귀환 로그에 행동을 남겼습니다.',
    )
    if (!result) return null
    setHome((current) => current ? {
      ...current,
      neighbors: (current.neighbors || []).map((neighbor) => neighbor.uid === targetUid ? {
        ...neighbor,
        routeLevel: result.routeLevel ?? neighbor.routeLevel,
        connectionXp: result.connectionXp ?? neighbor.connectionXp,
        nextLevelXp: result.nextLevelXp ?? neighbor.nextLevelXp,
        interactionCount: Math.max(0, Number(neighbor.interactionCount || 0)) + 1,
      } : neighbor),
    } : current)
    return result
  }

  const performObjectMission = async (item = selectedObject) => {
    if (!item?.instanceId) return null
    if (isOwner) {
      flash('내 행성의 객체 정보는 가까이에서 F 키를 눌러 확인할 수 있어요.')
      return null
    }
    const mission = getStructureVisitAction(item.itemId)
    const result = await runAction(
      `object:mission:${item.instanceId}`,
      () => callGalaxy('performGalaxyVisitAction', {
        targetUid,
        actionId: mission.actionId,
        instanceId: item.instanceId,
        message: visitMessage,
      }),
      (missionResult) => missionResult?.rewarded
        ? '객체 도움 미션을 기록하고 별가루 1개를 발견했습니다.'
        : '객체 도움 미션을 친구의 귀환 기록에 남겼습니다.',
    )
    if (!result) return null
    setHome((current) => current ? {
      ...current,
      neighbors: (current.neighbors || []).map((neighbor) => neighbor.uid === targetUid ? {
        ...neighbor,
        routeLevel: result.routeLevel ?? neighbor.routeLevel,
        connectionXp: result.connectionXp ?? neighbor.connectionXp,
        nextLevelXp: result.nextLevelXp ?? neighbor.nextLevelXp,
        interactionCount: Math.max(0, Number(neighbor.interactionCount || 0)) + 1,
      } : neighbor),
    } : current)
    return result
  }

  const performWorldAction = async (node) => {
    if (!node) return
    if (!isOwner) {
      if (planet.visitMode === 'private') {
        flash('이 행성은 지금 조용한 휴식 모드입니다.')
        return
      }
      const visitActionMap = { crystal: 'admire', fiber: 'water', salvage: 'repair', beacon: 'repair', plant: 'feed' }
      return performVisitAction(visitActionMap[node.actionId] || 'admire', node)
    }
    return runAction(`world:${node.id}`, () => callGalaxy('performGalaxyWorldAction', {
      actionId: node.actionId,
      nodeId: node.id,
      x: node.position?.[0] || 0,
      z: node.position?.[2] || 0,
    }), (result) => result?.label || '월드 활동을 완료했습니다.')
  }

  const completeDailyEvent = async (event = dailyEvent) => {
    if (!isOwner || event?.status !== 'pending') return null
    const result = await runAction(
      `daily:${event.eventId || event.type || 'event'}`,
      () => callGalaxy('completeGalaxyDailyEvent', { dayKey: event.dayKey, eventId: event.eventId }),
      (completion) => {
        const reward = completion?.reward || event.reward || {}
        return `${event.title || '오늘의 행성 사건'} 해결 · ${reward.title || MATERIAL_LABELS[reward.material] || '행성 재료'} ${reward.amount ?? 1}개를 회수했습니다.`
      },
    )
    if (!result?.dailyEvent) return null

    const receivedAtMs = Date.now()
    setHome((current) => {
      if (!current) return current
      const nextOwnPlanet = {
        ...current.ownPlanet,
        materials: { ...(current.ownPlanet?.materials || {}), ...(result.materials || {}) },
        stats: { ...(current.ownPlanet?.stats || {}), ...(result.stats || {}) },
      }
      return {
        ...current,
        dailyEvent: result.dailyEvent,
        serverNowMs: result.serverNowMs || current.serverNowMs,
        serverClockOffsetMs: Number.isFinite(Number(result.serverNowMs))
          ? Number(result.serverNowMs) - receivedAtMs
          : current.serverClockOffsetMs,
        ownPlanet: nextOwnPlanet,
        ...(targetUid === user?.uid ? { planet: nextOwnPlanet } : {}),
      }
    })
    setNowMs(receivedAtMs)
    return result
  }

  const runMission = useCallback(async (route, operationId = createOperationId()) => {
    const result = await runAction(
      `mission:${route}`,
      () => callGalaxy('runGalaxyMission', { route, partnerUid: missionPartnerUid, operationId }),
      (missionResult) => `${missionResult?.reward?.title || '탐사 표본'} ${missionResult?.reward?.amount || 1}개를 회수했습니다.`,
    )
    if (!result) return null
    const completedAtMs = Number(result.nextMissionAtMs || Date.now()) - (2 * 60 * 60 * 1000)
    setHome((current) => current ? {
      ...current,
      ownPlanet: { ...current.ownPlanet, lastMissionAtMs: completedAtMs },
      ...(targetUid === user?.uid ? { planet: { ...current.planet, lastMissionAtMs: completedAtMs } } : {}),
    } : current)
    setNowMs(Date.now())
    return result
  }, [missionPartnerUid, runAction, targetUid, user?.uid])

  const dispatchRover = async (route) => {
    if (!isOwner) return null
    const result = await runAction(
      'rover:dispatch',
      () => callGalaxy('startGalaxyRoverExpedition', { route, operationId: createOperationId() }),
      (dispatchResult) => {
        const title = dispatchResult?.expedition?.routeTitle || '장거리 로버 원정'
        const readyAt = formatGalaxyTime(dispatchResult?.expedition?.readyAtMs)
        return `${title}을 시작했습니다.${readyAt ? ` ${readyAt} 귀환 예정입니다.` : ''}`
      },
    )
    if (!result?.expedition) return null
    const receivedAtMs = Date.now()
    setHome((current) => {
      if (!current) return current
      const nextOwnPlanet = { ...current.ownPlanet, roverExpedition: result.expedition }
      return {
        ...current,
        serverNowMs: result.serverNowMs || current.serverNowMs,
        serverClockOffsetMs: Number.isFinite(Number(result.serverNowMs))
          ? Number(result.serverNowMs) - receivedAtMs
          : current.serverClockOffsetMs,
        ownPlanet: nextOwnPlanet,
        ...(targetUid === user?.uid ? { planet: nextOwnPlanet } : {}),
      }
    })
    setNowMs(receivedAtMs)
    return result
  }

  const claimRover = async () => {
    if (!isOwner || !roverExpedition?.operationId) {
      flash('수령할 로버 원정 기록을 찾지 못했습니다. 관제 화면을 다시 열어 주세요.')
      return null
    }
    const result = await runAction(
      'rover:claim',
      () => callGalaxy('claimGalaxyRoverExpedition', { operationId: roverExpedition.operationId }),
      (claimResult) => {
        const reward = claimResult?.claimResult?.reward || {}
        const discovery = claimResult?.claimResult?.discovery || {}
        return `${reward.title || '원정 재료'} ${reward.amount || 0}개와 ${discovery.name || '새 발견 기록'}을 수령했습니다.`
      },
    )
    if (!result?.expedition || !result?.claimResult) return null
    const receivedAtMs = Date.now()
    setHome((current) => {
      if (!current) return current
      const currentDiscoveries = Array.isArray(current.ownPlanet?.roverDiscoveries)
        ? current.ownPlanet.roverDiscoveries
        : []
      const discovery = result.claimResult.discovery
      const nextDiscoveries = discovery?.id && !currentDiscoveries.some((entry) => entry?.id === discovery.id)
        ? [...currentDiscoveries, { ...discovery, discoveredAtMs: result.claimResult.claimedAtMs }]
        : currentDiscoveries
      const nextOwnPlanet = {
        ...current.ownPlanet,
        roverExpedition: result.expedition,
        roverDiscoveries: nextDiscoveries,
        materials: result.claimResult.materials || current.ownPlanet?.materials || {},
      }
      return {
        ...current,
        serverNowMs: result.serverNowMs || current.serverNowMs,
        serverClockOffsetMs: Number.isFinite(Number(result.serverNowMs))
          ? Number(result.serverNowMs) - receivedAtMs
          : current.serverClockOffsetMs,
        ownPlanet: nextOwnPlanet,
        ...(targetUid === user?.uid ? { planet: nextOwnPlanet } : {}),
      }
    })
    setNowMs(receivedAtMs)
    return result
  }

  const savePassport = async (form) => {
    const result = await runAction('passport', () => callGalaxy('saveGalaxyPassport', form), '탐험가 패스포트가 갱신되었습니다.')
    if (!result) return
    setHome((current) => current ? {
      ...current,
      ownPlanet: { ...current.ownPlanet, ...form },
      ...(targetUid === user?.uid ? { planet: { ...current.planet, ...form } } : {}),
    } : current)
  }

  const openLogs = async () => {
    setArrivalOpen(false)
    setMenu('logs')
    const unreadIds = events.filter((event) => !event.seen).map((event) => event.id)
    if (unreadIds.length) await runAction('logs', () => callGalaxy('markGalaxyEventsSeen', { eventIds: unreadIds }))
  }

  const openGameMenu = (nextMenu) => {
    setArrivalOpen(false)
    if (nextMenu === 'logs') {
      openLogs()
      return
    }
    if (nextMenu === 'build' && !effectiveFocusedBuildItemId && catalogEntries[0]?.[0]) setFocusedBuildItemId(catalogEntries[0][0])
    setMenu(nextMenu)
  }

  const handleObjectiveAction = () => {
    if (todayObjective.action === 'rover') {
      openGameMenu('rover')
      return
    }
    if (todayObjective.action === 'logs') {
      openLogs()
      return
    }
    if (todayObjective.action === 'build') {
      openGameMenu('build')
      return
    }
    if (todayObjective.action === 'daily-event') {
      setArrivalOpen(false)
      setMenu('')
      flash('미니맵의 금빛 사건 표식을 따라 현장으로 이동한 뒤 E키로 안정시켜 주세요.')
      return
    }
    setArrivalOpen(false)
    setMenu('')
    flash(isOwner ? '월드의 빛나는 탐사 관문으로 이동해 항로를 시작하세요.' : '가까운 생태 지점에서 도움 행동을 남겨보세요.')
  }

  const beginBuild = (itemId) => {
    setSelectedBuildItem(itemId)
    setMenu('')
    setArrivalOpen(false)
  }

  if (loading) return <GalaxyLoading />
  if (!home) return <GalaxyLoadError message={error} onRetry={() => loadHome(user?.uid)} />

  const menuMeta = MENU_META[menu] || MENU_META.passport
  const MenuIcon = menuMeta.Icon
  const focusedHasMaterial = focusedBuildItem
    ? Number(ownPlanet.materials?.[focusedBuildItem.material] || 0) >= Number(focusedBuildItem.materialCost || 0)
    : false
  const focusedCanAfford = focusedBuildItem ? wallet >= Number(focusedBuildItem.cost || 0) : false
  const FocusedItemIcon = ITEM_ICONS[effectiveFocusedBuildItemId] || Building2
  const DailyEventIcon = DAILY_EVENT_ICONS[dailyEvent?.type] || Sparkles
  const dailyRewardLabel = dailyEvent?.reward
    ? `${dailyEvent.reward.title || MATERIAL_LABELS[dailyEvent.reward.material] || '행성 재료'} ${dailyEvent.reward.amount ?? 1}개`
    : '행성 재료 1개'

  return (
    <div className="meta-galaxy frontier-immersive">
      <GalaxyWorld3D
        planet={planet}
        materials={(isOwner ? planet : ownPlanet).materials || {}}
        missionReady={isOwner && missionCooldown.ready}
        missionCooldownLabel={isOwner ? missionCooldown.label : '현장 탐사는 내 행성에서 출발할 수 있어요'}
        roverStatus={isOwner ? roverStatus : 'idle'}
        roverStatusLabel={isOwner ? roverStatusLabel : '내 행성에서 원정 가능'}
        remotePlayers={remotePlayers}
        localPlayerName={home?.liveSession?.displayName || ownPlanet.ownerName || userData?.publicDisplayName || userData?.name || '탐사원'}
        localSpeech={ownSpeech}
        liveConnected={liveConnected}
        presenceError={presenceError}
        onPlayerTransform={updateLivePosition}
        onSendSpeech={sendSpeech}
        dailyEvent={isOwner ? dailyEvent : null}
        onDailyEventComplete={completeDailyEvent}
        onOpenRover={() => openGameMenu('rover')}
        selectedBuildItem={selectedBuildItem}
        onCancelBuild={() => setSelectedBuildItem('')}
        onBuildAt={buildItemAt}
        onWorldAction={performWorldAction}
        onMissionComplete={runMission}
        selectedStructureId={selectedStructureId}
        onSelectStructure={openObjectDialog}
        onStructureMission={performObjectMission}
        onOpenMenu={openGameMenu}
        onMessage={flash}
        objective={todayObjective}
        paused={Boolean(menu || arrivalOpen || objectDialogOpen)}
        onOpenBriefing={() => setArrivalOpen(true)}
      />

      <div className="frontier-top-hud" aria-label="행성 상태와 보유 자원">
        <section className="frontier-planet-hud">
          <span className={`frontier-hud-icon theme-${planet.theme || 'forest'}`}><ThemeGlyph themeId={planet.theme} size={21} /></span>
          <div>
            <small>{isOwner ? 'MY FRONTIER' : `${planet.ownerName || '이웃 탐사원'}의 FRONTIER`}</small>
            <strong>{planet.planetName || '이름 없는 작은 별'}</strong>
            <span>{currentTheme.label}{!isOwner && <b className="frontier-visitor-chip">방문 중</b>}</span>
          </div>
        </section>
        <section className="frontier-economy-hud">
          <div className="frontier-ore-readout" title="학습을 통해서만 얻는 메타 광석">
            <Gem size={18} aria-hidden="true" />
            <span><small>LEARNING ORE</small><strong>{wallet.toLocaleString()}</strong></span>
          </div>
          <MaterialStrip materials={(isOwner ? planet : ownPlanet).materials || {}} compact />
        </section>
      </div>

      <button type="button" className={`frontier-objective-card${dailyEventPending && todayObjective.id === 'daily-event' ? ' daily-event' : ''}`} onClick={handleObjectiveAction}>
        <span className="frontier-objective-icon">{createElement(todayObjective.id === 'daily-event' ? DailyEventIcon : Compass, { size: 19, 'aria-hidden': true })}</span>
        <span className="frontier-objective-copy">
          <small>{todayObjective.eyebrow}</small>
          <strong>{todayObjective.title}</strong>
        </span>
        <ChevronRight size={18} aria-hidden="true" />
      </button>

      <button
        type="button"
        className="frontier-learning-route"
        onClick={onBack}
        aria-label="메타센스로 귀환"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        <div><small>EXIT ROUTE</small><strong>메타센스로 귀환</strong></div>
      </button>

      <nav className="frontier-command-dock" aria-label="프론티어 명령 독">
        <button type="button" className={menu === 'rover' ? 'active' : ''} onClick={() => openGameMenu('rover')} aria-label={roverStatus === 'ready' ? '로버 귀환 상자 열기' : '로버 원정 관제 열기'}>
          <Satellite size={21} aria-hidden="true" /><small>로버</small>{isOwner && roverStatus === 'ready' && <b>!</b>}
        </button>
        <button type="button" className={menu === 'build' ? 'active' : ''} onClick={() => openGameMenu('build')}>
          <Backpack size={21} aria-hidden="true" /><small>건설</small>
        </button>
        <button type="button" className={menu === 'neighbors' ? 'active' : ''} onClick={() => openGameMenu('neighbors')}>
          <Route size={21} aria-hidden="true" /><small>항로</small>
        </button>
        <button type="button" className={menu === 'logs' ? 'active' : ''} onClick={openLogs}>
          <Radio size={21} aria-hidden="true" /><small>신호</small>{unreadCount > 0 && <b>{unreadCount}</b>}
        </button>
        <button type="button" className={menu === 'passport' ? 'active' : ''} onClick={() => openGameMenu('passport')}>
          <CircleUserRound size={21} aria-hidden="true" /><small>패스포트</small>
        </button>
        <button type="button" className={`frontier-command-home${isOwner ? ' active' : ''}`} onClick={() => isOwner ? setArrivalOpen(true) : visitNeighbor(user.uid)}>
          <Home size={21} aria-hidden="true" /><small>내 행성</small>
        </button>
      </nav>

      {busy && <div className="frontier-network-busy"><i /> 은하 네트워크 동기화</div>}

      <AnimatePresence>
        {objectDialogOpen && selectedObject && (
          <Motion.div className="frontier-object-dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeObjectDialog} onKeyDown={trapDialogFocus}>
            <Motion.div className="frontier-object-dialog-motion" initial={{ opacity: 0, y: 22, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: .98 }} onClick={(event) => event.stopPropagation()}>
              <GalaxyObjectDialog
                key={`${selectedObject.instanceId}:${selectedObject.name || ''}:${selectedObject.description || ''}:${selectedObject.x}:${selectedObject.y}:${selectedObject.imageUrl || ''}`}
                item={selectedObject}
                catalogItem={selectedObjectCatalog}
                isOwner={isOwner}
                busy={busy}
                missionLabel={selectedObjectMission?.label}
                closeButtonRef={objectDialogCloseRef}
                onClose={closeObjectDialog}
                onSave={saveGalaxyObject}
                onDelete={deleteGalaxyObject}
                onMission={performObjectMission}
              />
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(error || notice) && (
          <Motion.div
            className={`frontier-game-toast ${error ? 'error' : 'success'}`}
            role={error ? 'alert' : 'status'}
            aria-live={error ? 'assertive' : 'polite'}
            aria-atomic="true"
            initial={{ opacity: 0, y: -14, scale: .96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            {error || notice}
            <button type="button" onClick={() => { setError(''); setNotice('') }} aria-label="알림 닫기"><X size={17} aria-hidden="true" /></button>
          </Motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {arrivalOpen && (
          <Motion.div className="frontier-arrival-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onKeyDown={trapDialogFocus}>
            <Motion.section className="frontier-arrival-panel" role="dialog" aria-modal="true" aria-labelledby="frontier-arrival-title" initial={{ opacity: 0, y: 28, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: .98 }}>
              <header className="frontier-arrival-header">
                <span className="frontier-lumi-mark"><Bot size={26} aria-hidden="true" /></span>
                <div>
                  <small>LUMI RETURN BRIEFING</small>
                  <h2 id="frontier-arrival-title">루미의 귀환 브리핑</h2>
                  <p>암흑물질 폭풍 뒤에 잠든 작은 별이 다시 당신의 신호를 기다리고 있어요.</p>
                </div>
                <button ref={arrivalCloseRef} type="button" onClick={() => setArrivalOpen(false)} aria-label="브리핑 닫기"><X size={20} aria-hidden="true" /></button>
              </header>

              <div className="frontier-arrival-grid">
                <BriefingCard
                  Icon={DailyEventIcon}
                  overline={dailyEvent ? '밤사이 발생한 행성 변화' : '귀환 후 행성 변화'}
                  title={dailyEvent?.title || (events.length ? '새로운 기억이 도착했어요' : '귀환등이 항로를 지켰어요')}
                  detail={overnightSummary}
                  accent={dailyEventPending}
                />
                <BriefingCard Icon={Radio} overline="수신 신호" title={unreadCount ? `읽지 않은 신호 ${unreadCount}개` : '새 신호를 기다리는 중'} detail={unreadCount ? '타임라인에서 친구의 도움과 메시지를 확인할 수 있어요.' : '이웃 행성을 방문해 첫 도움 신호를 보내면 새로운 왕복 항로가 시작됩니다.'} />
                <BriefingCard
                  Icon={Satellite}
                  overline="장거리 로버 상태"
                  title={roverStatus === 'ready' ? '귀환 상자가 도착했어요' : roverStatus === 'active' ? '로버가 원정 중이에요' : '새 원정을 설정할 수 있어요'}
                  detail={roverStatus === 'ready'
                    ? '원정 관제에서 재료와 새로운 발견 기록을 안전하게 수령하세요.'
                    : roverStatus === 'active'
                      ? `${roverRemainingLabel} 귀환합니다. 게임을 닫아도 항해는 계속돼요.`
                      : `세 항로 중 하나를 골라 ${hasRoverBay ? '6시간' : '8시간'} 장거리 원정을 시작할 수 있어요.`}
                />
                <BriefingCard
                  Icon={dailyEventPending ? Package : Compass}
                  overline={dailyEventPending ? '현장 안정화 보상' : todayObjective.eyebrow}
                  title={dailyEventPending ? dailyRewardLabel : todayObjective.title}
                  detail={dailyEventPending ? '표시된 현장까지 직접 이동해 E키로 해결하면 서버가 오늘 보상을 한 번만 지급합니다.' : todayObjective.detail}
                  accent
                />
              </div>

              <footer className="frontier-arrival-actions">
                <button type="button" className="galaxy-secondary-btn" onClick={() => openGameMenu('logs')}><Radio size={17} aria-hidden="true" /> 신호 기록 보기</button>
                <button type="button" className={roverStatus === 'ready' ? 'galaxy-primary-btn' : 'galaxy-secondary-btn'} onClick={() => openGameMenu('rover')}><Satellite size={17} aria-hidden="true" /> {roverStatus === 'ready' ? '귀환 상자 열기' : '로버 관제 열기'}</button>
                <button type="button" className="galaxy-primary-btn" onClick={() => setArrivalOpen(false)}>
                  {dailyEventPending ? <><MapPin size={17} aria-hidden="true" /> 사건 현장으로 출발</> : <>행성으로 들어가기 <DoorOpen size={17} aria-hidden="true" /></>}
                </button>
              </footer>
            </Motion.section>
          </Motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menu && (
          <Motion.div className="frontier-menu-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenu('')} onKeyDown={trapDialogFocus}>
            <Motion.section className={`frontier-menu-panel menu-${menu}`} role="dialog" aria-modal="true" aria-labelledby={`frontier-menu-${menu}`} initial={{ opacity: 0, x: 30, scale: .97 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 25 }} onClick={(event) => event.stopPropagation()}>
              <header>
                <div className="frontier-menu-title">
                  <span><MenuIcon size={15} aria-hidden="true" /> {menuMeta.overline}</span>
                  <h2 id={`frontier-menu-${menu}`}>{menuMeta.title}</h2>
                </div>
                <button ref={menuCloseRef} type="button" onClick={() => setMenu('')} aria-label="메뉴 닫기"><X size={20} aria-hidden="true" /></button>
              </header>

              {menu === 'rover' && (
                isOwner ? (
                  <GalaxyRoverPanel
                    expedition={roverExpedition}
                    nowMs={galaxyNowMs}
                    materials={ownPlanet.materials || {}}
                    discoveries={ownPlanet.roverDiscoveries || []}
                    hasRoverBay={hasRoverBay}
                    hasExpeditionBeacon={hasExpeditionBeacon}
                    abilityValues={ownPlanet.abilitySnapshot?.values || {}}
                    busy={busy.startsWith('rover:') ? busy.split(':')[1] : false}
                    onDispatch={dispatchRover}
                    onClaim={claimRover}
                  />
                ) : (
                  <div className="galaxy-empty-state frontier-log-empty">
                    <span className="frontier-empty-icon"><Satellite size={30} aria-hidden="true" /></span>
                    <h3>로버 관제는 내 행성에서 연결할 수 있어요</h3>
                    <p>친구의 행성을 둘러본 뒤 내 착륙장으로 돌아가 장거리 원정을 설정해 주세요.</p>
                    <button type="button" className="galaxy-primary-btn" onClick={() => visitNeighbor(user.uid)}>내 행성으로 귀환</button>
                  </div>
                )
              )}

              {menu === 'build' && (
                <div className="frontier-build-menu">
                  {!isOwner ? (
                    <div className="galaxy-empty-state frontier-log-empty">
                      <span className="frontier-empty-icon"><Home size={30} aria-hidden="true" /></span>
                      <h3>건설 설계소는 내 행성에서 열 수 있어요</h3>
                      <p>내 행성으로 돌아가 장소를 고른 뒤 시설을 배치해 주세요.</p>
                      <button type="button" className="galaxy-primary-btn" onClick={() => visitNeighbor(user.uid)}>내 행성으로 귀환</button>
                    </div>
                  ) : focusedBuildItem ? (
                    <div className="frontier-build-layout">
                      <section className="frontier-build-showcase">
                        <div className="frontier-build-preview">
                          <StructurePreview3D itemId={effectiveFocusedBuildItemId} />
                          <span><FocusedItemIcon size={18} aria-hidden="true" /> 3D 설계 미리보기</span>
                        </div>
                        <div className="frontier-build-story">
                          <small>{focusedBuildStory.overline}</small>
                          <h3>{focusedBuildItem.name}</h3>
                          <p>{focusedBuildStory.promise}</p>
                          <dl>
                            <div><dt><Zap size={15} aria-hidden="true" /> 설치 변화</dt><dd>{focusedBuildStory.effect}</dd></div>
                            <div><dt><Orbit size={15} aria-hidden="true" /> 컬렉션</dt><dd>{focusedBuildStory.set}</dd></div>
                          </dl>
                          <div className="frontier-build-costs">
                            <span className={focusedCanAfford ? 'ready' : 'short'}><Gem size={15} aria-hidden="true" /> 학습 광석 {focusedBuildItem.cost}</span>
                            <span className={focusedHasMaterial ? 'ready' : 'short'}><Package size={15} aria-hidden="true" /> {MATERIAL_LABELS[focusedBuildItem.material]} {focusedBuildItem.materialCost}</span>
                          </div>
                          <button type="button" className="galaxy-primary-btn frontier-build-cta" disabled={Boolean(busy) || !focusedHasMaterial || !focusedCanAfford} onClick={() => beginBuild(effectiveFocusedBuildItemId)}>
                            {focusedHasMaterial && focusedCanAfford ? <><MapPin size={17} aria-hidden="true" /> 월드에서 자리 선택</> : <><LockKeyhole size={17} aria-hidden="true" /> 부족한 재료 확인</>}
                          </button>
                        </div>
                      </section>

                      <section className="frontier-build-catalog-shell">
                        <div className="frontier-catalog-heading">
                          <div><small>BLUEPRINT COLLECTION</small><h3>다음에 만들 풍경을 고르세요</h3></div>
                          <MaterialStrip materials={ownPlanet.materials} />
                        </div>
                        <div className="frontier-build-catalog">
                          {catalogEntries.map(([itemId, item]) => {
                            const ItemIcon = ITEM_ICONS[itemId] || Building2
                            const storyBase = BUILD_ITEM_STORIES[itemId] || FALLBACK_BUILD_STORY
                            const story = { ...storyBase, set: item.setName || storyBase.set }
                            const hasMaterial = Number(ownPlanet.materials?.[item.material] || 0) >= Number(item.materialCost || 0)
                            const canAfford = wallet >= Number(item.cost || 0)
                            const available = hasMaterial && canAfford
                            return (
                              <button type="button" key={itemId} className={`frontier-build-option${effectiveFocusedBuildItemId === itemId ? ' selected' : ''}${available ? '' : ' unavailable'}`} onClick={() => setFocusedBuildItemId(itemId)}>
                                <span className="frontier-build-option-icon"><ItemIcon size={21} aria-hidden="true" /></span>
                                <div><small>{story.overline}</small><strong>{item.name}</strong><p>{story.set}</p></div>
                                <span className="frontier-build-option-state">{available ? '설계 가능' : '재료 필요'}</span>
                              </button>
                            )
                          })}
                        </div>
                      </section>
                    </div>
                  ) : (
                    <div className="galaxy-empty-state"><span className="frontier-empty-icon"><Hammer size={30} aria-hidden="true" /></span><h3>수신된 건설 설계도가 없습니다</h3><p>잠시 뒤 다시 설계소를 열어 주세요.</p></div>
                  )}
                </div>
              )}

              {menu === 'neighbors' && (
                <div className="frontier-social-menu">
                  <div className="frontier-relay-setting">
                    <label>
                      <span><Satellite size={17} aria-hidden="true" /> 현장 탐사 릴레이 파트너</span>
                      <select value={missionPartnerUid} onChange={(event) => setMissionPartnerUid(event.target.value)}>
                        <option value="">혼자 출항</option>
                        {neighbors.map((neighbor) => <option key={neighbor.uid} value={neighbor.uid}>{neighbor.displayName}</option>)}
                      </select>
                    </label>
                    <small>45초 현장 탐사 관문을 완주하면 선택한 친구의 귀환 타임라인에도 공동 기록이 남습니다.</small>
                  </div>
                  {!isOwner && (
                    <label className="galaxy-preset-message">
                      <span><ShieldCheck size={15} aria-hidden="true" /> 친구 월드에 남길 안전 메시지</span>
                      <select value={visitMessage} onChange={(event) => setVisitMessage(event.target.value)}>
                        {VISIT_MESSAGES.map((message) => <option key={message} value={message}>{message}</option>)}
                      </select>
                    </label>
                  )}

                  {neighbors.length ? (
                    <div className="frontier-galaxy-map">
                      <i className="frontier-galaxy-orbit orbit-one" />
                      <i className="frontier-galaxy-orbit orbit-two" />
                      {neighbors.map((neighbor, index) => {
                        const connection = getConnectionSummary(neighbor, events)
                        const isPrivate = neighbor.visitMode === 'private'
                        return (
                          <article key={neighbor.uid} className={`frontier-neighbor-card theme-${neighbor.theme}${targetUid === neighbor.uid ? ' active' : ''}${isPrivate ? ' private' : ''}`} style={{ '--route-index': index }}>
                            <span className="frontier-neighbor-card__planet"><ThemeGlyph themeId={neighbor.theme} size={27} /><i /></span>
                            <div className="frontier-neighbor-card__body">
                              <small>{neighbor.displayName} · SHIP T{neighbor.shipHullTier}</small>
                              <h3>{neighbor.planetName}</h3>
                              <p>{neighbor.tagline}</p>
                              <div className="frontier-neighbor-card__route">
                                <span><HeartHandshake size={14} aria-hidden="true" /> 항로 연결도 Lv.{connection.level}</span>
                                <i className="frontier-route-meter"><b style={{ width: `${connection.percent}%` }} /></i>
                                <small>최근 도움 신호 {connection.signalCount}회</small>
                              </div>
                            </div>
                            <button type="button" className="frontier-neighbor-card__cta" disabled={isPrivate} onClick={() => visitNeighbor(neighbor.uid)}>
                              {isPrivate ? <><LockKeyhole size={16} aria-hidden="true" /> 휴식 중</> : targetUid === neighbor.uid ? <><Eye size={16} aria-hidden="true" /> 방문 중</> : <><Rocket size={16} aria-hidden="true" /> 워프</>}
                            </button>
                          </article>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="galaxy-empty-state frontier-social-empty">
                      <span className="frontier-empty-icon"><Map size={31} aria-hidden="true" /></span>
                      <h3>아직 복구된 이웃 항로가 없어요</h3>
                      <p>스터디 크루에 참여하면 크루원의 작은 별이 이 은하 지도에 나타납니다.</p>
                      <div className="frontier-social-empty-steps">
                        <span><Users size={16} aria-hidden="true" /> 크루에서 이웃 발견</span>
                        <span><Gift size={16} aria-hidden="true" /> 첫 도움 신호 보내기</span>
                        <span><Orbit size={16} aria-hidden="true" /> 왕복 항로 밝히기</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {menu === 'logs' && (
                events.length ? (
                  <div className="frontier-log-timeline">
                    {events.map((event) => {
                      const EventIcon = EVENT_ICONS[event.actionId] || Radio
                      const canVisitActor = event.actorId && neighbors.some((neighbor) => neighbor.uid === event.actorId)
                      return (
                        <article key={event.id} className={`frontier-log-item${!event.seen ? ' unread' : ''}`}>
                          <span className="frontier-log-marker"><EventIcon size={19} aria-hidden="true" /></span>
                          <div className="frontier-log-copy">
                            <small>{formatGalaxyTime(event.createdAt) || '최근 귀환 기록'}</small>
                            <h3>{event.actorName || '이웃 탐사원'} · {event.actionLabel || '새로운 항로 신호'}</h3>
                            {event.message && <p>{event.message}</p>}
                            <div className="frontier-log-meta"><MapPin size={14} aria-hidden="true" /> {event.position ? `행성 좌표 ${event.position.x}, ${event.position.z}에 기록됨` : '행성 기억 기록소에 안전하게 보존됨'}</div>
                            {canVisitActor && (
                              <div className="frontier-log-actions">
                                <button type="button" onClick={() => visitNeighbor(event.actorId)}><Rocket size={15} aria-hidden="true" /> 답방하기</button>
                                <button type="button" onClick={() => { setMissionPartnerUid(event.actorId); setMenu('neighbors') }}><HeartHandshake size={15} aria-hidden="true" /> 릴레이 파트너로 선택</button>
                              </div>
                            )}
                          </div>
                          {!event.seen && <i>NEW</i>}
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <div className="galaxy-empty-state frontier-log-empty">
                    <span className="frontier-empty-icon"><Radio size={31} aria-hidden="true" /></span>
                    <h3>첫 귀환 신호가 올 자리를 비워두었어요</h3>
                    <p>이웃과 도움을 주고받으면 이곳이 함께 만든 행성 기억의 타임라인으로 채워집니다.</p>
                    <div className="frontier-log-guide">
                      <span className="frontier-log-guide-step"><Building2 size={17} aria-hidden="true" /><b>1</b><small>친구가 기억할 시설을 건설해요</small></span>
                      <span className="frontier-log-guide-step"><Route size={17} aria-hidden="true" /><b>2</b><small>이웃 항로를 따라 도움을 남겨요</small></span>
                      <span className="frontier-log-guide-step"><MessageCircle size={17} aria-hidden="true" /><b>3</b><small>돌아오면 첫 신호를 확인해요</small></span>
                    </div>
                    <button type="button" className="galaxy-primary-btn" onClick={() => setMenu('neighbors')}>첫 이웃 항로 찾기 <ChevronRight size={16} aria-hidden="true" /></button>
                  </div>
                )
              )}

              {menu === 'passport' && (
                <div className="frontier-passport-menu">
                  <section className={`galaxy-passport-preview frontier-passport-profile theme-${ownPlanet.theme || 'forest'}`}>
                    <span className="passport-overline"><CircleUserRound size={15} aria-hidden="true" /> EXPLORER PASSPORT</span>
                    <div className="frontier-passport-identity">
                      <div className="passport-avatar"><Rocket size={43} aria-hidden="true" /><i>T{home?.learningState?.shipHullTier || ownPlanet.shipHullTier || 1}</i></div>
                      <div>
                        <small>{ownPlanet.ownerName || userData?.publicDisplayName || '탐사원'}</small>
                        <h2>{ownPlanet.planetName || '이름 없는 작은 별'}</h2>
                        <p>{ownPlanet.tagline || '새로운 행성 기억을 기다리고 있어요.'}</p>
                      </div>
                    </div>
                    <div className="frontier-passport-climate"><ThemeGlyph themeId={ownPlanet.theme} size={18} /><span><small>행성 기후</small><strong>{ownTheme.label}</strong></span></div>
                    <div className="passport-tags">
                      {(ownPlanet.playStyles || []).map((styleId) => <span key={styleId}><StyleGlyph styleId={styleId} /> {GALAXY_PLAY_STYLES[styleId]?.label}</span>)}
                    </div>
                    <div className="frontier-passport-ability-list">
                      {Object.entries(GALAXY_ABILITIES).map(([id, ability]) => {
                        const AbilityIcon = ABILITY_ICONS[id] || Zap
                        const level = ownPlanet.abilitySnapshot?.values?.[id] || 1
                        return (
                          <article className="frontier-passport-ability" key={id}>
                            <span className="frontier-passport-ability-icon"><AbilityIcon size={17} aria-hidden="true" /></span>
                            <div><small>{ability.label}</small><strong>Lv.{level}</strong><p>{ABILITY_EFFECTS[id] || ability.description}</p></div>
                          </article>
                        )
                      })}
                    </div>
                  </section>
                  <section className="passport-editor-shell frontier-passport-edit">
                    <header><span><Eye size={15} aria-hidden="true" /> PROFILE CONTROL</span><h3>내 행성 첫인상 편집</h3><p>기후와 취향은 방문자에게 보이는 프로필과 월드 분위기에 반영됩니다.</p></header>
                    <PassportEditor key={ownPlanet.id || user?.uid || 'passport'} planet={ownPlanet} onSave={savePassport} busy={busy} />
                  </section>
                </div>
              )}
            </Motion.section>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
