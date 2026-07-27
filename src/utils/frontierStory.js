export const FRONTIER_STORY_VERSION = 3

export const FRONTIER_PROLOGUE_STEPS = Object.freeze([
  'restore_beacon',
  'build_first_light',
  'field_expedition',
  'launch_rover',
])

export const FRONTIER_REBORN_STAR_STEPS = Object.freeze([
  'build_lumen_tree',
  'restore_garden',
  'stabilize_daily_event',
])

export const FRONTIER_LOST_ROUTE_STEPS = Object.freeze([
  'trace_lost_route',
  'dispatch_route_rover',
  'recover_pre_storm_discovery',
])

export const FRONTIER_FRIEND_SIGNAL_STEPS = Object.freeze([
  'visit_friend_planet',
  'help_friend_planet',
  'unlock_shared_route',
])

export const FRONTIER_ASTRA_MEMORY_STEPS = Object.freeze([
  'complete_discovery_codex',
  'complete_core_facilities',
  'build_astra_gateway',
  'restore_astra_memory',
])

export const FRONTIER_FIRST_SIGNAL_STEPS = FRONTIER_REBORN_STAR_STEPS

export const FRONTIER_CORE_FACILITY_IDS = Object.freeze([
  'lumen_tree',
  'starflower_garden',
  'observatory',
])

export const FRONTIER_STORY_CHAPTERS = Object.freeze([
  { id: 'prologue', title: '꺼진 귀환등', steps: FRONTIER_PROLOGUE_STEPS },
  { id: 'reborn_star', title: '다시 숨 쉬는 별', steps: FRONTIER_REBORN_STAR_STEPS },
  { id: 'lost_route', title: '잃어버린 항로', steps: FRONTIER_LOST_ROUTE_STEPS },
  { id: 'friend_signal', title: '친구의 신호', steps: FRONTIER_FRIEND_SIGNAL_STEPS },
  { id: 'astra_memory', title: '아스트라 기억망', steps: FRONTIER_ASTRA_MEMORY_STEPS },
])

export const FRONTIER_STORY_STEPS = Object.freeze(
  FRONTIER_STORY_CHAPTERS.flatMap((chapter) => chapter.steps),
)

const LEGACY_STEP_MAP = Object.freeze({
  restore_connection: 'help_friend_planet',
  recover_first_discovery: 'recover_pre_storm_discovery',
})

