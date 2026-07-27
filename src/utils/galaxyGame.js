export const GALAXY_THEMES = {
  forest: {
    label: '루멘 숲', icon: '♧', iconId: 'trees', accent: '#63f5a6',
    description: '발광 식물과 부드러운 녹색 지형이 살아나는 생태 행성',
    effect: '지면과 자연물에 짙은 녹색·루멘 발광 색조가 적용됩니다.',
  },
  ocean: {
    label: '심해 행성', icon: '≈', iconId: 'waves', accent: '#4dc9ff',
    description: '차가운 바다빛과 잠수 기지 분위기가 감도는 심해 행성',
    effect: '지면과 수면 오브젝트가 청록·심해색 중심으로 바뀝니다.',
  },
  crystal: {
    label: '수정 협곡', icon: '◇', iconId: 'gem', accent: '#c084fc',
    description: '프리즘 광맥과 보랏빛 반사가 이어지는 수정 행성',
    effect: '지형과 광원에 보라색 프리즘·수정 발광 색조가 적용됩니다.',
  },
  desert: {
    label: '황혼 사막', icon: '☼', iconId: 'sunset', accent: '#ffc766',
    description: '황혼빛 모래와 고대 구조물이 어울리는 건조 행성',
    effect: '지면과 자연물에 모래색·노을색 대비가 적용됩니다.',
  },
  mechanical: {
    label: '기계 도시', icon: '⌬', iconId: 'cog', accent: '#95a4bd',
    description: '금속 지반과 신호 장치가 맞물리는 산업 행성',
    effect: '지형과 시설에 회청색 금속·전기 신호 색조가 적용됩니다.',
  },
  ice: {
    label: '빙하 천문대', icon: '✧', iconId: 'snowflake', accent: '#b8edff',
    description: '얼음 능선과 오로라 관측지가 펼쳐지는 극지 행성',
    effect: '지면과 자연물에 빙하색·오로라색 하이라이트가 적용됩니다.',
  },
}

export const GALAXY_PLAY_STYLES = {
  decorate: {
    label: '꾸미기', icon: '◈', iconId: 'palette',
    description: '건물과 생태 오브젝트를 조합해 나만의 풍경을 만드는 취향',
    effect: '패스포트와 이웃 카드에서 꾸미기 중심 탐험가로 표시됩니다.',
  },
  explore: {
    label: '탐사', icon: '⌖', iconId: 'compass',
    description: '관문을 통과하고 미지의 신호를 찾아 걷는 취향',
    effect: '패스포트와 이웃 카드에서 항로 탐사 중심 탐험가로 표시됩니다.',
  },
  collect: {
    label: '수집', icon: '▦', iconId: 'archive',
    description: '희귀 재료와 생태 표본을 차곡차곡 모으는 취향',
    effect: '패스포트와 이웃 카드에서 표본 수집 중심 탐험가로 표시됩니다.',
  },
  cooperate: {
    label: '협동', icon: '∞', iconId: 'handshake',
    description: '친구의 시설을 돌보고 공동 항로를 성장시키는 취향',
    effect: '패스포트와 이웃 카드에서 협력 중심 탐험가로 표시됩니다.',
  },
  photo: {
    label: '사진', icon: '□', iconId: 'camera',
    description: '행성의 빛과 친구의 방문 장면을 기록하는 취향',
    effect: '패스포트와 이웃 카드에서 장면 기록 중심 탐험가로 표시됩니다.',
  },
}

