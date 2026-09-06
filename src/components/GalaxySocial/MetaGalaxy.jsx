import { releaseFrontierPointerLock } from './frontierPointerLock.js'
import { createElement, useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { collection, doc, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { deleteObject, getDownloadURL, ref as createStorageRef, uploadBytes } from 'firebase/storage'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import {
  ArrowLeft,
  Backpack,
  Ban,
  Bot,
  Building2,
  Camera,
  Check,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Compass,
  Cpu,
  DoorOpen,
  Droplets,
  Egg,
  Expand,
  Eye,
  Flower2,
  Flag,
  Gem,
  Gift,
  Globe2,
  Hammer,
  HeartHandshake,
  Home,
  Leaf,
  LockKeyhole,
  LogOut,
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
  Volume2,
  Waves,
  Warehouse,
  Wrench,
  X,
  Zap,
} from 'lucide-react'
import { db, functions, storage } from '../../firebase'
import { useGalaxyWorldPresence } from '../../hooks/useGalaxyWorldPresence'
import { useGuestGalaxyData } from '../../hooks/useGuestGalaxyData'
import {
  GALAXY_ABILITIES,
  GALAXY_PLAY_STYLES,
  GALAXY_THEMES,
  MATERIAL_LABELS,
  formatGalaxyRoverRemainingTime,
  formatGalaxyTime,
  getGalaxyRoverPhase,
  getGalaxyRoverStatus,
  getMissionCooldown,
} from '../../utils/galaxyGame'
import {
  FRONTIER_CORE_FACILITY_IDS,
  getFrontierStoryObjective,
  isFirstLightStoryGrant,
  normalizeFrontierStory,
} from '../../utils/frontierStory'
import { compressImage } from '../../utils/storageUtils'
import soundManager from '../../utils/SoundManager'
import GalaxyObjectDialog from './GalaxyObjectDialog'
import GalaxyRoverPanel from './GalaxyRoverPanel'
import FrontierAudioSettingsModal from './FrontierAudioSettingsModal'
import { getBuildRadius, isBridgeDeck, isRiverWater, terrainSlope } from './GalaxyTerrainModel'
import GalaxyWorld3D, { StructurePreview3D } from './GalaxyWorld3D'
import './MetaGalaxy.css'
import FrontierCrewAtlas, { CrewVisitActivities } from './FrontierCrewAtlas'
import { canVisitCrewRoute } from './frontierCrewRoutes'
import { useFrontierCrewTravel } from '../../hooks/useFrontierCrewTravel'

const invokeGalaxy = (name, payload = {}) => httpsCallable(functions, name)(payload).then((result) => result.data)

const createOperationId = () => globalThis.crypto?.randomUUID?.()
  || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
const ASTRA_BUILDER_INSTALL_ITEM_ID = 'astra_builder_plot'

const getRoverDispatchStorageKey = (uid) => `metasense_rover_dispatch_${String(uid || 'anonymous')}`

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

const MATERIAL_DETAILS = {
  stardust: {
    purpose: '빛과 장식에 쓰는 기본 재료',
    source: '생명체를 돌보거나 일일 사건을 해결해 모아요.',
    use: '별빛 램프 · 프리즘 길잡이',
  },
  biofiber: {
    purpose: '나무와 정원을 키우는 생태 재료',
    source: '식물에 물을 주거나 45초 탐사·성운 로버 원정에서 모아요.',
    use: '루멘 나무 · 온실 · 별꽃 정원',
  },
  crystalGlass: {
    purpose: '관측과 신호 시설에 쓰는 투명 재료',
    source: '시설에 감탄을 남기거나 수정비 일일 사건에서 모아요.',
    use: '수정 연못 · 성운 관측소 · 신호 광장',
  },
  alloy: {
    purpose: '기계 시설을 고치는 단단한 재료',
    source: '시설을 수리하거나 혜성 로버 원정에서 모아요.',
    use: '로버 정비소 · 원정대 비콘 · 항로문',
  },
}

const DAILY_EVENT_ICONS = {
  lumen_bloom: Leaf,
  crystal_rain: Gem,
  signal_blackout: RadioTower,
  meteor_debris: Package,
}

const STRUCTURE_VISIT_ACTIONS = {
  starter_dome: { actionId: 'repair', label: '개척자 돔을 점검하기' },
  lumen_tree: { actionId: 'water', label: '루멘 나무에 물 주기' },
  crystal_pond: { actionId: 'water', label: '수정 연못 돌보기' },
  friend_greenhouse: { actionId: 'water', label: '공동 온실에 물 주기' },
  starflower_garden: { actionId: 'water', label: '별꽃 정원에 물 주기' },
  wild_sprout: { actionId: 'water', label: '루멘 새싹에 물 주기' },
  rover_bay: { actionId: 'repair', label: '로버 정비소 점검하기' },
  observatory: { actionId: 'repair', label: '관측 장치 수리하기' },
  expedition_beacon: { actionId: 'repair', label: '원정 비콘 수리하기' },
  prism_pathlight: { actionId: 'repair', label: '프리즘 길잡이 점검하기' },
  creature_habitat: { actionId: 'feed', label: '루미 생명체 돌보기' },
}

const getStructureVisitAction = (itemId) => STRUCTURE_VISIT_ACTIONS[itemId]
  || { actionId: 'admire', label: '이 시설에 감탄 신호 남기기' }

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
    effect: '정비소를 설치한 뒤 출발하는 장거리 로버 원정 시간을 8시간에서 6시간으로 단축합니다.',
    set: '개척 탐사 세트',
  },
  observatory: {
    overline: '오늘의 신호를 읽는 높은 눈',
    promise: '행성 사건과 귀환 신호, 로버 원정 상태를 한눈에 확인하는 관측 거점을 세웁니다.',
    effect: '관측소 가까이에서 E 키를 눌러 오늘의 행성 브리핑을 바로 열 수 있습니다.',
    set: '심우주 관측 세트',
  },
  friend_greenhouse: {
    overline: '친구가 머무는 이유',
    promise: '방문한 친구가 직접 돌보고 흔적을 남길 수 있는 공동 온실입니다.',
    effect: '물주기와 귀환 신호가 자연스럽게 이어지는 소셜 거점을 만듭니다.',
    set: '항로 우정 세트',
  },
  prism_pathlight: {
    overline: '빛이 이어지는 길',
    promise: '회전 방향을 따라 프리즘 패널의 빛이 흐르며 다음 길잡이를 가리킵니다.',
    effect: '여러 개를 연속 배치하면 착륙장과 주요 시설 사이에 하나의 빛길이 만들어집니다.',
    set: '귀환의 빛',
  },
  starflower_garden: {
    overline: '잠시 머물고 싶은 풍경',
    promise: '크기와 색이 다른 별꽃이 바람에 천천히 흔들리는 작은 치유 정원을 만듭니다.',
    effect: '친구의 물주기 신호와 어울리는 산책 화단과 은은한 별빛 풍경을 더합니다.',
    set: '별무리 치유정원',
  },
  creature_habitat: {
    overline: '작은 생명과 나누는 온기',
    promise: '포근한 둥지와 물가에서 루미 가족이 쉬고 뛰노는 교감 생태원을 만듭니다.',
    effect: '먹이 주기와 생명체 돌보기 행동이 눈앞의 루미와 이어지는 생태 랜드마크가 됩니다.',
    set: '루미 교감 생태원',
  },
  signal_plaza: {
    overline: '친구의 방문이 빛으로 남는 곳',
    promise: '도착한 인사·감탄·도움 신호가 기억 캡슐과 중앙 비콘의 빛으로 보존됩니다.',
    effect: '광장에서 E 키를 눌러 새 신호를 확인하고 기록을 따라 친구 행성으로 답방할 수 있습니다.',
    set: '항로 기억 신호원',
  },
  expedition_beacon: {
    overline: '원정의 출발과 귀환을 잇는 신호',
    promise: '심우주 항로를 향한 로버 신호를 중계하고 현재 원정 상태를 빛으로 알려줍니다.',
    effect: '설치 뒤 출발하는 모든 장거리 로버 원정의 회수 재료가 1개 늘어나며, 현장에서 E 키로 관제를 엽니다.',
    set: '심우주 원정 중계기',
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
  neighbors: { overline: 'CREW CONSTELLATION', title: '크루 성도 · 함께할 일', Icon: Route },
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
          <span key={id} className={`material-${id}`} title={`${label}: ${MATERIAL_DETAILS[id]?.purpose || '건설 재료'}`}>
            <Icon size={compact ? 14 : 15} aria-hidden="true" />
            {!compact && label}
            <strong>{Number(materials[id] || 0)}</strong>
          </span>
        )
      })}
    </div>
  )
}

