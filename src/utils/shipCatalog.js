export const SHIP_SLOT_ORDER = ['hull', 'wings', 'cockpit', 'engine', 'trail', 'companion']
export const PATHFINDER_SLOT_ORDER = ['hull', 'wings', 'cockpit', 'engine', 'core', 'orbital', 'trail', 'companion']

export const SHIP_FAMILIES = {
  scout: {
    id: 'scout', name: '정찰선 계열', code: 'SCOUT FAMILY', grade: 2,
    description: '기민하고 아기자기한 개인 탐사선', slotOrder: SHIP_SLOT_ORDER,
  },
  pathfinder: {
    id: 'pathfinder', name: '헤일로급 심우주 개척함', code: 'HALO-CLASS DEEP-SPACE PATHFINDER', grade: 3,
    description: '헤일로 링과 삼중 추진계를 갖춘 대형 개척함', slotOrder: PATHFINDER_SLOT_ORDER,
  },
}

export const PATHFINDER_HULL_ID = 'pathfinder-genesis'

export const SHIP_SLOT_META = {
  hull: { label: '선체', shortLabel: '선체' },
  wings: { label: '날개', shortLabel: '날개' },
  cockpit: { label: '조종석', shortLabel: '조종석' },
  engine: { label: '엔진', shortLabel: '엔진' },
  core: { label: '에너지 코어', shortLabel: '코어' },
  orbital: { label: '궤도 모듈', shortLabel: '궤도' },
  trail: { label: '비행 궤적', shortLabel: '궤적' },
  companion: { label: '동행 장치', shortLabel: '동행' },
}

export const DEFAULT_SHIP_LOADOUT = {
  hull: 'hull-nova',
  wings: 'wings-vector',
  cockpit: 'cockpit-azure',
  engine: 'engine-ion',
  trail: 'trail-none',
  companion: 'companion-none',
}

export const DEFAULT_OWNED_SHIP_ITEMS = Object.values(DEFAULT_SHIP_LOADOUT)

