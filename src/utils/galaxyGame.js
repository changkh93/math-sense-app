export const GALAXY_THEMES = {
  forest: { label: '루멘 숲', icon: '🌿', accent: '#63f5a6' },
  ocean: { label: '심해 행성', icon: '🌊', accent: '#4dc9ff' },
  crystal: { label: '수정 협곡', icon: '💎', accent: '#c084fc' },
  desert: { label: '황혼 사막', icon: '🏜️', accent: '#ffc766' },
  mechanical: { label: '기계 도시', icon: '⚙️', accent: '#95a4bd' },
  ice: { label: '빙하 천문대', icon: '❄️', accent: '#b8edff' },
}

export const GALAXY_PLAY_STYLES = {
  decorate: { label: '꾸미기', icon: '🎨' },
  explore: { label: '탐사', icon: '🧭' },
  collect: { label: '수집', icon: '🧺' },
  cooperate: { label: '협동', icon: '🤝' },
  photo: { label: '사진', icon: '📸' },
}

export const GALAXY_ABILITIES = {
  detection: { label: '탐지 공명', icon: '◉', description: '숨은 항로와 희귀 흔적을 발견합니다.' },
  endurance: { label: '항해 지속력', icon: '∞', description: '긴 원정에서 보급 효율을 높입니다.' },
  precision: { label: '정밀 제어', icon: '⌖', description: '수리와 조종의 정밀 선택지를 엽니다.' },
  pioneering: { label: '개척 파동', icon: '◇', description: '새로운 생태계의 변종을 발견합니다.' },
  communication: { label: '교신 공명', icon: '⌁', description: '친구와의 협력 신호를 강화합니다.' },
  piloting: { label: '조종 감각', icon: '△', description: '혜성 항로와 편대 비행을 돕습니다.' },
  construction: { label: '건조 기술', icon: '⬡', description: '대형 시설과 선체 모듈을 해금합니다.' },
}

export const GALAXY_VISIT_ACTIONS = {
  water: { label: '별꽃에 물주기', icon: '💧', description: '정원의 생명력을 회복합니다.' },
  repair: { label: '시설 수리하기', icon: '🔧', description: '폭풍에 지친 시설을 손봅니다.' },
  feed: { label: '생명체 돌보기', icon: '🌱', description: '작은 생명체에게 먹이를 줍니다.' },
  admire: { label: '감탄 신호', icon: '✨', description: '주인에게 반짝이는 감탄을 남깁니다.' },
}

export const GALAXY_MISSION_ROUTES = {
  nebula: { label: '성운 생태 항로', icon: '🌌', ability: 'detection', reward: '바이오 섬유', copy: '빛나는 포자를 따라 미지의 생태 표본을 회수합니다.' },
  comet: { label: '혜성 구조 항로', icon: '☄️', ability: 'piloting', reward: '혜성 합금', copy: '흔들리는 혜성 꼬리 사이로 구조 신호를 추적합니다.' },
  ruins: { label: '고대 정거장', icon: '🛰️', ability: 'precision', reward: '수정 유리', copy: '버려진 정거장의 장치를 정밀하게 복원합니다.' },
}

export const MATERIAL_LABELS = {
  stardust: '별가루',
  biofiber: '바이오 섬유',
  crystalGlass: '수정 유리',
  alloy: '혜성 합금',
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