export const GALAXY_ABILITIES = {
  detection: { label: '탐지 공명', icon: '◉', iconId: 'radar', description: '숨은 항로와 희귀 흔적을 발견합니다.', effect: 'Lv.4부터 성운 생태 항로의 바이오 섬유 보상이 1개 늘어납니다.' },
  endurance: { label: '항해 지속력', icon: '∞', iconId: 'gauge', description: '연속 학습으로 쌓이는 장거리 항해 기록입니다.', effect: '현재 패스포트에 누적 성장 능력으로 표시됩니다.' },
  precision: { label: '정밀 제어', icon: '⌖', iconId: 'crosshair', description: '집중 신호의 정확도로 성장하는 정밀 능력입니다.', effect: 'Lv.4부터 고대 정거장 항로의 수정 유리 보상이 1개 늘어납니다.' },
  pioneering: { label: '개척 파동', icon: '◇', iconId: 'sparkles', description: '주간 학습 성장으로 강해지는 개척 능력입니다.', effect: '현재 패스포트에 누적 성장 능력으로 표시됩니다.' },
  communication: { label: '교신 공명', icon: '⌁', iconId: 'radio', description: '질문과 도움 활동으로 성장하는 교신 능력입니다.', effect: '현재 패스포트에 누적 성장 능력으로 표시됩니다.' },
  piloting: { label: '조종 감각', icon: '△', iconId: 'navigation', description: '퀴즈 배틀 경험으로 성장하는 항로 조종 능력입니다.', effect: 'Lv.4부터 혜성 구조 항로의 합금 보상이 1개 늘어납니다.' },
  construction: { label: '건조 기술', icon: '⬡', iconId: 'hammer', description: '누적 학습 광석으로 성장하는 건설 능력입니다.', effect: '현재 패스포트와 선체 성장 기록에 표시됩니다.' },
}

// 백엔드 functions/galaxyGame.js 의 GALAXY_ITEM_CATALOG 와 동기화한 프론트엔드 사본.
// 게스트 모드는 서버에서 catalog 를 내려받을 수 없으므로 이 사본으로 UI/비용을 구성한다.
// 백엔드 카탈로그가 바뀌면 이쪽도 함께 갱신해야 한다.
const GALAXY_ITEM_STAGE2_COSTS = Object.freeze({
  star_lamp: 20,
  lumen_tree: 45,
  crystal_pond: 70,
  rover_bay: 100,
  observatory: 140,
  friend_greenhouse: 110,
  prism_pathlight: 30,
  starflower_garden: 55,
  creature_habitat: 85,
  signal_plaza: 80,
  expedition_beacon: 120,
  route_gateway: 180,
})