export const SHIP_ITEMS = [
  {
    id: 'hull-nova', slot: 'hull', name: '노바 탐사정', tier: 'BASIC', cost: 0,
    tagline: '원뿔형 기본 실루엣을 정교하게 다듬은 정찰선',
  },
  {
    id: 'hull-aurora', slot: 'hull', name: '오로라 선체', tier: 'RARE', cost: 260,
    tagline: '빛의 파장을 머금은 고광택 세라믹 장갑',
    unlock: { type: 'quiz', value: 20, label: '퀴즈 탐사 20회' },
  },
  {
    id: 'wings-vector', slot: 'wings', name: '벡터 핀', tier: 'BASIC', cost: 0,
    tagline: '초보 탐사정의 균형을 잡는 소형 안정익',
  },
  {
    id: 'wings-solar', slot: 'wings', name: '헬리오 태양익', tier: 'UNCOMMON', cost: 120,
    tagline: '금빛 셀을 펼쳐 별빛을 추진력으로 바꿉니다',
  },
  {
    id: 'wings-prism', slot: 'wings', name: '프리즘 델타익', tier: 'RARE', cost: 240,
    tagline: '각도에 따라 청록과 보라로 빛나는 대형 날개',
    unlock: { type: 'quiz', value: 30, label: '퀴즈 탐사 30회' },
  },
  {
    id: 'cockpit-azure', slot: 'cockpit', name: '애저 캐노피', tier: 'BASIC', cost: 0,
    tagline: '우주 지형을 선명하게 읽는 푸른 조종석',
  },
  {
    id: 'cockpit-gold', slot: 'cockpit', name: '솔라 골드 캐노피', tier: 'RARE', cost: 220,
    tagline: '완벽한 항해 기록을 새긴 황금 편광 유리',
    unlock: { type: 'perfect', value: 5, label: '100점 탐사 5회' },
  },
  {
    id: 'cockpit-holo', slot: 'cockpit', name: '홀로그램 브리지', tier: 'EPIC', cost: 360,
    tagline: '수식과 항로가 유리 위를 실시간으로 흐릅니다',
    unlock: { type: 'perfect', value: 20, label: '100점 탐사 20회' },
  },
  {
    id: 'engine-ion', slot: 'engine', name: '이온 펄스 엔진', tier: 'BASIC', cost: 0,
    tagline: '안정적인 청색 플라스마를 내뿜는 기본 엔진',
  },
  {
    id: 'engine-plasma', slot: 'engine', name: '트윈 플라스마 엔진', tier: 'UNCOMMON', cost: 180,
    tagline: '두 갈래 코어가 주황빛 입자류를 분사합니다',
  },
  {
    id: 'engine-dark', slot: 'engine', name: '암흑물질 엔진 Mk.III', tier: 'LEGEND', cost: 480,
    tagline: '보랏빛 이중 엔진이 항로의 공간을 갈라냅니다',
    unlock: { type: 'darkMatter', value: 10, label: '다크 매터 복구 10회' },
  },
  {
    id: 'trail-none', slot: 'trail', name: '표준 항적', tier: 'BASIC', cost: 0,
    tagline: '엔진 불꽃만 남기는 정돈된 기본 비행',
  },
  {
    id: 'trail-comet', slot: 'trail', name: '혜성의 꼬리', tier: 'RARE', cost: 200,
    tagline: '별가루가 긴 곡선을 그리며 천천히 사라집니다',
    unlock: { type: 'streak', value: 7, label: '7일 연속 학습' },
  },
  {
    id: 'trail-equation', slot: 'trail', name: '수식 네온 궤적', tier: 'EPIC', cost: 340,
    tagline: 'π, ∑, x²가 항로 뒤에 푸른 잔상으로 남습니다',
    unlock: { type: 'streak', value: 30, label: '30일 연속 학습' },
  },
  {
    id: 'companion-none', slot: 'companion', name: '단독 항해', tier: 'BASIC', cost: 0,
    tagline: '탐사선 한 대로 조용히 우주를 누빕니다',
  },
  {
    id: 'companion-drone', slot: 'companion', name: '핀치 정찰 드론', tier: 'UNCOMMON', cost: 160,
    tagline: '작은 드론이 선체 주변을 돌며 항로를 스캔합니다',
  },
  {
    id: 'companion-orb', slot: 'companion', name: '루멘 생명 구체', tier: 'EPIC', cost: 380,
    tagline: '호기심 많은 우주 생명체가 빛으로 신호를 보냅니다',
    unlock: { type: 'quiz', value: 50, label: '퀴즈 탐사 50회' },
  },
  {
    id: PATHFINDER_HULL_ID, family: 'pathfinder', slot: 'hull', name: '제네시스 프레임', englishName: 'GENESIS FRAME', tier: 'LEGEND', cost: 4000,
    tagline: '백금 장갑과 심우주 항법 골격을 통째로 건조하는 Grade 03의 중심 선체',
    requiresScoutGrade: 2,
  },
  {
    id: 'pathfinder-twin-nova', family: 'pathfinder', slot: 'wings', name: '트윈 노바윙', englishName: 'TWIN NOVA WINGS', tier: 'LEGEND', cost: 1500,
    tagline: '뒤로 휘어진 광폭 이중 날개가 작은 화면에서도 개척함의 실루엣을 각인합니다',
    requiresFamily: 'pathfinder',
  },
  {
    id: 'pathfinder-prism', family: 'pathfinder', slot: 'cockpit', name: '프리즘 브리지', englishName: 'PRISM BRIDGE', tier: 'EPIC', cost: 900,
    tagline: '빛을 거의 반사하지 않는 흑청색 프리즘 유리와 백금 캐노피 프레임',
    requiresFamily: 'pathfinder',
  },
  {
    id: 'pathfinder-trinity', family: 'pathfinder', slot: 'engine', name: '트리니티 이온 드라이브', englishName: 'TRINITY ION DRIVE', tier: 'LEGEND', cost: 1400,
    tagline: '청록 중심과 보라 외곽 불꽃을 내뿜는 세 개의 독립 심우주 추진기',
    requiresFamily: 'pathfinder',
  },
  {
    id: 'pathfinder-quantum-core', family: 'pathfinder', slot: 'core', name: '퀀텀 코어', englishName: 'QUANTUM CORE', tier: 'LEGEND', cost: 900,
    tagline: '선체 중앙의 모든 에너지 라인을 깨우는 맥동형 양자 동력핵',
    requiresFamily: 'pathfinder',
  },
  {
    id: 'pathfinder-halo-ring', family: 'pathfinder', slot: 'orbital', name: '헤일로 링', englishName: 'HALO RING', tier: 'LEGEND', cost: 800,
    tagline: '선체 앞뒤를 감싸며 회전하는 청록·보라 이중 위상 궤도 장치',
    requiresFamily: 'pathfinder',
  },
  {
    id: 'pathfinder-warp-afterglow', family: 'pathfinder', slot: 'trail', name: '워프 잔광', englishName: 'WARP AFTERGLOW', tier: 'EPIC', cost: 300,
    tagline: '세 엔진의 빛이 하나의 길고 날카로운 공간 잔상으로 합쳐집니다',
    requiresFamily: 'pathfinder',
  },
  {
    id: 'pathfinder-sentinel-drones', family: 'pathfinder', slot: 'companion', name: '센티널 드론 편대', englishName: 'SENTINEL DRONES', tier: 'EPIC', cost: 200,
    tagline: '개척함 양옆을 호위하며 항로를 스캔하는 쌍둥이 정찰 드론',
    requiresFamily: 'pathfinder',
  },
]

export const SHIP_ITEM_MAP = Object.fromEntries(SHIP_ITEMS.map((item) => [item.id, item]))

export function getShipItemFamily(item) {
  return item?.family || 'scout'
}

export function normalizeOwnedShipItems(userData = {}) {
  return Array.from(new Set([
    ...DEFAULT_OWNED_SHIP_ITEMS,
    ...(Array.isArray(userData?.ownedShipItems) ? userData.ownedShipItems : []),
  ])).filter((itemId) => Boolean(SHIP_ITEM_MAP[itemId]))
}

