export const CREW_MOTHERSHIP_LEVELS = [
  { level: 1, minMembers: 1, name: '크루 탐사정', code: 'CREW SCOUT', description: '소형 코어와 기본 도킹 포트를 갖춘 첫 공동 함선' },
  { level: 2, minMembers: 10, name: '궤도 탐사선', code: 'ORBITAL EXPLORER', description: '10명의 승무원이 모여 양측 모듈 베이를 확장한 함선' },
  { level: 3, minMembers: 20, name: '성간 연구모함', code: 'STELLAR CARRIER', description: '20명의 항로와 다중 격납고를 운용하는 연구모함' },
  { level: 4, minMembers: 40, name: '궤도 연구기지', code: 'ORBITAL STATION', description: '40명의 항로를 연결하는 거대 궤도 연구기지' },
  { level: 5, minMembers: 80, name: '은하 수도함', code: 'GALACTIC CITADEL', description: '80명의 완전체 함대와 워프 항로를 통제하는 전설 기함' },
]

export const CREW_MOTHERSHIP_DEFAULT_MODULES = ['core-cadet', 'hangar-basic']

export const CREW_MOTHERSHIP_MODULES = [
  {
    id: 'dock-lights', slot: 'lights', name: '시안 도킹 라이트', cost: 150, tier: 'COMMON', minLevel: 1,
    description: '귀환하는 개인 탐사선의 도킹 항로를 청록빛으로 밝힙니다.',
  },
  {
    id: 'storage-gold', slot: 'storage', name: '황금 광석 저장고', cost: 300, tier: 'UNCOMMON', minLevel: 1,
    description: '공동 성취로 모은 광석이 하부 저장고에 차오르는 모습을 보여줍니다.',
  },
  {
    id: 'comms-array', slot: 'communication', name: '아고라 통신 배열', cost: 450, tier: 'UNCOMMON', minLevel: 2,
    description: '모함 상단에서 지식 신호를 송수신하는 회전식 통신 안테나입니다.',
  },
  {
    id: 'research-dark', slot: 'research', name: '다크 매터 연구소', cost: 700, tier: 'RARE', minLevel: 2,
    description: '복구된 다크 매터를 보랏빛 에너지로 정제하는 공동 연구 시설입니다.',
    achievement: { field: 'missionsCompleted', value: 5, label: '팀 미션 5회 완료' },
  },
  {
    id: 'archive-gold', slot: 'archive', name: '황금 항해 기록소', cost: 900, tier: 'RARE', minLevel: 3,
    description: '크루의 만점 성취와 공동 상자 역사를 영구 보관하는 기록 시설입니다.',
    achievement: { field: 'chestCycles', value: 3, label: '크루 광석 상자 3회 완성' },
  },
  {
    id: 'ring-orbital', slot: 'ring', name: '아틀라스 궤도 링', cost: 1500, tier: 'EPIC', minLevel: 4,
    description: '모함을 연구기지로 확장하는 거대한 외곽 궤도 구조물입니다.',
    achievement: { field: 'missionsCompleted', value: 15, label: '팀 미션 15회 완료' },
  },
  {
    id: 'warp-gate', slot: 'special', name: '공동 워프 게이트', cost: 3000, tier: 'LEGEND', minLevel: 5,
    description: '완전체 함대가 목표를 달성했을 때만 열리는 전설의 공동 항로입니다.',
    achievement: { field: 'missionsCompleted', value: 30, label: '팀 미션 30회 완료' },
  },
]

export const CREW_MOTHERSHIP_MODULE_MAP = Object.fromEntries(CREW_MOTHERSHIP_MODULES.map((item) => [item.id, item]))
export const CREW_CONTRIBUTION_AMOUNTS = [5, 10, 20, 50]
export const CREW_DAILY_CONTRIBUTION_LIMIT = 100

export function getCrewMemberCount(crew = {}) {
  const ids = new Set([
    ...(Array.isArray(crew?.memberIds) ? crew.memberIds : []),
    crew?.leaderId,
  ].filter(Boolean))
  return Math.max(1, Number(crew?.memberCount || 0), ids.size)
}

export function getCrewMothershipLevel(crew = {}) {
  const memberCount = getCrewMemberCount(crew)
  return [...CREW_MOTHERSHIP_LEVELS].reverse().find((item) => memberCount >= item.minMembers) || CREW_MOTHERSHIP_LEVELS[0]
}

export function getCrewMothershipStats(crew = {}) {
  const stored = crew?.mothershipStats && typeof crew.mothershipStats === 'object' ? crew.mothershipStats : {}
  return {
    missionsCompleted: Math.max(0, Number(stored.missionsCompleted || 0)),
    chestCycles: Math.max(Number(stored.chestCycles || 0), Number(crew?.crystalChest?.cycle || 0)),
    totalContributedOre: Math.max(0, Number(stored.totalContributedOre || 0)),
    completedProjects: Math.max(0, Number(stored.completedProjects || 0)),
    xp: Math.max(0, Number(crew?.mothershipXP || stored.xp || 0)),
  }
}

export function getOwnedCrewModules(crew = {}) {
  return Array.from(new Set([
    ...CREW_MOTHERSHIP_DEFAULT_MODULES,
    ...(Array.isArray(crew?.ownedMothershipModules) ? crew.ownedMothershipModules : []),
  ]))
}

export function getEquippedCrewModules(crew = {}) {
  const equipped = crew?.equippedMothershipModules && typeof crew.equippedMothershipModules === 'object'
    ? crew.equippedMothershipModules
    : {}
  return Object.values(equipped).filter(Boolean)
}

export function getCrewModuleUnlock(module, crew = {}) {
  const level = getCrewMothershipLevel(crew)
  const stats = getCrewMothershipStats(crew)
  const levelReady = level.level >= Number(module?.minLevel || 1)
  const achievementCurrent = module?.achievement ? Number(stats[module.achievement.field] || 0) : 0
  const achievementReady = !module?.achievement || achievementCurrent >= module.achievement.value
  return {
    unlocked: levelReady && achievementReady,
    levelReady,
    achievementReady,
    achievementCurrent,
    reason: !levelReady
      ? `모함 Lv.${module.minLevel} 필요`
      : !achievementReady
        ? module.achievement.label
        : '건설 가능',
  }
}

export function getCrewLevelProgress(crew = {}) {
  const current = getCrewMothershipLevel(crew)
  const memberCount = getCrewMemberCount(crew)
  const next = CREW_MOTHERSHIP_LEVELS.find((item) => item.level === current.level + 1)
  if (!next) return { current, next: null, memberCount, progress: 1 }
  const span = Math.max(1, next.minMembers - current.minMembers)
  return {
    current,
    next,
    memberCount,
    progress: Math.min(1, Math.max(0, (memberCount - current.minMembers) / span)),
  }
}