export const GALAXY_ITEM_CATALOG = {
  star_lamp: {
    name: '별빛 램프', icon: '✦', iconId: 'sparkles', cost: 25, material: 'stardust', materialCost: 0, kind: 'decor',
    description: '귀환 지점을 은은하게 밝히는 첫 번째 개척 조명입니다.',
    effect: '주변에 따뜻한 별빛과 귀환 포인트를 만듭니다.',
    setName: '귀환의 빛', previewTone: '#ffe28a',
  },
  lumen_tree: {
    name: '루멘 나무', icon: '♧', iconId: 'tree-pine', cost: 60, material: 'biofiber', materialCost: 2, kind: 'nature',
    description: '행성의 밤에도 빛을 머금는 대표 생태 식물입니다.',
    effect: '행성에 발광 수관과 생태 구역의 중심을 만듭니다.',
    setName: '루멘 생태계', previewTone: '#72efad',
  },
  crystal_pond: {
    name: '수정 연못', icon: '◈', iconId: 'waves', cost: 110, material: 'crystalGlass', materialCost: 2, kind: 'nature',
    description: '수정 입자가 수면을 따라 흐르는 작은 휴식 공간입니다.',
    effect: '반사 수면과 부유 입자로 행성에 물가 풍경을 더합니다.',
    setName: '루멘 생태계', previewTone: '#62ddff',
  },
  rover_bay: {
    name: '탐사 로버 정비소', icon: '⌂', iconId: 'wrench', cost: 160, material: 'alloy', materialCost: 3, kind: 'facility',
    description: '귀환한 로버를 정비하고 다음 원정을 준비하는 전초 시설입니다.',
    effect: '장거리 로버 원정 시간을 8시간에서 6시간으로 단축합니다.',
    setName: '개척 전초기지', previewTone: '#ffad70',
  },
  observatory: {
    name: '성운 관측소', icon: '◎', iconId: 'telescope', cost: 240, material: 'crystalGlass', materialCost: 4, kind: 'facility',
    description: '멀리 끊어진 아스트라 항로의 신호를 관측하는 시설입니다.',
    effect: '행성 스카이라인에 회전 관측 장치와 푸른 신호광을 더합니다.',
    setName: '개척 전초기지', previewTone: '#91b9ff',
  },
  friend_greenhouse: {
    name: '별빛 공동 온실', icon: '◇', iconId: 'warehouse', cost: 180, material: 'biofiber', materialCost: 4, kind: 'social',
    description: '친구가 찾아와 물을 주고 생태 흔적을 남길 수 있는 공동 공간입니다.',
    effect: '방문 도움 행동의 목적지가 되는 투명 온실을 만듭니다.',
    setName: '연결의 정원', previewTone: '#8fffd1',
  },
  prism_pathlight: {
    name: '프리즘 길잡이', icon: '⌁', iconId: 'route', cost: 45, material: 'stardust', materialCost: 1, kind: 'decor',
    description: '착륙장과 주요 시설 사이의 길을 표시하는 낮은 유도등입니다.',
    effect: '걸어갈 방향을 보여주는 연속 빛 표식을 만듭니다.',
    setName: '귀환의 빛', previewTone: '#79eaff',
  },
  starflower_garden: {
    name: '별꽃 정원', icon: '❋', iconId: 'flower-2', cost: 90, material: 'biofiber', materialCost: 3, kind: 'nature',
    description: '친구의 물주기 신호에 어울리는 작은 발광 꽃밭입니다.',
    effect: '정원 구역에 색 변화가 있는 꽃 군락을 더합니다.',
    setName: '연결의 정원', previewTone: '#ff9fcb',
  },
  creature_habitat: {
    name: '루미 생명체 쉼터', icon: '◌', iconId: 'egg', cost: 145, material: 'biofiber', materialCost: 4, kind: 'ecology',
    description: '작은 행성 생명체가 머물 수 있도록 만든 안전한 보금자리입니다.',
    effect: '생명체 돌보기 행동을 위한 생태 랜드마크를 만듭니다.',
    setName: '루멘 생태계', previewTone: '#c6f58a',
  },
  signal_plaza: {
    name: '귀환 신호 광장', icon: '⌾', iconId: 'radio-tower', cost: 135, material: 'crystalGlass', materialCost: 3, kind: 'social',
    description: '방문자의 인사와 감탄 신호가 모이는 작은 행성 광장입니다.',
    effect: '친구 방문 흔적을 보여줄 중심 광장과 신호 비콘을 만듭니다.',
    setName: '항로 연결망', previewTone: '#a995ff',
  },
  expedition_beacon: {
    name: '원정대 비콘', icon: '△', iconId: 'satellite-dish', cost: 210, material: 'alloy', materialCost: 4, kind: 'facility',
    description: '미지의 섹터로 향하는 탐사 신호를 증폭하는 전초 비콘입니다.',
    effect: '장거리 로버 원정의 회수 재료를 매번 1개 늘립니다.',
    setName: '개척 전초기지', previewTone: '#ff8c68',
  },
  route_gateway: {
    name: '아스트라 항로문', icon: '⬡', iconId: 'orbit', cost: 320, material: 'alloy', materialCost: 6, kind: 'social',
    description: '오래 연결된 친구의 행성을 향해 빛나는 대형 항로 구조물입니다.',
    effect: '행성에 전시 가치가 높은 워프 랜드마크를 세웁니다.',
    setName: '항로 연결망', previewTone: '#68f0d0',
  },
}