const STORY_OBJECTIVES = Object.freeze({
  restore_beacon: {
    eyebrow: '프롤로그 1/4 · 꺼진 귀환등',
    title: '왼쪽 지도에서 고장 난 비콘으로 이동해 E키로 수리하세요',
    detail: '폭풍에 끊긴 귀환 신호를 복구하면 첫 번째 기억 조각과 별가루를 찾습니다.',
    action: 'story-world',
  },
  build_first_light: {
    eyebrow: '프롤로그 2/4 · 첫 번째 빛',
    title: '건설 메뉴에서 별빛 램프를 골라 행성에 배치하세요',
    detail: '첫 별빛 램프는 프롤로그 지원으로 학습 광석과 재료를 쓰지 않습니다.',
    action: 'build',
    itemId: 'star_lamp',
  },
  field_expedition: {
    eyebrow: '프롤로그 3/4 · 지표면의 기억',
    title: '화면 앞 보라색 출발대에서 E키를 눌러 45초 탐사를 시작하세요',
    detail: '빛나는 조각 5개를 모두 모으면 세 번째 기억 조각이 깨어납니다.',
    action: 'world',
  },
  launch_rover: {
    eyebrow: '프롤로그 4/4 · 첫 항로',
    title: '로버 관제에서 항로 하나를 골라 첫 장거리 원정을 출발시키세요',
    detail: '로버가 출항하는 순간 마지막 기억 조각이 복원되고 프롤로그가 완성됩니다.',
    action: 'rover',
  },
  build_lumen_tree: {
    eyebrow: '제1장 1/3 · 루멘의 숨결',
    title: '루멘 나무를 건설해 행성에 첫 생명의 빛을 되돌리세요',
    detail: '건설 메뉴에서 루멘 나무를 선택해 평평한 땅에 배치하세요.',
    action: 'build',
    itemId: 'lumen_tree',
  },
  restore_garden: {
    eyebrow: '제1장 2/3 · 되살아난 정원',
    title: '별꽃 정원을 건설해 루멘 생태계를 확장하세요',
    detail: '별꽃 정원은 친구가 물을 줄수록 활력과 항로 연결도가 함께 자랍니다.',
    action: 'build',
    itemId: 'starflower_garden',
  },
  stabilize_daily_event: {
    eyebrow: '제1장 3/3 · 다시 숨 쉬는 별',
    title: '오늘의 행성 사건 현장으로 이동해 불안정한 신호를 해결하세요',
    detail: '사건을 안정화하면 하늘과 식생, 생명체의 빛이 한 단계 회복됩니다.',
    action: 'daily-event',
  },
  trace_lost_route: {
    eyebrow: '제2장 1/3 · 잃어버린 좌표',
    title: '45초 현장 탐사에서 빛나는 조각 5개를 회수하세요',
    detail: '폭풍 속에 흩어진 항로 좌표를 직접 모아 로버의 출항 경로를 복원합니다.',
    action: 'world',
  },
  dispatch_route_rover: {
    eyebrow: '제2장 2/3 · 폭풍 너머로',
    title: '로버를 장거리 항로로 출항시키세요',
    detail: '로버는 게임을 닫아도 탐사를 계속하며 폭풍 이전의 발견물을 찾아옵니다.',
    action: 'rover',
  },
  recover_pre_storm_discovery: {
    eyebrow: '제2장 3/3 · 되찾은 발견물',
    title: '귀환한 로버의 보상 상자를 열어 발견물을 복원하세요',
    detail: '첫 폭풍 이전 발견물이 도감에 기록되면 잃어버린 항로가 완성됩니다.',
    action: 'rover',
  },
  visit_friend_planet: {
    eyebrow: '제3장 1/3 · 친구의 신호',
    title: '크루 이웃 목록에서 친구 행성을 방문하세요',
    detail: '친구의 별에 도착하면 두 행성 사이에 첫 왕복 신호가 생성됩니다.',
    action: 'neighbors',
  },
  help_friend_planet: {
    eyebrow: '제3장 2/3 · 도움의 흔적',
    title: '친구 행성의 시설이나 생명체를 한 번 도와주세요',
    detail: '물주기, 수리, 돌보기, 감탄 신호 중 하나를 남기면 관계 항로가 성장합니다.',
    action: 'neighbors',
  },
  unlock_shared_route: {
    eyebrow: '제3장 3/3 · 공동 항로',
    title: '같은 친구와 항로 레벨 2에 도달하세요',
    detail: '도움을 반복해 연결 XP 20을 모으면 안정 항로와 관계 레벨이 해금됩니다.',
    action: 'neighbors',
  },
  complete_discovery_codex: {
    eyebrow: '피날레 1/4 · 발견 기억망',
    title: '서로 다른 로버 발견물 3개를 도감에 복원하세요',
    detail: '로버 원정을 반복해 폭풍 이전의 발견 기록을 세 종류 이상 보존하세요.',
    action: 'rover',
  },
  complete_core_facilities: {
    eyebrow: '피날레 2/4 · 살아 있는 거점',
    title: '루멘 나무, 별꽃 정원, 관측소를 모두 완성하세요',
    detail: '세 핵심 시설이 함께 작동하면 아스트라 항로문 설계가 안정됩니다.',
    action: 'build',
  },
  build_astra_gateway: {
    eyebrow: '피날레 3/4 · 아스트라 항로문',
    title: '건설 메뉴에서 아스트라 항로문을 완성하세요',
    detail: '혜성 합금으로 기억망의 마지막 관문을 건설합니다.',
    action: 'build',
    itemId: 'route_gateway',
  },
  restore_astra_memory: {
    eyebrow: '피날레 4/4 · 별의 기억',
    title: '완성된 아스트라 항로문 가까이에서 E키를 눌러 기억망을 가동하세요',
    detail: '모든 장의 기억을 연결해 별의 귀환 장면을 완성합니다.',
    action: 'activate-gateway',
  },
})

function getChapterForStep(stepId) {
  return FRONTIER_STORY_CHAPTERS.find((chapter) => chapter.steps.includes(stepId)) || FRONTIER_STORY_CHAPTERS[0]
}

function getCompletedChapterIds(completedStepIds) {
  return FRONTIER_STORY_CHAPTERS
    .filter((chapter) => chapter.steps.every((stepId) => completedStepIds.includes(stepId)))
    .map((chapter) => chapter.id)
}

function getRestorationStage(restorationPercent) {
  if (restorationPercent >= 100) return 5
  if (restorationPercent >= 80) return 4
  if (restorationPercent >= 60) return 3
  if (restorationPercent >= 40) return 2
  if (restorationPercent >= 20) return 1
  return 0
}

function normalizeCompletedStepIds(raw = {}) {
  const source = Array.isArray(raw.completedStepIds) ? raw.completedStepIds : []
  const migrated = source.map((stepId) => LEGACY_STEP_MAP[stepId] || stepId)
  const legacyPrologueComplete = raw.stepId === 'prologue_complete'
  if (legacyPrologueComplete) migrated.push(...FRONTIER_PROLOGUE_STEPS)
  return FRONTIER_STORY_STEPS.filter((stepId) => migrated.includes(stepId))
}

export function createInitialFrontierStory(nowMs = Date.now()) {
  return {
    version: FRONTIER_STORY_VERSION,
    chapterId: 'prologue',
    stepId: FRONTIER_STORY_STEPS[0],
    completedStepIds: [],
    completedChapterIds: [],
    memoryShards: 0,
    signalFragments: 0,
    restorationPercent: 0,
    restorationStage: 0,
    status: 'active',
    startedAtMs: nowMs,
    updatedAtMs: nowMs,
  }
}

