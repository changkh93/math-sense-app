export const SHIP_SLOT_ORDER = ['hull', 'wings', 'cockpit', 'engine', 'trail', 'companion']

export const SHIP_SLOT_META = {
  hull: { label: '선체', shortLabel: '선체' },
  wings: { label: '날개', shortLabel: '날개' },
  cockpit: { label: '조종석', shortLabel: '조종석' },
  engine: { label: '엔진', shortLabel: '엔진' },
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
]

export const SHIP_ITEM_MAP = Object.fromEntries(SHIP_ITEMS.map((item) => [item.id, item]))

export function normalizeOwnedShipItems(userData = {}) {
  return Array.from(new Set([
    ...DEFAULT_OWNED_SHIP_ITEMS,
    ...(Array.isArray(userData?.ownedShipItems) ? userData.ownedShipItems : []),
  ])).filter((itemId) => Boolean(SHIP_ITEM_MAP[itemId]))
}

export function normalizeShipLoadout(userData = {}) {
  const owned = new Set(normalizeOwnedShipItems(userData))
  const stored = userData?.shipCustomization || {}
  return SHIP_SLOT_ORDER.reduce((result, slot) => {
    const candidate = stored[slot]
    result[slot] = candidate && SHIP_ITEM_MAP[candidate]?.slot === slot && owned.has(candidate)
      ? candidate
      : DEFAULT_SHIP_LOADOUT[slot]
    return result
  }, {})
}

export function getShipAchievementStats(userData = {}, history = []) {
  const quizRows = history.filter((row) => !['video', 'text'].includes(row?.type))
  const darkMatterRows = history.filter((row) => String(row?.unitId || '').includes('dark_matter'))
  return {
    quiz: Math.max(Number(userData?.quizCount || 0), quizRows.length),
    perfect: Math.max(Number(userData?.perfectCount || 0), quizRows.filter((row) => Number(row?.score) === 100).length),
    streak: Number(userData?.currentStreak || 0),
    darkMatter: Math.max(
      Number(userData?.darkMatterRecoveredCount || userData?.darkMatterMasteredCount || 0),
      darkMatterRows.filter((row) => Number(row?.score || 0) >= 80).length,
    ),
  }
}

export function getShipItemUnlock(item, stats = {}) {
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

export function getShipGrade(userData = {}) {
  const upgradeCount = Math.max(0, normalizeOwnedShipItems(userData).length - DEFAULT_OWNED_SHIP_ITEMS.length)
  if (upgradeCount >= 10) return { level: 5, name: '전설의 심우주선', code: 'DEEP LEGEND' }
  if (upgradeCount >= 7) return { level: 4, name: '은하 항해선', code: 'GALAXY CLASS' }
  if (upgradeCount >= 4) return { level: 3, name: '행성 개척선', code: 'PIONEER CLASS' }
  if (upgradeCount >= 1) return { level: 2, name: '성간 정찰선', code: 'STELLAR SCOUT' }
  return { level: 1, name: '기본 탐사선', code: 'CADET SCOUT' }
}

export function buildShipPreviewLoadout(loadout, previewItem) {
  if (!previewItem?.slot) return loadout
  return { ...loadout, [previewItem.slot]: previewItem.id }
}