// 백엔드와 동일하게 Stage 2/최대 레벨 메타를 파생시킨다.
Object.entries(GALAXY_ITEM_CATALOG).forEach(([itemId, item]) => {
  item.maxLevel = 2
  item.stage2Cost = GALAXY_ITEM_STAGE2_COSTS[itemId] || 0
  item.stage2Available = itemId === 'lumen_tree' || itemId === 'star_lamp' || itemId === 'rover_bay' || itemId === 'crystal_pond' || itemId === 'observatory'
  item.stage2Label = itemId === 'lumen_tree' ? '성목 루멘'
    : itemId === 'star_lamp' ? '외행성 개척 비콘'
    : itemId === 'rover_bay' ? '외행성 로버 서비스 도크'
    : itemId === 'crystal_pond' ? '외행성 수정 생태 샘'
    : itemId === 'observatory' ? '오로라 성운 천문대'
    : 'Stage 2 준비 중'
})

// 게스트가 기본 보유한 개척자 돔. 카탈로그엔 없는 특수 객체라 별도 정의.
export const GUEST_STARTER_OBJECTS = {
  starter_dome: {
    name: '개척자 돔', icon: '⬡', iconId: 'house', kind: 'facility',
    description: '아스트라 프론티어에 처음 도착한 탐험가의 귀환 거점입니다.',
    effect: '행성의 중심과 안전한 귀환 지점을 표시합니다.',
  },
}

// 게스트 모드에서는 별도 재료 소모 없이 광석(학습 크리스탈)만 차감한다.
export function getGuestBuildCost(itemId) {
  return Number(GALAXY_ITEM_CATALOG[itemId]?.cost || 0)
}

export function getGuestItemName(itemId) {
  return GALAXY_ITEM_CATALOG[itemId]?.name
    || GUEST_STARTER_OBJECTS[itemId]?.name
    || itemId
}

export const GALAXY_VISIT_ACTIONS = {
  water: { label: '별꽃에 물주기', icon: '▽', iconId: 'droplets', description: '친구 정원의 생명력을 회복합니다.', effect: '정원 활력 +4 · 항로 연결도 +6', stat: 'gardenVitality', connectionXp: 6 },
  repair: { label: '시설 수리하기', icon: '⌁', iconId: 'wrench', description: '폭풍에 지친 친구 시설을 손봅니다.', effect: '시설 상태 +4 · 항로 연결도 +7', stat: 'facilityHealth', connectionXp: 7 },
  feed: { label: '생명체 돌보기', icon: '♧', iconId: 'sprout', description: '친구 행성의 작은 생명체를 돌봅니다.', effect: '생명체 행복 +4 · 항로 연결도 +6', stat: 'creatureHappiness', connectionXp: 6 },
  admire: { label: '감탄 신호', icon: '✦', iconId: 'sparkles', description: '행성 주인에게 반짝이는 감탄을 남깁니다.', effect: '감탄 기록 +1 · 항로 연결도 +4', stat: 'admirationCount', connectionXp: 4 },
}

export const GALAXY_MISSION_ROUTES = {
  nebula: {
    label: '성운 생태 항로', icon: '✣', iconId: 'cloud', ability: 'detection', reward: '바이오 섬유', rewardMaterial: 'biofiber', baseReward: 2,
    copy: '45초 안에 빛나는 조각 5개를 모아 바이오 섬유를 가져옵니다.',
    effect: '45초 안에 빛나는 조각 5개를 모으면 바이오 섬유 2개를 얻고, 탐지 공명 Lv.4부터 1개가 추가됩니다.',
  },
  comet: {
    label: '혜성 구조 항로', icon: '◒', iconId: 'comet', ability: 'piloting', reward: '혜성 합금', rewardMaterial: 'alloy', baseReward: 1,
    copy: '45초 안에 빛나는 조각 5개를 모아 혜성 합금을 가져옵니다.',
    effect: '45초 안에 빛나는 조각 5개를 모으면 혜성 합금 1개를 얻고, 조종 감각 Lv.4부터 1개가 추가됩니다.',
  },
  ruins: {
    label: '고대 정거장', icon: '⌬', iconId: 'satellite', ability: 'precision', reward: '수정 유리', rewardMaterial: 'crystalGlass', baseReward: 1,
    copy: '45초 안에 빛나는 조각 5개를 모아 수정 유리를 가져옵니다.',
    effect: '45초 안에 빛나는 조각 5개를 모으면 수정 유리 1개를 얻고, 정밀 제어 Lv.4부터 1개가 추가됩니다.',
  },
}

