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

export const GALAXY_VISIT_ACTIONS = {
  water: { label: '별꽃에 물주기', icon: '▽', iconId: 'droplets', description: '친구 정원의 생명력을 회복합니다.', effect: '정원 활력 +4 · 항로 연결도 +6', stat: 'gardenVitality', connectionXp: 6 },
  repair: { label: '시설 수리하기', icon: '⌁', iconId: 'wrench', description: '폭풍에 지친 친구 시설을 손봅니다.', effect: '시설 상태 +4 · 항로 연결도 +7', stat: 'facilityHealth', connectionXp: 7 },
  feed: { label: '생명체 돌보기', icon: '♧', iconId: 'sprout', description: '친구 행성의 작은 생명체를 돌봅니다.', effect: '생명체 행복 +4 · 항로 연결도 +6', stat: 'creatureHappiness', connectionXp: 6 },
  admire: { label: '감탄 신호', icon: '✦', iconId: 'sparkles', description: '행성 주인에게 반짝이는 감탄을 남깁니다.', effect: '감탄 기록 +1 · 항로 연결도 +4', stat: 'admirationCount', connectionXp: 4 },
}

export const GALAXY_MISSION_ROUTES = {
  nebula: {
    label: '성운 생태 항로', icon: '✣', iconId: 'cloud', ability: 'detection', reward: '바이오 섬유', rewardMaterial: 'biofiber', baseReward: 2,
    copy: '빛나는 포자를 따라 미지의 생태 표본을 회수합니다.',
    effect: '45초 안에 신호 조각 5개를 모으면 바이오 섬유 2개를 얻고, 탐지 공명 Lv.4부터 1개가 추가됩니다.',
  },
  comet: {
    label: '혜성 구조 항로', icon: '◒', iconId: 'comet', ability: 'piloting', reward: '혜성 합금', rewardMaterial: 'alloy', baseReward: 1,
    copy: '흔들리는 혜성 꼬리 사이로 구조 신호를 추적합니다.',
    effect: '45초 안에 신호 조각 5개를 모으면 혜성 합금 1개를 얻고, 조종 감각 Lv.4부터 1개가 추가됩니다.',
  },
  ruins: {
    label: '고대 정거장', icon: '⌬', iconId: 'satellite', ability: 'precision', reward: '수정 유리', rewardMaterial: 'crystalGlass', baseReward: 1,
    copy: '버려진 정거장의 장치를 정밀하게 복원합니다.',
    effect: '45초 안에 신호 조각 5개를 모으면 수정 유리 1개를 얻고, 정밀 제어 Lv.4부터 1개가 추가됩니다.',
  },
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