export function normalizeFrontierStory(raw, nowMs = Date.now()) {
  const initial = createInitialFrontierStory(nowMs)
  if (!raw || typeof raw !== 'object') return initial
  const completedStepIds = normalizeCompletedStepIds(raw)
  const nextStepId = FRONTIER_STORY_STEPS.find((stepId) => !completedStepIds.includes(stepId)) || 'astra_memory_complete'
  const completed = completedStepIds.length === FRONTIER_STORY_STEPS.length
  const completedChapterIds = getCompletedChapterIds(completedStepIds)
  const restorationPercent = Math.round((completedStepIds.length / FRONTIER_STORY_STEPS.length) * 100)
  const chapter = completed ? FRONTIER_STORY_CHAPTERS.at(-1) : getChapterForStep(nextStepId)
  return {
    ...initial,
    ...raw,
    version: FRONTIER_STORY_VERSION,
    chapterId: chapter.id,
    stepId: nextStepId,
    completedStepIds,
    completedChapterIds,
    memoryShards: FRONTIER_PROLOGUE_STEPS.filter((stepId) => completedStepIds.includes(stepId)).length,
    signalFragments: FRONTIER_REBORN_STAR_STEPS.filter((stepId) => completedStepIds.includes(stepId)).length,
    restorationPercent,
    restorationStage: getRestorationStage(restorationPercent),
    status: completed ? 'completed' : 'active',
  }
}

function eventMatchesStep(stepId, event = {}) {
  const builtItemIds = Array.isArray(event.builtItemIds) ? event.builtItemIds : []
  if (stepId === 'restore_beacon') return (event.type === 'world_action' && event.nodeId === 'broken_beacon')
    || (event.type === 'daily_event_completed' && event.nodeId === 'broken_beacon')
  if (stepId === 'build_first_light') return event.type === 'item_built' && event.itemId === 'star_lamp' && Number(event.level || 1) === 1
  if (stepId === 'field_expedition') return event.type === 'mission_completed'
  if (stepId === 'launch_rover') return event.type === 'rover_dispatched'
  if (stepId === 'build_lumen_tree') return event.type === 'item_built' && event.itemId === 'lumen_tree'
  if (stepId === 'restore_garden') return event.type === 'item_built' && ['starflower_garden', 'friend_greenhouse'].includes(event.itemId)
  if (stepId === 'stabilize_daily_event') return event.type === 'daily_event_completed'
  if (stepId === 'trace_lost_route') return event.type === 'mission_completed'
  if (stepId === 'dispatch_route_rover') return event.type === 'rover_dispatched'
  if (stepId === 'recover_pre_storm_discovery') return event.type === 'rover_claimed'
  if (stepId === 'visit_friend_planet') return event.type === 'friend_visited'
  if (stepId === 'help_friend_planet') return event.type === 'social_help_completed'
  if (stepId === 'unlock_shared_route') return event.type === 'social_help_completed' && Number(event.routeLevel || 0) >= 2
  if (stepId === 'complete_discovery_codex') return Number(event.discoveryCount || 0) >= 3
  if (stepId === 'complete_core_facilities') return FRONTIER_CORE_FACILITY_IDS.every((itemId) => builtItemIds.includes(itemId))
  if (stepId === 'build_astra_gateway') return event.type === 'item_built' && event.itemId === 'route_gateway'
  if (stepId === 'restore_astra_memory') return event.type === 'astra_memory_activated'
    || (event.type === 'structure_cared' && event.itemId === 'route_gateway')
  return false
}

export function advanceFrontierStory(raw, event = {}, nowMs = Date.now()) {
  let story = normalizeFrontierStory(raw, nowMs)
  if (story.status === 'completed') return story
  let guard = 0
  while (story.status !== 'completed' && eventMatchesStep(story.stepId, event) && guard < FRONTIER_STORY_STEPS.length) {
    const completedStepIds = [...story.completedStepIds, story.stepId]
    story = normalizeFrontierStory({
      ...story,
      completedStepIds,
      updatedAtMs: nowMs,
      ...(completedStepIds.length === FRONTIER_STORY_STEPS.length ? { completedAtMs: nowMs } : {}),
    }, nowMs)
    guard += 1
  }
  return story
}

export function isFirstLightStoryGrant(story, itemId, level = 1) {
  return normalizeFrontierStory(story).stepId === 'build_first_light'
    && itemId === 'star_lamp'
    && Number(level) === 1
}

export function getFrontierStoryObjective(raw) {
  const story = normalizeFrontierStory(raw)
  if (story.status === 'completed') return null
  const chapter = getChapterForStep(story.stepId)
  const chapterProgress = chapter.steps.filter((stepId) => story.completedStepIds.includes(stepId)).length
  return {
    id: story.stepId,
    progress: chapterProgress,
    total: chapter.steps.length,
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    ...STORY_OBJECTIVES[story.stepId],
  }
}