const GALAXY_ROVER_BASE_DURATION_MS = 8 * 60 * 60 * 1000
const GALAXY_ROVER_BAY_DURATION_MS = 6 * 60 * 60 * 1000

export const GALAXY_ROVER_ROUTES = {
  nebula: {
    label: '성운 생태 원정',
    shortLabel: '성운',
    iconId: 'cloud',
    ability: 'detection',
    abilityLabel: '탐지 공명',
    rewardMaterial: 'biofiber',
    reward: '바이오 섬유',
    baseReward: 4,
    durationMs: GALAXY_ROVER_BASE_DURATION_MS,
    roverBayDurationMs: GALAXY_ROVER_BAY_DURATION_MS,
    accent: '#9e8cff',
    copy: '빛나는 포자 지대를 지나 미지의 생태 표본을 추적합니다.',
    discoveries: [
      { id: 'nebula_lumen_spore', name: '루멘 포자낭', rarity: 'common', description: '성운 바람을 머금고 은은하게 빛나는 생태 표본입니다.' },
      { id: 'nebula_aether_seed', name: '에테르 씨앗', rarity: 'rare', description: '중력이 약한 곳에서만 싹을 틔우는 부유 종자입니다.' },
      { id: 'nebula_whale_echo', name: '성운고래의 메아리', rarity: 'legendary', description: '아주 오래된 거대 생명체가 남긴 공명 기록입니다.' },
    ],
  },
  comet: {
    label: '혜성 구조 원정',
    shortLabel: '혜성',
    iconId: 'comet',
    ability: 'piloting',
    abilityLabel: '조종 감각',
    rewardMaterial: 'alloy',
    reward: '혜성 합금',
    baseReward: 2,
    durationMs: GALAXY_ROVER_BASE_DURATION_MS,
    roverBayDurationMs: GALAXY_ROVER_BAY_DURATION_MS,
    accent: '#ff9b65',
    copy: '불안정한 꼬리 궤도를 따라 오래된 구조 신호를 회수합니다.',
    discoveries: [
      { id: 'comet_iron_scale', name: '혜성 철편', rarity: 'common', description: '수많은 항해를 견딘 단단한 외피 조각입니다.' },
      { id: 'comet_tail_crystal', name: '꼬리빛 결정', rarity: 'rare', description: '혜성 꼬리의 빛이 결정처럼 굳어진 희귀 표본입니다.' },
      { id: 'comet_rescue_capsule', name: '개척자 구조 캡슐', rarity: 'legendary', description: '첫 아스트라 개척대의 항해 기록이 잠든 캡슐입니다.' },
    ],
  },
  ruins: {
    label: '고대 정거장 원정',
    shortLabel: '유적',
    iconId: 'satellite',
    ability: 'precision',
    abilityLabel: '정밀 제어',
    rewardMaterial: 'crystalGlass',
    reward: '수정 유리',
    baseReward: 2,
    durationMs: GALAXY_ROVER_BASE_DURATION_MS,
    roverBayDurationMs: GALAXY_ROVER_BAY_DURATION_MS,
    accent: '#65dff5',
    copy: '멈춘 정거장의 장치를 복원해 사라진 항로의 기억을 읽습니다.',
    discoveries: [
      { id: 'ruins_station_seal', name: '정거장 인장', rarity: 'common', description: '옛 항로 관리자가 사용하던 수정 표식입니다.' },
      { id: 'ruins_prism_memory', name: '프리즘 기억핵', rarity: 'rare', description: '빛의 결을 따라 장면을 보존하는 고대 저장 장치입니다.' },
      { id: 'ruins_astra_chart', name: '잃어버린 아스트라 성도', rarity: 'legendary', description: '폭풍 이전의 모든 항로가 새겨진 별자리 지도입니다.' },
    ],
  },
}