function MaterialGuide({ materials = {} }) {
  return (
    <section className="frontier-material-guide" aria-labelledby="frontier-material-guide-title">
      <div className="frontier-material-guide-heading">
        <div><small>재료 도감 · 어디서 얻고 어디에 쓰나요?</small><h4 id="frontier-material-guide-title">건설 재료 4종</h4></div>
        <span>시설 가까이에서 <kbd>E</kbd> 키로 재료를 모을 수 있어요.</span>
      </div>
      <div className="frontier-material-guide-grid">
        {Object.entries(MATERIAL_LABELS).map(([id, label]) => {
          const Icon = MATERIAL_ICONS[id] || Package
          const detail = MATERIAL_DETAILS[id]
          return (
            <article key={id} className={`frontier-material-card material-${id}`}>
              <span><Icon size={19} aria-hidden="true" /></span>
              <div>
                <strong>{label} <b>보유 {Number(materials[id] || 0)}</b></strong>
                <p>{detail?.purpose}</p>
                <small><em>얻기</em> {detail?.source}</small>
                <small><em>사용</em> {detail?.use}</small>
              </div>
            </article>
          )
        })}
      </div>
    </section>
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

function formatMinutes(seconds) {
  const safe = Math.max(0, Number(seconds || 0))
  if (safe === 0) return '0분'
  if (safe < 60) return '1분 미만'
  return `${Math.ceil(safe / 60)}분`
}

function formatCountdown(seconds) {
  const safe = Math.max(0, Math.ceil(Number(seconds || 0)))
  if (safe > 120) return `${Math.ceil(safe / 60)}분`
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
}

export default function MetaGalaxy({ user, userData, playSession, playRemainingSeconds, dailyUsedSeconds, dailyLimitSeconds, warningStage = 0, onBack }) {
  const [home, setHome] = useState(null)
  const [targetUid, setTargetUid] = useState(user?.uid || '')
  const [menu, setMenu] = useState('')
  const [arrivalOpen, setArrivalOpen] = useState(true)
  const [finaleOpen, setFinaleOpen] = useState(false)
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false)
  const [isFirstPerson, setIsFirstPerson] = useState(false)
  const [builderActive, setBuilderActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [returning, setReturning] = useState(false)
  const [roverHistory, setRoverHistory] = useState({ entries: [], loaded: false, loading: false, hasMore: false, nextCursorOperationId: '' })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const toggleViewMode = useCallback(() => {
    // No toast/notice: the view change is immediately visible (camera switches), so a textual
    // confirmation is redundant. The on-screen icon button reflects current mode via its glyph.
    setIsFirstPerson((prev) => !prev)
  }, [])

  // V-key view toggle is handled exclusively by GalaxyWorld3D's keydown listener, which calls
  // onToggleFirstPerson (wired to toggleViewMode via the prop). We intentionally do NOT register
  // a second V listener here — that would call toggleViewMode twice per keypress and the
  // double-toggle cancels out, making the view appear stuck.
  const [selectedStructureId, setSelectedStructureId] = useState('')
  const [objectDialogOpen, setObjectDialogOpen] = useState(false)
  const [selectedBuildItem, setSelectedBuildItem] = useState('')
  const [selectedBuildLevel, setSelectedBuildLevel] = useState(1)
  const [focusedBuildItemId, setFocusedBuildItemId] = useState('')
  const [focusedBuildLevel, setFocusedBuildLevel] = useState(1)
  const [visitMessage, setVisitMessage] = useState(VISIT_MESSAGES[0])
  const [missionPartnerUid, setMissionPartnerUid] = useState('')
  const [nowMs, setNowMs] = useState(Date.now())
  const noticeTimerRef = useRef(null)
  const returningRef = useRef(false)
  const actionLockRef = useRef('')
  const builderInstallOperationRef = useRef('')
  const builderUpgradeOperationRef = useRef({})
  const territoryExpansionOperationRef = useRef('')
  const arrivalCloseRef = useRef(null)
  const menuCloseRef = useRef(null)
  const objectDialogCloseRef = useRef(null)
  const restoreFocusRef = useRef(null)
  const crewTravelCancelRef = useRef(null)
  const activeOverlayRef = useRef('')
  const finaleShownRef = useRef(false)
  const storySessionStartedAtRef = useRef(Date.now())
  const latestFrontierStoryRef = useRef(null)
  const lastExitTelemetryAtRef = useRef(0)
  const lastChapterTelemetryRef = useRef('')
  const homeLoadInFlightRef = useRef(new Set())
  const dailyStorySyncAttemptRef = useRef('')
  const audioSessionKey = `${user?.uid || 'guest'}:${targetUid || 'home'}:${playSession?.sessionId || 'no-session'}`
  const audioMountedRef = useRef(false)
  const audioSessionKeyRef = useRef(audioSessionKey)
  audioSessionKeyRef.current = audioSessionKey
  const isGuest = userData?.isGuest === true
  const guestGalaxy = useGuestGalaxyData()
  const syncGuestCompletedDailyEventStory = guestGalaxy.syncCompletedDailyEventStory
  const isOwner = isGuest || targetUid === user?.uid
  const overlayReady = !loading && Boolean(home)

  useEffect(() => {
    audioMountedRef.current = true
    return () => {
      audioMountedRef.current = false
    }
  }, [])

  const callGalaxy = useCallback((name, payload = {}) => invokeGalaxy(name, {
    ...payload,
    playSessionId: playSession?.sessionId || '',
    playClientInstanceId: playSession?.clientInstanceId || '',
    playResumeToken: playSession?.resumeToken || '',
  }), [playSession?.clientInstanceId, playSession?.resumeToken, playSession?.sessionId])
  const sendSpeechRequest = useCallback((payload) => callGalaxy('sendGalaxyWorldSpeech', payload), [callGalaxy])
  const openBuilderPlot = useCallback(
    (payload) => callGalaxy('openGalaxyBuildPlot', payload),
    [callGalaxy],
  )
  const saveBuilderState = useCallback(
    (payload) => callGalaxy('saveGalaxyBuildState', payload),
    [callGalaxy],
  )
  const purchaseBuilderUpgrade = useCallback(
    (payload) => callGalaxy('purchaseGalaxyBuilderUpgrade', payload),
    [callGalaxy],
  )
  const purchaseTerritoryExpansion = useCallback(
    (payload) => callGalaxy('purchaseGalaxyTerritoryExpansion', payload),
    [callGalaxy],
  )
  const purchaseExplorationKit = useCallback(
    (payload) => callGalaxy('purchaseStoreItem', payload),
    [callGalaxy],
  )

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

  // 게스트는 서버가 없으므로 로컬 mockHomeData(메모이제이션)로 home 을 채운다.
  // guestData 가 바뀌면 mockHomeData 도 갱신되어 이 effect 가 home 을 다시 동기화한다.
  const guestMockHomeData = guestGalaxy.mockHomeData

  const loadHome = useCallback(async (nextTargetUid = user?.uid, { quiet = false } = {}) => {
    const requestKey = String(nextTargetUid || user?.uid || (isGuest ? 'guest' : 'anonymous'))
    if (homeLoadInFlightRef.current.has(requestKey)) return null
    homeLoadInFlightRef.current.add(requestKey)
    if (isGuest) {
      try {
        setHome(guestMockHomeData)
        setTargetUid('guest')
        setLoading(false)
        return guestMockHomeData
      } finally {
        homeLoadInFlightRef.current.delete(requestKey)
      }
    }
    if (!user?.uid) {
      setLoading(false)
      homeLoadInFlightRef.current.delete(requestKey)
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
      homeLoadInFlightRef.current.delete(requestKey)
      if (!quiet) setLoading(false)
    }
  }, [callGalaxy, guestMockHomeData, isGuest, user?.uid])

  useEffect(() => { loadHome(user?.uid) }, [loadHome, user?.uid])

  const crewTravel = useFrontierCrewTravel({
    identityKey: `${user?.uid || 'guest'}:${playSession?.sessionId || ''}`,
    request: async (uid) => {
      const sentAt = Date.now()
      const data = await callGalaxy('openGalaxyHome', { targetUid: uid })
      return { uid, data, serverClockOffsetMs: Number.isFinite(Number(data?.serverNowMs))
        ? Number(data.serverNowMs) - Math.round((sentAt + Date.now()) / 2) : 0 }
    },
    onArrive: ({ uid, data, serverClockOffsetMs }) => {
      setHome({ ...data, serverClockOffsetMs })
      setTargetUid(uid)
      setError('')
      setMenu(uid === user?.uid ? '' : 'neighbors')
      flash(uid === user?.uid ? '내 행성으로 안전하게 귀환했습니다.' : '크루 행성에 도착했습니다. 함께할 일을 골라보세요.')
    },
    onError: (err) => flash(err?.message || '항로 연결에 실패했습니다. 원래 행성에 머무릅니다.'),
  })

  const hasActiveOverlay = Boolean(
    menu
    || arrivalOpen
    || finaleOpen
    || audioSettingsOpen
    || objectDialogOpen
    || selectedBuildItem
    || crewTravel.pending
  )

  useEffect(() => {
    if (hasActiveOverlay) {
      soundManager.duck('frontier:overlay', 0.2)
    } else {
      soundManager.unduck('frontier:overlay')
    }
  }, [hasActiveOverlay])

  const receiveOwnPlanet = useEffectEvent((snapshot) => {
    if (!snapshot.exists() || snapshot.id !== user?.uid) return
    const nextOwnPlanet = { id: snapshot.id, ...snapshot.data() }
    setHome((current) => current ? {
      ...current,
      ownPlanet: nextOwnPlanet,
      ...(targetUid === user.uid ? { planet: nextOwnPlanet } : {}),
    } : current)
  })
  useEffect(() => {
    if (isGuest || !user?.uid) return undefined
    return onSnapshot(doc(db, 'galaxyPlanets', user.uid), (snapshot) => receiveOwnPlanet(snapshot),
      (snapshotError) => setError(snapshotError?.message || '내 행성의 실시간 신호가 끊어졌습니다.'))
  }, [isGuest, user?.uid])

  useEffect(() => {
    if (isGuest || !targetUid || targetUid === user?.uid) return undefined
    return onSnapshot(doc(db, 'galaxyPlanets', targetUid), (snapshot) => {
      if (!snapshot.exists()) return
      const nextPlanet = { id: snapshot.id, ...snapshot.data() }
      setHome((current) => current ? { ...current, planet: nextPlanet } : current)
    }, (snapshotError) => setError(snapshotError?.message || '이웃 행성의 실시간 신호가 끊어졌습니다.'))
  }, [isGuest, targetUid, user?.uid])

  useEffect(() => {
    if (isGuest || !user?.uid) return undefined
    return onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (!snapshot.exists()) return
      const profile = snapshot.data() || {}
      const nextWallet = Math.max(0, Number(profile.crystals || 0))
      const ownedExplorationKits = Array.isArray(profile.ownedExplorationKits) ? profile.ownedExplorationKits : []
      setHome((current) => current ? { ...current, wallet: nextWallet, ownedExplorationKits } : current)
    })
  }, [isGuest, user?.uid])

  useEffect(() => {
    if (isGuest || !user?.uid) return undefined
    const eventQuery = query(collection(db, 'galaxyPlanets', user.uid, 'visitEvents'), orderBy('createdAt', 'desc'), limit(30))
    return onSnapshot(eventQuery, (snapshot) => {
      const events = snapshot.docs.map((eventDoc) => ({
        id: eventDoc.id,
        ...eventDoc.data(),
        createdAt: eventDoc.data()?.createdAt?.toDate?.()?.toISOString?.() || '',
      }))
      setHome((current) => current ? { ...current, events } : current)
    }, (snapshotError) => setError(snapshotError?.message || '귀환 신호를 실시간으로 불러오지 못했습니다.'))
  }, [isGuest, user?.uid])

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 15000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!home?.liveSession?.granted || home.liveSession.roomOwnerUid !== targetUid || !user?.uid) return undefined
    let cancelled = false
    let inFlight = false
    let lastAttemptMs = -Infinity
    const renew = async () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine || inFlight || Date.now() - lastAttemptMs < 5000) return
      inFlight = true
      lastAttemptMs = Date.now()
      try {
        const result = await callGalaxy('renewGalaxyWorldSession', { roomOwnerUid: targetUid })
        if (cancelled || !result?.liveSession) return
        setHome((current) => current && current.liveSession?.roomOwnerUid === targetUid
          ? { ...current, liveSession: result.liveSession }
          : current)
      } catch (renewError) {
        console.warn('Failed to renew galaxy live session', renewError)
      } finally {
        inFlight = false
      }
    }
    // Server grants five minutes; renew with two minutes of headroom.
    const timer = window.setInterval(renew, 3 * 60 * 1000)
    const handleFocus = () => {
      const estimatedServerNowMs = Date.now() + Number(home.serverClockOffsetMs || 0)
      if (Number(home.liveSession.expiresAtMs || 0) - estimatedServerNowMs < 90 * 1000) renew()
    }
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [callGalaxy, home?.liveSession?.expiresAtMs, home?.liveSession?.granted, home?.liveSession?.roomOwnerUid, home?.serverClockOffsetMs, targetUid, user?.uid])

  useEffect(() => () => window.clearTimeout(noticeTimerRef.current), [])

  const requestReturn = useCallback(() => {
    if (returningRef.current) return

    returningRef.current = true
    setReturning(true)

    try {
      const returnRequest = onBack?.()
      if (!returnRequest || typeof returnRequest.then !== 'function') {
        if (!onBack) {
          returningRef.current = false
          setReturning(false)
        }
        return
      }

      returnRequest.then((result) => {
        // endSession returns null when an online request failed. Offline returns also finish
        // locally, so this state update is harmless as MetaGalaxy is unmounted immediately.
        if (result === null) {
          returningRef.current = false
          setReturning(false)
        }
      }).catch(() => {
        returningRef.current = false
        setReturning(false)
        setError('귀환 신호를 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.')
      })
    } catch {
      returningRef.current = false
      setReturning(false)
      setError('귀환 신호를 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }, [onBack])

  useEffect(() => {
    const nextOverlay = overlayReady ? (crewTravel.pending ? 'travel' : objectDialogOpen ? 'object' : arrivalOpen ? 'arrival' : menu ? 'menu' : '') : ''
    const previousOverlay = activeOverlayRef.current
    let frameId = 0

    if (nextOverlay && !previousOverlay) {
      const activeElement = document.activeElement
      restoreFocusRef.current = activeElement && typeof activeElement.focus === 'function' ? activeElement : null
    }

    activeOverlayRef.current = nextOverlay
    if (nextOverlay) {
      frameId = window.requestAnimationFrame(() => {
        const closeButton = nextOverlay === 'travel'
          ? crewTravelCancelRef.current
          : nextOverlay === 'object'
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
  }, [arrivalOpen, crewTravel.pending, menu, objectDialogOpen, overlayReady])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape' || event.repeat || event.defaultPrevented) return

      // GalaxyWorld3D owns Escape while building. The same key must never close the builder
      // and return from the game in one press.
      if (builderActive) return

      event.preventDefault()
      if (objectDialogOpen) {
        setObjectDialogOpen(false)
        setSelectedStructureId('')
      }
      else if (finaleOpen) setFinaleOpen(false)
      else if (arrivalOpen) setArrivalOpen(false)
      else if (audioSettingsOpen) setAudioSettingsOpen(false)
      else if (menu) setMenu('')
      // Escape releases the mouse; only the explicit return button ends a session.
      else releaseFrontierPointerLock(document)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [arrivalOpen, audioSettingsOpen, builderActive, finaleOpen, menu, objectDialogOpen])

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
  const signalPlazaSummary = useMemo(() => ({
    unreadCount: isOwner ? events.filter((event) => !event.seen).length : 0,
    recentCount: isOwner
      ? events.length
      : Math.max(0, Number(planet.stats?.admirationCount || 0)),
    totalVisits: Math.max(0, Number(planet.stats?.visits || 0)),
    recentSignals: isOwner
      ? events.slice(0, 6).map((event) => ({
        id: event.id,
        actionId: event.actionId || 'admire',
        actorName: event.actorName || '이웃 탐사원',
        seen: Boolean(event.seen),
      }))
      : [],
  }), [events, isOwner, planet.stats?.admirationCount, planet.stats?.visits])
  const greenhouseSummary = useMemo(() => {
    const waterEvents = isOwner
      ? events.filter((event) => event?.itemId === 'friend_greenhouse' && event?.actionId === 'water')
      : []
    const recentHelpers = [...new Set(waterEvents.map((event) => event?.actorName).filter(Boolean))].slice(0, 3)
    const route = (home?.neighbors || []).find((neighbor) => neighbor?.uid === targetUid)
    return {
      vitality: Math.min(100, Math.max(0, Number(planet.stats?.gardenVitality || 0))),
      recentWaterCount: waterEvents.length,
      recentHelpers,
      visitMessage,
      routeLevel: Math.max(1, Number(route?.routeLevel || 1)),
      connectionXp: Math.max(0, Number(route?.connectionXp || 0)),
      nextLevelXp: Math.max(0, Number(route?.nextLevelXp || 0)),
    }
  }, [events, home?.neighbors, isOwner, planet.stats?.gardenVitality, targetUid, visitMessage])
  const gardenSummary = useMemo(() => {
    const waterEvents = isOwner
      ? events.filter((event) => event?.itemId === 'starflower_garden' && event?.actionId === 'water')
      : []
    return {
      vitality: Math.min(100, Math.max(0, Number(planet.stats?.gardenVitality || 0))),
      recentWaterCount: waterEvents.length,
      recentHelpers: [...new Set(waterEvents.map((event) => event?.actorName).filter(Boolean))].slice(0, 3),
      visitMessage,
    }
  }, [events, isOwner, planet.stats?.gardenVitality, visitMessage])
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
  const frontierStory = useMemo(() => normalizeFrontierStory(ownPlanet.frontierStory), [ownPlanet.frontierStory])
  latestFrontierStoryRef.current = frontierStory
  const storyObjective = useMemo(() => {
    const objective = getFrontierStoryObjective(frontierStory)
    if (isOwner && frontierStory.stepId === 'stabilize_daily_event' && dailyEvent?.status !== 'pending') return {
      ...objective,
      eyebrow: '제1장 완료 기록 확인 중',
      title: dailyEvent?.status === 'completed'
        ? '오늘의 행성 사건은 해결되었습니다. 다음 항로를 여는 중입니다'
        : '오늘의 행성 사건 신호를 다시 확인하고 있습니다',
      detail: '완료 기록이 확인되면 제2장 ‘잃어버린 항로’로 자동 전환됩니다.',
      action: 'story-sync',
    }
    return isOwner || objective?.action === 'neighbors' ? objective : null
  }, [dailyEvent?.status, frontierStory, isOwner])
  useEffect(() => {
    if (
      !isGuest
      || !isOwner
      || frontierStory.stepId !== 'stabilize_daily_event'
      || dailyEvent?.status !== 'completed'
    ) return
    syncGuestCompletedDailyEventStory()
  }, [dailyEvent?.status, frontierStory.stepId, isGuest, isOwner, syncGuestCompletedDailyEventStory])

  useEffect(() => {
    if (
      isGuest
      || !isOwner
      || !user?.uid
      || frontierStory.stepId !== 'stabilize_daily_event'
      || dailyEvent?.status !== 'completed'
    ) return
    const attemptKey = `${user.uid}:${dailyEvent.eventId || dailyEvent.dayKey || 'completed'}`
    if (dailyStorySyncAttemptRef.current === attemptKey) return
    dailyStorySyncAttemptRef.current = attemptKey
    void loadHome(user.uid, { quiet: true })
  }, [dailyEvent?.dayKey, dailyEvent?.eventId, dailyEvent?.status, frontierStory.stepId, isGuest, isOwner, loadHome, user?.uid])
  useEffect(() => {
    if (frontierStory.status !== 'completed' || finaleShownRef.current) return
    finaleShownRef.current = true
    setArrivalOpen(false)
    setMenu('')
    setFinaleOpen(true)
    if (!isGuest) {
      void callGalaxy('recordGalaxyStoryTelemetry', {
        eventId: createOperationId(),
        eventType: 'finale_view',
        chapterId: frontierStory.chapterId,
        stepId: frontierStory.stepId,
        restorationPercent: frontierStory.restorationPercent,
        elapsedMs: Date.now() - storySessionStartedAtRef.current,
      }).catch(() => {})
    }
  }, [callGalaxy, frontierStory.chapterId, frontierStory.restorationPercent, frontierStory.status, frontierStory.stepId, isGuest])

  useEffect(() => {
    if (isGuest || !frontierStory.chapterId || lastChapterTelemetryRef.current === frontierStory.chapterId) return
    lastChapterTelemetryRef.current = frontierStory.chapterId
    void callGalaxy('recordGalaxyStoryTelemetry', {
      eventId: createOperationId(),
      eventType: 'chapter_view',
      chapterId: frontierStory.chapterId,
      stepId: frontierStory.stepId,
      restorationPercent: frontierStory.restorationPercent,
      elapsedMs: Date.now() - storySessionStartedAtRef.current,
    }).catch(() => {})
  }, [callGalaxy, frontierStory.chapterId, frontierStory.restorationPercent, frontierStory.stepId, isGuest])

  useEffect(() => {
    if (isGuest) return undefined
    const recordExit = () => {
      const now = Date.now()
      if (now - lastExitTelemetryAtRef.current < 2000) return
      const story = latestFrontierStoryRef.current
      if (!story) return
      lastExitTelemetryAtRef.current = now
      void callGalaxy('recordGalaxyStoryTelemetry', {
        eventId: createOperationId(),
        eventType: 'exit',
        chapterId: story.chapterId,
        stepId: story.stepId,
        restorationPercent: story.restorationPercent,
        elapsedMs: now - storySessionStartedAtRef.current,
      }).catch(() => {})
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') recordExit()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      recordExit()
    }
  }, [callGalaxy, isGuest])
  const roverExpedition = ownPlanet.roverExpedition || null
  const roverStatus = getGalaxyRoverStatus(roverExpedition, galaxyNowMs)
  const roverPhase = getGalaxyRoverPhase(roverExpedition, galaxyNowMs)
  const roverReadyAtMs = Number(roverExpedition?.returnsAtMs || roverExpedition?.readyAtMs || 0)
  const roverRemainingLabel = formatGalaxyRoverRemainingTime(Math.max(0, roverReadyAtMs - galaxyNowMs))
  const hasRoverBay = ownLayout.some((item) => item?.itemId === 'rover_bay' && item?.locked !== true)
  const hasExpeditionBeacon = ownLayout.some((item) => item?.itemId === 'expedition_beacon' && item?.locked !== true)
  const roverBayAppliedToCurrent = Boolean(roverExpedition?.bonuses?.roverBay)
  const roverStatusLabel = roverPhase === 'returned'
    ? '귀환 상자 수신하기'
    : roverPhase === 'expedition'
      ? `귀환 ${roverRemainingLabel}`
      : roverPhase === 'report'
        ? '귀환 보고서 보관하기'
        : '장거리 원정 준비'
  const observatorySummary = {
    mode: dailyEventPending ? 'alert' : unreadCount > 0 || roverStatus === 'ready' ? 'signal' : 'stable',
    statusLabel: dailyEventPending
      ? `행성 사건 관측 · ${dailyEvent?.title || '미확인 현장 신호'}`
      : unreadCount > 0
        ? `새 귀환 신호 ${unreadCount}개 관측`
        : roverStatus === 'ready'
          ? '로버 귀환 신호 관측'
          : roverStatus === 'active'
            ? `로버 원정 관측 · ${roverRemainingLabel}`
            : '오늘의 행성 신호 안정',
    detail: dailyEventPending
      ? '브리핑에서 사건 위치와 해결 보상을 확인한 뒤 현장으로 이동할 수 있습니다.'
      : unreadCount > 0
        ? '브리핑에서 새 방문 기록과 행성 상태를 함께 확인할 수 있습니다.'
        : roverStatus === 'ready'
          ? '브리핑에서 귀환 상태를 확인하고 로버 관제로 이동할 수 있습니다.'
          : '사건·방문·원정 신호를 한 화면에서 확인할 수 있습니다.',
  }
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
    if (storyObjective) return storyObjective
    if (isOwner && roverStatus === 'ready') return {
      id: 'rover-return',
      eyebrow: '지금 할 일 · 로버 보상 받기',
      title: '아래 로버 메뉴를 열고 ‘보상 받기’를 누르세요',
      detail: '원정이 가져온 건설 재료와 발견 기록을 한 번에 받습니다.',
      progress: 1,
      total: 1,
      action: 'rover',
    }
    if (unreadCount > 0) return {
      id: 'signals',
      eyebrow: '지금 할 일 · 새 소식 확인',
      title: `아래 신호 메뉴에서 새 메시지 ${unreadCount}개를 읽으세요`,
      detail: '친구의 도움 기록과 메시지를 확인할 수 있습니다.',
      progress: 0,
      total: unreadCount,
      action: 'logs',
    }
    if (dailyEventPending) return {
      id: 'daily-event',
      eyebrow: '오늘 한 번 · 현장 사건 해결',
      title: `왼쪽 아래 행성 지도의 점선 방향으로 [✦ 사건 현장]까지 이동하세요 · ${dailyEvent.title || '행성 사건'}`,
      detail: `${dailyEvent.detail || '현장에 가서 사건을 해결하세요.'} 해결하면 ${dailyEvent.reward?.title || '건설 재료'} ${dailyEvent.reward?.amount ?? 1}개를 받습니다.`,
      progress: 0,
      total: 1,
      action: 'daily-event',
    }
    if (builtCount === 0 && wallet >= 25) return {
      id: 'first-build',
      eyebrow: '처음 시작하기 · 첫 시설 건설',
      title: '아래 건설 메뉴에서 시설 하나를 골라 땅에 배치하세요',
      detail: '‘건설’ → 시설 선택 → 초록색 원이 보이는 평평한 땅을 누르면 완성됩니다.',
      progress: 0,
      total: 1,
      action: 'build',
    }
    if (isOwner && roverStatus === 'claimed') return {
      id: 'rover-report',
      eyebrow: '지금 할 일 · 귀환 보고서 보관',
      title: '로버 관제에서 이번 원정의 귀환 보고서를 보관하세요',
      detail: '보관하면 이번 원정은 일지에 남고 그다음 원정을 준비할 수 있습니다.',
      progress: 1,
      total: 1,
      action: 'rover',
    }
    if (isOwner && roverStatus === 'idle') return {
      id: 'rover-dispatch',
      eyebrow: '지금 할 일 · 로버 보내기',
      title: '아래 로버 메뉴에서 항로 하나를 고르고 출발시키세요',
      detail: `출발하면 ${hasRoverBay ? '6시간' : '8시간'} 뒤 건설 재료와 발견 기록을 가져옵니다. 게임을 닫아도 계속됩니다.`,
      progress: 0,
      total: 1,
      action: 'rover',
    }
    if (missionCooldown.ready) return {
      id: 'field-expedition',
      eyebrow: '45초 미니게임 · 건설 재료',
      title: '화면 앞 보라색 출발대에서 E키를 눌러 탐사를 시작하세요',
      detail: '시작 뒤 나타나는 빛나는 조각 5개를 몸으로 지나가 모으세요. 45초 안에 모두 모으면 재료를 받습니다.',
      progress: 0,
      total: 5,
      action: 'world',
    }
    if (isOwner && roverStatus === 'active') return {
      id: 'rover-active',
      eyebrow: '로버가 재료를 모으는 중',
      title: `로버가 ${roverRemainingLabel} 돌아옵니다`,
      detail: '기다리는 동안 시설 가까이에서 E키로 재료를 모으거나, 아래 건설 메뉴에서 행성을 꾸며보세요.',
      progress: 0,
      total: 1,
      action: 'rover',
    }
    return {
      id: 'route-care',
      eyebrow: isOwner ? '지금 할 일 · 내 시설 돌보기' : '지금 할 일 · 친구 시설 도와주기',
      title: isOwner ? '가까운 시설에서 E키를 눌러 건설 재료를 모으세요' : '친구 시설 가까이에서 E키를 눌러 도움을 남기세요',
      detail: isOwner ? `시설마다 5분에 한 번 재료를 얻을 수 있습니다. 탐사 출발대는 ${missionCooldown.label} 뒤 다시 이용할 수 있습니다.` : '친구 행성에서는 시설을 수정하거나 건설할 수 없지만, 돌보기로 도움 기록을 남길 수 있습니다.',
      progress: 0,
      total: 1,
      action: isOwner ? 'build' : 'world',
    }
  }, [builtCount, dailyEvent?.detail, dailyEvent?.reward?.amount, dailyEvent?.reward?.title, dailyEvent?.title, dailyEventPending, hasRoverBay, isOwner, missionCooldown.label, missionCooldown.ready, roverRemainingLabel, roverStatus, storyObjective, unreadCount, wallet])

  const overnightSummary = useMemo(() => {
    if (dailyEventPending) return `${dailyEvent.title} ${dailyEvent.detail || '현장의 신호를 따라가 오늘의 변화를 해결해 주세요.'}`
    if (dailyEvent?.status === 'completed') return `${dailyEvent.title || '오늘의 행성 사건'} 해결로 행성의 흐름이 다시 안정됐습니다.`
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

  const buyBuilderUpgrade = useCallback(async ({ kind, plotId }) => {
    if (isGuest) {
      flash('블록 용량 구매는 회원 계정에서 이용할 수 있어요.')
      return null
    }
    if (kind !== 'block_pack') return null
    const confirmed = window.confirm('학습 광석 1,000개로 이 건축실의 블록 용량을 500개 늘릴까요?')
    if (!confirmed) return null
    const label = '블록 용량이 500개 늘었습니다.'
    const operationKey = `${kind}:${plotId}`
    const operationId = builderUpgradeOperationRef.current[operationKey]
      || (builderUpgradeOperationRef.current[operationKey] = createOperationId())
    const result = await runAction(
      `astra-builder:${kind}:${plotId || 'next'}`,
      () => purchaseBuilderUpgrade({ kind, plotId, operationId }),
      label,
    )
    if (!result) return null
    delete builderUpgradeOperationRef.current[operationKey]
    setHome((current) => current ? {
      ...current,
      wallet: result.wallet,
      builderAccess: result.builderAccess,
    } : current)
    return result
  }, [flash, isGuest, purchaseBuilderUpgrade, runAction])

  const buyTerritoryExpansion = useCallback(async () => {
    if (isGuest) {
      flash('개척 영지 확장은 회원 계정에서 이용할 수 있어요.')
      return null
    }
    if (home?.ownPlanet?.territoryExpanded) return null
    const confirmed = window.confirm('학습 광석 6,000개로 개척 영지의 면적을 2배로 확장할까요? 확장지는 시설 없이 강과 산이 있는 빈땅으로 열립니다.')
    if (!confirmed) return null
    const operationId = territoryExpansionOperationRef.current
      || (territoryExpansionOperationRef.current = createOperationId())
    const result = await runAction(
      'territory:expand',
      () => purchaseTerritoryExpansion({ operationId }),
      '개척 영지가 2배로 확장되었습니다.',
    )
    if (!result) return null
    territoryExpansionOperationRef.current = ''
    setHome((current) => current ? {
      ...current,
      wallet: result.wallet,
      ownPlanet: { ...current.ownPlanet, ...result.planet },
      planet: isOwner ? { ...current.planet, ...result.planet } : current.planet,
    } : current)
    return result
  }, [flash, home?.ownPlanet?.territoryExpanded, isGuest, isOwner, purchaseTerritoryExpansion, runAction])

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
    if (crewTravel.pending || homeLoadInFlightRef.current.size || neighborUid === targetUid) return
    if (!isGuest && neighborUid !== user?.uid && !canVisitCrewRoute((home?.neighbors || []).find(entry => entry.uid === neighborUid), targetUid)) {
      flash('승인된 크루의 방문 가능한 행성을 선택해주세요.')
      return
    }
    setSelectedStructureId('')
    setObjectDialogOpen(false)
    setSelectedBuildItem('')
    setMenu('')
    setArrivalOpen(false)
    releaseFrontierPointerLock(document)
    if (isGuest && neighborUid === 'guest-training-neighbor') {
      const result = guestGalaxy.visitTrainingNeighbor()
      setHome((current) => current ? {
        ...current,
        ownPlanet: { ...current.ownPlanet, frontierStory: result.frontierStory },
        planet: { ...current.planet, frontierStory: result.frontierStory },
      } : current)
      flash('루미의 훈련용 행성에 왕복 신호를 보냈습니다. 친구 방문 단계가 기록되었습니다.')
      return
    }
    crewTravel.start(neighborUid, neighborUid === user?.uid ? home?.ownPlanet?.planetName || '내 행성' : (home?.neighbors || []).find(entry => entry.uid === neighborUid)?.planetName || '크루 행성')
  }

  const setNeighborBlocked = async (neighbor, blocked) => {
    if (!neighbor?.uid) return
    const result = await runAction(
      `safety:block:${neighbor.uid}`,
      () => callGalaxy('setGalaxyUserBlocked', { targetUid: neighbor.uid, blocked }),
      blocked
        ? `${neighbor.displayName} 탐사원과의 방문·대화를 차단했습니다.`
        : `${neighbor.displayName} 탐사원의 차단을 해제했습니다.`,
    )
    if (!result) return
    setHome((current) => current ? {
      ...current,
      neighbors: (current.neighbors || []).map((entry) => entry.uid === neighbor.uid ? {
        ...entry,
        blocked,
        visitMode: blocked ? 'private' : entry.visitMode,
        planetName: blocked ? '차단한 탐사원' : entry.planetName,
        tagline: blocked ? '차단을 해제하기 전에는 서로 방문하거나 대화할 수 없습니다.' : entry.tagline,
      } : entry),
    } : current)
    await loadHome(blocked && targetUid === neighbor.uid ? user.uid : targetUid, { quiet: true })
  }

  const reportNeighbor = async (neighbor) => {
    if (!neighbor?.uid) return
    const confirmed = window.confirm(`${neighbor.displayName} 탐사원의 부적절한 행동을 운영자에게 신고할까요?`)
    if (!confirmed) return
    // 신고 증거로 해당 탐사원의 가장 최근 공개 발언 한 줄만 서버에 전달한다.
    // 신고자가 직접 쓴 문장이 아니라 실제 노출되었던 휘발성 대화 텍스트다.
    const recentSpeech = remotePlayers
      .find((player) => player?.uid === neighbor.uid)?.speech?.text || ''
    const evidence = typeof recentSpeech === 'string' ? recentSpeech.slice(0, 200) : ''
    await runAction(
      `safety:report:${neighbor.uid}`,
      () => callGalaxy('reportGalaxyUser', {
        targetUid: neighbor.uid,
        category: 'harassment',
        reportId: createOperationId(),
        evidence,
      }),
      '신고를 접수했습니다. 불편하면 함께 차단해 주세요.',
    )
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
        Math.hypot(numericWorldX, numericWorldZ) > getBuildRadius(Boolean(ownPlanet?.territoryExpanded))
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

  const upgradeGalaxyObject = async (item = selectedObject) => {
    if (!isOwner || !item?.instanceId) return null
    const targetLevel = Math.max(1, Number(item.level || 1)) + 1
    const result = await runAction(
      `object:upgrade:${item.instanceId}`,
      () => callGalaxy('upgradeGalaxyItem', {
        instanceId: item.instanceId,
        targetLevel,
        operationId: createOperationId(),
      }),
      (upgradeResult) => `${upgradeResult?.item?.name || item.name || '객체'}가 Stage ${targetLevel}로 성장했습니다.`,
    )
    if (!result?.item) return null
    setHome((current) => {
      if (!current) return current
      const updateLayout = (targetPlanet = {}) => ({
        ...targetPlanet,
        layout: (Array.isArray(targetPlanet.layout) ? targetPlanet.layout : [])
          .map((entry) => entry.instanceId === item.instanceId ? result.item : entry),
      })
      const nextOwnPlanet = updateLayout(current.ownPlanet)
      return {
        ...current,
        wallet: Number.isFinite(Number(result.wallet)) ? Number(result.wallet) : current.wallet,
        ownPlanet: nextOwnPlanet,
        planet: targetUid === user.uid ? nextOwnPlanet : current.planet,
      }
    })
    soundManager.play('frontier.build.complete')
    if (result.frontierStory?.stepId === 'stabilize_daily_event' && dailyEvent?.status === 'completed') {
      void loadHome(user.uid, { quiet: true })
    }
    return result
  }

  const deleteGalaxyObject = async (item = selectedObject) => {
    if (!isOwner || !item?.instanceId) return null
    const instanceId = item.instanceId
    if (isGuest) {
      // 게스트는 로컬 저장소에서만 삭제한다. (서버 호출 없음)
      guestGalaxy.removeBuildItem(instanceId)
      setHome((current) => {
        if (!current) return current
        const removeFromLayout = (targetPlanet = {}) => ({
          ...targetPlanet,
          layout: (Array.isArray(targetPlanet.layout) ? targetPlanet.layout : []).filter((entry) => entry.instanceId !== instanceId),
        })
        const nextOwnPlanet = removeFromLayout(current.ownPlanet)
        return { ...current, ownPlanet: nextOwnPlanet, planet: nextOwnPlanet }
      })
      setNotice(`${item.name || '객체'}를 행성에서 삭제했습니다.`)
      soundManager.play('frontier.buildingPlaced')
      closeObjectDialog()
      return { success: true }
    }
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
    if (itemId === ASTRA_BUILDER_INSTALL_ITEM_ID) {
      if (isGuest) {
        flash('추가 아스트라 빌더 설치는 회원 계정에서 이용할 수 있어요.')
        return
      }
      const result = await runAction('astra-builder:install', () => callGalaxy('installGalaxyAstraBuilder', {
        operationId: builderInstallOperationRef.current || (builderInstallOperationRef.current = createOperationId()),
        x: 50 + Number(worldX || 0) * 3,
        y: 50 + Number(worldZ || 0) * 3,
      }), '새 아스트라 빌더를 이곳에 설치했습니다.')
      if (!result) return
      setHome((current) => current ? {
        ...current,
        wallet: result.wallet,
        builderAccess: result.builderAccess,
      } : current)
      setSelectedBuildItem('')
      setSelectedBuildLevel(1)
      builderInstallOperationRef.current = ''
      soundManager.play('frontier.buildingPlaced')
      return
    }
    if (isGuest) {
      // 정규 서버 스키마와 동일한 좌표(0~100)를 사용한다. 비용은 카탈로그에서 읽는다.
      const placementX = 50 + Number(worldX || 0) * 3
      const placementY = 50 + Number(worldZ || 0) * 3
      try {
        const guestResult = guestGalaxy.buildItem(itemId, placementX, placementY)
        const newItem = guestResult.item
        setHome((current) => {
          if (!current) return current
          const nextOwnPlanet = { ...current.ownPlanet, ...guestResult.planet }
          return {
            ...current,
            ownPlanet: nextOwnPlanet,
            planet: nextOwnPlanet,
            userCrystals: guestResult.wallet,
            wallet: guestResult.wallet,
          }
        })
        setNotice(guestResult.storyGrantApplied
          ? `${newItem.name || itemId}을(를) 프롤로그 지원으로 건설했습니다. 기억 조각 2/4 복원!`
          : `${newItem.name || itemId}을(를) 로컬 행성에 건설했습니다.`)
        soundManager.play('frontier.buildingPlaced')
      } catch (err) {
        setError(err?.message || '광석이 부족하거나 건설할 수 없습니다.')
        soundManager.play('frontier.connection.softError')
      }
      return
    }
    const operationId = createOperationId()
    const requestAudioSessionKey = audioSessionKey
    const result = await runAction(`build:${itemId}`, () => callGalaxy('buildGalaxyItem', {
      itemId,
      level: selectedBuildLevel,
      operationId,
      x: 50 + Number(worldX || 0) * 3,
      y: 50 + Number(worldZ || 0) * 3,
    }), (buildResult) => buildResult?.frontierStory?.memoryShards > frontierStory.memoryShards
      ? `${buildResult?.placed?.name || '새 시설'}을 건설했습니다. 기억 조각 ${buildResult.frontierStory.memoryShards}/4 복원!`
      : `${buildResult?.placed?.name || '새 시설'}을 이곳에 건설했습니다.`)
    if (
      !audioMountedRef.current
      || audioSessionKeyRef.current !== requestAudioSessionKey
    ) return
    if (!result) {
      soundManager.play('frontier.connection.softError')
      return
    }
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
        frontierStory: result.frontierStory || currentOwnPlanet.frontierStory,
      }
      return {
        ...current,
        wallet: Number.isFinite(Number(result.wallet)) ? Number(result.wallet) : current.wallet,
        ownPlanet: nextOwnPlanet,
        planet: targetUid === user?.uid ? nextOwnPlanet : current.planet,
      }
    })
    setSelectedBuildItem('')
    setSelectedBuildLevel(1)
    soundManager.play('frontier.build.complete')
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
      ownPlanet: result.frontierStory
        ? { ...current.ownPlanet, frontierStory: result.frontierStory, materials: result.materials || current.ownPlanet?.materials }
        : current.ownPlanet,
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
    const mission = getStructureVisitAction(item.itemId)
    if (isOwner && item.itemId === 'signal_plaza') {
      closeObjectDialog()
      await openLogs()
      flash(unreadCount > 0
        ? `광장에 도착한 새 귀환 신호 ${unreadCount}개를 열었습니다.`
        : '귀환 신호 타임라인을 열었습니다.')
      return { openedSignalTimeline: true }
    }
    if (isOwner && item.itemId === 'observatory') {
      closeObjectDialog()
      setArrivalOpen(true)
      flash(`${observatorySummary.statusLabel}. 관측 브리핑을 열었습니다.`)
      return { openedObservatoryBriefing: true }
    }
    if (isOwner && item.itemId === 'expedition_beacon') {
      closeObjectDialog()
      openGameMenu('rover')
      flash(roverStatus === 'ready'
        ? '원정대 비콘이 귀환 상자를 수신했습니다. 보상을 회수해 주세요.'
        : roverStatus === 'active'
          ? `원정 신호를 추적 중입니다. ${roverRemainingLabel} 귀환합니다.`
          : '원정 관제를 열었습니다. 비콘 보너스가 적용된 항로를 선택해 주세요.')
      return { openedRoverControl: true }
    }
    if (isOwner && item.itemId === 'rover_bay') {
      closeObjectDialog()
      openGameMenu('rover')
      flash(roverStatus === 'ready'
        ? '정비소에 로버가 귀환했습니다. 상자를 열어 보상을 회수해 주세요.'
        : roverStatus === 'active'
          ? roverBayAppliedToCurrent
            ? `정비소 가속이 적용된 원정입니다. ${roverRemainingLabel} 귀환합니다.`
            : `이번 원정은 기존 8시간 일정입니다. 정비소 가속은 다음 원정부터 적용됩니다.`
          : '로버 관제를 열었습니다. 정비소 가속으로 다음 원정은 6시간이 걸립니다.')
      return { openedRoverControl: true }
    }
    if (isOwner) {
      const result = await runAction(
        `object:mission:${item.instanceId}`,
        () => isGuest
          ? guestGalaxy.careForStructure(item)
          : callGalaxy('performGalaxyStructureAction', { instanceId: item.instanceId }),
        (missionResult) => missionResult?.frontierStory?.signalFragments > frontierStory.signalFragments
          ? `${missionResult?.label || '시설 돌보기를 마쳤습니다.'} 항로 신호 ${missionResult.frontierStory.signalFragments}/3 복원!`
          : item.itemId === 'friend_greenhouse' || item.itemId === 'starflower_garden'
          ? `${missionResult?.label || '정원 돌봄을 마쳤습니다.'} 다음 돌봄은 5분 뒤 가능합니다.`
          : missionResult?.label || `${mission.label}을 완료했습니다.`,
      )
      if (!result) return null
      setHome((current) => {
        if (!current) return current
        const ownPlanet = current.ownPlanet || {}
        const nextOwnPlanet = {
          ...ownPlanet,
          materials: result.materials || ownPlanet.materials || {},
          frontierStory: result.frontierStory || ownPlanet.frontierStory,
        }
        return { ...current, ownPlanet: nextOwnPlanet, planet: (isGuest || targetUid === user?.uid) ? nextOwnPlanet : current.planet }
      })
      return result
    }
    const result = await runAction(
      `object:mission:${item.instanceId}`,
      () => callGalaxy('performGalaxyVisitAction', {
        targetUid,
        actionId: mission.actionId,
        instanceId: item.instanceId,
        message: visitMessage,
      }),
      (missionResult) => item.itemId === 'friend_greenhouse' || item.itemId === 'starflower_garden'
        ? missionResult?.rewarded
          ? `${item.itemId === 'starflower_garden' ? '별꽃 물주기' : '물주기'} 완료 · 정원 활력 +${missionResult?.statAmount || 4} · 연결도 +${missionResult?.connectionXpGained || 6} · 별가루 +1`
          : `${item.itemId === 'starflower_garden' ? '별꽃 물주기' : '물주기'} 완료 · 정원 활력 +${missionResult?.statAmount || 4} · 연결도 +${missionResult?.connectionXpGained || 6} · 방문 기록 전달`
        : missionResult?.rewarded
          ? '객체 도움 미션을 기록하고 별가루 1개를 발견했습니다.'
          : '객체 도움 미션을 친구의 귀환 기록에 남겼습니다.',
    )
    if (!result) return null
    setHome((current) => {
      if (!current) return current
      const currentOwnPlanet = current.ownPlanet || {}
      const currentPlanet = current.planet || {}
      return {
        ...current,
        ownPlanet: result.materials || result.frontierStory ? {
          ...currentOwnPlanet,
          materials: result.materials || currentOwnPlanet.materials,
          frontierStory: result.frontierStory || currentOwnPlanet.frontierStory,
        } : currentOwnPlanet,
        planet: result.stat
          ? { ...currentPlanet, stats: { ...(currentPlanet.stats || {}), [result.stat]: result.statValue } }
          : currentPlanet,
        neighbors: (current.neighbors || []).map((neighbor) => neighbor.uid === targetUid ? {
        ...neighbor,
        routeLevel: result.routeLevel ?? neighbor.routeLevel,
        connectionXp: result.connectionXp ?? neighbor.connectionXp,
        nextLevelXp: result.nextLevelXp ?? neighbor.nextLevelXp,
        interactionCount: Math.max(0, Number(neighbor.interactionCount || 0)) + 1,
      } : neighbor),
      }
    })
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
    const result = await runAction(
      `world:${node.id}`,
      () => isGuest
        ? guestGalaxy.performWorldAction(node)
        : callGalaxy('performGalaxyWorldAction', {
          actionId: node.actionId,
          nodeId: node.id,
          x: node.position?.[0] || 0,
          z: node.position?.[2] || 0,
        }),
      (actionResult) => actionResult?.frontierStory?.memoryShards > frontierStory.memoryShards
        ? `${actionResult?.label || '월드 활동을 완료했습니다.'} 기억 조각 ${actionResult.frontierStory.memoryShards}/4 복원!`
        : actionResult?.label || '월드 활동을 완료했습니다.',
    )
    if (!result) return null
    setHome((current) => {
      if (!current) return current
      const nextOwnPlanet = {
        ...current.ownPlanet,
        materials: result.materials || current.ownPlanet?.materials || {},
        stats: result.stats || current.ownPlanet?.stats || {},
        frontierStory: result.frontierStory || current.ownPlanet?.frontierStory,
      }
      return { ...current, ownPlanet: nextOwnPlanet, planet: nextOwnPlanet }
    })
    return result
  }

  const completeDailyEvent = async (event = dailyEvent) => {
    if (!isOwner || event?.status !== 'pending') return null
    const requestAudioSessionKey = audioSessionKey
    const result = await runAction(
      `daily:${event.eventId || event.type || 'event'}`,
      () => isGuest
        ? guestGalaxy.completeDailyEvent()
        : callGalaxy('completeGalaxyDailyEvent', { dayKey: event.dayKey, eventId: event.eventId }),
      (completion) => {
        const reward = completion?.reward || event.reward || {}
        const base = `${event.title || '오늘의 행성 사건'} 해결 · ${reward.title || MATERIAL_LABELS[reward.material] || '행성 재료'} ${reward.amount ?? 1}개를 회수했습니다.`
        return completion?.frontierStory?.signalFragments > frontierStory.signalFragments
          ? `${base} 항로 신호 ${completion.frontierStory.signalFragments}/3 복원!`
          : base
      },
    )
    if (
      !audioMountedRef.current
      || audioSessionKeyRef.current !== requestAudioSessionKey
    ) return result
    if (!result?.dailyEvent) {
      soundManager.play('frontier.connection.softError')
      return null
    }
    soundManager.play('frontier.daily.complete')

    const receivedAtMs = Date.now()
    setHome((current) => {
      if (!current) return current
      const nextOwnPlanet = {
        ...current.ownPlanet,
        materials: { ...(current.ownPlanet?.materials || {}), ...(result.materials || {}) },
        stats: { ...(current.ownPlanet?.stats || {}), ...(result.stats || {}) },
        frontierStory: result.frontierStory || current.ownPlanet?.frontierStory,
      }
      return {
        ...current,
        dailyEvent: result.dailyEvent,
        serverNowMs: result.serverNowMs || current.serverNowMs,
        serverClockOffsetMs: Number.isFinite(Number(result.serverNowMs))
          ? Number(result.serverNowMs) - receivedAtMs
          : current.serverClockOffsetMs,
        ownPlanet: nextOwnPlanet,
        ...((isGuest || targetUid === user?.uid) ? { planet: nextOwnPlanet } : {}),
      }
    })
    setNowMs(receivedAtMs)
    return result
  }

  const runMission = useCallback(async (route, operationId = createOperationId()) => {
    if (playRemainingSeconds < 60) {
      flash('안전 귀환까지 1분이 남아 새로운 현장 탐사는 시작할 수 없어요.')
      return null
    }
    const result = await runAction(
      `mission:${route}`,
      () => isGuest
        ? guestGalaxy.completeMission(route)
        : callGalaxy('runGalaxyMission', { route, partnerUid: missionPartnerUid, operationId }),
      (missionResult) => missionResult?.frontierStory?.memoryShards > frontierStory.memoryShards
        ? `${missionResult?.reward?.title || '탐사 표본'} ${missionResult?.reward?.amount || 1}개를 회수했습니다. 기억 조각 ${missionResult.frontierStory.memoryShards}/4 복원!`
        : `${missionResult?.reward?.title || '탐사 표본'} ${missionResult?.reward?.amount || 1}개를 회수했습니다.`,
    )
    if (!result) return null
    const completedAtMs = Number(result.nextMissionAtMs || Date.now()) - (2 * 60 * 60 * 1000)
    setHome((current) => current ? {
      ...current,
      ownPlanet: {
        ...current.ownPlanet,
        lastMissionAtMs: completedAtMs,
        materials: result.planet?.materials || current.ownPlanet?.materials,
        frontierStory: result.frontierStory || current.ownPlanet?.frontierStory,
      },
      ...((isGuest || targetUid === user?.uid) ? { planet: {
        ...current.planet,
        lastMissionAtMs: completedAtMs,
        materials: result.planet?.materials || current.planet?.materials,
        frontierStory: result.frontierStory || current.planet?.frontierStory,
      } } : {}),
    } : current)
    setNowMs(Date.now())
    return result
  }, [callGalaxy, flash, frontierStory, guestGalaxy, isGuest, missionPartnerUid, playRemainingSeconds, runAction, targetUid, user?.uid])

  const dispatchRover = async (route) => {
    if (!isOwner) return null
    const requestAudioSessionKey = audioSessionKey
    const dispatchStorageKey = getRoverDispatchStorageKey(user?.uid)
    let operationId = ''
    let dispatchRoute = route
    try {
      const pendingDispatch = JSON.parse(sessionStorage.getItem(dispatchStorageKey) || 'null')
      operationId = pendingDispatch?.operationId || ''
      dispatchRoute = pendingDispatch?.route || route
      if (!operationId) {
        operationId = createOperationId()
        dispatchRoute = route
        sessionStorage.setItem(dispatchStorageKey, JSON.stringify({ operationId, route: dispatchRoute }))
      }
    } catch {
      operationId = createOperationId()
      dispatchRoute = route
    }
    const result = await runAction(
      'rover:dispatch',
      () => isGuest
        ? guestGalaxy.dispatchRover(dispatchRoute, operationId)
        : callGalaxy('startGalaxyRoverExpedition', { route: dispatchRoute, operationId, reportFlowVersion: 2 }).catch((dispatchError) => {
          const activeExpedition = dispatchError?.details?.expedition
          if (!activeExpedition?.operationId) throw dispatchError
          return {
            success: true,
            recovered: true,
            expedition: activeExpedition,
            serverNowMs: dispatchError?.details?.serverNowMs,
          }
        }),
      (dispatchResult) => {
        const title = dispatchResult?.expedition?.routeTitle || '장거리 로버 원정'
        const readyAt = formatGalaxyTime(dispatchResult?.expedition?.readyAtMs)
        if (dispatchResult?.frontierStory?.completedChapterIds?.includes('prologue') && !frontierStory.completedChapterIds?.includes('prologue')) {
          return `${title}이 출항했습니다. 기억 조각 4/4 복원 · 아스트라 프론티어 프롤로그 완성!`
        }
        return dispatchResult?.recovered
          ? `이미 진행 중인 ${title} 기록을 복원했습니다.${readyAt ? ` ${readyAt} 귀환 예정입니다.` : ''}`
          : `${title}을 시작했습니다.${readyAt ? ` ${readyAt} 귀환 예정입니다.` : ''}`
      },
    )
    if (
      !audioMountedRef.current
      || audioSessionKeyRef.current !== requestAudioSessionKey
    ) return result
    if (!result?.expedition) {
      soundManager.play('frontier.connection.softError')
      return null
    }
    try {
      sessionStorage.removeItem(dispatchStorageKey)
    } catch {
      // 세션 저장소를 사용할 수 없는 환경에서도 서버 원정 상태는 정상 유지된다.
    }
    const receivedAtMs = Date.now()
    setHome((current) => {
      if (!current) return current
      const nextOwnPlanet = {
        ...current.ownPlanet,
        roverExpedition: result.expedition,
        frontierStory: result.frontierStory || current.ownPlanet?.frontierStory,
      }
      return {
        ...current,
        serverNowMs: result.serverNowMs || current.serverNowMs,
        serverClockOffsetMs: Number.isFinite(Number(result.serverNowMs))
          ? Number(result.serverNowMs) - receivedAtMs
          : current.serverClockOffsetMs,
        ownPlanet: nextOwnPlanet,
        ...((isGuest || targetUid === user?.uid) ? { planet: nextOwnPlanet } : {}),
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
    const requestAudioSessionKey = audioSessionKey
    const result = await runAction(
      'rover:claim',
      () => isGuest
        ? guestGalaxy.claimRover()
        : callGalaxy('claimGalaxyRoverExpedition', { operationId: roverExpedition.operationId }),
      (claimResult) => {
        const reward = claimResult?.claimResult?.reward || {}
        const discovery = claimResult?.claimResult?.discovery || {}
        const base = `${reward.title || '원정 재료'} ${reward.amount || 0}개와 ${discovery.name || '새 발견 기록'}을 수령했습니다.`
        return claimResult?.frontierStory?.completedChapterIds?.includes('first_signal') && !frontierStory.completedChapterIds?.includes('first_signal')
          ? `${base} 제1장 ‘깨어난 신호’ 완성!`
          : base
      },
    )
    if (
      !audioMountedRef.current
      || audioSessionKeyRef.current !== requestAudioSessionKey
    ) return result
    if (!result?.expedition || !result?.claimResult) {
      soundManager.play('frontier.connection.softError')
      return null
    }
    soundManager.play('frontier.rover.complete')
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
        frontierStory: result.frontierStory || current.ownPlanet?.frontierStory,
      }
      return {
        ...current,
        serverNowMs: result.serverNowMs || current.serverNowMs,
        serverClockOffsetMs: Number.isFinite(Number(result.serverNowMs))
          ? Number(result.serverNowMs) - receivedAtMs
          : current.serverClockOffsetMs,
        ownPlanet: nextOwnPlanet,
        ...((isGuest || targetUid === user?.uid) ? { planet: nextOwnPlanet } : {}),
      }
    })
    setNowMs(receivedAtMs)
    return result
  }

  const loadRoverHistory = useCallback(async (cursorOperationId = '') => {
    if (!isOwner || roverHistory.loading) return null
    setRoverHistory((current) => ({ ...current, loading: true }))
    try {
      const result = isGuest
        ? guestGalaxy.listRoverHistory({ cursorOperationId, limit: 10 })
        : await callGalaxy('listGalaxyRoverExpeditions', { cursorOperationId, limit: 10 })
      const entries = Array.isArray(result?.entries) ? result.entries : []
      setRoverHistory((current) => {
        const previous = cursorOperationId ? current.entries : []
        const merged = [...previous, ...entries.filter((entry) => !previous.some((existing) => existing?.operationId === entry?.operationId))]
        return {
          entries: merged,
          loaded: true,
          loading: false,
          hasMore: Boolean(result?.hasMore),
          nextCursorOperationId: result?.nextCursorOperationId || '',
        }
      })
      return result
    } catch (historyError) {
      setRoverHistory((current) => ({ ...current, loaded: true, loading: false }))
      flash(historyError?.message || '원정 일지를 불러오지 못했습니다.')
      return null
    }
  }, [callGalaxy, flash, guestGalaxy, isGuest, isOwner, roverHistory.loading])

  const acknowledgeRoverReport = async (operationId) => {
    if (!isOwner || !operationId) return null
    const requestAudioSessionKey = audioSessionKey
    const result = await runAction(
      'rover:archive',
      () => isGuest
        ? guestGalaxy.acknowledgeRoverReport(operationId)
        : callGalaxy('acknowledgeGalaxyRoverReport', { operationId }),
      '귀환 보고서를 원정 일지에 보관했습니다. 다음 원정을 준비할 수 있어요.',
    )
    if (!result || !audioMountedRef.current || audioSessionKeyRef.current !== requestAudioSessionKey) return result
    const receivedAtMs = Date.now()
    setHome((current) => {
      if (!current) return current
      const roverStats = current.ownPlanet?.roverStats || {}
      const nextOwnPlanet = {
        ...current.ownPlanet,
        roverExpedition: null,
        roverStats: { ...roverStats, lastAcknowledgedOperationId: operationId },
      }
      return {
        ...current,
        serverNowMs: result.serverNowMs || current.serverNowMs,
        serverClockOffsetMs: Number.isFinite(Number(result.serverNowMs)) ? Number(result.serverNowMs) - receivedAtMs : current.serverClockOffsetMs,
        ownPlanet: nextOwnPlanet,
        ...((isGuest || targetUid === user?.uid) ? { planet: nextOwnPlanet } : {}),
      }
    })
    setRoverHistory({ entries: [], loaded: false, loading: false, hasMore: false, nextCursorOperationId: '' })
    setNowMs(receivedAtMs)
    return result
  }

  useEffect(() => {
    if (!user?.uid || !roverExpedition?.operationId) return
    try {
      sessionStorage.removeItem(getRoverDispatchStorageKey(user.uid))
    } catch {
      // 실시간 서버 원정 기록이 확인되었으므로 별도 복구 키가 없어도 안전하다.
    }
  }, [roverExpedition?.operationId, user?.uid])

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

  const openBuildForRoverMaterial = (material) => {
    const buildItemId = catalogEntries.find(([, item]) => item?.material === material)?.[0]
    if (buildItemId) setFocusedBuildItemId(buildItemId)
    openGameMenu('build')
  }

  const handleObjectiveAction = () => {
    if (todayObjective.action === 'story-sync') {
      if (!isGuest && user?.uid) void loadHome(user.uid, { quiet: true })
      flash('완료된 행성 사건 기록을 확인해 다음 항로를 열고 있습니다.')
      return
    }
    if (todayObjective.action === 'rover') {
      openGameMenu('rover')
      return
    }
    if (todayObjective.action === 'logs') {
      openLogs()
      return
    }
    if (todayObjective.action === 'build') {
      const missingCoreFacility = FRONTIER_CORE_FACILITY_IDS.find((itemId) => !ownLayout.some((item) => item?.itemId === itemId && item?.locked !== true))
      const objectiveItemId = todayObjective.itemId || (frontierStory.stepId === 'complete_core_facilities' ? missingCoreFacility : '')
      if (objectiveItemId) {
        setFocusedBuildItemId(objectiveItemId)
        setFocusedBuildLevel(1)
      }
      openGameMenu('build')
      return
    }
    if (todayObjective.action === 'neighbors') {
      if (isGuest) {
        if (frontierStory.stepId === 'visit_friend_planet') {
          visitNeighbor('guest-training-neighbor')
          return
        }
        const result = guestGalaxy.helpTrainingNeighbor()
        setHome((current) => current ? {
          ...current,
          ownPlanet: { ...current.ownPlanet, frontierStory: result.frontierStory },
          planet: { ...current.planet, frontierStory: result.frontierStory },
          neighbors: (current.neighbors || []).map((neighbor) => neighbor.uid === 'guest-training-neighbor' ? {
            ...neighbor,
            connectionXp: result.guestRouteXp,
            routeLevel: result.routeLevel,
            nextLevelXp: Math.max(0, 20 - result.guestRouteXp),
            interactionCount: Math.max(0, Number(neighbor.interactionCount || 0)) + 1,
          } : neighbor),
        } : current)
        flash(result.routeLevel >= 2
          ? '루미와 안정 항로 레벨 2를 해금했습니다. 친구의 신호가 기억망에 연결되었습니다.'
          : '훈련 행성에 도움 신호를 남겼습니다. 한 번 더 도우면 안정 항로 레벨 2가 열립니다.')
        return
      }
      if (!isOwner) {
        setArrivalOpen(false)
        setMenu('')
        flash(frontierStory.stepId === 'unlock_shared_route'
          ? '이 친구의 시설이나 자원 지점 가까이에서 E키로 도움을 반복해 연결 XP 20을 모으세요.'
          : '친구 시설이나 자원 지점 가까이에서 E키를 눌러 도움 신호를 남기세요.')
        return
      }
      openGameMenu('neighbors')
      return
    }
    if (todayObjective.action === 'story-world') {
      setArrivalOpen(false)
      setMenu('')
      flash('왼쪽 아래 행성 지도에서 고장 난 비콘을 찾아 이동하세요. 가까이에서 E키를 누르면 귀환 신호가 복구됩니다.')
      return
    }
    if (todayObjective.action === 'care') {
      if (neighbors.some((neighbor) => !neighbor.blocked)) {
        openGameMenu('neighbors')
        flash('방문 가능한 크루 이웃을 골라 시설이나 자원 지점 가까이에서 E키로 도움을 남기세요. 내 시설을 돌봐도 진행됩니다.')
      } else {
        setArrivalOpen(false)
        setMenu('')
        flash('내 개척자 돔이나 별빛 램프 가까이에서 E키를 눌러 시설을 돌보세요.')
      }
      return
    }
    if (todayObjective.action === 'daily-event') {
      setArrivalOpen(false)
      setMenu('')
      flash('왼쪽 아래 행성 지도에서 ‘나’와 [✦ 사건 현장]을 잇는 점선 방향으로 이동하세요. 도착하면 E키(모바일: 사건 버튼)를 눌러 해결합니다.')
      return
    }
    if (todayObjective.action === 'activate-gateway') {
      setArrivalOpen(false)
      setMenu('')
      flash('아스트라 항로문을 찾아 가까이에서 E키를 누르세요. 항로문이 별의 기억을 다시 연결합니다.')
      return
    }
    setArrivalOpen(false)
    setMenu('')
    flash(isOwner
      ? '화면 앞 보라색 출발대까지 걸어가 E키를 누르세요. 시작 후 빛나는 조각 5개를 몸으로 지나가 모으면 됩니다.'
      : '친구 시설 가까이에서 E키를 누르면 돌보기 도움을 남길 수 있습니다.')
  }

  const beginBuild = (itemId, level = 1) => {
    if (itemId === ASTRA_BUILDER_INSTALL_ITEM_ID && !builderInstallOperationRef.current) {
      builderInstallOperationRef.current = createOperationId()
    }
    setSelectedBuildItem(itemId)
    setSelectedBuildLevel(level)
    setMenu('')
    setArrivalOpen(false)
  }

  if (loading) return <GalaxyLoading />
  if (!home) return <GalaxyLoadError message={error} onRetry={() => loadHome(user?.uid)} />

  const menuMeta = MENU_META[menu] || MENU_META.passport
  const MenuIcon = menuMeta.Icon
  const firstLightStoryGrant = focusedBuildItem
    ? isFirstLightStoryGrant(frontierStory, effectiveFocusedBuildItemId, focusedBuildLevel)
    : false
  const focusedHasMaterial = focusedBuildItem
    ? firstLightStoryGrant || Number(ownPlanet.materials?.[focusedBuildItem.material] || 0) >= Number(focusedBuildItem.materialCost || 0)
    : false
  const focusedStage2Ready = Boolean(focusedBuildItem?.stage2Available)
  const focusedUpgradeCost = focusedBuildLevel >= 2 ? Number(focusedBuildItem?.stage2Cost || 0) : 0
  const focusedTotalCost = firstLightStoryGrant ? 0 : Number(focusedBuildItem?.cost || 0) + focusedUpgradeCost
  const focusedCanAfford = focusedBuildItem ? wallet >= focusedTotalCost : false
  const FocusedItemIcon = ITEM_ICONS[effectiveFocusedBuildItemId] || Building2
  const DailyEventIcon = DAILY_EVENT_ICONS[dailyEvent?.type] || Sparkles
  const dailyRewardLabel = dailyEvent?.reward
    ? `${dailyEvent.reward.title || MATERIAL_LABELS[dailyEvent.reward.material] || '행성 재료'} ${dailyEvent.reward.amount ?? 1}개`
    : '행성 재료 1개'

  return (
    <div className={`meta-galaxy frontier-immersive${builderActive ? ' builder-active' : ''}`}>
      {isGuest && (
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          background: 'rgba(15, 23, 42, 0.88)',
          border: '1px solid rgba(0, 243, 255, 0.4)',
          borderRadius: '12px',
          padding: '8px 16px',
          color: '#e2e8f0',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'none'
        }}>
          <span style={{ color: '#00f3ff' }}>💡</span>
          <span><strong>게스트 체험 모드</strong>: 하루 500 광석이 기본 제공되며, 현재 브라우저에 건설 내역이 저장됩니다. 회원가입 시 작성한 행성이 정식 계정으로 안전하게 연결됩니다.</span>
        </div>
      )}
      <GalaxyWorld3D
        key={targetUid}
        planet={planet}
        frontierStory={isOwner ? frontierStory : planet.frontierStory}
        restorationPercent={frontierStory.restorationPercent}
        audioSessionKey={audioSessionKey}
        materials={(isOwner ? planet : ownPlanet).materials || {}}
        missionReady={isOwner && missionCooldown.ready}
        missionCooldownLabel={isOwner ? missionCooldown.label : '현장 탐사는 내 행성에서 출발할 수 있어요'}
        roverStatus={isOwner ? roverStatus : 'idle'}
        roverStatusLabel={isOwner ? roverStatusLabel : '내 행성에서 원정 가능'}
        roverBayApplied={isOwner && roverBayAppliedToCurrent}
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
        selectedBuildLevel={selectedBuildLevel}
        onCancelBuild={() => { setSelectedBuildItem(''); setSelectedBuildLevel(1); builderInstallOperationRef.current = '' }}
        onBuildAt={buildItemAt}
        onWorldAction={performWorldAction}
        onMissionComplete={runMission}
        selectedStructureId={selectedStructureId}
        onSelectStructure={openObjectDialog}
        onStructureMission={performObjectMission}
        signalPlazaSummary={signalPlazaSummary}
        observatorySummary={isOwner ? observatorySummary : null}
        greenhouseSummary={greenhouseSummary}
        gardenSummary={gardenSummary}
        isPlanetOwner={isOwner}
        isFirstPerson={isFirstPerson}
        onToggleFirstPerson={toggleViewMode}
        builderOwnerId={user?.uid || 'local'}
        builderRemainingSeconds={playRemainingSeconds}
        builderServerSessionKey={playSession?.sessionId || ''}
        builderAccess={home?.builderAccess}
        builderStates={home?.builderStates}
        builderWallet={wallet}
        explorationWallet={wallet}
        ownedExplorationKits={home?.ownedExplorationKits ?? userData?.ownedExplorationKits ?? []}
        onPurchaseExplorationKit={isGuest ? null : purchaseExplorationKit}
        onOpenBuilderPlot={openBuilderPlot}
        onSaveBuilderState={saveBuilderState}
        onPurchaseBuilderUpgrade={buyBuilderUpgrade}
        onBuilderModeChange={setBuilderActive}
        onOpenMenu={openGameMenu}
        onOpenCrewAtlas={() => openGameMenu('neighbors')}
        onMessage={flash}
        objective={todayObjective}
        paused={Boolean(menu || arrivalOpen || objectDialogOpen || audioSettingsOpen || crewTravel.pending)}
        onOpenBriefing={() => setArrivalOpen(true)}
      />

      {crewTravel.pending && <div className="crew-travel-screen" role="dialog" aria-modal="true" aria-label="크루 항로 이동" onKeyDown={(event) => { if (event.key === 'Tab') event.preventDefault(); if (event.key === 'Escape') { event.preventDefault(); crewTravel.cancel() } }}>
        <span aria-hidden="true">✦</span><strong role="status">{crewTravel.pending.name} 연결 중</strong>
        <p>방문 허가를 확인하고 목적지 한 곳만 불러옵니다. 연결이 완료되면 안전한 착륙 지점에서 시작해요.</p>
        <button ref={crewTravelCancelRef} type="button" autoFocus onClick={crewTravel.cancel}>이동 취소 · 현재 행성에 머물기</button>
      </div>}

      <div className="frontier-top-hud" aria-label="행성 상태와 보유 자원 및 탐험 시간">
        <section className="frontier-planet-hud">
          <span className={`frontier-hud-icon theme-${planet.theme || 'forest'}`}><ThemeGlyph themeId={planet.theme} size={21} /></span>
          <div>
            <small>{isOwner ? 'MY FRONTIER' : `${planet.ownerName || '이웃 탐사원'}의 FRONTIER`}</small>
            <strong>{planet.planetName || '이름 없는 작은 별'}</strong>
            <span>{currentTheme.label}{!isOwner && <b className="frontier-visitor-chip">방문 중</b>}</span>
          </div>
        </section>
        <button type="button" className={`frontier-objective-card${dailyEventPending && todayObjective.id === 'daily-event' ? ' daily-event' : ''}`} onClick={handleObjectiveAction}>
          <span className="frontier-objective-icon">{createElement(todayObjective.id === 'daily-event' ? DailyEventIcon : Compass, { size: 19, 'aria-hidden': true })}</span>
          <span className="frontier-objective-copy">
            <small>{todayObjective.eyebrow}</small>
            <strong>{todayObjective.title}</strong>
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        <section className="frontier-economy-hud frontier-unified-hud">
          <div className="frontier-ore-readout" title="학습을 통해서만 얻는 메타 광석">
            <Gem size={17} aria-hidden="true" />
            <span><small>LEARNING ORE</small><strong>{wallet.toLocaleString()}</strong></span>
          </div>
          <MaterialStrip materials={(isOwner ? planet : ownPlanet).materials || {}} compact />

          {playRemainingSeconds !== undefined && playRemainingSeconds !== null && (
            <div className={`frontier-time-readout${warningStage > 0 ? ' is-warning' : ''}`} title="오늘 게임 이용 시간 및 이번 탐험 남은 시간">
              <Clock3 size={15} aria-hidden="true" />
              <div>
                <small>{warningStage === 1 ? '안전 귀환' : '이번 탐험'}</small>
                <strong>{formatCountdown(playRemainingSeconds)}</strong>
                {dailyUsedSeconds !== undefined && dailyLimitSeconds !== undefined && (
                  <span className="frontier-time-sub">오늘 {formatMinutes(dailyUsedSeconds)} / {formatMinutes(dailyLimitSeconds)}</span>
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            className={`frontier-hud-exit-btn camera-view-btn${isFirstPerson ? ' active' : ''}`}
            onClick={toggleViewMode}
            title={isFirstPerson ? '3인칭 시점으로 전환 (단축키: V)' : '1인칭 시점으로 전환 (단축키: V)'}
            aria-label={isFirstPerson ? '3인칭 시점으로 전환' : '1인칭 시점으로 전환'}
          >
            <Eye size={15} aria-hidden="true" />
            <span>{isFirstPerson ? '1인칭 [V]' : '3인칭 [V]'}</span>
          </button>
          <button
            type="button"
            className="frontier-hud-exit-btn audio-settings-btn"
            onClick={() => setAudioSettingsOpen(true)}
            title="오디오 및 소리 설정"
            aria-label="오디오 및 소리 설정"
          >
            <Volume2 size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="frontier-hud-exit-btn"
            onClick={requestReturn}
            disabled={returning}
            aria-busy={returning}
            title={returning ? '탐험 기록을 저장하고 귀환 중' : '메타센스로 귀환'}
            aria-label={returning ? '탐험 기록을 저장하고 귀환 중' : '메타센스로 귀환'}
          >
            <LogOut size={15} aria-hidden="true" />
            <span>{returning ? '귀환 중…' : '귀환'}</span>
          </button>
        </section>
      </div>

      <nav className="frontier-command-dock" aria-label="프론티어 명령 독">
        <button type="button" className={menu === 'rover' ? 'active' : ''} onClick={() => openGameMenu('rover')} aria-label={roverStatus === 'ready' ? '로버 귀환 상자 열기' : roverStatus === 'active' ? `진행 중인 로버 원정 확인 · ${roverRemainingLabel}` : '로버 원정 관제 열기'}>
          <Satellite size={21} aria-hidden="true" /><small>로버</small>{isOwner && (roverStatus === 'ready' || roverStatus === 'active') && <b className={roverStatus === 'active' ? 'is-active-expedition' : ''}>{roverStatus === 'ready' ? '!' : '●'}</b>}
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
      {returning && (
        <div className="frontier-returning-status" role="status" aria-live="assertive">
          <i aria-hidden="true" />
          <span>탐험 기록을 저장하고 귀환 중…</span>
        </div>
      )}

      <AnimatePresence>
        {objectDialogOpen && selectedObject && (
          <Motion.div className="frontier-object-dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeObjectDialog} onKeyDown={trapDialogFocus}>
            <Motion.div className="frontier-object-dialog-motion" initial={{ opacity: 0, y: 22, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: .98 }} onClick={(event) => event.stopPropagation()}>
              <GalaxyObjectDialog
                key={`${selectedObject.instanceId}:${selectedObject.level || 1}:${selectedObject.name || ''}:${selectedObject.description || ''}:${selectedObject.x}:${selectedObject.y}:${selectedObject.imageUrl || ''}`}
                item={selectedObject}
                catalogItem={selectedObjectCatalog}
                isOwner={isOwner}
                busy={busy}
                wallet={wallet}
                errorMessage={error}
                missionLabel={selectedObjectMission?.label}
                missionAction={selectedObjectMission?.actionId}
                closeButtonRef={objectDialogCloseRef}
                onClose={closeObjectDialog}
                onSave={saveGalaxyObject}
                onUpgrade={upgradeGalaxyObject}
                onDelete={deleteGalaxyObject}
                onMission={performObjectMission}
                signalSummary={signalPlazaSummary}
                observatorySummary={isOwner ? observatorySummary : null}
                greenhouseSummary={greenhouseSummary}
                gardenSummary={gardenSummary}
                roverStatus={isOwner ? roverStatus : 'idle'}
                roverStatusLabel={isOwner ? roverStatusLabel : '내 행성에서 원정 가능'}
                roverExpedition={isOwner ? roverExpedition : null}
                onOpenSignals={() => {
                  closeObjectDialog()
                  openLogs()
                }}
                onOpenBriefing={() => {
                  closeObjectDialog()
                  setArrivalOpen(true)
                }}
                onOpenRover={() => {
                  closeObjectDialog()
                  openGameMenu('rover')
                }}
                playRemainingSeconds={playRemainingSeconds}
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
                  <p>{storyObjective
                    ? `${storyObjective.chapterTitle} · 전체 복원율 ${frontierStory.restorationPercent}% · ${storyObjective.title}`
                    : '암흑물질 폭풍 뒤에 잠든 작은 별이 다시 당신의 신호를 기다리고 있어요.'}</p>
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
                  Icon={storyObjective ? Compass : dailyEventPending ? Package : Compass}
                  overline={storyObjective ? todayObjective.eyebrow : dailyEventPending ? '현장 안정화 보상' : todayObjective.eyebrow}
                  title={storyObjective ? todayObjective.title : dailyEventPending ? dailyRewardLabel : todayObjective.title}
                  detail={storyObjective ? todayObjective.detail : dailyEventPending ? '표시된 현장까지 직접 이동해 E키로 해결하면 서버가 오늘 보상을 한 번만 지급합니다.' : todayObjective.detail}
                  accent
                />
              </div>

              <footer className="frontier-arrival-actions">
                <button type="button" className="galaxy-secondary-btn" onClick={() => openGameMenu('logs')}><Radio size={17} aria-hidden="true" /> 신호 기록 보기</button>
                <button type="button" className={roverStatus === 'ready' ? 'galaxy-primary-btn' : 'galaxy-secondary-btn'} onClick={() => openGameMenu('rover')}><Satellite size={17} aria-hidden="true" /> {roverStatus === 'ready' ? '귀환 상자 열기' : '로버 관제 열기'}</button>
                <button type="button" className="galaxy-primary-btn" onClick={handleObjectiveAction}>
                  {storyObjective
                    ? <><MapPin size={17} aria-hidden="true" /> {storyObjective.chapterTitle} 계속하기</>
                    : dailyEventPending
                      ? <><MapPin size={17} aria-hidden="true" /> 사건 현장으로 출발</>
                      : <>행성으로 들어가기 <DoorOpen size={17} aria-hidden="true" /></>}
                </button>
              </footer>
            </Motion.section>
          </Motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {finaleOpen && (
          <Motion.div className="frontier-arrival-backdrop frontier-finale-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Motion.section className="frontier-arrival-panel frontier-finale-panel" role="dialog" aria-modal="true" aria-labelledby="frontier-finale-title" initial={{ opacity: 0, scale: .9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .96 }}>
              <Sparkles size={46} aria-hidden="true" />
              <small>ASTRA MEMORY NETWORK · 100%</small>
              <h2 id="frontier-finale-title">별의 기억이 돌아왔습니다</h2>
              <p>꺼진 귀환등에서 시작한 모든 신호가 하나의 항로가 되었습니다. 하늘과 식생, 루미 생명체와 시설의 빛이 완전히 복원되었습니다.</p>
              <div className="frontier-finale-progress"><i style={{ width: '100%' }} /></div>
              <button type="button" className="galaxy-primary-btn" onClick={() => setFinaleOpen(false)}><DoorOpen size={17} aria-hidden="true" /> 복원된 아스트라로 돌아가기</button>
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
                    storyObjective={storyObjective}
                    historyEntries={roverHistory.entries}
                    historyLoaded={roverHistory.loaded}
                    historyLoading={roverHistory.loading}
                    historyHasMore={roverHistory.hasMore}
                    onDispatch={dispatchRover}
                    onClaim={claimRover}
                    onAcknowledgeReport={acknowledgeRoverReport}
                    onLoadHistory={loadRoverHistory}
                    onOpenBuildForMaterial={openBuildForRoverMaterial}
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
                          <StructurePreview3D itemId={effectiveFocusedBuildItemId} level={focusedBuildLevel} />
                          <span><FocusedItemIcon size={18} aria-hidden="true" /> Stage {focusedBuildLevel} 실시간 미리보기</span>
                        </div>
                        <div className="frontier-build-story">
                          <small>{focusedBuildStory.overline}</small>
                          <h3>{focusedBuildItem.name}</h3>
                          <p>{focusedBuildStory.promise}</p>
                          <dl>
                            <div><dt><Zap size={15} aria-hidden="true" /> 설치 변화</dt><dd>{focusedBuildStory.effect}</dd></div>
                            <div><dt><Orbit size={15} aria-hidden="true" /> 컬렉션</dt><dd>{focusedBuildStory.set}</dd></div>
                          </dl>
                          <div className="frontier-build-stage-picker" role="group" aria-label="객체 그래픽 등급">
                            <button type="button" className={focusedBuildLevel === 1 ? 'active' : ''} onClick={() => setFocusedBuildLevel(1)}>
                              <small>STAGE 1</small><strong>기본 설계</strong><span>추가 비용 없음</span>
                            </button>
                            <button type="button" className={focusedBuildLevel === 2 ? 'active' : ''} disabled={!focusedStage2Ready} onClick={() => setFocusedBuildLevel(2)}>
                              <small>STAGE 2</small><strong>{focusedBuildItem.stage2Label || '고급 설계'}</strong><span>{focusedStage2Ready ? `광석 +${Number(focusedBuildItem.stage2Cost || 0)}` : '그래픽 준비 중'}</span>
                            </button>
                          </div>
                          <div className="frontier-build-costs">
                            <span className={focusedCanAfford ? 'ready' : 'short'}><Gem size={15} aria-hidden="true" /> {firstLightStoryGrant ? '프롤로그 지원 · 학습 광석 0' : `학습 광석 ${focusedTotalCost}${focusedBuildLevel >= 2 ? ` (기본 ${focusedBuildItem.cost} + 성장 ${focusedUpgradeCost})` : ''}`}</span>
                            <span className={focusedHasMaterial ? 'ready' : 'short'}><Package size={15} aria-hidden="true" /> {firstLightStoryGrant ? '첫 빛 건설 재료 지원' : `${MATERIAL_LABELS[focusedBuildItem.material]} ${focusedBuildItem.materialCost}개 필요 · 보유 ${Number(ownPlanet.materials?.[focusedBuildItem.material] || 0)}개`}</span>
                          </div>
                          <button type="button" className="galaxy-primary-btn frontier-build-cta" disabled={Boolean(busy) || !focusedHasMaterial || !focusedCanAfford} onClick={() => beginBuild(effectiveFocusedBuildItemId, focusedBuildLevel)}>
                            {focusedHasMaterial && focusedCanAfford ? <><MapPin size={17} aria-hidden="true" /> 월드에서 자리 선택</> : <><LockKeyhole size={17} aria-hidden="true" /> 부족한 재료 확인</>}
                          </button>
                        </div>
                      </section>

                      <section className="frontier-build-catalog-shell">
                        <div className="frontier-catalog-heading">
                          <div><small>BLUEPRINT COLLECTION</small><h3>다음에 만들 풍경을 고르세요</h3></div>
                          <MaterialStrip materials={ownPlanet.materials} />
                        </div>
                        <section className={`frontier-territory-expansion-offer${ownPlanet?.territoryExpanded ? ' is-complete' : ''}`} aria-label="개척 영지 확장">
                          <span className="frontier-build-option-icon"><Expand size={21} aria-hidden="true" /></span>
                          <div>
                            <small>FRONTIER TERRITORY</small>
                            <strong>개척 영지 2배 확장</strong>
                            <p>현재 영지에 같은 면적의 빈 개척지를 더합니다. 새 구역에는 시설 없이 이어지는 강과 산 지형만 있습니다.</p>
                          </div>
                          <span className="frontier-territory-expansion-offer__price"><Gem size={14} aria-hidden="true" /> 학습 광석 6,000</span>
                          <button
                            type="button"
                            disabled={Boolean(busy) || wallet < 6000 || Boolean(ownPlanet?.territoryExpanded)}
                            onClick={() => { void buyTerritoryExpansion() }}
                          >
                            <Expand size={16} aria-hidden="true" />
                            {ownPlanet?.territoryExpanded ? '확장 완료' : wallet < 6000 ? '광석 부족' : '영지 확장 구매'}
                          </button>
                        </section>
                        <section className="frontier-astra-builder-offer" aria-label="아스트라 빌더 설치">
                          <span className="frontier-build-option-icon"><Hammer size={21} aria-hidden="true" /></span>
                          <div>
                            <small>독립 자유 건축 부지</small>
                            <strong>새 아스트라 빌더 설치</strong>
                            <p>
                              현재 {Number(home?.builderAccess?.slotCount || 1)}개 설치됨 · 각 빌더는 건축물과 블록 용량을 따로 보관합니다.
                            </p>
                          </div>
                          <span className="frontier-astra-builder-offer__price"><Gem size={14} aria-hidden="true" /> 학습 광석 2,000</span>
                          <button
                            type="button"
                            disabled={Boolean(busy) || wallet < 2000 || Number(home?.builderAccess?.slotCount || 1) >= Number(home?.builderAccess?.maxSlots || 8)}
                            onClick={() => beginBuild(ASTRA_BUILDER_INSTALL_ITEM_ID, 1)}
                          >
                            <MapPin size={16} aria-hidden="true" />
                            {Number(home?.builderAccess?.slotCount || 1) >= Number(home?.builderAccess?.maxSlots || 8)
                              ? '최대 설치 완료'
                              : wallet < 2000
                                ? '광석 부족'
                                : '월드에서 자리 선택'}
                          </button>
                        </section>
                        <MaterialGuide materials={ownPlanet.materials} />
                        <div className="frontier-build-catalog">
                          {catalogEntries.map(([itemId, item]) => {
                            const ItemIcon = ITEM_ICONS[itemId] || Building2
                            const storyBase = BUILD_ITEM_STORIES[itemId] || FALLBACK_BUILD_STORY
                            const story = { ...storyBase, set: item.setName || storyBase.set }
                            const storyGrant = isFirstLightStoryGrant(frontierStory, itemId, 1)
                            const hasMaterial = storyGrant || Number(ownPlanet.materials?.[item.material] || 0) >= Number(item.materialCost || 0)
                            const canAfford = storyGrant || wallet >= Number(item.cost || 0)
                            const available = hasMaterial && canAfford
                            return (
                              <button type="button" key={itemId} className={`frontier-build-option${effectiveFocusedBuildItemId === itemId ? ' selected' : ''}${available ? '' : ' unavailable'}`} onClick={() => { setFocusedBuildItemId(itemId); setFocusedBuildLevel(1) }}>
                                <span className="frontier-build-option-icon"><ItemIcon size={21} aria-hidden="true" /></span>
                                <div><small>{story.overline}</small><strong>{item.name}</strong><p>{story.set}</p></div>
                                <span className={`frontier-build-option-state material-${item.material}`}>{storyGrant ? '프롤로그 지원 · 무료 설계' : `${MATERIAL_LABELS[item.material]} ${item.materialCost}개 필요 · 보유 ${Number(ownPlanet.materials?.[item.material] || 0)}개 ${available ? '· 설계 가능' : ''}`}</span>
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
                  {!isOwner && <CrewVisitActivities planet={planet} onInspect={openObjectDialog} onReturn={() => visitNeighbor(user.uid)} onLogs={openLogs} />}
                  <div className="frontier-relay-setting">
                    <label>
                      <span><Satellite size={17} aria-hidden="true" /> 현장 탐사 릴레이 파트너</span>
                      <select value={missionPartnerUid} onChange={(event) => setMissionPartnerUid(event.target.value)}>
                        <option value="">혼자 출항</option>
                        {neighbors.filter((neighbor) => !neighbor.blocked).map((neighbor) => <option key={neighbor.uid} value={neighbor.uid}>{neighbor.displayName}</option>)}
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
                    <FrontierCrewAtlas
                      neighbors={neighbors.map(neighbor => ({ ...neighbor, connection: getConnectionSummary(neighbor, events) }))}
                      currentUid={targetUid}
                      ownName={ownPlanet.planetName}
                      isGuest={isGuest}
                      busy={busy || crewTravel.pending}
                      onVisit={visitNeighbor}
                      onBlock={setNeighborBlocked}
                      onReport={reportNeighbor}
                    />
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
      <FrontierAudioSettingsModal
        key={`${audioSessionKey}:${audioSettingsOpen ? 'open' : 'closed'}`}
        open={audioSettingsOpen}
        onClose={() => setAudioSettingsOpen(false)}
      />
    </div>
  )
}