export function ownsShipFamily(userData = {}, family = 'scout') {
  if (family === 'scout') return true
  return normalizeOwnedShipItems(userData).includes(PATHFINDER_HULL_ID)
}

export function getActiveShipFamily(userData = {}) {
  return userData?.activeShipFamily === 'pathfinder' && ownsShipFamily(userData, 'pathfinder') ? 'pathfinder' : 'scout'
}

export function getShipFamilySlotOrder(family = 'scout') {
  return SHIP_FAMILIES[family]?.slotOrder || SHIP_SLOT_ORDER
}

export function normalizeShipLoadout(userData = {}, familyOverride) {
  const family = familyOverride || getActiveShipFamily(userData)
  const owned = new Set(normalizeOwnedShipItems(userData))
  const stored = family === 'scout'
    ? (userData?.shipLoadouts?.scout || userData?.shipCustomization || {})
    : (userData?.shipLoadouts?.pathfinder || {})
  return getShipFamilySlotOrder(family).reduce((result, slot) => {
    const candidate = stored[slot]
    const validCandidate = candidate && SHIP_ITEM_MAP[candidate]?.slot === slot && getShipItemFamily(SHIP_ITEM_MAP[candidate]) === family && owned.has(candidate)
    result[slot] = validCandidate
      ? candidate
      : family === 'scout' ? DEFAULT_SHIP_LOADOUT[slot] : null
    return result
  }, {})
}

export function getShipAchievementStats(userData = {}, history = []) {
  const summaryStats = userData?.learningSummary?.stats || {}
  const quizRows = history.filter((row) => !['video', 'text'].includes(row?.type))
  const darkMatterRows = history.filter((row) => String(row?.unitId || '').includes('dark_matter'))
  return {
    quiz: Math.max(Number(userData?.quizCount || 0), Number(summaryStats.quizAttempts || 0), quizRows.length),
    perfect: Math.max(Number(userData?.perfectCount || 0), Number(summaryStats.perfectAttempts || 0), quizRows.filter((row) => Number(row?.score) === 100).length),
    streak: Number(userData?.currentStreak || 0),
    darkMatter: Math.max(
      Number(userData?.darkMatterRecoveredCount || userData?.darkMatterMasteredCount || 0), Number(summaryStats.darkMatterRecovered || 0),
      darkMatterRows.filter((row) => Number(row?.score || 0) >= 80).length,
    ),
  }
}

export function getShipItemUnlock(item, stats = {}, userData = {}) {
  if (item?.requiresScoutGrade && getShipGrade(userData, 'scout').level < item.requiresScoutGrade) {
    return { unlocked: false, current: getShipGrade(userData, 'scout').level, target: item.requiresScoutGrade, progress: 0, label: '성간 정찰선 Grade 02 달성' }
  }
  if (item?.requiresFamily && !ownsShipFamily(userData, item.requiresFamily)) {
    return { unlocked: false, current: 0, target: 1, progress: 0, label: '제네시스 프레임 건조 후 해금' }
  }
  if (!item?.unlock) return { unlocked: true, current: 0, target: 0, progress: 1, label: '즉시 구매 가능' }
  const current = Number(stats[item.unlock.type] || 0)
  const target = Number(item.unlock.value || 0)
  return {
    unlocked: current >= target,
    current,
    target,
    progress: target > 0 ? Math.min(1, current / target) : 1,
    label: item.unlock.label,
  }
}

export function getShipGrade(userData = {}, familyOverride) {
  const family = familyOverride || getActiveShipFamily(userData)
  if (family === 'pathfinder') return { level: 3, name: '헤일로급 심우주 개척함', code: 'HALO-CLASS DEEP-SPACE PATHFINDER' }
  const upgradeCount = Math.max(0, normalizeOwnedShipItems(userData).length - DEFAULT_OWNED_SHIP_ITEMS.length)
  if (upgradeCount >= 1) return { level: 2, name: '성간 정찰선', code: 'STELLAR SCOUT' }
  return { level: 1, name: '기본 탐사선', code: 'CADET SCOUT' }
}

export function getShipFamilyProgress(userData = {}, family = 'pathfinder') {
  const familyItems = SHIP_ITEMS.filter((item) => getShipItemFamily(item) === family)
  const owned = new Set(normalizeOwnedShipItems(userData))
  const totalCost = familyItems.reduce((sum, item) => sum + Number(item.cost || 0), 0)
  const spentCost = familyItems.reduce((sum, item) => sum + (owned.has(item.id) ? Number(item.cost || 0) : 0), 0)
  const ownedCount = familyItems.filter((item) => owned.has(item.id)).length
  return {
    totalCost,
    spentCost,
    remainingCost: Math.max(0, totalCost - spentCost),
    ownedCount,
    totalCount: familyItems.length,
    progress: totalCost > 0 ? spentCost / totalCost : 1,
    complete: ownedCount === familyItems.length,
  }
}

export function buildShipPreviewLoadout(loadout, previewItem) {
  if (!previewItem?.slot) return loadout
  return { ...loadout, [previewItem.slot]: previewItem.id }
}