export const GALAXY_ROVER_DISCOVERIES = Object.values(GALAXY_ROVER_ROUTES)
  .flatMap((route) => route.discoveries)

export function getGalaxyRoverStatus(expedition, nowMs = Date.now()) {
  if (!expedition || typeof expedition !== 'object') return 'idle'

  const status = String(expedition.status || '').trim().toLowerCase()
  const hasIdentity = Boolean(expedition.operationId || expedition.id || expedition.route)
  if (!hasIdentity || status === 'idle' || status === 'none') return 'idle'
  if (expedition.claimedAtMs || ['claimed', 'collected'].includes(status)) return 'claimed'
  if (['ready', 'returned'].includes(status)) return 'ready'

  const returnsAtMs = Number(expedition.returnsAtMs || expedition.readyAtMs || expedition.returnAtMs || 0)
  if (returnsAtMs > 0 && Number(nowMs || 0) >= returnsAtMs) return 'ready'
  return 'active'
}

export function formatGalaxyRoverRemainingTime(remainingMs) {
  const safeRemainingMs = Math.max(0, Number(remainingMs) || 0)
  if (!safeRemainingMs) return '귀환 완료'

  const totalMinutes = Math.max(1, Math.ceil(safeRemainingMs / 60000))
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) return `${days}일 ${hours}시간 후`
  if (hours > 0) return `${hours}시간 ${minutes}분 후`
  return `${minutes}분 후`
}

export const GALAXY_ROUTE_LEVELS = [
  { level: 1, minXp: 0, nextLevelXp: 20, label: '첫 신호', iconId: 'radio' },
  { level: 2, minXp: 20, nextLevelXp: 60, label: '안정 항로', iconId: 'route' },
  { level: 3, minXp: 60, nextLevelXp: 140, label: '우정 궤도', iconId: 'orbit' },
  { level: 4, minXp: 140, nextLevelXp: 300, label: '공동 개척', iconId: 'handshake' },
  { level: 5, minXp: 300, nextLevelXp: 300, label: '별자리 동맹', iconId: 'sparkles' },
]

export const MATERIAL_LABELS = {
  stardust: '별가루',
  biofiber: '바이오 섬유',
  crystalGlass: '수정 유리',
  alloy: '혜성 합금',
}

export function getGalaxyRouteProgress(connectionXp = 0) {
  const safeXp = Math.max(0, Math.floor(Number(connectionXp) || 0))
  const current = [...GALAXY_ROUTE_LEVELS].reverse().find((route) => safeXp >= route.minXp) || GALAXY_ROUTE_LEVELS[0]
  return { ...current, connectionXp: safeXp }
}

export function formatGalaxyTime(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function getMissionCooldown(lastMissionAtMs, nowMs = Date.now()) {
  const lastCompletedAtMs = Number(lastMissionAtMs || 0)
  if (!lastCompletedAtMs) return { ready: true, label: '출항 가능' }
  const readyAtMs = lastCompletedAtMs + (2 * 60 * 60 * 1000)
  const remainingMs = Math.max(0, readyAtMs - nowMs)
  if (!remainingMs) return { ready: true, label: '출항 가능' }
  const minutes = Math.ceil(remainingMs / 60000)
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return { ready: false, label: hours ? `${hours}시간 ${rest}분 후` : `${rest}분 후` }
}
