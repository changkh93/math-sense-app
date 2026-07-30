/* global module, Buffer */

const GALAXY_ITEM_CATALOG = {
  star_lamp: {
    name: "별빛 램프", icon: "✦", iconId: "sparkles", cost: 25, material: "stardust", materialCost: 0, kind: "decor",
    description: "귀환 지점을 은은하게 밝히는 첫 번째 개척 조명입니다.",
    effect: "주변에 따뜻한 별빛과 귀환 포인트를 만듭니다.",
    setName: "귀환의 빛", previewTone: "#ffe28a",
  },
  lumen_tree: {
    name: "루멘 나무", icon: "♧", iconId: "tree-pine", cost: 60, material: "biofiber", materialCost: 2, kind: "nature",
    description: "행성의 밤에도 빛을 머금는 대표 생태 식물입니다.",
    effect: "행성에 발광 수관과 생태 구역의 중심을 만듭니다.",
    setName: "루멘 생태계", previewTone: "#72efad",
  },
  crystal_pond: {
    name: "수정 연못", icon: "◈", iconId: "waves", cost: 110, material: "crystalGlass", materialCost: 2, kind: "nature",
    description: "수정 입자가 수면을 따라 흐르는 작은 휴식 공간입니다.",
    effect: "반사 수면과 부유 입자로 행성에 물가 풍경을 더합니다.",
    setName: "루멘 생태계", previewTone: "#62ddff",
  },
  rover_bay: {
    name: "탐사 로버 정비소", icon: "⌂", iconId: "wrench", cost: 160, material: "alloy", materialCost: 3, kind: "facility",
    description: "귀환한 로버를 정비하고 다음 원정을 준비하는 전초 시설입니다.",
    effect: "설치 후 출발하는 장거리 로버 원정 시간을 8시간에서 6시간으로 단축합니다.",
    setName: "개척 전초기지", previewTone: "#ffad70",
  },
  observatory: {
    name: "성운 관측소", icon: "◎", iconId: "telescope", cost: 240, material: "crystalGlass", materialCost: 4, kind: "facility",
    description: "행성 사건·귀환 신호·로버 원정 상태를 한곳에서 관측하는 브리핑 시설입니다.",
    effect: "가까이에서 E 키를 누르면 오늘의 관측 브리핑을 열고, 행성 스카이라인에 푸른 신호광을 더합니다.",
    setName: "개척 전초기지", previewTone: "#91b9ff",
  },
  friend_greenhouse: {
    name: "별빛 공동 온실", icon: "◇", iconId: "warehouse", cost: 180, material: "biofiber", materialCost: 4, kind: "social",
    description: "친구가 찾아와 물을 주면 정원 활력과 서로의 항로 연결도가 자라는 협업 시설입니다.",
    effect: "친구는 가까이에서 E 키로 물을 주고, 주인은 방문자의 이름과 메시지를 귀환 기록에서 확인합니다.",
    setName: "연결의 정원", previewTone: "#8fffd1",
  },
  prism_pathlight: {
    name: "프리즘 길잡이", icon: "⌁", iconId: "route", cost: 45, material: "stardust", materialCost: 1, kind: "decor",
    description: "착륙장과 주요 시설 사이의 길을 표시하는 낮은 유도등입니다.",
    effect: "걸어갈 방향을 보여주는 연속 빛 표식을 만듭니다.",
    setName: "귀환의 빛", previewTone: "#79eaff",
  },
  starflower_garden: {
    name: "별꽃 정원", icon: "❋", iconId: "flower-2", cost: 90, material: "biofiber", materialCost: 3, kind: "nature",
    description: "친구가 찾아와 물을 주면 꽃빛이 살아나고 정원 활력과 항로 연결도가 자라는 협업 꽃밭입니다.",
    effect: "친구는 가까이에서 E 키로 별꽃에 물을 주고, 주인은 방문자의 이름과 메시지를 귀환 기록에서 확인합니다.",
    setName: "연결의 정원", previewTone: "#ff9fcb",
  },
  creature_habitat: {
    name: "루미 생명체 쉼터", icon: "◌", iconId: "egg", cost: 145, material: "biofiber", materialCost: 4, kind: "ecology",
    description: "작은 행성 생명체가 머물 수 있도록 만든 안전한 보금자리입니다.",
    effect: "생명체 돌보기 행동을 위한 생태 랜드마크를 만듭니다.",
    setName: "루멘 생태계", previewTone: "#c6f58a",
  },
  signal_plaza: {
    name: "귀환 신호 광장", icon: "⌾", iconId: "radio-tower", cost: 135, material: "crystalGlass", materialCost: 3, kind: "social",
    description: "방문자의 인사와 감탄 신호가 모이는 작은 행성 광장입니다.",
    effect: "친구 방문 흔적을 보여줄 중심 광장과 신호 비콘을 만듭니다.",
    setName: "항로 연결망", previewTone: "#a995ff",
  },
  expedition_beacon: {
    name: "원정대 비콘", icon: "△", iconId: "satellite-dish", cost: 210, material: "alloy", materialCost: 4, kind: "facility",
    description: "미지의 섹터로 향하는 탐사 신호를 증폭하는 전초 비콘입니다.",
    effect: "장거리 로버 원정의 회수 재료를 매번 1개 늘립니다.",
    setName: "개척 전초기지", previewTone: "#ff8c68",
  },
  route_gateway: {
    name: "아스트라 항로문", icon: "⬡", iconId: "orbit", cost: 320, material: "alloy", materialCost: 6, kind: "social",
    description: "오래 연결된 친구의 행성을 향해 빛나는 대형 항로 구조물입니다.",
    effect: "행성에 전시 가치가 높은 워프 랜드마크를 세웁니다.",
    setName: "항로 연결망", previewTone: "#68f0d0",
  },
};

// 모든 행성 객체가 같은 등급 계약을 사용한다.
// 자산이 완성된 항목의 `stage2Available`만 켜면 동일한 결제·저장·UI 경로를 사용한다.
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
});

Object.entries(GALAXY_ITEM_CATALOG).forEach(([itemId, item]) => {
  item.maxLevel = 2;
  item.stage2Cost = GALAXY_ITEM_STAGE2_COSTS[itemId] || 0;
  item.stage2Available = itemId === "lumen_tree" || itemId === "star_lamp" || itemId === "prism_pathlight" || itemId === "rover_bay" || itemId === "crystal_pond" || itemId === "observatory" || itemId === "friend_greenhouse" || itemId === "starflower_garden" || itemId === "creature_habitat" || itemId === "signal_plaza" || itemId === "expedition_beacon";
  item.stage2Label = itemId === "lumen_tree" ? "성목 루멘"
    : itemId === "star_lamp" ? "외행성 개척 비콘"
    : itemId === "prism_pathlight" ? "프리즘 항로 리본"
    : itemId === "rover_bay" ? "외행성 로버 서비스 도크"
    : itemId === "crystal_pond" ? "외행성 수정 생태 샘"
    : itemId === "observatory" ? "오로라 성운 천문대"
    : itemId === "friend_greenhouse" ? "별빛 공생 생태관"
    : itemId === "starflower_garden" ? "별무리 치유정원"
    : itemId === "creature_habitat" ? "루미 교감 생태원"
    : itemId === "signal_plaza" ? "항로 기억 신호원"
    : itemId === "expedition_beacon" ? "심우주 원정 중계기"
    : "Stage 2 준비 중";
});

const GALAXY_THEMES = new Set(["forest", "ocean", "crystal", "desert", "mechanical", "ice"]);
const GALAXY_PLAY_STYLES = new Set(["decorate", "explore", "collect", "cooperate", "photo"]);
const GALAXY_VISIT_ACTIONS = {
  water: { label: "별꽃에 물주기", icon: "▽", iconId: "droplets", stat: "gardenVitality", connectionXp: 6 },
  repair: { label: "시설 수리하기", icon: "⌁", iconId: "wrench", stat: "facilityHealth", connectionXp: 7 },
  feed: { label: "생명체 돌보기", icon: "♧", iconId: "sprout", stat: "creatureHappiness", connectionXp: 6 },
  admire: { label: "감탄 신호 남기기", icon: "✦", iconId: "sparkles", stat: "admirationCount", connectionXp: 4 },
};
const GALAXY_SAFE_VISIT_MESSAGES = new Set([
  "새로운 풍경이 정말 멋져!",
  "다음 탐사도 같이 가자!",
  "정원을 조금 돌보고 갔어.",
  "이 행성의 색 조합이 좋아!",
]);
const GALAXY_REPORT_CATEGORIES = new Set([
  "unsafe_message",
  "personal_info",
  "harassment",
  "other",
]);
const GALAXY_WORLD_ACTIONS = {
  crystal: { material: "crystalGlass", amount: 1, label: "수정 파편을 채집했습니다." },
  fiber: { material: "biofiber", amount: 1, label: "루멘 섬유를 채집했습니다." },
  salvage: { material: "alloy", amount: 1, label: "고대 합금을 회수했습니다." },
  beacon: { material: "stardust", amount: 1, label: "신호기를 수리하고 별가루를 찾았습니다.", stat: "facilityHealth" },
  plant: { material: "stardust", amount: 0, label: "황무지에 루멘 새싹을 심었습니다.", plants: true },
};
const GALAXY_WORLD_NODE_ACTIONS = {
  crystal_north: "crystal",
  fiber_grove: "fiber",
  ancient_scrap: "salvage",
  broken_beacon: "beacon",
  wild_soil: "plant",
};

const FRONTIER_STORY_VERSION = 3;
const FRONTIER_PROLOGUE_STEPS = Object.freeze([
  "restore_beacon",
  "build_first_light",
  "field_expedition",
  "launch_rover",
]);
const FRONTIER_REBORN_STAR_STEPS = Object.freeze([
  "build_lumen_tree",
  "restore_garden",
  "stabilize_daily_event",
]);
const FRONTIER_LOST_ROUTE_STEPS = Object.freeze([
  "trace_lost_route",
  "dispatch_route_rover",
  "recover_pre_storm_discovery",
]);
const FRONTIER_FRIEND_SIGNAL_STEPS = Object.freeze([
  "visit_friend_planet",
  "help_friend_planet",
  "unlock_shared_route",
]);
const FRONTIER_ASTRA_MEMORY_STEPS = Object.freeze([
  "complete_discovery_codex",
  "complete_core_facilities",
  "build_astra_gateway",
  "restore_astra_memory",
]);
const FRONTIER_FIRST_SIGNAL_STEPS = FRONTIER_REBORN_STAR_STEPS;
const FRONTIER_CORE_FACILITY_IDS = Object.freeze(["lumen_tree", "starflower_garden", "observatory"]);
const FRONTIER_STORY_CHAPTERS = Object.freeze([
  { id: "prologue", steps: FRONTIER_PROLOGUE_STEPS },
  { id: "reborn_star", steps: FRONTIER_REBORN_STAR_STEPS },
  { id: "lost_route", steps: FRONTIER_LOST_ROUTE_STEPS },
  { id: "friend_signal", steps: FRONTIER_FRIEND_SIGNAL_STEPS },
  { id: "astra_memory", steps: FRONTIER_ASTRA_MEMORY_STEPS },
]);
const FRONTIER_STORY_STEPS = Object.freeze(FRONTIER_STORY_CHAPTERS.flatMap((chapter) => chapter.steps));
const FRONTIER_LEGACY_STEP_MAP = Object.freeze({
  restore_connection: "help_friend_planet",
  recover_first_discovery: "recover_pre_storm_discovery",
});

function getFrontierChapterForStep(stepId) {
  return FRONTIER_STORY_CHAPTERS.find((chapter) => chapter.steps.includes(stepId)) || FRONTIER_STORY_CHAPTERS[0];
}

function getFrontierCompletedChapterIds(completedStepIds) {
  return FRONTIER_STORY_CHAPTERS
    .filter((chapter) => chapter.steps.every((stepId) => completedStepIds.includes(stepId)))
    .map((chapter) => chapter.id);
}

function getFrontierRestorationStage(restorationPercent) {
  if (restorationPercent >= 100) return 5;
  if (restorationPercent >= 80) return 4;
  if (restorationPercent >= 60) return 3;
  if (restorationPercent >= 40) return 2;
  if (restorationPercent >= 20) return 1;
  return 0;
}

function normalizeFrontierCompletedStepIds(raw = {}) {
  const source = Array.isArray(raw.completedStepIds) ? raw.completedStepIds : [];
  const migrated = source.map((stepId) => FRONTIER_LEGACY_STEP_MAP[stepId] || stepId);
  if (raw.stepId === "prologue_complete") migrated.push(...FRONTIER_PROLOGUE_STEPS);
  return FRONTIER_STORY_STEPS.filter((stepId) => migrated.includes(stepId));
}

function createInitialFrontierStory(nowMs = Date.now()) {
  return {
    version: FRONTIER_STORY_VERSION,
    chapterId: "prologue",
    stepId: FRONTIER_PROLOGUE_STEPS[0],
    completedStepIds: [],
    completedChapterIds: [],
    memoryShards: 0,
    signalFragments: 0,
    restorationPercent: 0,
    restorationStage: 0,
    status: "active",
    startedAtMs: nowMs,
    updatedAtMs: nowMs,
  };
}

function normalizeFrontierStory(raw, nowMs = Date.now()) {
  const initial = createInitialFrontierStory(nowMs);
  if (!raw || typeof raw !== "object") return initial;
  const completedStepIds = normalizeFrontierCompletedStepIds(raw);
  const completed = completedStepIds.length === FRONTIER_STORY_STEPS.length;
  const nextStepId = completed
    ? "astra_memory_complete"
    : FRONTIER_STORY_STEPS.find((stepId) => !completedStepIds.includes(stepId)) || FRONTIER_STORY_STEPS[0];
  const completedChapterIds = getFrontierCompletedChapterIds(completedStepIds);
  const restorationPercent = Math.round((completedStepIds.length / FRONTIER_STORY_STEPS.length) * 100);
  const chapter = completed ? FRONTIER_STORY_CHAPTERS[FRONTIER_STORY_CHAPTERS.length - 1] : getFrontierChapterForStep(nextStepId);
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
    restorationStage: getFrontierRestorationStage(restorationPercent),
    status: completed ? "completed" : "active",
  };
}

function frontierEventMatchesStep(stepId, event = {}) {
  const builtItemIds = Array.isArray(event.builtItemIds) ? event.builtItemIds : [];
  const discoveryRoutes = Array.isArray(event.discoveryRoutes) ? [...new Set(event.discoveryRoutes.filter(Boolean))] : [];
  if (stepId === "restore_beacon") return (event.type === "world_action" && event.nodeId === "broken_beacon")
    || (event.type === "daily_event_completed" && event.nodeId === "broken_beacon");
  if (stepId === "build_first_light") return event.type === "item_built" && event.itemId === "star_lamp" && Number(event.level || 1) === 1;
  if (stepId === "field_expedition") return event.type === "mission_completed";
  if (stepId === "launch_rover") return event.type === "rover_dispatched";
  if (stepId === "build_lumen_tree") return event.type === "item_built" && event.itemId === "lumen_tree";
  if (stepId === "restore_garden") return event.type === "item_built" && ["starflower_garden", "friend_greenhouse"].includes(event.itemId);
  if (stepId === "stabilize_daily_event") return event.type === "daily_event_completed";
  if (stepId === "trace_lost_route") return event.type === "mission_completed";
  if (stepId === "dispatch_route_rover") return event.type === "rover_dispatched";
  if (stepId === "recover_pre_storm_discovery") return event.type === "rover_claimed" && event.isNewDiscovery === true;
  if (stepId === "visit_friend_planet") return event.type === "friend_visited";
  if (stepId === "help_friend_planet") return event.type === "social_help_completed";
  if (stepId === "unlock_shared_route") return event.type === "social_help_completed" && Number(event.routeLevel || 0) >= 2;
  if (stepId === "complete_discovery_codex") {
    return discoveryRoutes.length ? discoveryRoutes.length >= 3 : Number(event.discoveryCount || 0) >= 3;
  }
  if (stepId === "complete_core_facilities") return FRONTIER_CORE_FACILITY_IDS.every((itemId) => builtItemIds.includes(itemId));
  if (stepId === "build_astra_gateway") return event.type === "item_built" && event.itemId === "route_gateway";
  if (stepId === "restore_astra_memory") return event.type === "astra_memory_activated"
    || (event.type === "structure_cared" && event.itemId === "route_gateway");
  return false;
}

function advanceFrontierStory(raw, event = {}, nowMs = Date.now()) {
  const initialStory = normalizeFrontierStory(raw, nowMs);
  if (initialStory.status === "completed") return { story: initialStory, advanced: false, advancedStepIds: [] };
  let story = initialStory;
  let guard = 0;
  while (story.status !== "completed" && frontierEventMatchesStep(story.stepId, event) && guard < FRONTIER_STORY_STEPS.length) {
    const completedStepIds = [...story.completedStepIds, story.stepId];
    story = normalizeFrontierStory({
      ...story,
      completedStepIds,
      updatedAtMs: nowMs,
      ...(completedStepIds.length === FRONTIER_STORY_STEPS.length ? { completedAtMs: nowMs } : {}),
    }, nowMs);
    guard += 1;
  }
  const advancedStepIds = story.completedStepIds.filter((stepId) => !initialStory.completedStepIds.includes(stepId));
  const completedChapterIds = story.completedChapterIds.filter((chapterId) => !initialStory.completedChapterIds.includes(chapterId));
  return {
    story,
    advanced: advancedStepIds.length > 0,
    advancedStepIds,
    ...(advancedStepIds.length ? { completedStepId: advancedStepIds[advancedStepIds.length - 1] } : {}),
    ...(completedChapterIds.length ? { completedChapterId: completedChapterIds[completedChapterIds.length - 1] } : {}),
  };
}

function isPendingFrontierBeaconRepair(rawStory, nodeId) {
  if (nodeId !== "broken_beacon") return false;
  const story = normalizeFrontierStory(rawStory);
  return story.status === "active"
    && story.stepId === "restore_beacon"
    && !story.completedStepIds.includes("restore_beacon");
}

function deriveFrontierStoryFromPlanet(planet = {}, nowMs = Date.now()) {
  if (planet.frontierStory) return normalizeFrontierStory(planet.frontierStory, nowMs);
  let story = createInitialFrontierStory(nowMs);
  const advance = (event) => {
    story = advanceFrontierStory(story, event, nowMs).story;
  };
  const unlockedLayout = Array.isArray(planet.layout) ? planet.layout.filter((item) => item?.locked !== true) : [];
  if (unlockedLayout.some((item) => item?.itemId === "star_lamp")) {
    advance({ type: "world_action", nodeId: "broken_beacon" });
    advance({ type: "item_built", itemId: "star_lamp", level: 1 });
  }
  if (Number(planet.lastMissionAtMs || 0) > 0 || planet.lastMission) {
    if (story.stepId === "restore_beacon") advance({ type: "world_action", nodeId: "broken_beacon" });
    if (story.stepId === "build_first_light") advance({ type: "item_built", itemId: "star_lamp", level: 1 });
    advance({ type: "mission_completed" });
  }
  if (planet.roverExpedition || (Array.isArray(planet.roverDiscoveries) && planet.roverDiscoveries.length)) {
    if (story.stepId === "restore_beacon") advance({ type: "world_action", nodeId: "broken_beacon" });
    if (story.stepId === "build_first_light") advance({ type: "item_built", itemId: "star_lamp", level: 1 });
    if (story.stepId === "field_expedition") advance({ type: "mission_completed" });
    advance({ type: "rover_dispatched" });
  }
  if (Array.isArray(planet.roverDiscoveries) && planet.roverDiscoveries.length) {
    advance({
      type: "rover_claimed",
      isNewDiscovery: true,
      discoveryCount: planet.roverDiscoveries.length,
      discoveryRoutes: planet.roverDiscoveries.map((entry) => entry?.route).filter(Boolean),
    });
  }
  return story;
}

function getFrontierBuildPricing(story, itemId, level, item = {}) {
  const storyGrantApplied = normalizeFrontierStory(story).stepId === "build_first_light"
    && itemId === "star_lamp"
    && Number(level) === 1;
  return {
    storyGrantApplied,
    totalCost: storyGrantApplied ? 0 : Number(item.cost || 0) + (Number(level) >= 2 ? Number(item.stage2Cost || 0) : 0),
    materialCost: storyGrantApplied ? 0 : Number(item.materialCost || 0),
  };
}
const GALAXY_STRUCTURE_ACTION_REWARDS = {
  water: { material: "biofiber", amount: 1, label: "돌봄을 마치고 바이오 섬유 1개를 얻었습니다." },
  repair: { material: "alloy", amount: 1, label: "정비를 마치고 고대 합금 1개를 회수했습니다." },
  feed: { material: "stardust", amount: 1, label: "생명체를 돌보고 별가루 1개를 얻었습니다." },
  admire: { material: "crystalGlass", amount: 1, label: "관측 기록을 남기고 수정 유리 1개를 발견했습니다." },
};

const GALAXY_DAILY_EVENT_VERSION = 1;
const GALAXY_DAILY_EVENT_OPERATION_TYPE = "galaxy_daily_event";
const GALAXY_DAILY_EVENT_CATALOG = [
  {
    type: "lumen_bloom",
    nodeId: "fiber_grove",
    title: "루멘 숲 개화",
    detail: "섬유 숲에 빛꽃이 피었습니다. 생태 표본을 회수해 정원의 활력을 높여보세요.",
    reward: { material: "biofiber", amount: 1, title: "바이오 섬유" },
    stat: "gardenVitality",
    statAmount: 6,
  },
  {
    type: "crystal_rain",
    nodeId: "crystal_north",
    title: "수정비 낙하",
    detail: "북쪽 구릉에 수정비가 내렸습니다. 반짝이는 파편을 모아 정원을 회복하세요.",
    reward: { material: "crystalGlass", amount: 1, title: "수정 유리" },
    stat: "gardenVitality",
    statAmount: 6,
  },
  {
    type: "signal_blackout",
    nodeId: "broken_beacon",
    title: "신호망 정전",
    detail: "오래된 비콘의 신호가 끊겼습니다. 전력을 복구하고 남은 별가루를 회수하세요.",
    reward: { material: "stardust", amount: 1, title: "별가루" },
    stat: "facilityHealth",
    statAmount: 6,
  },
  {
    type: "meteor_debris",
    nodeId: "ancient_scrap",
    title: "운석 잔해 낙하",
    detail: "고대 잔해 지대에 작은 운석이 떨어졌습니다. 합금을 회수해 시설을 보강하세요.",
    reward: { material: "alloy", amount: 1, title: "고대 합금" },
    stat: "facilityHealth",
    statAmount: 6,
  },
];

const GALAXY_ROVER_OPERATION_TYPE = "galaxy_rover_expedition";
const GALAXY_ROVER_DEFAULT_DURATION_MS = 8 * 60 * 60 * 1000;
const GALAXY_ROVER_BAY_DURATION_MS = 6 * 60 * 60 * 1000;
const GALAXY_ROVER_CATALOG_VERSION = 2;
const GALAXY_ROVER_REPORT_FLOW_VERSION = 2;
// Version 2 clients render the report acknowledgement action. Version 1
// clients retain the legacy flow until they receive the new UI, so a stale tab
// never sees an enabled departure button that the server suddenly rejects.
const ENFORCE_ROVER_REPORT_ACKNOWLEDGEMENT = true;
const GALAXY_ROVER_ROUTES = {
  nebula: {
    title: "성운 생태 항로",
    shortLabel: "성운",
    copy: "폭풍 뒤 사라진 생태 신호를 추적해 행성의 생명 기록을 복원합니다.",
    material: "biofiber",
    rewardTitle: "바이오 섬유",
    baseAmount: 4,
    ability: "detection",
    discoveries: [
      { id: "nebula_lumen_spore", name: "루멘 포자낭", rarity: "common", description: "성운 바람을 머금고 은은하게 빛나는 생태 표본입니다." },
      { id: "nebula_aether_seed", name: "에테르 씨앗", rarity: "rare", description: "중력이 약한 곳에서만 싹을 틔우는 부유 종자입니다." },
      { id: "nebula_whale_echo", name: "성운고래의 메아리", rarity: "legendary", description: "아주 오래된 거대 생명체가 남긴 공명 기록입니다." },
    ],
  },
  comet: {
    title: "혜성 구조 항로",
    shortLabel: "혜성",
    copy: "끊긴 구조 신호와 오래된 장비를 회수해 개척 전초기지를 보강합니다.",
    material: "alloy",
    rewardTitle: "혜성 합금",
    baseAmount: 2,
    ability: "piloting",
    discoveries: [
      { id: "comet_iron_scale", name: "혜성 철편", rarity: "common", description: "수많은 항해를 견딘 단단한 외피 조각입니다." },
      { id: "comet_tail_crystal", name: "꼬리빛 결정", rarity: "rare", description: "혜성 꼬리의 빛이 결정처럼 굳어진 희귀 표본입니다." },
      { id: "comet_rescue_capsule", name: "개척자 구조 캡슐", rarity: "legendary", description: "첫 아스트라 개척대의 항해 기록이 잠든 캡슐입니다." },
    ],
  },
  ruins: {
    title: "고대 정거장 항로",
    shortLabel: "정거장",
    copy: "멈춘 정거장의 기억 장치를 복원해 사라진 항로의 기록을 읽습니다.",
    material: "crystalGlass",
    rewardTitle: "수정 유리",
    baseAmount: 2,
    ability: "precision",
    discoveries: [
      { id: "ruins_station_seal", name: "정거장 인장", rarity: "common", description: "옛 항로 관리자가 사용하던 수정 표식입니다." },
      { id: "ruins_prism_memory", name: "프리즘 기억핵", rarity: "rare", description: "빛의 결을 따라 장면을 보존하는 고대 저장 장치입니다." },
      { id: "ruins_astra_chart", name: "잃어버린 아스트라 성도", rarity: "legendary", description: "폭풍 이전의 모든 항로가 새겨진 별자리 지도입니다." },
    ],
  },
};

const GALAXY_BUILD_RADIUS = 14.2;
const GALAXY_BUILD_MIN_SPACING = 2.1;
const GALAXY_BUILD_RESERVED_POSITIONS = [
  [9.2, 7.8], [7.8, -7.3], [11.7, 3.2], [-10.5, 7.4], [4.8, -8.7],
  [-12.2, 1.5], [1.2, -12.4], [12.4, 0.2],
  [1.5, 4.4], [-1.45, 4.85],
  [-9.25, -5.15], [-6.45, -5.85], [-8.75, -2.65], [-5.55, -3.15],
  [-7.45, -4.25],
];

const ASTRA_BUILDER_STATE_ENCODING = "u16le-v1";
const ASTRA_BUILDER_SAVE_GRACE_MS = 30 * 1000;
const ASTRA_BUILDER_MAX_STATE_BYTES = 64 * 1024;
const ASTRA_BUILDER_ALLOWED_CELL_MASK = 0x03ff;
const ASTRA_BUILDER_ALLOWED_BLOCK_TYPES = new Set([1, 2, 3, 4, 5, 6, 7]);
const ASTRA_BUILDER_PLOTS = {
  "habitat-b01": {
    schemaVersion: 1,
    plotId: "habitat-b01",
    name: "별빛 건축실 B-01",
    zoneId: "habitat",
    origin: { x: -7.5, y: 0, z: -4.5 },
    rotation: 0,
    dimensions: { x: 12, y: 10, z: 12 },
    cellSize: 0.34,
    maxBlocks: 360,
    unlockedSetIds: ["astra_builder_basic"],
  },
};

const GALAXY_STRUCTURE_VISIT_ACTIONS = {
  starter_dome: "repair",
  star_lamp: "admire",
  lumen_tree: "water",
  crystal_pond: "water",
  rover_bay: "repair",
  observatory: "repair",
  friend_greenhouse: "water",
  prism_pathlight: "repair",
  starflower_garden: "water",
  creature_habitat: "feed",
  signal_plaza: "admire",
  expedition_beacon: "repair",
  route_gateway: "admire",
  wild_sprout: "water",
};

const GALAXY_ITEM_FALLBACK_DESCRIPTIONS = {
  starter_dome: "아스트라 프론티어에 처음 도착한 개척자를 위한 안전한 귀환 거점입니다.",
  wild_sprout: "황무지에 직접 심어 천천히 빛을 키워가는 어린 루멘 새싹입니다.",
};

const GALAXY_OBJECT_IMAGE_BUCKETS = new Set([
  "math-sense-1f6a8.firebasestorage.app",
]);
const GALAXY_ITEM_NAME_MAX_LENGTH = 40;
const GALAXY_ITEM_DESCRIPTION_MAX_LENGTH = 240;
const GALAXY_OBJECT_IMAGE_PATH_MAX_LENGTH = 500;
const GALAXY_OBJECT_IMAGE_URL_MAX_LENGTH = 2048;
const GALAXY_LIVE_ACCESS_DURATION_MS = 5 * 60 * 1000;
const GALAXY_LIVE_CONNECTION_STALE_MS = 15 * 1000;
const GALAXY_LIVE_SPEECH_DURATION_MS = 8 * 1000;
const GALAXY_LIVE_SPEECH_COOLDOWN_MS = 1200;
const GALAXY_LIVE_PROXIMITY_DISTANCE = 4.5;

const GALAXY_RELATIONSHIP_LEVEL_THRESHOLDS = [0, 20, 60, 140, 300];
const GALAXY_VISIT_NODE_ACTIONS = {
  crystal_north: "admire",
  fiber_grove: "water",
  ancient_scrap: "repair",
  broken_beacon: "repair",
  wild_soil: "feed",
};
const GALAXY_VISIT_NODE_POSITIONS = {
  crystal_north: [9.2, 7.8],
  fiber_grove: [7.8, -7.3],
  ancient_scrap: [11.7, 3.2],
  broken_beacon: [-10.5, 7.4],
  wild_soil: [4.8, -8.7],
};

const LEARNING_ORE_EXCLUDED_TYPES = new Set([
  "crystal_gift_received",
  "crystal_gift_sent",
  "store_item_gift_received",
  "store_item_gift_sent",
  "crew_crystal_chest_reward",
  "crew_growth_event_reward",
  "crew_mothership_contribution",
  "galaxy_build",
]);
const GALAXY_LEARNING_LEDGER_VERSION = 2;
const GALAXY_LEARNING_BACKFILL_LIMIT = 200;
const GALAXY_LEARNING_MAX_ORE_PER_TRANSACTION = 10000;
const GALAXY_LEARNING_ADMIN_SCAN_LIMIT = 1000;
const GALAXY_LEARNING_ADMIN_MAX_USERS_PER_RUN = 20;
const GALAXY_LEARNING_ADMIN_MAX_PAGES_PER_USER = 5;
const GALAXY_LEARNING_ADMIN_MAX_PAGES_PER_RUN = 25;
const GALAXY_LEARNING_ADMIN_LOCK_MS = 10 * 60 * 1000;
const GALAXY_LEARNING_ADMIN_JOB_ID = "learningOreLedgerV2";
const GALAXY_LEARNING_ADMIN_CONFIRMATION = "BACKFILL-ASTRA-LEARNING-ORE";
const GALAXY_LEARNING_ADMIN_BLOCKED_ROLES = new Set([
  "admin",
  "developer",
  "teacher",
  "operator",
  "parent",
  "guest",
]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function cleanText(value, maxLength = 120) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanId(value, maxLength = 180) {
  return String(value || "").trim().slice(0, maxLength);
}

function isSafeRealtimePathSegment(value, maxLength = 180) {
  return typeof value === "string"
    && value.length > 0
    && value.length <= maxLength
    && value.trim() === value
    && !value.split("").some((character) => ".#$[]/".includes(character));
}

function validateGalaxyLiveSpeechText(value) {
  const text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  if (!text || text.length > 80 || containsUnsafePublicText(text) || /[<>]/.test(text)) {
    return { valid: false, text: "" };
  }
  return { valid: true, text };
}

function getActiveGalaxyLiveConnection(connections = {}, expectedUid = "", nowMs = Date.now()) {
  return Object.values(connections || {})
    .filter((connection) => connection && typeof connection === "object")
    .filter((connection) => connection.uid === expectedUid)
    .filter((connection) => {
      const updatedAtMs = Number(connection.updatedAtMs || 0);
      return updatedAtMs > nowMs - GALAXY_LIVE_CONNECTION_STALE_MS && updatedAtMs <= nowMs + 5_000;
    })
    .sort((first, second) => Number(second.updatedAtMs || 0) - Number(first.updatedAtMs || 0))[0] || null;
}

function planGalaxyLiveSpeech({ actorAccess = {}, targetAccess = {}, actorConnection = null, targetConnections = {}, actorUid = "", targetUid = "", nowMs = Date.now() } = {}) {
  const targetConnection = getActiveGalaxyLiveConnection(targetConnections, targetUid, nowMs);
  const actorUpdatedAtMs = Number(actorConnection?.updatedAtMs || 0);
  if (
    Number(actorAccess.expiresAtMs || 0) <= nowMs
    || actorAccess.uid !== actorUid
    || Number(targetAccess.expiresAtMs || 0) <= nowMs
    || targetAccess.uid !== targetUid
    || !actorConnection
    || actorConnection.uid !== actorUid
    || actorUpdatedAtMs <= nowMs - GALAXY_LIVE_CONNECTION_STALE_MS
    || actorUpdatedAtMs > nowMs + 5_000
    || !targetConnection
  ) return { kind: "offline" };

  const actorX = Number(actorConnection.x);
  const actorZ = Number(actorConnection.z);
  const targetX = Number(targetConnection.x);
  const targetZ = Number(targetConnection.z);
  if (![actorX, actorZ, targetX, targetZ].every(Number.isFinite)) return { kind: "invalid_position" };
  const distance = Math.hypot(actorX - targetX, actorZ - targetZ);
  if (distance > GALAXY_LIVE_PROXIMITY_DISTANCE) return { kind: "too_far", distance };
  return { kind: "allowed", targetConnection, distance };
}

function isGalaxyLiveSpeechRateLimited(value, nowMs = Date.now()) {
  const lastSentAtMs = Number(value?.lastSentAtMs || 0);
  return Number.isFinite(lastSentAtMs)
    && lastSentAtMs > Number(nowMs || 0) - GALAXY_LIVE_SPEECH_COOLDOWN_MS;
}

function getExactDocumentId(value) {
  return typeof value === "string" ? value : "";
}

// External contact patterns and school-name hints are blocked server-side so a
// student cannot route a friend off-platform or reveal identifying context in
// public galaxy text (planet names, item names, live speech, descriptions).
// 정확한 단어 일치보다 오탐을 줄이는 것이 우선이므로, 띄어쓰기/구분자로
// 묶인 키워드만 매칭한다. 전화번호/이메일/URL은 기존 정규식으로 잡는다.
// \b는 ASCII 단어 경계라 한글과 함께 쓰지 못하므로 한글 패턴에는 쓰지 않는다.
const GALAXY_PUBLIC_TEXT_UNSAFE_PATTERNS = [
  /https?:\/\/|www\./i,
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
  /@[a-z0-9_.-]{2,}/i,
  /\b\d{2,4}[- .)]?\d{3,4}[- .]?\d{4}\b/,
  // External messenger accounts and off-platform handles.
  /(?:카톡|카카오톡|kakaotalk|kakao\.?talk|insta|인스타(그램)?|instagram|디엠|dm|틱톡|tiktok|트위터|twitter|x\.com|스냅챗|snapchat|텔레그램|telegram|라인|line|디스코드|discord|왓챠|watcha|유튜브|youtube|넥슨|배그|발로란트|오버워치)\s*[:.\-=]?\s*[@a-z0-9_][a-z0-9_.@-]{1,30}/i,
  // Korean residential/road addresses and school/academy identifiers.
  /(?:경기|서울|부산|대구|인천|광주|대전|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)\s?(?:특별자치도|특별자치시|특별시|광역시|도)?\s?[가-힣]{1,4}(?:시|군|구)\s?[가-힣0-9]+\s?(?:로|길)\s?\d/,
  /[가-힣]{1,8}(?:초등학교|중학교|고등학교|학원|교회)/,
  /(?:학번|반|번)[\s:.]?\d{1,4}/,
];

function containsUnsafePublicText(value) {
  const text = String(value || "");
  return GALAXY_PUBLIC_TEXT_UNSAFE_PATTERNS.some((pattern) => pattern.test(text));
}

function getGalaxyItemDefaultDescription(itemId) {
  return cleanText(
    GALAXY_ITEM_CATALOG[itemId]?.description
      || GALAXY_ITEM_FALLBACK_DESCRIPTIONS[itemId]
      || "행성 개척 과정에서 세운 아스트라 프론티어 시설입니다.",
    GALAXY_ITEM_DESCRIPTION_MAX_LENGTH,
  );
}

function getGalaxyStructureVisitAction(itemId) {
  return GALAXY_STRUCTURE_VISIT_ACTIONS[cleanId(itemId, 80)] || "";
}

function getGalaxyLayoutWorldPosition(item = {}) {
  const x = Number(item.x);
  const y = Number(item.y);
  return {
    x: (Number.isFinite(x) ? x - 50 : 0) / 3,
    z: (Number.isFinite(y) ? y - 50 : 0) / 3,
  };
}

function planGalaxyStructureVisit({ layout = [], instanceId = "", actionId = "", clientPosition = null } = {}) {
  const structure = (Array.isArray(layout) ? layout : [])
    .find((entry) => entry?.instanceId === instanceId) || null;
  if (!structure) return { kind: "not_found" };
  const expectedActionId = getGalaxyStructureVisitAction(structure.itemId);
  if (!expectedActionId || expectedActionId !== actionId) {
    return { kind: "action_mismatch", expectedActionId };
  }
  const position = getGalaxyLayoutWorldPosition(structure);
  if (clientPosition && Math.hypot(
    Number(clientPosition.x) - position.x,
    Number(clientPosition.z) - position.z,
  ) > 0.75) return { kind: "stale_position", structure, position };
  return { kind: "valid", structure, position, actionId: expectedActionId };
}

function planGalaxyItemPlacement({ layout = [], instanceId = "", x, y, rotation = 0 } = {}) {
  const numericX = Number(x);
  const numericY = Number(y);
  const numericRotation = Number(rotation);
  if (!Number.isFinite(numericX) || !Number.isFinite(numericY) || !Number.isFinite(numericRotation)) {
    return { kind: "invalid_number" };
  }
  if (numericX < 7.4 || numericX > 92.6 || numericY < 7.4 || numericY > 92.6) {
    return { kind: "outside_bounds" };
  }

  const worldX = (numericX - 50) / 3;
  const worldZ = (numericY - 50) / 3;
  if (Math.hypot(worldX, worldZ) > GALAXY_BUILD_RADIUS) {
    return { kind: "outside_radius" };
  }
  const collides = (Array.isArray(layout) ? layout : []).some((entry) => {
    if (!entry || (instanceId && entry.instanceId === instanceId)) return false;
    const entryPosition = getGalaxyLayoutWorldPosition(entry);
    return Math.hypot(worldX - entryPosition.x, worldZ - entryPosition.z) < GALAXY_BUILD_MIN_SPACING;
  });
  if (collides) return { kind: "overlap" };
  if (GALAXY_BUILD_RESERVED_POSITIONS.some(([reservedX, reservedZ]) => (
    Math.hypot(worldX - reservedX, worldZ - reservedZ) < 2
  ))) return { kind: "reserved" };

  return {
    kind: "valid",
    x: Math.round(numericX * 1000) / 1000,
    y: Math.round(numericY * 1000) / 1000,
    rotation: ((Math.round(numericRotation / 45) * 45) % 360 + 360) % 360,
    worldX,
    worldZ,
  };
}

function extractFirebaseStorageObject(value) {
  if (typeof value !== "string" || !value || value.length > GALAXY_OBJECT_IMAGE_URL_MAX_LENGTH) return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  try {
    if (url.hostname === "firebasestorage.googleapis.com") {
      const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
      if (!match) return null;
      return { bucket: decodeURIComponent(match[1]), path: decodeURIComponent(match[2]) };
    }
    if (url.hostname === "storage.googleapis.com") {
      const match = url.pathname.match(/^\/([^/]+)\/(.+)$/);
      if (!match) return null;
      return { bucket: decodeURIComponent(match[1]), path: decodeURIComponent(match[2]) };
    }
    if (url.hostname.endsWith(".storage.googleapis.com")) {
      const bucket = url.hostname.slice(0, -".storage.googleapis.com".length);
      const path = decodeURIComponent(url.pathname.replace(/^\//, ""));
      return bucket && path ? { bucket, path } : null;
    }
  } catch {
    return null;
  }
  return null;
}

function isGalaxyObjectImagePath(uid, instanceId, value) {
  if (typeof value !== "string" || !value || value.length > GALAXY_OBJECT_IMAGE_PATH_MAX_LENGTH) return false;
  const expectedPrefix = `galaxy-objects/${uid}/${instanceId}/`;
  const fileName = value.startsWith(expectedPrefix) ? value.slice(expectedPrefix.length) : "";
  return Boolean(
    fileName
    && !fileName.includes("/")
    && !fileName.includes("..")
    && /^[A-Za-z0-9][A-Za-z0-9._-]{0,179}$/.test(fileName)
  );
}

function validateGalaxyObjectImage({ uid, instanceId, imagePath, imageUrl } = {}) {
  if (imagePath === "" && imageUrl === "") return { valid: true, imagePath: "", imageUrl: "" };
  if (typeof imagePath !== "string" || typeof imageUrl !== "string") return { valid: false };
  const normalizedPath = imagePath.trim();
  const normalizedUrl = imageUrl.trim();
  if (
    normalizedPath !== imagePath
    || normalizedUrl !== imageUrl
    || !normalizedPath
    || !normalizedUrl
    || normalizedPath.length > GALAXY_OBJECT_IMAGE_PATH_MAX_LENGTH
    || normalizedUrl.length > GALAXY_OBJECT_IMAGE_URL_MAX_LENGTH
  ) return { valid: false };

  if (!isGalaxyObjectImagePath(uid, instanceId, normalizedPath)) return { valid: false };

  const storageObject = extractFirebaseStorageObject(normalizedUrl);
  if (
    !storageObject
    || !GALAXY_OBJECT_IMAGE_BUCKETS.has(storageObject.bucket)
    || storageObject.path !== normalizedPath
  ) return { valid: false };
  return { valid: true, imagePath: normalizedPath, imageUrl: normalizedUrl };
}

function normalizeGalaxyItemPublicText(value) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
}

function uniqueIds(values = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function stableGalaxyHash(value) {
  let hash = 2166136261;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getGalaxyRoverExpeditionView(expedition, nowMs = Date.now()) {
  if (!expedition || typeof expedition !== "object" || !expedition.operationId) return null;
  const isClaimed = expedition.status === "claimed" || Boolean(expedition.claimedAtMs) || Boolean(expedition.claimedAt) || Boolean(expedition.result?.claimedAtMs);
  const status = isClaimed
    ? "claimed"
    : Math.max(0, Number(expedition.readyAtMs || 0)) <= Math.max(0, Number(nowMs || 0))
      ? "ready"
      : "exploring";
  const view = { ...expedition, status, ...(isClaimed ? { claimedAtMs: expedition.claimedAtMs || expedition.result?.claimedAtMs } : {}) };
  // The route is public while travelling; the concrete discovery is only
  // revealed in the return report. The operation keeps the server snapshot.
  if (!isClaimed) {
    delete view.discovery;
    view.discoveryPending = true;
  }
  return view;
}

function normalizeGalaxyRoverStats(raw = {}) {
  const routeLaunchCounts = raw?.routeLaunchCounts && typeof raw.routeLaunchCounts === "object"
    ? raw.routeLaunchCounts : {};
  return {
    version: Math.max(1, Number(raw?.version || 1)),
    totalLaunched: Math.max(0, Math.floor(Number(raw?.totalLaunched || 0))),
    totalClaimed: Math.max(0, Math.floor(Number(raw?.totalClaimed || 0))),
    nextExpeditionNo: Math.max(1, Math.floor(Number(raw?.nextExpeditionNo || Number(raw?.totalLaunched || 0) + 1))),
    routeLaunchCounts: {
      nebula: Math.max(0, Math.floor(Number(routeLaunchCounts.nebula || 0))),
      comet: Math.max(0, Math.floor(Number(routeLaunchCounts.comet || 0))),
      ruins: Math.max(0, Math.floor(Number(routeLaunchCounts.ruins || 0))),
    },
    uniqueDiscoveryCount: Math.max(0, Math.floor(Number(raw?.uniqueDiscoveryCount || 0))),
    lastOperationId: cleanId(raw?.lastOperationId, 120),
    lastClaimedOperationId: cleanId(raw?.lastClaimedOperationId, 120),
    lastAcknowledgedOperationId: cleanId(raw?.lastAcknowledgedOperationId, 120),
  };
}

function getGalaxyRoverDiscovery({ route, routeConfig, operationId, roverDiscoveries = [] } = {}) {
  const discoveries = Array.isArray(routeConfig?.discoveries) ? routeConfig.discoveries : [];
  const knownIds = new Set((Array.isArray(roverDiscoveries) ? roverDiscoveries : []).map((entry) => entry?.id).filter(Boolean));
  const firstUnrestored = discoveries.find((discovery) => !knownIds.has(discovery.id));
  const template = firstUnrestored || discoveries[stableGalaxyHash(`${route}:${operationId}`) % Math.max(1, discoveries.length)];
  return template ? { route, ...template } : null;
}

function buildGalaxyRoverStoryContext(rawStory, nowMs = Date.now()) {
  const story = normalizeFrontierStory(rawStory, nowMs);
  const chapterTitles = {
    prologue: "꺼진 귀환등",
    reborn_star: "다시 숨 쉬는 별",
    lost_route: "잃어버린 항로",
    friend_signal: "친구의 신호",
    astra_memory: "아스트라 기억망",
  };
  const copyByStep = {
    launch_rover: { eyebrow: "프롤로그 4/4 · 첫 항로", title: "루미를 첫 장거리 항로로 출항시키세요", detail: "루미의 첫 귀환 기록이 아스트라 프론티어의 마지막 귀환등을 밝힙니다." },
    dispatch_route_rover: { eyebrow: "제2장 2/3 · 폭풍 너머로", title: "로버를 장거리 항로로 출항시키세요", detail: "폭풍 이전의 발견 기록을 되찾기 위해 루미를 보냅니다." },
    recover_pre_storm_discovery: { eyebrow: "제2장 3/3 · 되찾은 발견물", title: "귀환한 루미의 발견 기록을 복원하세요", detail: "새로운 발견이 도감에 기록되면 잃어버린 항로가 한 걸음 복원됩니다." },
  };
  const fallback = { eyebrow: "아스트라 프론티어 · 장거리 원정", title: "루미가 항로의 기억을 찾습니다", detail: "루미의 귀환은 행성의 건설 재료와 발견 기록으로 남습니다." };
  return {
    chapterId: story.chapterId,
    chapterTitle: chapterTitles[story.chapterId] || "아스트라 프론티어",
    stepId: story.stepId,
    ...(copyByStep[story.stepId] || fallback),
  };
}

function buildGalaxyRoverDeparture({ operationId, route, planet = {}, nowMs = Date.now(), reportFlowVersion = 1 }) {
  const routeConfig = GALAXY_ROVER_ROUTES[route];
  if (!routeConfig) return null;
  const layout = Array.isArray(planet.layout) ? planet.layout : [];
  const hasRoverBay = layout.some((item) => item?.itemId === "rover_bay");
  const hasExpeditionBeacon = layout.some((item) => item?.itemId === "expedition_beacon");
  const abilityLevel = Math.max(1, Math.floor(Number(planet.abilitySnapshot?.values?.[routeConfig.ability] || 1)));
  const abilityBonus = abilityLevel >= 4 ? 1 : 0;
  const beaconBonus = hasExpeditionBeacon ? 1 : 0;
  const durationMs = hasRoverBay ? GALAXY_ROVER_BAY_DURATION_MS : GALAXY_ROVER_DEFAULT_DURATION_MS;
  const startedAtMs = Math.max(0, Math.floor(Number(nowMs || 0)));
  const roverStats = normalizeGalaxyRoverStats(planet.roverStats);
  const discovery = getGalaxyRoverDiscovery({
    route,
    routeConfig,
    operationId,
    roverDiscoveries: planet.roverDiscoveries,
  });
  return {
    operationId,
    expeditionNo: roverStats.nextExpeditionNo,
    route,
    routeTitle: routeConfig.title,
    reportFlowVersion: Math.max(1, Math.min(GALAXY_ROVER_REPORT_FLOW_VERSION, Number(reportFlowVersion || 1))),
    status: "exploring",
    startedAtMs,
    readyAtMs: startedAtMs + durationMs,
    returnsAtMs: startedAtMs + durationMs,
    durationMs,
    reward: {
      material: routeConfig.material,
      amount: routeConfig.baseAmount + beaconBonus + abilityBonus,
      baseAmount: routeConfig.baseAmount,
      beaconBonus,
      abilityBonus,
      title: routeConfig.rewardTitle,
    },
    discovery,
    bonuses: {
      roverBay: hasRoverBay,
      expeditionBeacon: hasExpeditionBeacon,
      abilityId: routeConfig.ability,
      abilityLevel,
      ability: abilityBonus > 0,
    },
    storyContextAtLaunch: buildGalaxyRoverStoryContext(planet.frontierStory, startedAtMs),
  };
}

function planGalaxyRoverStart({ operationId, route, existingOperation = null, planet = {}, nowMs = Date.now(), reportFlowVersion = 1 }) {
  if (!GALAXY_ROVER_ROUTES[route]) return { kind: "invalid_route" };
  if (existingOperation) {
    if (
      existingOperation.type !== GALAXY_ROVER_OPERATION_TYPE
      || existingOperation.operationId !== operationId
      || existingOperation.route !== route
    ) {
      return { kind: "operation_conflict" };
    }
    return {
      kind: "deduplicated",
      expedition: getGalaxyRoverExpeditionView(existingOperation, nowMs),
    };
  }
  const activeExpedition = getGalaxyRoverExpeditionView(planet.roverExpedition, nowMs);
  const claimedReportBlocksStart = activeExpedition?.status === "claimed"
    && ENFORCE_ROVER_REPORT_ACKNOWLEDGEMENT
    && Number(activeExpedition.reportFlowVersion || 1) >= GALAXY_ROVER_REPORT_FLOW_VERSION;
  if (activeExpedition && (["exploring", "ready"].includes(activeExpedition.status) || claimedReportBlocksStart)) {
    return { kind: "active", expedition: activeExpedition };
  }
  return {
    kind: "startable",
    expedition: buildGalaxyRoverDeparture({ operationId, route, planet, nowMs, reportFlowVersion }),
  };
}

function planGalaxyRoverClaim({ operationId, operation = null, planet = {}, nowMs = Date.now() }) {
  if (!operation) return { kind: "not_found" };
  if (operation.type !== GALAXY_ROVER_OPERATION_TYPE || operation.operationId !== operationId) {
    return { kind: "operation_conflict" };
  }
  if (operation.status === "claimed") {
    return {
      kind: "deduplicated",
      claimResult: operation.claimResult || null,
      expedition: getGalaxyRoverExpeditionView(operation, nowMs),
    };
  }
  const expedition = planet.roverExpedition;
  if (!expedition || expedition.operationId !== operationId || !["exploring", "ready"].includes(expedition.status)) {
    return { kind: "inactive" };
  }
  const readyAtMs = Math.max(0, Number(operation.readyAtMs || expedition.readyAtMs || 0));
  if (Math.max(0, Number(nowMs || 0)) < readyAtMs) {
    return { kind: "not_ready", readyAtMs };
  }
  const routeConfig = GALAXY_ROVER_ROUTES[operation.route];
  const reward = operation.reward || {};
  const rewardAmount = Math.max(0, Math.floor(Number(reward.amount || 0)));
  if (
    !routeConfig
    || reward.material !== routeConfig.material
    || rewardAmount < routeConfig.baseAmount
    || rewardAmount > routeConfig.baseAmount + 2
  ) {
    return { kind: "invalid_reward" };
  }
  const materials = { ...(planet.materials || {}) };
  const balanceBefore = Math.max(0, Number(materials[reward.material] || 0));
  const balanceAfter = balanceBefore + rewardAmount;
  materials[reward.material] = balanceAfter;
  const existingDiscoveries = Array.isArray(planet.roverDiscoveries) ? planet.roverDiscoveries : [];
  const discovery = operation.discovery || expedition.discovery;
  if (!discovery?.id) return { kind: "invalid_discovery" };
  const isNewDiscovery = !existingDiscoveries.some((item) => item?.id === discovery.id);
  const observedAtMs = Math.max(0, Math.floor(Number(nowMs || 0)));
  const discoveryRecord = isNewDiscovery ? {
    ...discovery,
    firstOperationId: operationId,
    discoveredAtMs: observedAtMs,
    lastObservedAtMs: observedAtMs,
    lastOperationId: operationId,
    observationCount: 1,
  } : {
    ...(existingDiscoveries.find((item) => item?.id === discovery.id) || discovery),
    lastObservedAtMs: observedAtMs,
    lastOperationId: operationId,
    observationCount: Math.max(1, Number(existingDiscoveries.find((item) => item?.id === discovery.id)?.observationCount || 1)) + 1,
  };
  const roverDiscoveries = isNewDiscovery
    ? [...existingDiscoveries, discoveryRecord]
    : existingDiscoveries.map((item) => item?.id === discovery.id ? discoveryRecord : item);
  const claimedAtMs = observedAtMs;
  const claimResult = {
    operationId,
    route: operation.route,
    reward: { ...reward, amount: rewardAmount, balanceBefore, balanceAfter },
    discovery,
    isNewDiscovery,
    claimedAtMs,
    materials,
    routeDiscoveryCount: roverDiscoveries.filter((item) => item?.route === operation.route).length,
    totalDiscoveryCount: roverDiscoveries.length,
  };
  const claimedExpedition = {
    ...expedition,
    status: "claimed",
    claimedAtMs,
    result: claimResult,
  };
  return {
    kind: "claimable",
    claimResult,
    expedition: claimedExpedition,
    materials,
    roverDiscoveries,
  };
}

function planGalaxyRoverReportAcknowledgement({ operationId, operation = null, planet = {} } = {}) {
  if (!operation) return { kind: "not_found" };
  if (operation.type !== GALAXY_ROVER_OPERATION_TYPE || operation.operationId !== operationId) return { kind: "operation_conflict" };
  if (operation.reportAcknowledgedAtMs) return { kind: "deduplicated" };
  const expedition = planet.roverExpedition;
  const isOpClaimed = operation.status === "claimed" || Boolean(operation.claimResult) || Boolean(operation.claimedAtMs);
  const isExpeditionClaimed = Boolean(expedition) && (expedition.status === "claimed" || Boolean(expedition.claimedAtMs) || Boolean(expedition.result?.claimedAtMs) || Boolean(expedition.result));
  if (!isOpClaimed && !isExpeditionClaimed) return { kind: "not_claimed" };
  if (expedition && expedition.operationId !== operationId) return { kind: "stale_operation" };
  return { kind: "acknowledgeable" };
}

function buildGalaxyRoverPublicCatalog() {
  return Object.fromEntries(Object.entries(GALAXY_ROVER_ROUTES).map(([routeId, route]) => [routeId, {
    id: routeId,
    title: route.title,
    shortLabel: route.shortLabel,
    copy: route.copy,
    material: route.material,
    rewardTitle: route.rewardTitle,
    baseAmount: route.baseAmount,
    ability: route.ability,
  }]));
}

function buildGalaxyRoverStatsAfterLaunch(rawStats, expedition) {
  const stats = normalizeGalaxyRoverStats(rawStats);
  const routeLaunchCounts = { ...stats.routeLaunchCounts };
  routeLaunchCounts[expedition.route] = Math.max(0, Number(routeLaunchCounts[expedition.route] || 0)) + 1;
  return {
    ...stats,
    totalLaunched: stats.totalLaunched + 1,
    nextExpeditionNo: Math.max(stats.nextExpeditionNo + 1, Number(expedition.expeditionNo || 0) + 1),
    routeLaunchCounts,
    lastOperationId: expedition.operationId,
  };
}

function buildGalaxyRoverStatsAfterClaim(rawStats, claimResult) {
  const stats = normalizeGalaxyRoverStats(rawStats);
  return {
    ...stats,
    totalClaimed: stats.totalClaimed + 1,
    uniqueDiscoveryCount: Math.max(stats.uniqueDiscoveryCount, Number(claimResult.totalDiscoveryCount || 0)),
    lastClaimedOperationId: claimResult.operationId,
  };
}

function buildGalaxyRoverStatsAfterAcknowledgement(rawStats, operationId) {
  return { ...normalizeGalaxyRoverStats(rawStats), lastAcknowledgedOperationId: operationId };
}

/**
 * 운영 지표 이벤트 페이로드 빌더. 트랜잭션 안에서 같은 문서 id로 set({merge:true})하므로 재시도에도 중복되지 않는다.
 * 각 빌더는 전환 분석에 필요한 값만 남긴 경량 로그이며, operation/planet 원본과는 별개다.
 */
function buildGalaxyRoverEventPayload(type, { operationId, route, expeditionNo, reportFlowVersion, nowMs, isNewDiscovery, rarity, elapsedMs }) {
  const payload = {
    type,
    operationId: operationId || "",
    route: route || "",
    expeditionNo: Number(expeditionNo || 0) || null,
    reportFlowVersion: Number(reportFlowVersion || 1) || 1,
    serverNowMs: Number(nowMs || Date.now()) || 0,
  };
  if (typeof isNewDiscovery === "boolean") payload.isNewDiscovery = isNewDiscovery;
  if (rarity) payload.rarity = rarity;
  if (Number.isFinite(Number(elapsedMs)) && Number(elapsedMs) >= 0) payload.elapsedMs = Math.floor(Number(elapsedMs));
  return payload;
}

function getGalaxyRoverDiscoveryRoutes(discoveries = []) {
  return [...new Set((Array.isArray(discoveries) ? discoveries : []).map((entry) => entry?.route).filter(Boolean))];
}

function buildGalaxyRoverStoryProgressAtClaim(beforeStory, storyProgress) {
  const before = normalizeFrontierStory(beforeStory);
  const after = normalizeFrontierStory(storyProgress?.story || before);
  return {
    beforeChapterId: before.chapterId,
    beforeStepId: before.stepId,
    afterChapterId: after.chapterId,
    afterStepId: after.stepId,
    advancedStepIds: Array.isArray(storyProgress?.advancedStepIds) ? storyProgress.advancedStepIds : [],
    restorationBefore: before.restorationPercent,
    restorationAfter: after.restorationPercent,
  };
}

function getGalaxyRelationshipId(firstUid, secondUid) {
  return [cleanId(firstUid), cleanId(secondUid)].sort().join("__");
}

function getGalaxyRelationshipProgress(connectionXp = 0) {
  const safeXp = Math.max(0, Math.floor(Number(connectionXp) || 0));
  let routeLevel = 1;
  GALAXY_RELATIONSHIP_LEVEL_THRESHOLDS.forEach((threshold, index) => {
    if (safeXp >= threshold) routeLevel = index + 1;
  });
  const nextThresholdIndex = Math.min(routeLevel, GALAXY_RELATIONSHIP_LEVEL_THRESHOLDS.length - 1);
  return {
    connectionXp: safeXp,
    routeLevel,
    nextLevelXp: GALAXY_RELATIONSHIP_LEVEL_THRESHOLDS[nextThresholdIndex],
  };
}

function parseGalaxyVisitPosition(value) {
  if (value == null) return { provided: false, value: null };
  let x;
  let z;
  if (Array.isArray(value)) {
    if (value.length !== 3) return { provided: true, value: null };
    [x, , z] = value;
  } else if (typeof value === "object") {
    x = value.x;
    z = value.z;
  } else {
    return { provided: true, value: null };
  }
  if (typeof x !== "number" || !Number.isFinite(x) || typeof z !== "number" || !Number.isFinite(z)) {
    return { provided: true, value: null };
  }
  return {
    provided: true,
    value: {
      x: Math.round(clamp(x, -16, 16) * 100) / 100,
      z: Math.round(clamp(z, -16, 16) * 100) / 100,
    },
  };
}

function getCrewMemberIds(crew = {}) {
  return uniqueIds([...(Array.isArray(crew.memberIds) ? crew.memberIds : []), crew.leaderId]);
}

function getPublicName(user = {}) {
  return cleanText(user.publicDisplayName || user.studentName || user.name || user.displayName || "탐사원", 40) || "탐사원";
}

function getKstDayKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function getKstDayWindow(nowMs = Date.now()) {
  const numericNowMs = nowMs instanceof Date ? nowMs.getTime() : Number(nowMs);
  const safeNowMs = Number.isFinite(numericNowMs) ? Math.floor(numericNowMs) : Date.now();
  const dayKey = getKstDayKey(new Date(safeNowMs));
  const [year, month, day] = dayKey.split("-").map(Number);
  return {
    dayKey,
    expiresAtMs: Date.UTC(year, month - 1, day + 1) - 9 * 60 * 60 * 1000,
  };
}

function getKstDateOrdinal(dayKey) {
  const [year, month, day] = String(dayKey || "").split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / (24 * 60 * 60 * 1000));
}

function updateFrontierAnalyticsOnOpen(raw = {}, nowMs = Date.now()) {
  const current = raw && typeof raw === "object" ? raw : {};
  const dayKey = getKstDayKey(new Date(nowMs));
  const firstDayKey = /^\d{4}-\d{2}-\d{2}$/.test(current.firstDayKey || "") ? current.firstDayKey : dayKey;
  const dayOffset = Math.max(0, getKstDateOrdinal(dayKey) - getKstDateOrdinal(firstDayKey));
  const distinctDayKeys = uniqueIds([...(Array.isArray(current.distinctDayKeys) ? current.distinctDayKeys : []), dayKey]).slice(-32);
  return {
    ...current,
    firstEnteredAtMs: Math.max(0, Number(current.firstEnteredAtMs || nowMs)),
    firstDayKey,
    lastEnteredAtMs: nowMs,
    lastDayKey: dayKey,
    entryCount: Math.max(0, Math.floor(Number(current.entryCount || 0))) + 1,
    distinctDayKeys,
    ...(dayOffset >= 1 && !current.d1ReturnedAtMs ? { d1ReturnedAtMs: nowMs } : {}),
    ...(dayOffset >= 7 && !current.d7ReturnedAtMs ? { d7ReturnedAtMs: nowMs } : {}),
  };
}

function updateFrontierAnalyticsFirstBuild(raw = {}, nowMs = Date.now()) {
  const current = raw && typeof raw === "object" ? raw : {};
  if (Number(current.firstBuildAtMs || 0) > 0) return current;
  const firstEnteredAtMs = Math.max(0, Number(current.firstEnteredAtMs || nowMs));
  return {
    ...current,
    firstEnteredAtMs,
    firstBuildAtMs: nowMs,
    firstBuildElapsedMs: Math.max(0, nowMs - firstEnteredAtMs),
  };
}

function updateFrontierAnalyticsPrologue(raw = {}, story = {}, nowMs = Date.now()) {
  const current = raw && typeof raw === "object" ? raw : {};
  if (!story?.completedChapterIds?.includes("prologue") || Number(current.prologueCompletedAtMs || 0) > 0) return current;
  const firstEnteredAtMs = Math.max(0, Number(current.firstEnteredAtMs || nowMs));
  return {
    ...current,
    firstEnteredAtMs,
    prologueCompletedAtMs: nowMs,
    prologueElapsedMs: Math.max(0, nowMs - firstEnteredAtMs),
  };
}

function buildGalaxyDailyEvent({ uid, nowMs = Date.now() } = {}) {
  const { dayKey, expiresAtMs } = getKstDayWindow(nowMs);
  const event = GALAXY_DAILY_EVENT_CATALOG[
    (stableGalaxyHash(String(uid || "")) + getKstDateOrdinal(dayKey))
      % GALAXY_DAILY_EVENT_CATALOG.length
  ];
  return {
    version: GALAXY_DAILY_EVENT_VERSION,
    dayKey,
    eventId: `daily_${dayKey}_${event.type}`,
    type: event.type,
    nodeId: event.nodeId,
    title: event.title,
    detail: event.detail,
    reward: { ...event.reward },
    status: "pending",
    expiresAtMs,
  };
}

function getGalaxyDailyEventDefinition(type) {
  return GALAXY_DAILY_EVENT_CATALOG.find((event) => event.type === type) || null;
}

function isGalaxyDailyEventOperation(operation, uid, event) {
  if (!operation || typeof operation !== "object" || !event) return false;
  const definition = getGalaxyDailyEventDefinition(event.type);
  const completedAtMs = Number(operation.completedAtMs);
  return Boolean(
    definition
    && operation.type === GALAXY_DAILY_EVENT_OPERATION_TYPE
    && operation.version === GALAXY_DAILY_EVENT_VERSION
    && operation.uid === uid
    && operation.dayKey === event.dayKey
    && operation.eventId === event.eventId
    && operation.eventType === event.type
    && operation.nodeId === event.nodeId
    && operation.reward?.material === event.reward.material
    && Number(operation.reward?.amount) === event.reward.amount
    && operation.reward?.title === event.reward.title
    && operation.stat?.id === definition.stat
    && Number(operation.stat?.amount) === definition.statAmount
    && operation.status === "completed"
    && Number.isSafeInteger(completedAtMs)
    && completedAtMs >= 0
  );
}

function getGalaxyDailyEventView({ uid, event, operation = null }) {
  const view = {
    version: event.version,
    dayKey: event.dayKey,
    eventId: event.eventId,
    type: event.type,
    nodeId: event.nodeId,
    title: event.title,
    detail: event.detail,
    reward: { ...event.reward },
    status: "pending",
    expiresAtMs: event.expiresAtMs,
  };
  if (!isGalaxyDailyEventOperation(operation, uid, event)) return view;
  return {
    ...view,
    status: "completed",
    completedAtMs: Number(operation.completedAtMs),
  };
}

function planGalaxyDailyEventCompletion({
  uid,
  dayKey,
  eventId,
  operation = null,
  planet = {},
  nowMs = Date.now(),
} = {}) {
  const event = buildGalaxyDailyEvent({ uid, nowMs });
  if (dayKey !== event.dayKey) return { kind: "stale", dailyEvent: event };
  if (eventId !== event.eventId) return { kind: "forged", dailyEvent: event };

  const materials = { ...(planet.materials || {}) };
  const stats = { ...(planet.stats || {}) };
  if (operation) {
    if (!isGalaxyDailyEventOperation(operation, uid, event)) {
      return { kind: "operation_conflict", dailyEvent: event };
    }
    return {
      kind: "deduplicated",
      dailyEvent: getGalaxyDailyEventView({ uid, event, operation }),
      materials,
      stats,
    };
  }

  const definition = getGalaxyDailyEventDefinition(event.type);
  if (!definition) return { kind: "invalid_event", dailyEvent: event };
  const currentMaterial = Number(materials[event.reward.material]);
  materials[event.reward.material] = (Number.isFinite(currentMaterial) ? Math.max(0, currentMaterial) : 0)
    + event.reward.amount;
  stats[definition.stat] = clamp(Number(stats[definition.stat] || 0) + definition.statAmount, 0, 100);
  const numericNowMs = nowMs instanceof Date ? nowMs.getTime() : Number(nowMs);
  const completedAtMs = Number.isFinite(numericNowMs) ? Math.max(0, Math.floor(numericNowMs)) : Date.now();
  const completedOperation = {
    version: GALAXY_DAILY_EVENT_VERSION,
    uid,
    type: GALAXY_DAILY_EVENT_OPERATION_TYPE,
    dayKey: event.dayKey,
    eventId: event.eventId,
    eventType: event.type,
    nodeId: event.nodeId,
    reward: { ...event.reward },
    stat: { id: definition.stat, amount: definition.statAmount },
    status: "completed",
    expiresAtMs: event.expiresAtMs,
    completedAtMs,
  };
  return {
    kind: "completable",
    dailyEvent: getGalaxyDailyEventView({ uid, event, operation: completedOperation }),
    materials,
    stats,
    operation: completedOperation,
  };
}

function syncFrontierStoryWithCompletedDailyEvent({
  rawStory,
  uid,
  event,
  operation,
  nowMs = Date.now(),
} = {}) {
  const story = normalizeFrontierStory(rawStory, nowMs);
  if (!isGalaxyDailyEventOperation(operation, uid, event)) {
    return { story, advanced: false, advancedStepIds: [] };
  }
  return advanceFrontierStory(story, {
    type: "daily_event_completed",
    nodeId: event.nodeId,
  }, nowMs);
}

function calculateWilsonLowerBound(successes, total, z = 1) {
  const n = Math.max(0, Math.floor(Number(total) || 0));
  if (!n) return 0;
  const s = Math.min(n, Math.max(0, Math.floor(Number(successes) || 0)));
  const phat = s / n;
  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const center = phat + z2 / (2 * n);
  const margin = z * Math.sqrt((phat * (1 - phat) + z2 / (4 * n)) / n);
  return clamp((center - margin) / denominator, 0, 1);
}

function toAbilityLevel(score, thresholds) {
  let level = 1;
  thresholds.forEach((threshold, index) => {
    if (score >= threshold) level = index + 2;
  });
  return clamp(level, 1, 5);
}

function buildAbilitySnapshot(user = {}, lifetimeLearningOre = 0) {
  const avgScore = clamp(user.averageScore, 0, 100);
  const perfectCount = Math.max(0, Number(user.perfectCount || 0));
  const streak = Math.max(0, Number(user.currentStreak || 0));
  const weeklyGrowth = Math.max(0, Number(user.weeklyGrowth || 0));
  const helpCount = Math.max(0, Number(user.helpCount || 0));
  const questionCount = Math.max(0, Number(user.questionCount || 0));
  const focusHits = Math.max(0, Number(user.videoAttentionHits || user.attentionHits || user.focusHits || 0));
  const focusMisses = Math.max(0, Number(user.videoAttentionMisses || user.attentionMisses || user.focusMisses || 0));
  const focusOpportunities = Math.max(focusHits + focusMisses, Number(user.videoAttentionOpportunities || user.attentionOpportunities || user.focusOpportunities || 0));
  const battleMatches = Math.max(0, Number(user.totalBattleMatches || 0));
  const battleRating = Math.max(0, Number(user.battleRating || 0));
  const battleTraining = Math.max(0, Number(user.aiBattleCompletedMatches || 0));

  const values = {
    detection: toAbilityLevel(avgScore * 5 + perfectCount * 10, [180, 350, 550, 800]),
    endurance: toAbilityLevel(streak, [3, 7, 14, 30]),
    precision: toAbilityLevel(calculateWilsonLowerBound(focusHits, focusOpportunities) * 600, [80, 180, 320, 480]),
    pioneering: toAbilityLevel(weeklyGrowth, [50, 150, 350, 700]),
    communication: toAbilityLevel(helpCount * 20 + questionCount * 5, [40, 120, 280, 600]),
    piloting: toAbilityLevel(Math.max(0, battleRating - 900) + battleMatches * 15 + battleTraining * 5, [100, 300, 650, 1100]),
    construction: toAbilityLevel(lifetimeLearningOre, [100, 300, 800, 1800]),
  };
  return { version: 1, values };
}

function getShipHullTier(lifetimeLearningOre = 0) {
  const thresholds = [0, 100, 250, 500, 1000, 2000, 5000];
  let tier = 1;
  thresholds.forEach((threshold, index) => {
    if (lifetimeLearningOre >= threshold) tier = index + 1;
  });
  return tier;
}

function buildStarterPlanet(uid, user, learningState, now) {
  const nowMs = Date.now();
  return {
    ownerId: uid,
    ownerName: getPublicName(user),
    schemaVersion: 1,
    planetName: `${getPublicName(user)}의 작은 별`,
    tagline: "천천히, 하지만 분명하게 자라는 행성",
    theme: "forest",
    playStyles: ["decorate", "explore"],
    visitMode: "crew",
    layout: [
      { instanceId: "starter_dome", itemId: "starter_dome", icon: "⬡", iconId: "house", name: "개척자 돔", description: getGalaxyItemDefaultDescription("starter_dome"), imagePath: "", imageUrl: "", x: 48, y: 48, rotation: 0, locked: true },
      { instanceId: "starter_tree", itemId: "lumen_tree", icon: "♧", iconId: "tree-pine", name: "첫 루멘 나무", description: getGalaxyItemDefaultDescription("lumen_tree"), imagePath: "", imageUrl: "", x: 25, y: 58, rotation: 0, locked: true },
      { instanceId: "starter_lamp", itemId: "star_lamp", icon: "✦", iconId: "sparkles", name: "귀환등", description: getGalaxyItemDefaultDescription("star_lamp"), imagePath: "", imageUrl: "", x: 70, y: 62, rotation: 0, locked: true },
    ],
    materials: { stardust: 8, biofiber: 4, crystalGlass: 2, alloy: 1 },
    stats: { gardenVitality: 60, facilityHealth: 70, creatureHappiness: 55, admirationCount: 0, visits: 0 },
    lifetimeLearningOre: learningState.lifetimeLearningOre,
    shipHullTier: learningState.shipHullTier,
    abilitySnapshot: learningState.abilitySnapshot,
    frontierStory: createInitialFrontierStory(nowMs),
    lastMissionAtMs: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function isEligibleLearningOreTransaction(data = {}) {
  const amount = Number(data.amount || 0);
  const type = cleanId(data.type, 80);
  if (
    !Number.isSafeInteger(amount)
    || amount <= 0
    || amount > GALAXY_LEARNING_MAX_ORE_PER_TRANSACTION
    || LEARNING_ORE_EXCLUDED_TYPES.has(type)
  ) return false;
  if (type.includes("gift") || type.includes("refund") || type.includes("crew_")) return false;
  return true;
}

function isGalaxyLearningBackfillTarget(user = {}) {
  const role = cleanId(user.role, 40).toLowerCase();
  return !GALAXY_LEARNING_ADMIN_BLOCKED_ROLES.has(role)
    && user.isGuest !== true
    && user.isDeleted !== true
    && user.accountStatus !== "deleted";
}

function getGalaxyLearningLedgerStatus(user = {}) {
  const complete = Number(user.galaxyLearningLedgerVersion || 0) >= GALAXY_LEARNING_LEDGER_VERSION
    && user.galaxyLearningLedgerComplete === true;
  if (complete) return "complete";
  if (
    cleanId(user.galaxyLearningBackfillCursor, 180)
    || Number(user.galaxyLearningLedgerVersion || 0) > 0
    || user.galaxyLearningLedgerSyncedAt
  ) return "in_progress";
  return "not_started";
}

function normalizeGalaxyLearningBackfillCounters(counters = {}) {
  return {
    usersVisited: Math.max(0, Number(counters.usersVisited || 0)),
    usersCompleted: Math.max(0, Number(counters.usersCompleted || 0)),
    usersAlreadyComplete: Math.max(0, Number(counters.usersAlreadyComplete || 0)),
    usersSkipped: Math.max(0, Number(counters.usersSkipped || 0)),
    pagesProcessed: Math.max(0, Number(counters.pagesProcessed || 0)),
    ledgerDocsScanned: Math.max(0, Number(counters.ledgerDocsScanned || 0)),
    eligibleEventsScanned: Math.max(0, Number(counters.eligibleEventsScanned || 0)),
    eventsCredited: Math.max(0, Number(counters.eventsCredited || 0)),
    oreCredited: Math.max(0, Number(counters.oreCredited || 0)),
    errors: Math.max(0, Number(counters.errors || 0)),
  };
}

async function calculateLifetimeLearningOre(db, admin, userRef, user = {}) {
  const currentTotal = Math.max(0, Number(user.galaxyLearningOreV2Total || 0));
  const isComplete = Number(user.galaxyLearningLedgerVersion || 0) >= GALAXY_LEARNING_LEDGER_VERSION
    && user.galaxyLearningLedgerComplete === true;
  if (isComplete) {
    return { total: currentTotal, complete: true, scanned: 0, eligible: 0, creditedEvents: 0, credited: 0 };
  }

  let ledgerQuery = userRef.collection("crystal_transactions")
    .orderBy(admin.firestore.FieldPath.documentId())
    .limit(GALAXY_LEARNING_BACKFILL_LIMIT);
  const cursor = getExactDocumentId(user.galaxyLearningBackfillCursor);
  if (cursor) ledgerQuery = ledgerQuery.startAfter(cursor);
  const ledgerSnap = await ledgerQuery.get();

  if (ledgerSnap.empty) {
    return db.runTransaction(async (transaction) => {
      const freshUserSnap = await transaction.get(userRef);
      const freshUser = freshUserSnap.data() || {};
      if (!freshUserSnap.exists || freshUser.isDeleted === true || freshUser.accountStatus === "deleted") {
        return { total: 0, complete: false, missing: true, scanned: 0, eligible: 0, creditedEvents: 0, credited: 0 };
      }
      const freshTotal = Math.max(0, Number(freshUser.galaxyLearningOreV2Total || currentTotal));
      const freshComplete = Number(freshUser.galaxyLearningLedgerVersion || 0) >= GALAXY_LEARNING_LEDGER_VERSION
        && freshUser.galaxyLearningLedgerComplete === true;
      if (freshComplete) {
        return { total: freshTotal, complete: true, scanned: 0, eligible: 0, creditedEvents: 0, credited: 0 };
      }
      if (getExactDocumentId(freshUser.galaxyLearningBackfillCursor) !== cursor) {
        return { total: freshTotal, complete: false, stale: true, scanned: 0, eligible: 0, creditedEvents: 0, credited: 0 };
      }
      transaction.set(userRef, {
        galaxyLearningLedgerVersion: GALAXY_LEARNING_LEDGER_VERSION,
        galaxyLearningLedgerComplete: true,
        galaxyLearningOreV2Total: freshTotal,
        lifetimeLearningCrystalsEarned: freshTotal,
        galaxyLearningLedgerSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      return { total: freshTotal, complete: true, scanned: 0, eligible: 0, creditedEvents: 0, credited: 0 };
    });
  }

  const eligibleRows = ledgerSnap.docs
    .map((snap) => ({ id: snap.id, row: snap.data() || {} }))
    .filter(({ row }) => isEligibleLearningOreTransaction(row));
  const markerRefs = eligibleRows.map(({ id }) => userRef.collection("galaxyLearningOreEvents").doc(id));
  const nextCursor = ledgerSnap.docs[ledgerSnap.docs.length - 1].id;
  const pageComplete = ledgerSnap.size < GALAXY_LEARNING_BACKFILL_LIMIT;

  return db.runTransaction(async (transaction) => {
    const freshUserSnap = await transaction.get(userRef);
    const freshUser = freshUserSnap.data() || {};
    if (!freshUserSnap.exists || freshUser.isDeleted === true || freshUser.accountStatus === "deleted") {
      return { total: 0, complete: false, missing: true, scanned: 0, eligible: 0, creditedEvents: 0, credited: 0 };
    }
    const baseTotal = Math.max(0, Number(freshUser.galaxyLearningOreV2Total || 0));
    const freshComplete = Number(freshUser.galaxyLearningLedgerVersion || 0) >= GALAXY_LEARNING_LEDGER_VERSION
      && freshUser.galaxyLearningLedgerComplete === true;
    if (freshComplete) {
      return { total: baseTotal, complete: true, scanned: 0, eligible: 0, creditedEvents: 0, credited: 0 };
    }
    if (getExactDocumentId(freshUser.galaxyLearningBackfillCursor) !== cursor) {
      return {
        total: baseTotal,
        complete: false,
        stale: true,
        scanned: ledgerSnap.size,
        eligible: eligibleRows.length,
        creditedEvents: 0,
        credited: 0,
      };
    }
    const markerSnaps = await Promise.all(markerRefs.map((ref) => transaction.get(ref)));
    let delta = 0;
    let creditedEvents = 0;
    eligibleRows.forEach(({ id, row }, index) => {
      if (markerSnaps[index]?.exists) return;
      const amount = Math.max(0, Math.floor(Number(row.amount || 0)));
      if (!amount) return;
      delta += amount;
      creditedEvents += 1;
      transaction.set(markerRefs[index], {
        transactionId: id,
        amount,
        type: cleanId(row.type, 80),
        source: "backfill",
        recordedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    const total = baseTotal + delta;
    transaction.set(userRef, {
      galaxyLearningLedgerVersion: GALAXY_LEARNING_LEDGER_VERSION,
      galaxyLearningLedgerComplete: pageComplete,
      galaxyLearningBackfillCursor: nextCursor,
      galaxyLearningOreV2Total: total,
      lifetimeLearningCrystalsEarned: total,
      galaxyLearningLedgerSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return {
      total,
      complete: pageComplete,
      scanned: ledgerSnap.size,
      eligible: eligibleRows.length,
      creditedEvents,
      credited: delta,
    };
  });
}

function serializeValue(value) {
  if (value == null) return value;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serializeValue);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, serializeValue(nested)]));
  }
  return value;
}

function getAstraBuilderGridByteLength(plot) {
  return plot.dimensions.x * plot.dimensions.y * plot.dimensions.z * 2;
}

function normalizeAstraBuilderBase64(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > ASTRA_BUILDER_MAX_STATE_BYTES * 2) {
    return null;
  }
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) return null;
  const buffer = Buffer.from(value, "base64");
  const canonical = buffer.toString("base64").replace(/=+$/, "");
  if (canonical !== value.replace(/=+$/, "")) return null;
  return buffer;
}

function validateAstraBuilderStatePayload({
  plotId,
  encoding,
  gridDataBase64,
  modules,
  blockCount,
} = {}) {
  const plot = ASTRA_BUILDER_PLOTS[plotId];
  if (!plot) return { kind: "invalid_plot" };
  if (encoding !== ASTRA_BUILDER_STATE_ENCODING) return { kind: "invalid_encoding" };
  const gridBuffer = normalizeAstraBuilderBase64(gridDataBase64);
  if (!gridBuffer) return { kind: "invalid_base64" };
  if (
    gridBuffer.length !== getAstraBuilderGridByteLength(plot)
    || gridBuffer.length > ASTRA_BUILDER_MAX_STATE_BYTES
  ) {
    return {
      kind: "invalid_byte_length",
      expectedByteLength: getAstraBuilderGridByteLength(plot),
      actualByteLength: gridBuffer.length,
    };
  }
  if (!Array.isArray(modules) || modules.length !== 0) return { kind: "unsupported_modules" };

  let actualBlockCount = 0;
  for (let offset = 0; offset < gridBuffer.length; offset += 2) {
    const cellValue = gridBuffer.readUInt16LE(offset);
    if ((cellValue & ~ASTRA_BUILDER_ALLOWED_CELL_MASK) !== 0) {
      return { kind: "invalid_cell_bits", cellIndex: offset / 2 };
    }
    const blockType = cellValue & 0xff;
    if (blockType === 0) {
      if (cellValue !== 0) return { kind: "invalid_empty_cell", cellIndex: offset / 2 };
      continue;
    }
    if (!ASTRA_BUILDER_ALLOWED_BLOCK_TYPES.has(blockType)) {
      return { kind: "invalid_block_type", cellIndex: offset / 2, blockType };
    }
    actualBlockCount += 1;
    if (actualBlockCount > plot.maxBlocks) {
      return { kind: "too_many_blocks", blockCount: actualBlockCount, maxBlocks: plot.maxBlocks };
    }
  }

  if (
    blockCount !== undefined
    && (!Number.isInteger(blockCount) || blockCount !== actualBlockCount)
  ) {
    return { kind: "block_count_mismatch", blockCount: actualBlockCount };
  }

  return {
    kind: "valid",
    plot,
    gridBuffer,
    blockCount: actualBlockCount,
    modules: [],
  };
}

function getAstraBuilderStoredGridBuffer(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value?.toUint8Array === "function") return Buffer.from(value.toUint8Array());
  return null;
}

function buildAstraBuilderPlotView(plotData = {}, fallbackPlot = null) {
  const definition = fallbackPlot || ASTRA_BUILDER_PLOTS[plotData.plotId];
  return {
    schemaVersion: Number(plotData.schemaVersion || definition?.schemaVersion || 1),
    plotId: String(plotData.plotId || definition?.plotId || ""),
    ownerId: String(plotData.ownerId || ""),
    name: String(plotData.name || definition?.name || ""),
    zoneId: String(plotData.zoneId || definition?.zoneId || ""),
    origin: plotData.origin || definition?.origin || { x: 0, y: 0, z: 0 },
    rotation: Number(plotData.rotation || definition?.rotation || 0),
    dimensions: plotData.dimensions || definition?.dimensions || { x: 0, y: 0, z: 0 },
    cellSize: Number(plotData.cellSize || definition?.cellSize || 0),
    maxBlocks: Number(plotData.maxBlocks || definition?.maxBlocks || 0),
    blockCount: Math.max(0, Number(plotData.blockCount || 0)),
    moduleCount: Math.max(0, Number(plotData.moduleCount || 0)),
    currentRevision: Math.max(0, Number(plotData.currentRevision || 0)),
    publishedRevision: Math.max(0, Number(plotData.publishedRevision || 0)),
    permissions: plotData.permissions || { view: "private", build: "owner" },
    unlockedSetIds: Array.isArray(plotData.unlockedSetIds)
      ? plotData.unlockedSetIds
      : [...(definition?.unlockedSetIds || [])],
    thumbnailPath: String(plotData.thumbnailPath || ""),
    lastEditorId: String(plotData.lastEditorId || ""),
  };
}

module.exports = function registerGalaxyGame({ functions, admin, regionalFunctions, galaxyPlayTime = null }) {
  const db = admin.firestore();
  const FieldValue = admin.firestore.FieldValue;
  const galaxyLearningAdminFunctions = regionalFunctions.runWith({
    timeoutSeconds: 300,
    memory: "512MB",
    maxInstances: 1,
  });
  const galaxyLearningAdminJobRef = db.collection("adminGalaxyLearningBackfillJobs")
    .doc(GALAXY_LEARNING_ADMIN_JOB_ID);

  async function requireActiveGalaxyPlay(uid, data, options = {}) {
    if (!galaxyPlayTime?.assertActiveGalaxySession) {
      throw new functions.https.HttpsError("failed-precondition", "게임 이용시간 확인 서비스를 사용할 수 없습니다.");
    }
    const userSnap = await db.collection("users").doc(uid).get();
    const user = userSnap.data() || {};
    if (userSnap.exists && (user.role === "admin" || user.email === "paul@dulcine.net")) {
      const nowMs = Date.now();
      return {
        sessionId: cleanId(data?.playSessionId, 400) || "admin-unlimited-session",
        hardEndsAtMs: nowMs + (24 * 60 * 60 * 1000),
        leaseExpiresAtMs: nowMs + (24 * 60 * 60 * 1000),
        remainingSeconds: 86400,
        isAdmin: true,
      };
    }
    return galaxyPlayTime.assertActiveGalaxySession({
      uid,
      data,
      minRemainingSeconds: options.minRemainingSeconds || 0,
    });
  }

  function requireValidGalaxyItemPlacement(plan) {
    if (plan?.kind === "valid") return plan;
    if (plan?.kind === "overlap") {
      throw new functions.https.HttpsError("failed-precondition", "다른 시설과 겹치지 않는 위치를 선택해주세요.");
    }
    if (plan?.kind === "reserved") {
      throw new functions.https.HttpsError("failed-precondition", "탐사 지점과 겹치지 않는 위치를 선택해주세요.");
    }
    if (plan?.kind === "outside_bounds" || plan?.kind === "outside_radius") {
      throw new functions.https.HttpsError("invalid-argument", "행성 건설 구역 밖에는 시설을 놓을 수 없습니다.");
    }
    throw new functions.https.HttpsError("invalid-argument", "시설 좌표가 올바르지 않습니다.");
  }

  async function deleteGalaxyObjectImageBestEffort(uid, instanceId, imagePath) {
    if (!isGalaxyObjectImagePath(uid, instanceId, imagePath)) return false;
    try {
      await admin.storage().bucket().file(imagePath).delete({ ignoreNotFound: true });
      return true;
    } catch (error) {
      console.warn("Failed to delete galaxy object image", {
        uid,
        instanceId,
        imagePath,
        message: cleanText(error?.message || "storage delete failed", 200),
      });
      return false;
    }
  }

  const rollupGalaxyLearningOre = regionalFunctions.firestore
    .document("users/{uid}/crystal_transactions/{transactionId}")
    .onCreate(async (snapshot, context) => {
      const row = snapshot.data() || {};
      if (!isEligibleLearningOreTransaction(row)) return null;
      const uid = getExactDocumentId(context.params.uid);
      const transactionId = getExactDocumentId(context.params.transactionId);
      const amount = Math.max(0, Math.floor(Number(row.amount || 0)));
      if (!uid || !transactionId || !amount) return null;
      const userRef = db.collection("users").doc(uid);
      const markerRef = userRef.collection("galaxyLearningOreEvents").doc(transactionId);
      return db.runTransaction(async (transaction) => {
        const [markerSnap, userSnap] = await Promise.all([
          transaction.get(markerRef),
          transaction.get(userRef),
        ]);
        if (
          markerSnap.exists
          || !userSnap.exists
          || userSnap.data()?.isDeleted === true
          || userSnap.data()?.accountStatus === "deleted"
        ) return;
        const user = userSnap.data() || {};
        const total = Math.max(0, Number(user.galaxyLearningOreV2Total || 0)) + amount;
        transaction.set(userRef, {
          galaxyLearningLedgerVersion: GALAXY_LEARNING_LEDGER_VERSION,
          galaxyLearningOreV2Total: total,
          lifetimeLearningCrystalsEarned: total,
          galaxyLearningLedgerSyncedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        transaction.set(markerRef, {
          transactionId,
          amount,
          type: cleanId(row.type, 80),
          source: "trigger",
          recordedAt: FieldValue.serverTimestamp(),
        });
      });
    });

  function requireUid(context) {
    if (!context.auth?.uid) throw new functions.https.HttpsError("unauthenticated", "로그인이 필요합니다.");
    return context.auth.uid;
  }

  async function requireAdminUid(context) {
    const uid = requireUid(context);
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists || userSnap.data()?.role !== "admin") {
      throw new functions.https.HttpsError("permission-denied", "관리자 권한이 없습니다.");
    }
    return uid;
  }

  async function requireMember(uid) {
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists || userSnap.data()?.isGuest === true || userSnap.data()?.isDeleted === true) {
      throw new functions.https.HttpsError("failed-precondition", "정식 학생 계정에서만 은하 게임을 이용할 수 있습니다.");
    }
    return { userRef, user: userSnap.data() || {} };
  }

  async function writeGalaxyLearningAdminAudit(adminUid, action, details = {}) {
    const safeDetails = Object.fromEntries(
      Object.entries(details).filter(([, value]) => value !== undefined),
    );
    try {
      await db.collection("adminAuditLogs").add({
        action,
        adminUid,
        operation: "galaxy_learning_ore_ledger_v2_backfill",
        ...safeDetails,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error("[galaxyLearningBackfill] audit log failed", action, error);
    }
  }

  function buildGalaxyLearningAdminJobView(job = {}, id = GALAXY_LEARNING_ADMIN_JOB_ID) {
    const { targetUids = [], ...visibleJob } = job;
    return serializeValue({
      id,
      ...visibleJob,
      targetCount: Math.max(0, Number(job.targetCount || targetUids.length || 0)),
      leaseActive: Number(job.leaseUntilMs || 0) > Date.now(),
    });
  }

  async function readGalaxyLearningAdminStatus() {
    const [usersSnap, jobSnap] = await Promise.all([
      db.collection("users")
        .orderBy(admin.firestore.FieldPath.documentId())
        .limit(GALAXY_LEARNING_ADMIN_SCAN_LIMIT + 1)
        .get(),
      galaxyLearningAdminJobRef.get(),
    ]);
    const truncated = usersSnap.size > GALAXY_LEARNING_ADMIN_SCAN_LIMIT;
    const scannedDocs = usersSnap.docs.slice(0, GALAXY_LEARNING_ADMIN_SCAN_LIMIT);
    const users = scannedDocs
      .filter((snapshot) => isGalaxyLearningBackfillTarget(snapshot.data() || {}))
      .map((snapshot) => {
        const user = snapshot.data() || {};
        return {
          uid: snapshot.id,
          displayName: getPublicName(user),
          status: getGalaxyLearningLedgerStatus(user),
          ledgerVersion: Math.max(0, Number(user.galaxyLearningLedgerVersion || 0)),
          cursor: getExactDocumentId(user.galaxyLearningBackfillCursor),
          oreTotal: Math.max(0, Number(user.galaxyLearningOreV2Total || 0)),
          syncedAt: serializeValue(user.galaxyLearningLedgerSyncedAt) || null,
        };
      });
    const completeUsers = users.filter((user) => user.status === "complete").length;
    const inProgressUsers = users.filter((user) => user.status === "in_progress").length;
    const notStartedUsers = users.filter((user) => user.status === "not_started").length;
    const rawJob = jobSnap.exists ? jobSnap.data() || {} : null;
    const job = rawJob ? buildGalaxyLearningAdminJobView(rawJob, jobSnap.id) : null;

    return {
      ledgerVersion: GALAXY_LEARNING_LEDGER_VERSION,
      confirmationPhrase: GALAXY_LEARNING_ADMIN_CONFIRMATION,
      summary: {
        partial: truncated,
        totalUsers: users.length,
        completeUsers,
        pendingUsers: users.length - completeUsers,
        inProgressUsers,
        notStartedUsers,
        totalRecordedOre: users.reduce((sum, user) => sum + user.oreTotal, 0),
        scannedDocuments: scannedDocs.length,
        excludedDocuments: scannedDocs.length - users.length,
      },
      users,
      truncated,
      scanLimit: GALAXY_LEARNING_ADMIN_SCAN_LIMIT,
      job,
    };
  }

  const adminGetGalaxyLearningBackfillStatus = regionalFunctions.https.onCall(async (_data, context) => {
    await requireAdminUid(context);
    return {
      success: true,
      ...await readGalaxyLearningAdminStatus(),
    };
  });

  const adminStartGalaxyLearningBackfill = regionalFunctions.https.onCall(async (data, context) => {
    const adminUid = await requireAdminUid(context);
    const confirmation = String(data?.confirmation || "").trim();
    if (confirmation !== GALAXY_LEARNING_ADMIN_CONFIRMATION) {
      throw new functions.https.HttpsError("failed-precondition", "화면의 확인 문구를 정확히 입력해 주세요.");
    }
    const scope = String(data?.scope || "").trim();
    if (!["all", "user"].includes(scope)) {
      throw new functions.https.HttpsError("invalid-argument", "백필 범위는 전체 또는 개별 사용자여야 합니다.");
    }
    const targetUid = scope === "user" ? cleanId(data?.targetUid, 180) : "";
    let targetUids = [];
    if (scope === "user") {
      if (!targetUid) {
        throw new functions.https.HttpsError("invalid-argument", "개별 백필 대상 UID가 필요합니다.");
      }
      const targetSnap = await db.collection("users").doc(targetUid).get();
      if (!targetSnap.exists) {
        throw new functions.https.HttpsError("not-found", "대상 사용자 문서를 찾을 수 없습니다.");
      }
      if (!isGalaxyLearningBackfillTarget(targetSnap.data() || {})) {
        throw new functions.https.HttpsError("failed-precondition", "학생 계정만 학습 광석 백필 대상으로 지정할 수 있습니다.");
      }
      targetUids = [targetSnap.id];
    } else {
      const targetSnapshot = await db.collection("users")
        .orderBy(admin.firestore.FieldPath.documentId())
        .limit(GALAXY_LEARNING_ADMIN_SCAN_LIMIT + 1)
        .get();
      if (targetSnapshot.size > GALAXY_LEARNING_ADMIN_SCAN_LIMIT) {
        throw new functions.https.HttpsError(
          "resource-exhausted",
          `안전 한도 ${GALAXY_LEARNING_ADMIN_SCAN_LIMIT}명을 초과했습니다. 도구의 대상 스냅샷 한도를 먼저 확장해 주세요.`,
        );
      }
      targetUids = targetSnapshot.docs
        .filter((snapshot) => {
          const user = snapshot.data() || {};
          return isGalaxyLearningBackfillTarget(user)
            && getGalaxyLearningLedgerStatus(user) !== "complete";
        })
        .map((snapshot) => snapshot.id);
    }

    const jobRunId = `${Date.now()}_${adminUid.slice(0, 12)}_${Math.random().toString(36).slice(2, 10)}`;
    await db.runTransaction(async (transaction) => {
      const currentSnap = await transaction.get(galaxyLearningAdminJobRef);
      const current = currentSnap.data() || {};
      if (currentSnap.exists && !["completed", "cancelled"].includes(current.status)) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "재개 가능한 기존 백필 작업이 있습니다. 새 작업을 만들지 말고 기존 작업을 계속 실행해 주세요.",
          { jobRunId: current.jobRunId || "", status: current.status || "unknown" },
        );
      }
      transaction.set(galaxyLearningAdminJobRef, {
        version: GALAXY_LEARNING_LEDGER_VERSION,
        jobRunId,
        scope,
        targetUid,
        status: "queued",
        targetUids,
        targetCount: targetUids.length,
        targetIndex: 0,
        userCursor: "",
        currentUid: targetUids[0] || "",
        counters: normalizeGalaxyLearningBackfillCounters(),
        createdBy: adminUid,
        createdAt: FieldValue.serverTimestamp(),
        startedAt: null,
        updatedAt: FieldValue.serverTimestamp(),
        completedAt: null,
        leaseId: "",
        leaseOwnerUid: "",
        leaseUntilMs: 0,
        lastError: null,
        lastStep: null,
      });
    });

    await writeGalaxyLearningAdminAudit(adminUid, "galaxy_learning_backfill_started", {
      jobRunId,
      scope,
      targetUid,
      targetCount: targetUids.length,
    });
    const jobSnap = await galaxyLearningAdminJobRef.get();
    return { success: true, job: buildGalaxyLearningAdminJobView(jobSnap.data() || {}, jobSnap.id) };
  });

  const adminRunGalaxyLearningBackfillStep = galaxyLearningAdminFunctions.https.onCall(async (data, context) => {
    const adminUid = await requireAdminUid(context);
    const expectedJobRunId = cleanId(data?.jobRunId, 180);
    if (!expectedJobRunId) {
      throw new functions.https.HttpsError("invalid-argument", "실행할 백필 작업 ID가 필요합니다.");
    }
    const pageBudget = Math.floor(clamp(
      Number(data?.pageBudget) || 15,
      1,
      GALAXY_LEARNING_ADMIN_MAX_PAGES_PER_RUN,
    ));
    const userBudget = Math.floor(clamp(
      Number(data?.userBudget) || GALAXY_LEARNING_ADMIN_MAX_USERS_PER_RUN,
      1,
      GALAXY_LEARNING_ADMIN_MAX_USERS_PER_RUN,
    ));
    const leaseId = `${Date.now()}_${adminUid.slice(0, 12)}_${Math.random().toString(36).slice(2, 10)}`;
    let leaseAcquired = false;
    let userCursor = "";
    let currentUid = "";
    let targetIndex = 0;
    let counters = normalizeGalaxyLearningBackfillCounters();
    const step = {
      usersHandled: 0,
      userDocumentsScanned: 0,
      pagesProcessed: 0,
      ledgerDocsScanned: 0,
      eligibleEventsScanned: 0,
      eventsCredited: 0,
      oreCredited: 0,
      results: [],
      stopReason: "queued",
    };

    try {
      const acquisition = await db.runTransaction(async (transaction) => {
        const jobSnap = await transaction.get(galaxyLearningAdminJobRef);
        if (!jobSnap.exists) {
          throw new functions.https.HttpsError("failed-precondition", "먼저 백필 작업을 시작해 주세요.");
        }
        const job = jobSnap.data() || {};
        if (job.jobRunId !== expectedJobRunId) {
          throw new functions.https.HttpsError("failed-precondition", "화면의 작업 정보가 오래되었습니다. 현황을 새로 고쳐 주세요.");
        }
        if (job.status === "completed") return { alreadyCompleted: true, job };
        if (!["queued", "running", "failed", "paused"].includes(job.status)) {
          throw new functions.https.HttpsError("failed-precondition", "현재 상태에서는 백필 작업을 실행할 수 없습니다.");
        }
        if (cleanId(job.leaseId, 180) && Number(job.leaseUntilMs || 0) > Date.now()) {
          throw new functions.https.HttpsError("aborted", "다른 관리자 배치가 이미 실행 중입니다. 잠시 후 현황을 새로 고쳐 주세요.");
        }
        const updates = {
          status: "running",
          leaseId,
          leaseOwnerUid: adminUid,
          leaseUntilMs: Date.now() + GALAXY_LEARNING_ADMIN_LOCK_MS,
          updatedAt: FieldValue.serverTimestamp(),
          lastError: null,
        };
        if (!job.startedAt) updates.startedAt = FieldValue.serverTimestamp();
        transaction.set(galaxyLearningAdminJobRef, updates, { merge: true });
        return { alreadyCompleted: false, job };
      });

      if (acquisition.alreadyCompleted) {
        return {
          success: true,
          alreadyCompleted: true,
          job: buildGalaxyLearningAdminJobView(acquisition.job),
          step,
        };
      }
      leaseAcquired = true;
      const job = acquisition.job || {};
      const scope = job.scope === "user" ? "user" : "all";
      const targetUid = cleanId(job.targetUid, 180);
      const targetUids = Array.isArray(job.targetUids)
        ? job.targetUids.filter((uid) => typeof uid === "string" && uid)
        : [];
      targetIndex = Math.min(
        targetUids.length,
        Math.max(0, Math.floor(Number(job.targetIndex || 0))),
      );
      userCursor = getExactDocumentId(job.userCursor);
      currentUid = getExactDocumentId(job.currentUid) || targetUids[targetIndex] || "";
      if (currentUid && currentUid !== targetUids[targetIndex]) {
        throw new functions.https.HttpsError("failed-precondition", "백필 대상 큐가 일치하지 않습니다. 작업을 종료하고 새로 시작해 주세요.");
      }
      counters = normalizeGalaxyLearningBackfillCounters(job.counters);

      const checkpointProgress = async () => {
        await db.runTransaction(async (transaction) => {
          const checkpointSnap = await transaction.get(galaxyLearningAdminJobRef);
          const checkpointJob = checkpointSnap.data() || {};
          if (checkpointJob.jobRunId !== expectedJobRunId || checkpointJob.leaseId !== leaseId) {
            throw new functions.https.HttpsError("aborted", "백필 작업 잠금이 변경되었습니다. 현황을 새로 고쳐 주세요.");
          }
          transaction.set(galaxyLearningAdminJobRef, {
            targetIndex,
            userCursor,
            currentUid,
            counters,
            updatedAt: FieldValue.serverTimestamp(),
            lastCheckpointAtMs: Date.now(),
          }, { merge: true });
        });
      };

      const finishUser = async (uid, outcome) => {
        if (uid !== targetUids[targetIndex]) {
          throw new Error(`Backfill target index mismatch: ${uid}`);
        }
        targetIndex += 1;
        currentUid = "";
        userCursor = uid;
        step.usersHandled += 1;
        counters.usersVisited += 1;
        if (outcome === "completed") counters.usersCompleted += 1;
        if (outcome === "already_complete") counters.usersAlreadyComplete += 1;
        if (outcome === "skipped") counters.usersSkipped += 1;
        await checkpointProgress();
      };

      while (step.usersHandled < userBudget && step.pagesProcessed < pageBudget) {
        if (!currentUid) {
          currentUid = targetUids[targetIndex] || "";
          if (!currentUid) break;
        }

        const processingUid = currentUid;
        const userRef = db.collection("users").doc(processingUid);
        const userSnap = await userRef.get();
        step.userDocumentsScanned += 1;
        const user = userSnap.data() || {};
        if (!userSnap.exists || !isGalaxyLearningBackfillTarget(user)) {
          await finishUser(processingUid, "skipped");
          step.results.push({ uid: processingUid, displayName: getPublicName(user), outcome: "skipped" });
          continue;
        }

        const displayName = getPublicName(user);
        if (getGalaxyLearningLedgerStatus(user) === "complete") {
          await finishUser(processingUid, "already_complete");
          step.results.push({
            uid: processingUid,
            displayName,
            outcome: "already_complete",
            total: Math.max(0, Number(user.galaxyLearningOreV2Total || 0)),
          });
          continue;
        }

        let freshUser = user;
        let pagesForUser = 0;
        let scannedForUser = 0;
        let eligibleForUser = 0;
        let eventsCreditedForUser = 0;
        let oreCreditedForUser = 0;
        let latestTotal = Math.max(0, Number(user.galaxyLearningOreV2Total || 0));
        let userComplete = false;
        let userMissing = false;

        while (
          pagesForUser < GALAXY_LEARNING_ADMIN_MAX_PAGES_PER_USER
          && step.pagesProcessed < pageBudget
        ) {
          const result = await calculateLifetimeLearningOre(db, admin, userRef, freshUser);
          pagesForUser += 1;
          step.pagesProcessed += 1;
          scannedForUser += Number(result.scanned || 0);
          eligibleForUser += Number(result.eligible || 0);
          eventsCreditedForUser += Number(result.creditedEvents || 0);
          oreCreditedForUser += Number(result.credited || 0);
          step.ledgerDocsScanned += Number(result.scanned || 0);
          step.eligibleEventsScanned += Number(result.eligible || 0);
          step.eventsCredited += Number(result.creditedEvents || 0);
          step.oreCredited += Number(result.credited || 0);
          counters.pagesProcessed += 1;
          counters.ledgerDocsScanned += Number(result.scanned || 0);
          counters.eligibleEventsScanned += Number(result.eligible || 0);
          counters.eventsCredited += Number(result.creditedEvents || 0);
          counters.oreCredited += Number(result.credited || 0);
          latestTotal = Math.max(0, Number(result.total || 0));
          userMissing = result.missing === true;
          if (userMissing) break;
          userComplete = result.complete === true;
          if (userComplete) break;
          await checkpointProgress();
          const refreshedUserSnap = await userRef.get();
          if (
            !refreshedUserSnap.exists
            || refreshedUserSnap.data()?.isDeleted === true
            || refreshedUserSnap.data()?.accountStatus === "deleted"
          ) {
            userMissing = true;
            break;
          }
          freshUser = refreshedUserSnap.data() || {};
        }

        if (userMissing) {
          await finishUser(processingUid, "skipped");
          step.results.push({
            uid: processingUid,
            displayName,
            outcome: "skipped_deleted",
            pages: pagesForUser,
          });
          continue;
        }

        step.results.push({
          uid: processingUid,
          displayName,
          outcome: userComplete ? "completed" : "partial",
          pages: pagesForUser,
          scanned: scannedForUser,
          eligible: eligibleForUser,
          eventsCredited: eventsCreditedForUser,
          oreCredited: oreCreditedForUser,
          total: latestTotal,
        });
        if (userComplete) {
          await finishUser(processingUid, "completed");
          continue;
        }
        step.stopReason = step.pagesProcessed >= pageBudget ? "page_budget" : "per_user_page_budget";
        break;
      }

      const completed = !currentUid && targetIndex >= targetUids.length;
      if (completed) step.stopReason = "completed";
      else if (step.stopReason === "queued" && step.usersHandled >= userBudget) step.stopReason = "user_budget";
      else if (step.stopReason === "queued" && step.pagesProcessed >= pageBudget) step.stopReason = "page_budget";

      const finishedAtMs = Date.now();
      await db.runTransaction(async (transaction) => {
        const freshJobSnap = await transaction.get(galaxyLearningAdminJobRef);
        const freshJob = freshJobSnap.data() || {};
        if (freshJob.jobRunId !== expectedJobRunId || freshJob.leaseId !== leaseId) {
          throw new functions.https.HttpsError("aborted", "백필 작업 잠금이 변경되었습니다. 현황을 새로 고쳐 주세요.");
        }
        const updates = {
          status: completed ? "completed" : "queued",
          targetIndex,
          userCursor,
          currentUid,
          counters,
          updatedAt: FieldValue.serverTimestamp(),
          completedAt: completed ? FieldValue.serverTimestamp() : null,
          leaseId: "",
          leaseOwnerUid: "",
          leaseUntilMs: 0,
          lastError: null,
          lastStep: {
            ...step,
            pageBudget,
            userBudget,
            finishedAtMs,
            results: step.results.slice(-GALAXY_LEARNING_ADMIN_MAX_USERS_PER_RUN),
          },
        };
        transaction.set(galaxyLearningAdminJobRef, updates, { merge: true });
      });
      leaseAcquired = false;

      await writeGalaxyLearningAdminAudit(adminUid, "galaxy_learning_backfill_step_completed", {
        jobRunId: expectedJobRunId,
        scope,
        targetUid,
        status: completed ? "completed" : "queued",
        usersHandled: step.usersHandled,
        pagesProcessed: step.pagesProcessed,
        ledgerDocsScanned: step.ledgerDocsScanned,
        eventsCredited: step.eventsCredited,
        oreCredited: step.oreCredited,
        stopReason: step.stopReason,
      });
      const finalJobSnap = await galaxyLearningAdminJobRef.get();
      return {
        success: true,
        step,
        job: buildGalaxyLearningAdminJobView(finalJobSnap.data() || {}, finalJobSnap.id),
      };
    } catch (error) {
      const message = cleanText(error?.message || "알 수 없는 백필 오류", 500);
      if (leaseAcquired) {
        counters.errors += 1;
        try {
          await db.runTransaction(async (transaction) => {
            const jobSnap = await transaction.get(galaxyLearningAdminJobRef);
            const job = jobSnap.data() || {};
            if (job.jobRunId !== expectedJobRunId || job.leaseId !== leaseId) return;
            transaction.set(galaxyLearningAdminJobRef, {
              status: "failed",
              targetIndex,
              userCursor,
              currentUid,
              counters,
              updatedAt: FieldValue.serverTimestamp(),
              leaseId: "",
              leaseOwnerUid: "",
              leaseUntilMs: 0,
              lastError: {
                code: cleanId(error?.code || "internal", 80),
                message,
                failedAtMs: Date.now(),
                currentUid,
              },
              lastStep: {
                ...step,
                pageBudget,
                userBudget,
                failed: true,
                finishedAtMs: Date.now(),
                results: step.results.slice(-GALAXY_LEARNING_ADMIN_MAX_USERS_PER_RUN),
              },
            }, { merge: true });
          });
        } catch (stateError) {
          console.error("[galaxyLearningBackfill] failed to persist error state", stateError);
        }
        await writeGalaxyLearningAdminAudit(adminUid, "galaxy_learning_backfill_step_failed", {
          jobRunId: expectedJobRunId,
          currentUid,
          message,
        });
      }
      if (error instanceof functions.https.HttpsError) throw error;
      console.error("[galaxyLearningBackfill] step failed", error);
      throw new functions.https.HttpsError("internal", `백필 배치 실행에 실패했습니다: ${message}`);
    }
  });

  const adminCancelGalaxyLearningBackfill = regionalFunctions.https.onCall(async (data, context) => {
    const adminUid = await requireAdminUid(context);
    const expectedJobRunId = cleanId(data?.jobRunId, 180);
    const confirmation = String(data?.confirmation || "").trim();
    if (!expectedJobRunId || confirmation !== GALAXY_LEARNING_ADMIN_CONFIRMATION) {
      throw new functions.https.HttpsError("failed-precondition", "작업 ID와 안전 확인 문구를 확인해 주세요.");
    }

    const cancellation = await db.runTransaction(async (transaction) => {
      const jobSnap = await transaction.get(galaxyLearningAdminJobRef);
      if (!jobSnap.exists || jobSnap.data()?.jobRunId !== expectedJobRunId) {
        throw new functions.https.HttpsError("failed-precondition", "종료할 백필 작업이 현재 작업과 일치하지 않습니다.");
      }
      const job = jobSnap.data() || {};
      if (["completed", "cancelled"].includes(job.status)) {
        return { changed: false, status: job.status };
      }
      if (cleanId(job.leaseId, 180) && Number(job.leaseUntilMs || 0) > Date.now()) {
        throw new functions.https.HttpsError("failed-precondition", "실행 중인 서버 배치가 끝난 뒤 작업을 종료해 주세요.");
      }
      transaction.set(galaxyLearningAdminJobRef, {
        status: "cancelled",
        cancelledBy: adminUid,
        cancelledAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        leaseId: "",
        leaseOwnerUid: "",
        leaseUntilMs: 0,
      }, { merge: true });
      return { changed: true, status: "cancelled" };
    });

    if (cancellation.changed) {
      await writeGalaxyLearningAdminAudit(adminUid, "galaxy_learning_backfill_cancelled", {
        jobRunId: expectedJobRunId,
      });
    }
    const jobSnap = await galaxyLearningAdminJobRef.get();
    return {
      success: true,
      cancelled: cancellation.changed,
      job: buildGalaxyLearningAdminJobView(jobSnap.data() || {}, jobSnap.id),
    };
  });

  function getGalaxyBlockRef(ownerUid, targetUid) {
    return db.collection("galaxyBlocks").doc(ownerUid).collection("blocked").doc(targetUid);
  }

  async function getApprovedSharedCrew(actorUid, targetUid, actorUser) {
    const crewId = cleanId(actorUser.crewId);
    if (!crewId) return null;
    const crewSnap = await db.collection("crews").doc(crewId).get();
    if (!crewSnap.exists) return null;
    const crew = crewSnap.data() || {};
    const memberIds = getCrewMemberIds(crew);
    if (crew.status !== "approved" || !memberIds.includes(actorUid) || !memberIds.includes(targetUid)) return null;
    return { id: crewSnap.id, ...crew, memberIds };
  }

  async function getSharedCrew(actorUid, targetUid, actorUser) {
    const sharedCrew = await getApprovedSharedCrew(actorUid, targetUid, actorUser);
    if (!sharedCrew) return null;
    const [actorBlockSnap, targetBlockSnap] = await Promise.all([
      getGalaxyBlockRef(actorUid, targetUid).get(),
      getGalaxyBlockRef(targetUid, actorUid).get(),
    ]);
    if (actorBlockSnap.exists || targetBlockSnap.exists) return null;
    return sharedCrew;
  }

  async function syncLearningState(userRef, user) {
    let learningUser = user;
    let learningLedger = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      learningLedger = await calculateLifetimeLearningOre(db, admin, userRef, learningUser);
      if (learningLedger.missing) {
        throw new functions.https.HttpsError("not-found", "학습 광석을 동기화할 사용자 문서가 없습니다.");
      }
      if (!learningLedger.stale) break;
      const refreshedUserSnap = await userRef.get();
      if (!refreshedUserSnap.exists || refreshedUserSnap.data()?.isDeleted === true) {
        throw new functions.https.HttpsError("not-found", "학습 광석을 동기화할 사용자 문서가 없습니다.");
      }
      learningUser = refreshedUserSnap.data() || {};
    }
    const lifetimeLearningOre = learningLedger.total;
    const shipHullTier = getShipHullTier(lifetimeLearningOre);
    const currentResonance = buildAbilitySnapshot(learningUser, lifetimeLearningOre);
    const previousValues = learningUser.gameAbilitySnapshot?.values || {};
    const values = Object.fromEntries(Object.entries(currentResonance.values).map(([abilityId, level]) => [
      abilityId,
      abilityId === "construction"
        ? Number(level || 1)
        : Math.max(Number(previousValues[abilityId] || 1), Number(level || 1)),
    ]));
    const abilitySnapshot = {
      version: 2,
      values,
      resonance: currentResonance.values,
    };
    await db.runTransaction(async (transaction) => {
      const freshUserSnap = await transaction.get(userRef);
      if (
        !freshUserSnap.exists
        || freshUserSnap.data()?.isDeleted === true
        || freshUserSnap.data()?.accountStatus === "deleted"
      ) {
        throw new functions.https.HttpsError("not-found", "학습 광석을 동기화할 사용자 문서가 없습니다.");
      }
      transaction.set(userRef, {
        galaxyShipHullTier: shipHullTier,
        gameAbilitySnapshot: abilitySnapshot,
        galaxyLearningSyncedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });
    return { lifetimeLearningOre, shipHullTier, abilitySnapshot, learningLedgerComplete: learningLedger.complete };
  }

  async function ensurePlanet(uid, user, learningState = null) {
    const planetRef = db.collection("galaxyPlanets").doc(uid);
    let planetSnap = await planetRef.get();
    if (!planetSnap.exists) {
      const state = learningState || {
        lifetimeLearningOre: Math.max(0, Number(user.galaxyLearningOreV2Total || 0)),
        shipHullTier: getShipHullTier(Number(user.galaxyLearningOreV2Total || 0)),
        abilitySnapshot: buildAbilitySnapshot(user, Number(user.galaxyLearningOreV2Total || 0)),
      };
      await planetRef.create(buildStarterPlanet(uid, user, state, FieldValue.serverTimestamp()));
      planetSnap = await planetRef.get();
    } else {
      const currentPlanet = planetSnap.data() || {};
      const updates = {};
      if (!currentPlanet.frontierStory || Number(currentPlanet.frontierStory.version || 0) < FRONTIER_STORY_VERSION) {
        updates.frontierStory = deriveFrontierStoryFromPlanet(currentPlanet);
      }
      if (learningState) Object.assign(updates, {
        ownerName: getPublicName(user),
        lifetimeLearningOre: learningState.lifetimeLearningOre,
        shipHullTier: learningState.shipHullTier,
        abilitySnapshot: learningState.abilitySnapshot,
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (Object.keys(updates).length) {
        await planetRef.set(updates, { merge: true });
        planetSnap = await planetRef.get();
      }
    }
    return { ref: planetRef, data: { id: planetSnap.id, ...(planetSnap.data() || {}) } };
  }

  async function listCrewNeighbors(uid, user) {
    const crewId = cleanId(user.crewId);
    if (!crewId) return [];
    const crewSnap = await db.collection("crews").doc(crewId).get();
    if (!crewSnap.exists || crewSnap.data()?.status !== "approved") return [];
    const memberIds = getCrewMemberIds(crewSnap.data() || {}).filter((id) => id !== uid).slice(0, 40);
    if (!memberIds.length) return [];
    const refs = memberIds.flatMap((memberId) => [db.collection("users").doc(memberId), db.collection("galaxyPlanets").doc(memberId)]);
    const relationshipRefs = memberIds.map((memberId) => db.collection("galaxyRelationships").doc(getGalaxyRelationshipId(uid, memberId)));
    const ownBlockRefs = memberIds.map((memberId) => getGalaxyBlockRef(uid, memberId));
    const reverseBlockRefs = memberIds.map((memberId) => getGalaxyBlockRef(memberId, uid));
    const [snaps, relationshipSnaps, ownBlockSnaps, reverseBlockSnaps] = await Promise.all([
      db.getAll(...refs),
      db.getAll(...relationshipRefs),
      db.getAll(...ownBlockRefs),
      db.getAll(...reverseBlockRefs),
    ]);
    const rows = [];
    for (let index = 0; index < memberIds.length; index += 1) {
      const memberId = memberIds[index];
      const userSnap = snaps[index * 2];
      const planetSnap = snaps[index * 2 + 1];
      if (!userSnap?.exists || userSnap.data()?.isDeleted === true) continue;
      if (reverseBlockSnaps[index]?.exists) continue;
      const member = userSnap.data() || {};
      const planet = planetSnap?.exists ? planetSnap.data() || {} : {};
      const relationship = relationshipSnaps[index]?.exists ? relationshipSnaps[index].data() || {} : {};
      const route = getGalaxyRelationshipProgress(relationship.connectionXp);
      const blocked = ownBlockSnaps[index]?.exists === true;
      rows.push({
        uid: memberId,
        displayName: getPublicName(member),
        planetName: blocked ? "차단한 탐사원" : cleanText(planet.planetName || `${getPublicName(member)}의 미개척 별`, 40),
        theme: GALAXY_THEMES.has(planet.theme) ? planet.theme : "forest",
        visitMode: blocked || planet.visitMode === "private" ? "private" : "crew",
        shipHullTier: Math.max(1, Number(planet.shipHullTier || member.galaxyShipHullTier || 1)),
        tagline: blocked ? "차단을 해제하기 전에는 서로 방문하거나 대화할 수 없습니다." : cleanText(planet.tagline || "아직 첫 신호를 기다리고 있어요.", 80),
        blocked,
        routeLevel: route.routeLevel,
        connectionXp: route.connectionXp,
        nextLevelXp: route.nextLevelXp,
        interactionCount: Math.max(0, Math.floor(Number(relationship.interactionCount) || 0)),
      });
    }
    return rows;
  }

  async function grantGalaxyLiveRoomAccess({ roomOwnerUid, actorUid, actorName, nowMs = Date.now(), maxExpiresAtMs = 0 }) {
    const safeRoomOwnerUid = cleanId(roomOwnerUid, 180);
    const safeActorUid = cleanId(actorUid, 180);
    const safeActorName = cleanText(actorName, 40) || "탐사원";
    if (!isSafeRealtimePathSegment(safeRoomOwnerUid) || !isSafeRealtimePathSegment(safeActorUid)) {
      return { granted: false, roomOwnerUid: safeRoomOwnerUid, displayName: "", expiresAtMs: 0 };
    }
    const defaultExpiresAtMs = Math.max(0, Number(nowMs || Date.now())) + GALAXY_LIVE_ACCESS_DURATION_MS;
    const expiresAtMs = maxExpiresAtMs > nowMs
      ? Math.min(defaultExpiresAtMs, Number(maxExpiresAtMs))
      : defaultExpiresAtMs;
    try {
      await admin.database().ref(`galaxyWorldAccess/${safeRoomOwnerUid}/${safeActorUid}`).set({
        uid: safeActorUid,
        displayName: safeActorName,
        expiresAtMs,
        grantedAtMs: Math.max(0, Number(nowMs || Date.now())),
      });
      return { granted: true, roomOwnerUid: safeRoomOwnerUid, displayName: safeActorName, expiresAtMs };
    } catch (error) {
      console.warn("[galaxyLiveRoom] access grant failed", {
        roomOwnerUid: safeRoomOwnerUid,
        actorUid: safeActorUid,
        message: String(error?.message || error || "unknown").slice(0, 240),
      });
      return { granted: false, roomOwnerUid: safeRoomOwnerUid, displayName: "", expiresAtMs: 0 };
    }
  }

  async function requireGalaxyLiveRoomAuthorization(actorUid, actorUser, rawRoomOwnerUid) {
    if (!isSafeRealtimePathSegment(rawRoomOwnerUid)) {
      throw new functions.https.HttpsError("invalid-argument", "실시간 행성 방 식별자가 올바르지 않습니다.");
    }
    if (rawRoomOwnerUid === actorUid) return { roomOwnerUid: actorUid };
    const sharedCrew = await getSharedCrew(actorUid, rawRoomOwnerUid, actorUser);
    if (!sharedCrew) {
      throw new functions.https.HttpsError("permission-denied", "같은 승인 크루의 행성 방에만 접속할 수 있습니다.");
    }
    const targetUserSnap = await db.collection("users").doc(rawRoomOwnerUid).get();
    if (!targetUserSnap.exists || targetUserSnap.data()?.isDeleted === true) {
      throw new functions.https.HttpsError("not-found", "실시간 행성 방의 주인을 찾을 수 없습니다.");
    }
    const targetPlanet = await ensurePlanet(rawRoomOwnerUid, targetUserSnap.data() || {});
    if (targetPlanet.data.visitMode === "private") {
      throw new functions.https.HttpsError("permission-denied", "현재 방문을 받지 않는 행성입니다.");
    }
    return { roomOwnerUid: rawRoomOwnerUid, targetPlanet };
  }

  const openGalaxyHome = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    const playSession = await requireActiveGalaxyPlay(uid, data);
    const { userRef, user } = await requireMember(uid);
    const learningState = await syncLearningState(userRef, user);
    const ownPlanet = await ensurePlanet(uid, user, learningState);
    let ownPlanetData = ownPlanet.data;
    const serverNowMs = Date.now();
    const frontierAnalytics = updateFrontierAnalyticsOnOpen(ownPlanetData.frontierAnalytics, serverNowMs);
    ownPlanetData = { ...ownPlanetData, frontierAnalytics };
    await ownPlanet.ref.set({ frontierAnalytics, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    const targetUid = cleanId(data?.targetUid) || uid;
    let targetPlanet = ownPlanet;

    if (targetUid !== uid) {
      const sharedCrew = await getSharedCrew(uid, targetUid, user);
      if (!sharedCrew) throw new functions.https.HttpsError("permission-denied", "같은 스터디 크루의 행성만 방문할 수 있습니다.");
      const targetUserSnap = await db.collection("users").doc(targetUid).get();
      if (!targetUserSnap.exists) throw new functions.https.HttpsError("not-found", "친구 정보를 찾을 수 없습니다.");
      targetPlanet = await ensurePlanet(targetUid, targetUserSnap.data() || {});
      if (targetPlanet.data.visitMode === "private") {
        throw new functions.https.HttpsError("permission-denied", "현재 방문을 받지 않는 행성입니다.");
      }
      const visitStoryProgress = advanceFrontierStory(ownPlanetData.frontierStory, {
        type: "friend_visited",
      }, serverNowMs);
      if (visitStoryProgress.advanced) {
        ownPlanetData = { ...ownPlanetData, frontierStory: visitStoryProgress.story };
        await ownPlanet.ref.set({
          frontierStory: visitStoryProgress.story,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    }

    const pendingDailyEvent = buildGalaxyDailyEvent({ uid, nowMs: serverNowMs });
    const dailyOperationRef = db.collection("galaxyOperations")
      .doc(`daily_${uid}_${pendingDailyEvent.dayKey}`);
    const [neighbors, eventSnap, dailyOperationSnap, liveSession] = await Promise.all([
      listCrewNeighbors(uid, user),
      ownPlanet.ref.collection("visitEvents").orderBy("createdAt", "desc").limit(30).get(),
      dailyOperationRef.get(),
      grantGalaxyLiveRoomAccess({
        roomOwnerUid: targetUid,
        actorUid: uid,
        actorName: getPublicName(user),
        nowMs: serverNowMs,
        maxExpiresAtMs: playSession.hardEndsAtMs,
      }),
    ]);
    const dailyOperation = dailyOperationSnap.exists ? dailyOperationSnap.data() || {} : null;
    const dailyStoryProgress = syncFrontierStoryWithCompletedDailyEvent({
      rawStory: ownPlanetData.frontierStory,
      uid,
      event: pendingDailyEvent,
      operation: dailyOperation,
      nowMs: serverNowMs,
    });
    if (dailyStoryProgress.advanced) {
      ownPlanetData = { ...ownPlanetData, frontierStory: dailyStoryProgress.story };
      await ownPlanet.ref.set({
        frontierStory: dailyStoryProgress.story,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      if (targetUid === uid) targetPlanet = { ...targetPlanet, data: ownPlanetData };
    }
    const buildPlanetView = (planetData) => planetData?.roverExpedition
      ? { ...planetData, roverExpedition: getGalaxyRoverExpeditionView(planetData.roverExpedition, serverNowMs) }
      : planetData;

    return serializeValue({
      ownPlanet: buildPlanetView(ownPlanetData),
      planet: buildPlanetView(targetPlanet.data),
      dailyEvent: getGalaxyDailyEventView({
        uid,
        event: pendingDailyEvent,
        operation: dailyOperation,
      }),
      neighbors,
      events: eventSnap.docs.map((snap) => ({ id: snap.id, ...(snap.data() || {}) })),
      wallet: Math.max(0, Number(user.crystals || 0)),
      learningState,
      catalog: GALAXY_ITEM_CATALOG,
      roverCatalogVersion: GALAXY_ROVER_CATALOG_VERSION,
      roverCatalog: buildGalaxyRoverPublicCatalog(),
      liveSession,
      serverNowMs,
    });
  });

  const openGalaxyBuildPlot = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    const playSession = await requireActiveGalaxyPlay(uid, data);
    const { user } = await requireMember(uid);
    const planet = await ensurePlanet(uid, user);
    const plotId = cleanId(data?.plotId, 80) || "habitat-b01";
    const definition = ASTRA_BUILDER_PLOTS[plotId];
    if (!definition) {
      throw new functions.https.HttpsError("invalid-argument", "열 수 없는 건축 부지입니다.");
    }

    const serverNowMs = Date.now();
    const hardEndsAtMs = Math.max(serverNowMs, Number(playSession.hardEndsAtMs || 0));
    const saveGraceEndsAtMs = hardEndsAtMs + ASTRA_BUILDER_SAVE_GRACE_MS;
    const plotRef = planet.ref.collection("buildPlots").doc(plotId);
    const stateRef = plotRef.collection("state").doc("current");
    const leaseId = plotRef.collection("leaseIds").doc().id;
    const result = await db.runTransaction(async (transaction) => {
      const [plotSnap, stateSnap] = await Promise.all([
        transaction.get(plotRef),
        transaction.get(stateRef),
      ]);
      const previousPlot = plotSnap.exists ? plotSnap.data() || {} : {};
      const stateData = stateSnap.exists ? stateSnap.data() || {} : {};
      const currentRevision = Math.max(0, Number(stateData.revision || previousPlot.currentRevision || 0));
      const storedGridBuffer = stateSnap.exists
        ? getAstraBuilderStoredGridBuffer(stateData.gridData)
        : Buffer.alloc(getAstraBuilderGridByteLength(definition));
      if (!storedGridBuffer || storedGridBuffer.length !== getAstraBuilderGridByteLength(definition)) {
        throw new functions.https.HttpsError("data-loss", "저장된 건축 데이터를 복구할 수 없습니다.");
      }

      const editLease = {
        leaseId,
        holderUid: uid,
        hardEndsAtMs,
        saveGraceEndsAtMs,
        finalCommitsUsed: 0,
        issuedAtMs: serverNowMs,
      };
      const plotData = {
        ...definition,
        ownerId: uid,
        blockCount: Math.max(0, Number(stateData.blockCount || previousPlot.blockCount || 0)),
        moduleCount: 0,
        currentRevision,
        publishedRevision: Math.max(0, Number(previousPlot.publishedRevision || 0)),
        permissions: previousPlot.permissions || { view: "private", build: "owner" },
        unlockedSetIds: Array.isArray(previousPlot.unlockedSetIds)
          ? previousPlot.unlockedSetIds
          : [...definition.unlockedSetIds],
        thumbnailPath: cleanText(previousPlot.thumbnailPath || "", 300),
        lastEditorId: cleanId(previousPlot.lastEditorId, 180),
        editLease,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (!plotSnap.exists) plotData.createdAt = FieldValue.serverTimestamp();
      transaction.set(plotRef, plotData, { merge: true });
      if (!stateSnap.exists) {
        transaction.create(stateRef, {
          encoding: ASTRA_BUILDER_STATE_ENCODING,
          gridData: storedGridBuffer,
          modules: [],
          revision: 0,
          blockCount: 0,
          moduleCount: 0,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      return {
        plot: buildAstraBuilderPlotView(plotData, definition),
        state: {
          encoding: ASTRA_BUILDER_STATE_ENCODING,
          gridDataBase64: storedGridBuffer.toString("base64"),
          modules: [],
          revision: currentRevision,
          blockCount: plotData.blockCount,
          moduleCount: 0,
        },
        lease: {
          leaseId,
          hardEndsAtMs,
          saveGraceEndsAtMs,
          maxFinalCommits: 1,
        },
      };
    });
    return { success: true, serverNowMs, ...result };
  });

  const saveGalaxyBuildState = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    const { user } = await requireMember(uid);
    const plotId = cleanId(data?.plotId, 80);
    const leaseId = cleanId(data?.leaseId, 180);
    const baseRevision = Number(data?.baseRevision);
    if (!Number.isInteger(baseRevision) || baseRevision < 0) {
      throw new functions.https.HttpsError("invalid-argument", "건축 데이터 기준 버전이 올바르지 않습니다.");
    }
    if (!isSafeRealtimePathSegment(leaseId)) {
      throw new functions.https.HttpsError("invalid-argument", "건축 편집 권한이 올바르지 않습니다.");
    }

    const validated = validateAstraBuilderStatePayload({
      plotId,
      encoding: data?.encoding,
      gridDataBase64: data?.gridDataBase64,
      modules: data?.modules,
      blockCount: data?.blockCount,
    });
    if (validated.kind !== "valid") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "건축 데이터 형식이 올바르지 않습니다.",
        { reason: validated.kind },
      );
    }

    const planet = await ensurePlanet(uid, user);
    const plotRef = planet.ref.collection("buildPlots").doc(plotId);
    const stateRef = plotRef.collection("state").doc("current");
    const serverNowMs = Date.now();
    const result = await db.runTransaction(async (transaction) => {
      const [plotSnap, stateSnap] = await Promise.all([
        transaction.get(plotRef),
        transaction.get(stateRef),
      ]);
      if (!plotSnap.exists || !stateSnap.exists) {
        throw new functions.https.HttpsError("failed-precondition", "먼저 건축 부지를 열어주세요.");
      }
      const plotData = plotSnap.data() || {};
      const stateData = stateSnap.data() || {};
      const editLease = plotData.editLease || {};
      if (
        plotData.ownerId !== uid
        || editLease.holderUid !== uid
        || editLease.leaseId !== leaseId
      ) {
        throw new functions.https.HttpsError("permission-denied", "다른 기기에서 건축 부지를 열었습니다.");
      }
      const hardEndsAtMs = Number(editLease.hardEndsAtMs || 0);
      const saveGraceEndsAtMs = Number(editLease.saveGraceEndsAtMs || 0);
      if (!hardEndsAtMs || serverNowMs > saveGraceEndsAtMs) {
        throw new functions.https.HttpsError("deadline-exceeded", "건축 저장 유예 시간이 끝났습니다.");
      }
      const isFinalCommit = serverNowMs > hardEndsAtMs;
      const finalCommitsUsed = Math.max(0, Number(editLease.finalCommitsUsed || 0));
      if (isFinalCommit && finalCommitsUsed >= 1) {
        throw new functions.https.HttpsError("resource-exhausted", "종료 후 마지막 저장은 한 번만 가능합니다.");
      }

      const currentRevision = Math.max(0, Number(stateData.revision || 0));
      if (currentRevision !== baseRevision) {
        throw new functions.https.HttpsError(
          "aborted",
          "다른 저장본이 먼저 반영되었습니다.",
          { currentRevision },
        );
      }
      const revision = currentRevision + 1;
      transaction.set(stateRef, {
        encoding: ASTRA_BUILDER_STATE_ENCODING,
        gridData: validated.gridBuffer,
        modules: validated.modules,
        revision,
        blockCount: validated.blockCount,
        moduleCount: 0,
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(plotRef, {
        blockCount: validated.blockCount,
        moduleCount: 0,
        currentRevision: revision,
        lastEditorId: uid,
        editLease: {
          ...editLease,
          finalCommitsUsed: isFinalCommit ? finalCommitsUsed + 1 : finalCommitsUsed,
        },
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return { revision, isFinalCommit };
    });

    return {
      success: true,
      plotId,
      blockCount: validated.blockCount,
      moduleCount: 0,
      serverNowMs,
      ...result,
    };
  });

  const renewGalaxyWorldSession = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    const playSession = await requireActiveGalaxyPlay(uid, data);
    const rawRoomOwnerUid = data?.roomOwnerUid;
    const { user } = await requireMember(uid);
    await requireGalaxyLiveRoomAuthorization(uid, user, rawRoomOwnerUid);
    const liveSession = await grantGalaxyLiveRoomAccess({
      roomOwnerUid: rawRoomOwnerUid,
      actorUid: uid,
      actorName: getPublicName(user),
      nowMs: Date.now(),
      maxExpiresAtMs: playSession.hardEndsAtMs,
    });
    if (!liveSession.granted) {
      throw new functions.https.HttpsError("unavailable", "실시간 행성 방 접근권을 갱신하지 못했습니다.");
    }
    return { success: true, liveSession };
  });

  const sendGalaxyWorldSpeech = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    await requireActiveGalaxyPlay(uid, data);
    const rawRoomOwnerUid = data?.roomOwnerUid;
    const rawTargetUid = data?.targetUid;
    const rawConnectionId = data?.connectionId;
    const speechText = validateGalaxyLiveSpeechText(data?.text);
    if (
      !isSafeRealtimePathSegment(rawRoomOwnerUid)
      || !isSafeRealtimePathSegment(rawTargetUid)
      || !isSafeRealtimePathSegment(rawConnectionId, 120)
      || rawTargetUid === uid
      || !speechText.valid
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "대화에는 링크·연락처·계정명 없이 80자 이내의 안전한 문장만 보낼 수 있습니다.",
      );
    }

    const { user } = await requireMember(uid);
    await requireGalaxyLiveRoomAuthorization(uid, user, rawRoomOwnerUid);
    const nowMs = Date.now();
    const realtimeRoot = admin.database().ref();
    const actorAccessRef = realtimeRoot.child(`galaxyWorldAccess/${rawRoomOwnerUid}/${uid}`);
    const targetAccessRef = realtimeRoot.child(`galaxyWorldAccess/${rawRoomOwnerUid}/${rawTargetUid}`);
    const actorConnectionRef = realtimeRoot.child(`galaxyWorldRooms/${rawRoomOwnerUid}/players/${uid}/connections/${rawConnectionId}`);
    const targetConnectionsRef = realtimeRoot.child(`galaxyWorldRooms/${rawRoomOwnerUid}/players/${rawTargetUid}/connections`);
    const [actorAccessSnap, targetAccessSnap, actorConnectionSnap, targetConnectionsSnap] = await Promise.all([
      actorAccessRef.get(),
      targetAccessRef.get(),
      actorConnectionRef.get(),
      targetConnectionsRef.get(),
    ]);
    const actorAccess = actorAccessSnap.val() || {};
    const targetAccess = targetAccessSnap.val() || {};
    const actorConnection = actorConnectionSnap.val() || {};
    const speechPlan = planGalaxyLiveSpeech({
      actorAccess,
      targetAccess,
      actorConnection: actorConnectionSnap.exists() ? actorConnection : null,
      targetConnections: targetConnectionsSnap.val() || {},
      actorUid: uid,
      targetUid: rawTargetUid,
      nowMs,
    });
    if (speechPlan.kind === "offline") {
      throw new functions.https.HttpsError("failed-precondition", "상대방이 현재 같은 행성에 온라인 상태로 접속해 있지 않습니다.");
    }
    if (speechPlan.kind !== "allowed") {
      throw new functions.https.HttpsError("failed-precondition", "친구 캐릭터 가까이에서만 실시간 대화를 나눌 수 있습니다.");
    }
    if (Number(actorConnection.speech?.sentAtMs || 0) > nowMs - GALAXY_LIVE_SPEECH_COOLDOWN_MS) {
      throw new functions.https.HttpsError("resource-exhausted", "잠시 뒤 다음 말을 보내주세요.");
    }

    const speechRateLimitRef = realtimeRoot.child(`galaxyWorldSpeechRateLimits/${rawRoomOwnerUid}/${uid}`);
    const speechRateLimitResult = await speechRateLimitRef.transaction((currentValue) => {
      if (isGalaxyLiveSpeechRateLimited(currentValue, nowMs)) return undefined;
      return { lastSentAtMs: nowMs };
    });
    if (!speechRateLimitResult.committed) {
      throw new functions.https.HttpsError("resource-exhausted", "잠시 뒤 다음 말을 보내주세요.");
    }

    const speech = {
      id: db.collection("galaxyOperations").doc().id,
      text: speechText.text,
      targetUid: rawTargetUid,
      sentAtMs: nowMs,
      expiresAtMs: nowMs + GALAXY_LIVE_SPEECH_DURATION_MS,
    };
    const speechWriteResult = await actorConnectionRef.transaction((currentConnection) => {
      if (!currentConnection || currentConnection.uid !== uid) return undefined;
      return { ...currentConnection, speech, updatedAtMs: nowMs };
    });
    if (!speechWriteResult.committed) {
      throw new functions.https.HttpsError("failed-precondition", "실시간 연결이 종료되어 대화를 전송하지 못했습니다.");
    }
    return { success: true, speech };
  });

  const completeGalaxyDailyEvent = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    await requireActiveGalaxyPlay(uid, data);
    const rawDayKey = data?.dayKey;
    const rawEventId = data?.eventId;
    const dayKey = typeof rawDayKey === "string" ? rawDayKey.trim() : "";
    const eventId = typeof rawEventId === "string" ? rawEventId.trim() : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
      throw new functions.https.HttpsError("invalid-argument", "완료할 행성 사건의 날짜가 올바르지 않습니다.");
    }
    if (eventId.length > 120 || !/^[a-z0-9_-]{8,120}$/.test(eventId)) {
      throw new functions.https.HttpsError("invalid-argument", "완료할 행성 사건 식별자가 올바르지 않습니다.");
    }

    const { userRef, user } = await requireMember(uid);
    const planet = await ensurePlanet(uid, user);
    const operationRef = db.collection("galaxyOperations").doc(`daily_${uid}_${dayKey}`);
    const result = await db.runTransaction(async (transaction) => {
      const [operationSnap, planetSnap, userSnap] = await Promise.all([
        transaction.get(operationRef),
        transaction.get(planet.ref),
        transaction.get(userRef),
      ]);
      const freshUser = userSnap.data() || {};
      if (
        !userSnap.exists
        || freshUser.isGuest === true
        || freshUser.isDeleted === true
        || freshUser.accountStatus === "deleted"
      ) {
        throw new functions.https.HttpsError("failed-precondition", "정식 학생 계정에서만 행성 사건을 완료할 수 있습니다.");
      }
      if (!planetSnap.exists) {
        throw new functions.https.HttpsError("not-found", "행성 사건을 완료할 행성을 찾을 수 없습니다.");
      }

      const serverNowMs = Date.now();
      const plan = planGalaxyDailyEventCompletion({
        uid,
        dayKey,
        eventId,
        operation: operationSnap.exists ? operationSnap.data() || {} : null,
        planet: planetSnap.data() || {},
        nowMs: serverNowMs,
      });
      if (plan.kind === "stale") {
        throw new functions.https.HttpsError("failed-precondition", "이 행성 사건은 오늘의 사건이 아닙니다.", {
          currentDayKey: plan.dailyEvent.dayKey,
          serverNowMs,
        });
      }
      if (plan.kind === "forged") {
        throw new functions.https.HttpsError("invalid-argument", "행성 사건 정보가 서버 기록과 일치하지 않습니다.");
      }
      if (plan.kind === "operation_conflict") {
        throw new functions.https.HttpsError("already-exists", "오늘의 행성 사건 완료 기록을 확인할 수 없습니다.");
      }
      if (plan.kind === "deduplicated") {
        const storyProgress = advanceFrontierStory(planetSnap.data()?.frontierStory, {
          type: "daily_event_completed",
          nodeId: plan.dailyEvent.nodeId,
        }, serverNowMs);
        transaction.set(planet.ref, {
          frontierStory: storyProgress.story,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        return {
          dailyEvent: plan.dailyEvent,
          reward: plan.dailyEvent.reward,
          materials: plan.materials,
          stats: plan.stats,
          frontierStory: storyProgress.story,
          deduplicated: true,
          serverNowMs,
        };
      }
      if (plan.kind !== "completable" || !plan.operation) {
        throw new functions.https.HttpsError("internal", "오늘의 행성 사건 완료 상태를 계산하지 못했습니다.");
      }

      const storyProgress = advanceFrontierStory(planetSnap.data()?.frontierStory, {
        type: "daily_event_completed",
        nodeId: plan.dailyEvent.nodeId,
      }, serverNowMs);

      transaction.set(planet.ref, {
        materials: plan.materials,
        stats: plan.stats,
        frontierStory: storyProgress.story,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.set(operationRef, {
        ...plan.operation,
        frontierStory: storyProgress.story,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return {
        dailyEvent: plan.dailyEvent,
        reward: plan.dailyEvent.reward,
        materials: plan.materials,
        stats: plan.stats,
        frontierStory: storyProgress.story,
        deduplicated: false,
        serverNowMs,
      };
    });
    return serializeValue({ success: true, ...result });
  });

  const saveGalaxyPassport = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    await requireActiveGalaxyPlay(uid, data);
    const { user } = await requireMember(uid);
    const planet = await ensurePlanet(uid, user);
    const planetName = cleanText(data?.planetName, 30);
    const tagline = cleanText(data?.tagline, 80);
    const theme = GALAXY_THEMES.has(data?.theme) ? data.theme : "forest";
    const playStyles = uniqueIds(Array.isArray(data?.playStyles) ? data.playStyles : [])
      .filter((style) => GALAXY_PLAY_STYLES.has(style))
      .slice(0, 3);
    const visitMode = data?.visitMode === "private" ? "private" : "crew";
    if (planetName.length < 2) throw new functions.https.HttpsError("invalid-argument", "행성 이름을 두 글자 이상 입력해주세요.");
    if (containsUnsafePublicText(planetName) || containsUnsafePublicText(tagline)) {
      throw new functions.https.HttpsError("invalid-argument", "행성 공개 정보에는 연락처, 계정명 또는 링크를 넣을 수 없습니다.");
    }
    await planet.ref.set({ planetName, tagline, theme, playStyles, visitMode, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { success: true };
  });

  const buildGalaxyItem = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    await requireActiveGalaxyPlay(uid, data);
    const itemId = cleanId(data?.itemId, 80);
    const item = GALAXY_ITEM_CATALOG[itemId];
    if (!item) throw new functions.https.HttpsError("invalid-argument", "건설할 수 없는 시설입니다.");
    const requestedLevel = Number(data?.level ?? 1);
    if (!Number.isInteger(requestedLevel) || requestedLevel < 1 || requestedLevel > Number(item.maxLevel || 1)) {
      throw new functions.https.HttpsError("invalid-argument", "시설 등급이 올바르지 않습니다.");
    }
    if (requestedLevel > 1 && !item.stage2Available) {
      throw new functions.https.HttpsError("failed-precondition", "이 시설의 Stage 2 설계는 아직 준비 중입니다.");
    }
    const { userRef, user } = await requireMember(uid);
    const planet = await ensurePlanet(uid, user);
    const requestedOperationId = cleanId(data?.operationId, 120);
    if (requestedOperationId && !/^[A-Za-z0-9_-]{8,120}$/.test(requestedOperationId)) {
      throw new functions.https.HttpsError("invalid-argument", "건설 요청 식별자가 올바르지 않습니다.");
    }
    const operationId = requestedOperationId || userRef.collection("galaxyOperations").doc().id;
    const operationRef = userRef.collection("galaxyOperations").doc(operationId);
    const txRef = userRef.collection("crystal_transactions").doc(`galaxy-build-${operationId}`);
    const result = await db.runTransaction(async (transaction) => {
      const [operationSnap, userSnap, planetSnap] = await Promise.all([
        transaction.get(operationRef),
        transaction.get(userRef),
        transaction.get(planet.ref),
      ]);
      if (operationSnap.exists) {
        const previous = operationSnap.data() || {};
        if (previous.itemId !== itemId || Number(previous.level || 1) !== requestedLevel) {
          throw new functions.https.HttpsError("already-exists", "이미 다른 시설에 사용된 건설 요청입니다.");
        }
        return {
          placed: previous.placed,
          wallet: Math.max(0, Number(previous.wallet || 0)),
          materials: previous.materials || {},
          frontierStory: previous.frontierStory || null,
          storyGrantApplied: previous.storyGrantApplied === true,
          deduplicated: true,
        };
      }
      const currentUser = userSnap.data() || {};
      const currentPlanet = planetSnap.data() || {};
      const wallet = Math.max(0, Number(currentUser.crystals || 0));
      const materials = { ...(currentPlanet.materials || {}) };
      const materialCount = Math.max(0, Number(materials[item.material] || 0));
      const layout = Array.isArray(currentPlanet.layout) ? currentPlanet.layout : [];
      const pricing = getFrontierBuildPricing(currentPlanet.frontierStory, itemId, requestedLevel, item);
      const { totalCost, materialCost, storyGrantApplied } = pricing;
      if (wallet < totalCost) throw new functions.https.HttpsError("failed-precondition", "학습 광석이 부족합니다.");
      if (materialCount < materialCost) throw new functions.https.HttpsError("failed-precondition", `${item.name} 건설에 필요한 게임 재료가 부족합니다.`);
      if (layout.length >= 36) throw new functions.https.HttpsError("failed-precondition", "현재 구역에 더 이상 시설을 놓을 수 없습니다.");
      const instanceId = `${itemId}_${operationId.slice(0, 10)}`;
      const slot = layout.length;
      const requestedX = Number(data?.x);
      const requestedY = Number(data?.y);
      const x = Number.isFinite(requestedX) ? clamp(requestedX, 7.4, 92.6) : 16 + ((slot * 19) % 68);
      const y = Number.isFinite(requestedY) ? clamp(requestedY, 7.4, 92.6) : 24 + ((slot * 23) % 58);
      const placement = requireValidGalaxyItemPlacement(planGalaxyItemPlacement({ layout, x, y, rotation: 0 }));
      const placed = {
        instanceId,
        itemId,
        icon: item.icon,
        iconId: item.iconId,
        name: item.name,
        description: getGalaxyItemDefaultDescription(itemId),
        imagePath: "",
        imageUrl: "",
        x: placement.x,
        y: placement.y,
        rotation: placement.rotation,
        level: requestedLevel,
        locked: false,
      };
      materials[item.material] = materialCount - materialCost;
      const nextLayout = [...layout, placed];
      const builtItemIds = uniqueIds(nextLayout
        .filter((entry) => entry?.locked !== true)
        .map((entry) => cleanId(entry?.itemId, 80)));
      const buildCompletedAtMs = Date.now();
      const storyProgress = advanceFrontierStory(currentPlanet.frontierStory, {
        type: "item_built",
        itemId,
        level: requestedLevel,
        builtItemIds,
        discoveryCount: Array.isArray(currentPlanet.roverDiscoveries) ? currentPlanet.roverDiscoveries.length : 0,
      }, buildCompletedAtMs);
      const frontierAnalytics = updateFrontierAnalyticsFirstBuild(currentPlanet.frontierAnalytics, buildCompletedAtMs);
      transaction.set(userRef, { crystals: wallet - totalCost }, { merge: true });
      transaction.set(planet.ref, {
        layout: nextLayout,
        materials,
        frontierStory: storyProgress.story,
        frontierAnalytics,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.set(txRef, {
        amount: -totalCost,
        type: "galaxy_build",
        description: `${item.name} Stage ${requestedLevel} 행성 건설`,
        metadata: { itemId, instanceId: placed.instanceId, level: requestedLevel, source: "buildGalaxyItem" },
        timestamp: FieldValue.serverTimestamp(),
      });
      transaction.set(operationRef, {
        uid,
        type: "build",
        itemId,
        level: requestedLevel,
        amount: totalCost,
        placed,
        wallet: wallet - totalCost,
        materials,
        frontierStory: storyProgress.story,
        frontierAnalytics,
        storyGrantApplied,
        createdAt: FieldValue.serverTimestamp(),
      });
      return { placed, wallet: wallet - totalCost, materials, frontierStory: storyProgress.story, storyGrantApplied };
    });
    return serializeValue({ success: true, ...result });
  });

  const upgradeGalaxyItem = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    await requireActiveGalaxyPlay(uid, data);
    const instanceId = cleanId(data?.instanceId, 120);
    const targetLevel = Number(data?.targetLevel);
    const operationId = cleanId(data?.operationId, 120);
    if (
      typeof data?.instanceId !== "string"
      || !/^[A-Za-z0-9_-]{1,120}$/.test(instanceId)
      || !/^[A-Za-z0-9_-]{8,120}$/.test(operationId)
      || !Number.isInteger(targetLevel)
    ) {
      throw new functions.https.HttpsError("invalid-argument", "시설 업그레이드 요청이 올바르지 않습니다.");
    }

    const { userRef, user } = await requireMember(uid);
    const planet = await ensurePlanet(uid, user);
    const operationRef = userRef.collection("galaxyOperations").doc(operationId);
    const transactionRef = userRef.collection("crystal_transactions").doc(`galaxy-upgrade-${operationId}`);
    const result = await db.runTransaction(async (transaction) => {
      const [operationSnap, userSnap, planetSnap] = await Promise.all([
        transaction.get(operationRef),
        transaction.get(userRef),
        transaction.get(planet.ref),
      ]);
      if (operationSnap.exists) {
        const previous = operationSnap.data() || {};
        if (
          previous.type !== "upgrade"
          || previous.instanceId !== instanceId
          || Number(previous.targetLevel || 0) !== targetLevel
        ) {
          throw new functions.https.HttpsError("already-exists", "이미 다른 작업에 사용된 업그레이드 요청입니다.");
        }
        return {
          item: previous.item,
          wallet: Math.max(0, Number(previous.wallet || 0)),
          deduplicated: true,
        };
      }

      const layout = Array.isArray(planetSnap.data()?.layout) ? planetSnap.data().layout : [];
      const index = layout.findIndex((entry) => entry?.instanceId === instanceId);
      if (index < 0) throw new functions.https.HttpsError("not-found", "배치된 시설을 찾을 수 없습니다.");
      const current = layout[index] || {};
      const catalogItem = GALAXY_ITEM_CATALOG[current.itemId];
      if (!catalogItem) throw new functions.https.HttpsError("failed-precondition", "업그레이드할 수 없는 시설입니다.");
      if (!catalogItem.stage2Available) {
        throw new functions.https.HttpsError("failed-precondition", "이 시설의 Stage 2 설계는 아직 준비 중입니다.");
      }
      const currentLevel = Math.max(1, Number(current.level || 1));
      if (targetLevel !== currentLevel + 1 || targetLevel > Number(catalogItem.maxLevel || 1)) {
        throw new functions.https.HttpsError("failed-precondition", "현재 등급에서 진행할 수 없는 업그레이드입니다.");
      }
      const cost = targetLevel === 2 ? Number(catalogItem.stage2Cost || 0) : 0;
      const wallet = Math.max(0, Number(userSnap.data()?.crystals || 0));
      if (wallet < cost) throw new functions.https.HttpsError("failed-precondition", "업그레이드에 필요한 학습 광석이 부족합니다.");

      const upgraded = { ...current, level: targetLevel };
      const nextLayout = layout.map((entry, entryIndex) => entryIndex === index ? upgraded : entry);
      transaction.set(userRef, { crystals: wallet - cost }, { merge: true });
      transaction.set(planet.ref, { layout: nextLayout, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(transactionRef, {
        amount: -cost,
        type: "galaxy_object_upgrade",
        description: `${catalogItem.name} Stage ${targetLevel} 업그레이드`,
        metadata: { itemId: current.itemId, instanceId, targetLevel, source: "upgradeGalaxyItem" },
        timestamp: FieldValue.serverTimestamp(),
      });
      transaction.set(operationRef, {
        uid,
        type: "upgrade",
        instanceId,
        itemId: current.itemId,
        targetLevel,
        amount: cost,
        item: upgraded,
        wallet: wallet - cost,
        createdAt: FieldValue.serverTimestamp(),
      });
      return { item: upgraded, wallet: wallet - cost, deduplicated: false };
    });
    return serializeValue({ success: true, ...result });
  });

  const updateGalaxyItem = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    await requireActiveGalaxyPlay(uid, data);
    const rawInstanceId = data?.instanceId;
    const instanceId = cleanId(rawInstanceId, 120);
    if (
      typeof rawInstanceId !== "string"
      || rawInstanceId.trim() !== rawInstanceId
      || rawInstanceId.length > 120
      || !/^[A-Za-z0-9_-]{1,120}$/.test(instanceId)
    ) throw new functions.https.HttpsError("invalid-argument", "시설 식별자가 올바르지 않습니다.");

    const hasName = Object.prototype.hasOwnProperty.call(data || {}, "name");
    const hasDescription = Object.prototype.hasOwnProperty.call(data || {}, "description");
    const hasX = Object.prototype.hasOwnProperty.call(data || {}, "x");
    const hasY = Object.prototype.hasOwnProperty.call(data || {}, "y");
    const hasRotation = Object.prototype.hasOwnProperty.call(data || {}, "rotation");
    const hasImagePath = Object.prototype.hasOwnProperty.call(data || {}, "imagePath");
    const hasImageUrl = Object.prototype.hasOwnProperty.call(data || {}, "imageUrl");
    const name = hasName ? normalizeGalaxyItemPublicText(data.name) : "";
    const description = hasDescription ? normalizeGalaxyItemPublicText(data.description) : "";
    if (
      hasName
      && (!name || name.length > GALAXY_ITEM_NAME_MAX_LENGTH || containsUnsafePublicText(name))
    ) throw new functions.https.HttpsError("invalid-argument", "시설 이름은 안전한 글자로 1~40자 이내로 입력해주세요.");
    if (
      hasDescription
      && (description.length > GALAXY_ITEM_DESCRIPTION_MAX_LENGTH || containsUnsafePublicText(description))
    ) throw new functions.https.HttpsError("invalid-argument", "시설 설명에는 연락처, 계정명 또는 링크를 넣을 수 없습니다.");
    if (hasX && !Number.isFinite(Number(data.x))) {
      throw new functions.https.HttpsError("invalid-argument", "시설 X 좌표가 올바르지 않습니다.");
    }
    if (hasY && !Number.isFinite(Number(data.y))) {
      throw new functions.https.HttpsError("invalid-argument", "시설 Y 좌표가 올바르지 않습니다.");
    }
    if (hasRotation && !Number.isFinite(Number(data.rotation))) {
      throw new functions.https.HttpsError("invalid-argument", "시설 회전값이 올바르지 않습니다.");
    }
    if (hasImagePath !== hasImageUrl) {
      throw new functions.https.HttpsError("invalid-argument", "시설 이미지 주소와 저장 경로를 함께 보내주세요.");
    }
    const nextImage = hasImagePath
      ? validateGalaxyObjectImage({ uid, instanceId, imagePath: data.imagePath, imageUrl: data.imageUrl })
      : null;
    if (nextImage && !nextImage.valid) {
      throw new functions.https.HttpsError("invalid-argument", "시설 이미지는 본인 시설의 Firebase Storage 경로만 사용할 수 있습니다.");
    }

    const { user } = await requireMember(uid);
    const planet = await ensurePlanet(uid, user);
    const result = await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(planet.ref);
      const layout = Array.isArray(snap.data()?.layout) ? snap.data().layout : [];
      const index = layout.findIndex((entry) => entry?.instanceId === instanceId);
      if (index < 0) throw new functions.https.HttpsError("not-found", "배치된 시설을 찾을 수 없습니다.");
      const current = layout[index] || {};
      const placement = requireValidGalaxyItemPlacement(planGalaxyItemPlacement({
        layout,
        instanceId,
        x: hasX ? data.x : current.x,
        y: hasY ? data.y : current.y,
        rotation: hasRotation ? data.rotation : current.rotation || 0,
      }));
      const defaultName = cleanText(
        current.name || GALAXY_ITEM_CATALOG[current.itemId]?.name || "이름 없는 시설",
        GALAXY_ITEM_NAME_MAX_LENGTH,
      ) || "이름 없는 시설";
      const defaultDescription = getGalaxyItemDefaultDescription(current.itemId);
      const updated = {
        ...current,
        name: hasName ? name : defaultName,
        description: hasDescription ? (description || defaultDescription) : cleanText(current.description, GALAXY_ITEM_DESCRIPTION_MAX_LENGTH) || defaultDescription,
        x: placement.x,
        y: placement.y,
        rotation: placement.rotation,
        imagePath: nextImage ? nextImage.imagePath : cleanText(current.imagePath, GALAXY_OBJECT_IMAGE_PATH_MAX_LENGTH),
        imageUrl: nextImage ? nextImage.imageUrl : cleanText(current.imageUrl, GALAXY_OBJECT_IMAGE_URL_MAX_LENGTH),
      };
      const nextLayout = layout.map((entry, entryIndex) => entryIndex === index ? updated : entry);
      transaction.set(planet.ref, { layout: nextLayout, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return {
        item: updated,
        layout: nextLayout,
        previousImagePath: cleanText(current.imagePath, GALAXY_OBJECT_IMAGE_PATH_MAX_LENGTH),
      };
    });
    if (result.previousImagePath && result.previousImagePath !== result.item.imagePath) {
      await deleteGalaxyObjectImageBestEffort(uid, instanceId, result.previousImagePath);
    }
    return serializeValue({ success: true, item: result.item, layout: result.layout });
  });

  const moveGalaxyItem = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    await requireActiveGalaxyPlay(uid, data);
    const rawInstanceId = data?.instanceId;
    const instanceId = cleanId(rawInstanceId, 120);
    if (
      typeof rawInstanceId !== "string"
      || rawInstanceId.trim() !== rawInstanceId
      || rawInstanceId.length > 120
      || !/^[A-Za-z0-9_-]{1,120}$/.test(instanceId)
      || !Number.isFinite(Number(data?.x))
      || !Number.isFinite(Number(data?.y))
      || !Number.isFinite(Number(data?.rotation ?? 0))
    ) throw new functions.https.HttpsError("invalid-argument", "시설 이동 정보가 올바르지 않습니다.");
    const { user } = await requireMember(uid);
    const planet = await ensurePlanet(uid, user);
    const result = await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(planet.ref);
      const layout = Array.isArray(snap.data()?.layout) ? snap.data().layout : [];
      const index = layout.findIndex((entry) => entry?.instanceId === instanceId);
      if (index < 0) throw new functions.https.HttpsError("not-found", "배치된 시설을 찾을 수 없습니다.");
      const placement = requireValidGalaxyItemPlacement(planGalaxyItemPlacement({
        layout,
        instanceId,
        x: data.x,
        y: data.y,
        rotation: data.rotation ?? 0,
      }));
      const item = { ...layout[index], x: placement.x, y: placement.y, rotation: placement.rotation };
      const nextLayout = layout.map((entry, entryIndex) => entryIndex === index ? item : entry);
      transaction.set(planet.ref, { layout: nextLayout, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return { item, layout: nextLayout };
    });
    return serializeValue({ success: true, ...result });
  });

  const deleteGalaxyItem = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    await requireActiveGalaxyPlay(uid, data);
    const rawInstanceId = data?.instanceId;
    const instanceId = cleanId(rawInstanceId, 120);
    if (
      typeof rawInstanceId !== "string"
      || rawInstanceId.trim() !== rawInstanceId
      || rawInstanceId.length > 120
      || !/^[A-Za-z0-9_-]{1,120}$/.test(instanceId)
    ) throw new functions.https.HttpsError("invalid-argument", "삭제할 시설 식별자가 올바르지 않습니다.");
    const { user } = await requireMember(uid);
    const planet = await ensurePlanet(uid, user);
    const result = await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(planet.ref);
      const layout = Array.isArray(snap.data()?.layout) ? snap.data().layout : [];
      const index = layout.findIndex((entry) => entry?.instanceId === instanceId);
      if (index < 0) throw new functions.https.HttpsError("not-found", "배치된 시설을 찾을 수 없습니다.");
      const deleted = layout[index] || {};
      const nextLayout = layout.filter((_, entryIndex) => entryIndex !== index);
      transaction.set(planet.ref, { layout: nextLayout, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return { deleted, layout: nextLayout };
    });
    await deleteGalaxyObjectImageBestEffort(uid, instanceId, result.deleted?.imagePath);
    return serializeValue({ success: true, deleted: result.deleted, layout: result.layout, refunded: false });
  });

  const performGalaxyVisitAction = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    await requireActiveGalaxyPlay(uid, data);
    const targetUid = cleanId(data?.targetUid);
    const actionId = cleanId(data?.actionId, 40);
    const action = GALAXY_VISIT_ACTIONS[actionId];
    const visitMessage = GALAXY_SAFE_VISIT_MESSAGES.has(data?.message) ? data.message : "";
    if (!targetUid || targetUid === uid || !action) throw new functions.https.HttpsError("invalid-argument", "방문 행동 정보가 올바르지 않습니다.");
    const rawNodeId = data?.nodeId;
    const nodeId = rawNodeId == null || rawNodeId === "" ? "" : cleanId(rawNodeId, 80);
    const rawInstanceId = data?.instanceId;
    const instanceId = rawInstanceId == null || rawInstanceId === "" ? "" : cleanId(rawInstanceId, 120);
    if (nodeId && (typeof rawNodeId !== "string" || rawNodeId.trim().length > 80 || !/^[A-Za-z0-9_-]{1,80}$/.test(nodeId))) {
      throw new functions.https.HttpsError("invalid-argument", "방문 위치 식별자가 올바르지 않습니다.");
    }
    if (rawInstanceId != null && rawInstanceId !== "" && (
      typeof rawInstanceId !== "string"
      || rawInstanceId.trim() !== rawInstanceId
      || rawInstanceId.length > 120
      || !/^[A-Za-z0-9_-]{1,120}$/.test(instanceId)
    )) throw new functions.https.HttpsError("invalid-argument", "방문 시설 식별자가 올바르지 않습니다.");
    if (nodeId && instanceId) {
      throw new functions.https.HttpsError("invalid-argument", "방문 위치와 시설은 하나만 선택해주세요.");
    }
    if (nodeId && !GALAXY_VISIT_NODE_ACTIONS[nodeId]) {
      throw new functions.https.HttpsError("invalid-argument", "알 수 없는 방문 위치입니다.");
    }
    if (nodeId && GALAXY_VISIT_NODE_ACTIONS[nodeId] !== actionId) {
      throw new functions.https.HttpsError("invalid-argument", "이 위치에서 남길 수 없는 방문 행동입니다.");
    }
    const parsedPosition = parseGalaxyVisitPosition(data?.position);
    if (parsedPosition.provided && !parsedPosition.value) {
      throw new functions.https.HttpsError("invalid-argument", "방문 장면 좌표가 올바르지 않습니다.");
    }
    if (parsedPosition.provided && !nodeId && !instanceId) {
      throw new functions.https.HttpsError("invalid-argument", "방문 장면 좌표에는 위치 식별자가 필요합니다.");
    }
    const expectedPosition = nodeId ? GALAXY_VISIT_NODE_POSITIONS[nodeId] : null;
    if (parsedPosition.value && expectedPosition && Math.hypot(
      parsedPosition.value.x - expectedPosition[0],
      parsedPosition.value.z - expectedPosition[1],
    ) > 0.75) {
      throw new functions.https.HttpsError("invalid-argument", "방문 장면 좌표가 위치 식별자와 일치하지 않습니다.");
    }
    const fixedVisitPosition = expectedPosition ? { x: expectedPosition[0], z: expectedPosition[1] } : null;
    const { user: actor } = await requireMember(uid);
    const sharedCrew = await getSharedCrew(uid, targetUid, actor);
    if (!sharedCrew) throw new functions.https.HttpsError("permission-denied", "같은 크루 친구에게만 도움을 줄 수 있습니다.");
    const [targetUserSnap] = await Promise.all([db.collection("users").doc(targetUid).get()]);
    if (!targetUserSnap.exists) throw new functions.https.HttpsError("not-found", "행성 주인을 찾을 수 없습니다.");
    const [actorPlanet, targetPlanet] = await Promise.all([
      ensurePlanet(uid, actor),
      ensurePlanet(targetUid, targetUserSnap.data() || {}),
    ]);
    if (targetPlanet.data.visitMode === "private") throw new functions.https.HttpsError("permission-denied", "현재 방문을 받지 않는 행성입니다.");
    const dayKey = getKstDayKey();
    const dailyRef = db.collection("galaxyOperations").doc(`visit_${dayKey}_${uid}_${targetUid}`);
    const eventRef = targetPlanet.ref.collection("visitEvents").doc();
    const relationshipId = getGalaxyRelationshipId(uid, targetUid);
    const relationshipRef = db.collection("galaxyRelationships").doc(relationshipId);
    const result = await db.runTransaction(async (transaction) => {
      const [dailySnap, targetSnap, actorSnap, relationshipSnap] = await Promise.all([
        transaction.get(dailyRef), transaction.get(targetPlanet.ref), transaction.get(actorPlanet.ref), transaction.get(relationshipRef),
      ]);
      const daily = dailySnap.data() || {};
      const count = Math.max(0, Number(daily.count || 0));
      if (count >= 8) throw new functions.https.HttpsError("resource-exhausted", "이 친구에게 오늘 남길 수 있는 도움을 모두 사용했습니다.");
      const targetData = targetSnap.data() || {};
      let structure = null;
      let visitPosition = fixedVisitPosition;
      if (instanceId) {
        const targetLayout = Array.isArray(targetData.layout) ? targetData.layout : [];
        const structureVisit = planGalaxyStructureVisit({
          layout: targetLayout,
          instanceId,
          actionId,
          clientPosition: parsedPosition.value,
        });
        if (structureVisit.kind === "not_found") {
          throw new functions.https.HttpsError("not-found", "친구 행성에서 해당 시설을 찾을 수 없습니다.");
        }
        if (structureVisit.kind === "action_mismatch") {
          throw new functions.https.HttpsError("invalid-argument", "이 시설에서 남길 수 없는 방문 행동입니다.");
        }
        if (structureVisit.kind === "stale_position") {
          throw new functions.https.HttpsError("failed-precondition", "시설이 이동했습니다. 현재 위치에서 다시 시도해주세요.");
        }
        if (structureVisit.kind !== "valid") {
          throw new functions.https.HttpsError("internal", "시설 방문 행동을 확인하지 못했습니다.");
        }
        structure = structureVisit.structure;
        visitPosition = structureVisit.position;
      }
      const stats = { ...(targetData.stats || {}) };
      stats[action.stat] = action.stat === "admirationCount"
        ? Math.max(0, Number(stats[action.stat] || 0)) + 1
        : clamp(Number(stats[action.stat] || 0) + 4, 0, 100);
      stats.visits = Math.max(0, Number(stats.visits || 0)) + (count === 0 ? 1 : 0);
      const actorData = actorSnap.data() || {};
      const materials = { ...(actorData.materials || {}) };
      const rewarded = count < 3;
      if (rewarded) materials.stardust = Math.max(0, Number(materials.stardust || 0)) + 1;
      const relationship = relationshipSnap.data() || {};
      const relationshipProgress = getGalaxyRelationshipProgress(
        Math.max(0, Number(relationship.connectionXp || 0)) + action.connectionXp,
      );
      const interactionCount = Math.max(0, Math.floor(Number(relationship.interactionCount) || 0)) + 1;
      const lastAction = {
        actionId,
        actorId: uid,
        targetId: targetUid,
        message: visitMessage,
        at: FieldValue.serverTimestamp(),
        ...(nodeId ? { nodeId } : {}),
        ...(instanceId ? { instanceId, itemId: structure?.itemId || "" } : {}),
        ...(visitPosition ? { position: visitPosition } : {}),
      };
      const relationshipUpdate = {
        memberIds: [uid, targetUid].sort(),
        crewId: sharedCrew.id,
        connectionXp: relationshipProgress.connectionXp,
        interactionCount,
        routeLevel: relationshipProgress.routeLevel,
        lastAction,
        updatedAt: FieldValue.serverTimestamp(),
        ...(!relationshipSnap.exists ? { createdAt: FieldValue.serverTimestamp() } : {}),
      };
      const eventData = {
        ownerId: targetUid,
        actorId: uid,
        actorName: getPublicName(actor),
        actionId,
        actionLabel: action.label,
        actionIcon: action.icon,
        actionIconId: action.iconId,
        message: visitMessage,
        relationshipId,
        relationshipLevel: relationshipProgress.routeLevel,
        connectionXpGained: action.connectionXp,
        seen: false,
        createdAt: FieldValue.serverTimestamp(),
        ...(nodeId ? { nodeId } : {}),
        ...(instanceId ? {
          instanceId,
          itemId: structure?.itemId || "",
          objectName: cleanText(structure?.name || GALAXY_ITEM_CATALOG[structure?.itemId]?.name || "행성 시설", GALAXY_ITEM_NAME_MAX_LENGTH),
        } : {}),
        ...(visitPosition ? { position: visitPosition } : {}),
      };
      const storyProgress = advanceFrontierStory(actorData.frontierStory, {
        type: "social_help_completed",
        routeLevel: relationshipProgress.routeLevel,
        discoveryCount: Array.isArray(actorData.roverDiscoveries) ? actorData.roverDiscoveries.length : 0,
        builtItemIds: uniqueIds((Array.isArray(actorData.layout) ? actorData.layout : [])
          .filter((entry) => entry?.locked !== true)
          .map((entry) => cleanId(entry?.itemId, 80))),
      });
      transaction.set(targetPlanet.ref, { stats, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(actorPlanet.ref, {
        materials,
        frontierStory: storyProgress.story,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.set(dailyRef, { actorId: uid, targetId: targetUid, dayKey, count: count + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(relationshipRef, relationshipUpdate, { merge: true });
      transaction.set(eventRef, eventData);
      return {
        rewarded,
        material: rewarded ? "stardust" : "",
        materials,
        stat: action.stat,
        statValue: stats[action.stat],
        statAmount: action.stat === "admirationCount" ? 1 : 4,
        connectionXpGained: action.connectionXp,
        dailyHelpCount: count + 1,
        dailyHelpLimit: 8,
        dailyRewardLimit: 3,
        relationshipId,
        routeLevel: relationshipProgress.routeLevel,
        connectionXp: relationshipProgress.connectionXp,
        nextLevelXp: relationshipProgress.nextLevelXp,
        frontierStory: storyProgress.story,
        ...(instanceId ? { instanceId, position: visitPosition } : {}),
      };
    });
    return { success: true, ...result };
  });

  const startGalaxyRoverExpedition = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    await requireActiveGalaxyPlay(uid, data);
    const route = cleanId(data?.route, 40);
    if (!GALAXY_ROVER_ROUTES[route]) {
      throw new functions.https.HttpsError("invalid-argument", "탐사 로버 항로가 올바르지 않습니다.");
    }
    const { userRef, user } = await requireMember(uid);
    const rawOperationId = data?.operationId;
    const requestedOperationId = cleanId(rawOperationId, 120);
    if (rawOperationId != null && rawOperationId !== "" && (
      typeof rawOperationId !== "string"
      || rawOperationId.trim().length > 120
      || !/^[A-Za-z0-9_-]{8,120}$/.test(requestedOperationId)
    )) {
      throw new functions.https.HttpsError("invalid-argument", "탐사 로버 요청 식별자가 올바르지 않습니다.");
    }
    const operationId = requestedOperationId || userRef.collection("galaxyOperations").doc().id;
    const reportFlowVersion = Number(data?.reportFlowVersion) >= GALAXY_ROVER_REPORT_FLOW_VERSION
      ? GALAXY_ROVER_REPORT_FLOW_VERSION
      : 1;
    const operationRef = userRef.collection("galaxyOperations").doc(operationId);
    const planet = await ensurePlanet(uid, user);
    const serverNowMs = Date.now();
    const currentDailyEvent = buildGalaxyDailyEvent({ uid, nowMs: serverNowMs });
    const currentDailyOperationRef = db.collection("galaxyOperations").doc(`daily_${uid}_${currentDailyEvent.dayKey}`);
    const result = await db.runTransaction(async (transaction) => {
      const [operationSnap, freshUserSnap, planetSnap, currentDailyOperationSnap] = await Promise.all([
        transaction.get(operationRef),
        transaction.get(userRef),
        transaction.get(planet.ref),
        transaction.get(currentDailyOperationRef),
      ]);
      const freshUser = freshUserSnap.data() || {};
      if (
        !freshUserSnap.exists
        || freshUser.isGuest === true
        || freshUser.isDeleted === true
        || freshUser.accountStatus === "deleted"
      ) {
        throw new functions.https.HttpsError("failed-precondition", "정식 학생 계정에서만 탐사 로버를 보낼 수 있습니다.");
      }
      if (!planetSnap.exists) {
        throw new functions.https.HttpsError("not-found", "탐사 로버를 출발시킬 행성을 찾을 수 없습니다.");
      }
      const planetData = planetSnap.data() || {};
      const prevOpId = cleanId(planetData.roverExpedition?.operationId, 120);
      let previousOperationSnap = null;
      if (prevOpId && prevOpId !== operationId) {
        const prevOpRef = userRef.collection("galaxyOperations").doc(prevOpId);
        previousOperationSnap = await transaction.get(prevOpRef);
      }
      const isPrevOpClaimed = previousOperationSnap?.exists && previousOperationSnap.data()?.status === "claimed";
      const effectivePlanet = {
        ...planetData,
        ...(isPrevOpClaimed ? {
          roverExpedition: {
            ...(planetData.roverExpedition || {}),
            status: "claimed",
            claimedAtMs: previousOperationSnap.data()?.claimedAtMs || Date.now(),
            result: previousOperationSnap.data()?.claimResult || planetData.roverExpedition?.result || null,
          },
        } : {}),
      };
      const plan = planGalaxyRoverStart({
        operationId,
        route,
        existingOperation: operationSnap.exists ? operationSnap.data() || {} : null,
        planet: effectivePlanet,
        nowMs: serverNowMs,
        reportFlowVersion,
      });
      const applyCompletedDailyEvent = (story) => currentDailyOperationSnap.exists
        && currentDailyOperationSnap.data()?.type === GALAXY_DAILY_EVENT_OPERATION_TYPE
        && currentDailyOperationSnap.data()?.status === "completed"
        ? advanceFrontierStory(story, {
          type: "daily_event_completed",
          nodeId: currentDailyEvent.nodeId,
        }, serverNowMs).story
        : story;
      if (plan.kind === "operation_conflict") {
        throw new functions.https.HttpsError("already-exists", "이미 다른 탐사에 사용된 요청 식별자입니다.");
      }
      if (plan.kind === "active") {
        const reportPending = plan.expedition?.status === "claimed";
        throw new functions.https.HttpsError("failed-precondition", reportPending
          ? "귀환 보고서를 보관한 뒤 다음 원정을 시작할 수 있습니다."
          : "현재 탐사 중이거나 귀환 대기 중인 로버가 있습니다.", {
          reason: reportPending ? "report_pending" : "active_expedition",
          expedition: serializeValue(plan.expedition),
          serverNowMs,
        });
      }
      if (plan.kind === "deduplicated") {
        return {
          expedition: getGalaxyRoverExpeditionView(plan.expedition, serverNowMs),
          frontierStory: planetData.frontierStory,
          deduplicated: true,
        };
      }
      if (plan.kind !== "startable" || !plan.expedition) {
        throw new functions.https.HttpsError("internal", "탐사 로버 출발 상태를 만들지 못했습니다.");
      }
      const expedition = plan.expedition;
      const roverStats = buildGalaxyRoverStatsAfterLaunch(planetData.roverStats, expedition);
      const dispatchedStory = advanceFrontierStory(planetData.frontierStory, { type: "rover_dispatched" }, serverNowMs).story;
      const frontierStory = applyCompletedDailyEvent(dispatchedStory);
      const frontierAnalytics = updateFrontierAnalyticsPrologue(planetData.frontierAnalytics, frontierStory, serverNowMs);
      transaction.set(planet.ref, {
        roverExpedition: expedition,
        roverStats,
        frontierStory,
        frontierAnalytics,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.set(operationRef, {
        ...expedition,
        uid,
        type: GALAXY_ROVER_OPERATION_TYPE,
        frontierStory,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      // 운영 지표: 출항 전환 이벤트를 원정 단위로 기록한다. 트랜잭션 안에서 같은 문서 id를 덮어쓰므로 재시도에도 중복되지 않는다.
      transaction.set(userRef.collection("galaxyRoverEvents").doc(`${operationId}_dispatched`), {
        ...buildGalaxyRoverEventPayload("dispatched", {
          operationId,
          route: expedition.route,
          expeditionNo: expedition.expeditionNo,
          reportFlowVersion: expedition.reportFlowVersion,
          nowMs: serverNowMs,
        }),
        createdAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return { expedition: getGalaxyRoverExpeditionView(expedition, serverNowMs), frontierStory, deduplicated: false };
    });
    return serializeValue({ success: true, operationId, serverNowMs, ...result });
  });

  const claimGalaxyRoverExpedition = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    await requireActiveGalaxyPlay(uid, data);
    const { userRef, user } = await requireMember(uid);
    const rawOperationId = data?.operationId;
    const operationId = cleanId(rawOperationId, 120);
    if (
      typeof rawOperationId !== "string"
      || rawOperationId.trim().length > 120
      || !/^[A-Za-z0-9_-]{8,120}$/.test(operationId)
    ) {
      throw new functions.https.HttpsError("invalid-argument", "수령할 탐사 로버 요청 식별자가 올바르지 않습니다.");
    }
    const operationRef = userRef.collection("galaxyOperations").doc(operationId);
    const planet = await ensurePlanet(uid, user);
    const serverNowMs = Date.now();
    const result = await db.runTransaction(async (transaction) => {
      const [operationSnap, freshUserSnap, planetSnap] = await Promise.all([
        transaction.get(operationRef),
        transaction.get(userRef),
        transaction.get(planet.ref),
      ]);
      const freshUser = freshUserSnap.data() || {};
      if (
        !freshUserSnap.exists
        || freshUser.isGuest === true
        || freshUser.isDeleted === true
        || freshUser.accountStatus === "deleted"
      ) {
        throw new functions.https.HttpsError("failed-precondition", "정식 학생 계정에서만 탐사 로버 보상을 받을 수 있습니다.");
      }
      if (!planetSnap.exists) {
        throw new functions.https.HttpsError("not-found", "탐사 로버가 귀환할 행성을 찾을 수 없습니다.");
      }
      const plan = planGalaxyRoverClaim({
        operationId,
        operation: operationSnap.exists ? operationSnap.data() || {} : null,
        planet: planetSnap.data() || {},
        nowMs: serverNowMs,
      });
      if (plan.kind === "not_found") {
        throw new functions.https.HttpsError("not-found", "탐사 로버 기록을 찾을 수 없습니다.");
      }
      if (plan.kind === "operation_conflict") {
        throw new functions.https.HttpsError("already-exists", "이 요청 식별자는 탐사 로버 기록이 아닙니다.");
      }
      if (plan.kind === "not_ready") {
        throw new functions.https.HttpsError("failed-precondition", "탐사 로버가 아직 귀환하지 않았습니다.", {
          readyAtMs: plan.readyAtMs,
          serverNowMs,
        });
      }
      if (plan.kind === "inactive") {
        throw new functions.https.HttpsError("failed-precondition", "현재 행성의 활성 탐사 로버와 요청이 일치하지 않습니다.");
      }
      if (["invalid_reward", "invalid_discovery"].includes(plan.kind)) {
        throw new functions.https.HttpsError("data-loss", "탐사 로버 보상 기록을 확인할 수 없습니다.");
      }
      if (plan.kind === "deduplicated") {
        if (!plan.claimResult) {
          throw new functions.https.HttpsError("data-loss", "완료된 탐사 로버의 수령 결과가 없습니다.");
        }
        const planetData = planetSnap.data() || {};
        const storedOperation = operationSnap.data() || {};
        const frontierStory = storedOperation.frontierStory || planetData.frontierStory;
        const claimResult = storedOperation.claimResult || plan.claimResult;
        const expedition = {
          ...plan.expedition,
          status: "claimed",
          claimedAtMs: claimResult?.claimedAtMs || storedOperation.claimedAtMs || serverNowMs,
          result: claimResult,
        };
        transaction.set(planet.ref, { roverExpedition: expedition, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        return {
          expedition: getGalaxyRoverExpeditionView(expedition, serverNowMs),
          claimResult,
          frontierStory,
          deduplicated: true,
        };
      }
      if (plan.kind !== "claimable") {
        throw new functions.https.HttpsError("internal", "탐사 로버 수령 상태를 계산하지 못했습니다.");
      }
      const planetData = planetSnap.data() || {};
      const storyProgress = advanceFrontierStory(planetData.frontierStory, {
        type: "rover_claimed",
        isNewDiscovery: plan.claimResult.isNewDiscovery,
        discoveryCount: Array.isArray(plan.roverDiscoveries) ? plan.roverDiscoveries.length : 0,
        discoveryRoutes: getGalaxyRoverDiscoveryRoutes(plan.roverDiscoveries),
        builtItemIds: uniqueIds((Array.isArray(planetData.layout) ? planetData.layout : [])
          .filter((entry) => entry?.locked !== true)
          .map((entry) => cleanId(entry?.itemId, 80))),
      }, serverNowMs);
      const claimResult = {
        ...plan.claimResult,
        storyProgressAtClaim: buildGalaxyRoverStoryProgressAtClaim(planetData.frontierStory, storyProgress),
      };
      const expedition = {
        ...plan.expedition,
        status: "claimed",
        claimedAtMs: claimResult.claimedAtMs,
        result: claimResult,
      };
      const roverStats = buildGalaxyRoverStatsAfterClaim(planetData.roverStats, claimResult);
      transaction.set(planet.ref, {
        materials: plan.materials,
        roverDiscoveries: plan.roverDiscoveries,
        roverExpedition: expedition,
        roverStats,
        frontierStory: storyProgress.story,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.set(operationRef, {
        status: "claimed",
        claimedAtMs: claimResult.claimedAtMs,
        claimedAt: FieldValue.serverTimestamp(),
        claimResult,
        frontierStory: storyProgress.story,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      // 운영 지표: 수령 전환 이벤트. 출항 시각 대비 경과 시간과 신규 발견 여부로 이탈/재관측 비율을 관찰한다.
      const claimOperation = operationSnap.data() || {};
      transaction.set(userRef.collection("galaxyRoverEvents").doc(`${operationId}_claimed`), {
        ...buildGalaxyRoverEventPayload("claimed", {
          operationId,
          route: claimOperation.route || expedition.route || "",
          expeditionNo: claimOperation.expeditionNo || expedition.expeditionNo,
          reportFlowVersion: claimOperation.reportFlowVersion || expedition.reportFlowVersion,
          nowMs: serverNowMs,
          isNewDiscovery: Boolean(claimResult.isNewDiscovery),
          rarity: claimResult.discovery?.rarity || null,
          elapsedMs: serverNowMs - Number(claimOperation.startedAtMs || 0),
        }),
        createdAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return {
        expedition: getGalaxyRoverExpeditionView(expedition, serverNowMs),
        claimResult,
        frontierStory: storyProgress.story,
        deduplicated: false,
      };
    });
    return serializeValue({ success: true, operationId, serverNowMs, ...result });
  });

  const acknowledgeGalaxyRoverReport = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    await requireActiveGalaxyPlay(uid, data);
    const { userRef, user } = await requireMember(uid);
    const operationId = cleanId(data?.operationId, 120);
    if (!/^[A-Za-z0-9_-]{8,120}$/.test(operationId)) {
      throw new functions.https.HttpsError("invalid-argument", "보관할 루미 원정 보고서 식별자가 올바르지 않습니다.");
    }
    const operationRef = userRef.collection("galaxyOperations").doc(operationId);
    const planet = await ensurePlanet(uid, user);
    const serverNowMs = Date.now();
    const result = await db.runTransaction(async (transaction) => {
      const [operationSnap, planetSnap] = await Promise.all([
        transaction.get(operationRef),
        transaction.get(planet.ref),
      ]);
      const plan = planGalaxyRoverReportAcknowledgement({
        operationId,
        operation: operationSnap.exists ? operationSnap.data() || {} : null,
        planet: planetSnap.exists ? planetSnap.data() || {} : {},
      });
      if (plan.kind === "not_found") {
        throw new functions.https.HttpsError("not-found", "보관할 루미 원정 기록을 찾지 못했습니다.");
      }
      if (plan.kind === "operation_conflict") {
        throw new functions.https.HttpsError("already-exists", "이 기록은 루미 로버 원정이 아닙니다.");
      }
      if (plan.kind === "not_claimed") {
        throw new functions.https.HttpsError("failed-precondition", "귀환 결과를 수령한 뒤 보고서를 보관할 수 있습니다.", { reason: "not_claimed" });
      }
      if (plan.kind === "stale_operation") {
        throw new functions.https.HttpsError("failed-precondition", "현재 관제 중인 원정과 다른 보고서입니다.", { reason: "stale_operation" });
      }
      if (plan.kind === "deduplicated") {
        return { status: "deduplicated" };
      }
      const planetData = planetSnap.data() || {};
      const ackOperation = operationSnap.data() || {};
      transaction.set(operationRef, {
        status: "claimed",
        reportAcknowledgedAtMs: serverNowMs,
        reportAcknowledgedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.set(planet.ref, {
        roverExpedition: null,
        roverStats: buildGalaxyRoverStatsAfterAcknowledgement(planetData.roverStats, operationId),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      // 운영 지표: 보관 전환 이벤트. 수령 대비 경과 시간으로 보고서 체류·미보관 이탈을 관찰한다.
      transaction.set(userRef.collection("galaxyRoverEvents").doc(`${operationId}_acknowledged`), {
        ...buildGalaxyRoverEventPayload("acknowledged", {
          operationId,
          route: ackOperation.route || "",
          expeditionNo: ackOperation.expeditionNo,
          reportFlowVersion: ackOperation.reportFlowVersion,
          nowMs: serverNowMs,
          elapsedMs: serverNowMs - Number(ackOperation.claimedAtMs || ackOperation.startedAtMs || 0),
        }),
        createdAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return { status: "acknowledged" };
    });
    return serializeValue({ success: true, operationId, serverNowMs, ...result });
  });

  const listGalaxyRoverExpeditions = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    await requireActiveGalaxyPlay(uid, data);
    const { userRef } = await requireMember(uid);
    const requestedLimit = Math.floor(Number(data?.limit || 10));
    const pageSize = Math.min(20, Math.max(1, requestedLimit));
    const cursorOperationId = cleanId(data?.cursorOperationId, 120);
    let historyQuery = userRef.collection("galaxyOperations")
      .where("type", "==", GALAXY_ROVER_OPERATION_TYPE)
      .orderBy("startedAtMs", "desc")
      .limit(pageSize + 1);
    if (cursorOperationId) {
      const cursorSnap = await userRef.collection("galaxyOperations").doc(cursorOperationId).get();
      if (!cursorSnap.exists || cursorSnap.data()?.type !== GALAXY_ROVER_OPERATION_TYPE) {
        throw new functions.https.HttpsError("invalid-argument", "원정 일지 다음 페이지 식별자가 올바르지 않습니다.");
      }
      historyQuery = historyQuery.startAfter(cursorSnap);
    }
    const historySnap = await historyQuery.get();
    const rows = historySnap.docs.slice(0, pageSize).map((snap) => {
      const operation = snap.data() || {};
      const claimResult = operation.claimResult || {};
      return {
        operationId: operation.operationId || snap.id,
        expeditionNo: Number(operation.expeditionNo || 0) || null,
        route: operation.route || "",
        routeTitle: operation.routeTitle || "루미 로버 원정",
        startedAtMs: Number(operation.startedAtMs || 0),
        readyAtMs: Number(operation.readyAtMs || 0),
        claimedAtMs: Number(operation.claimedAtMs || 0),
        reportAcknowledgedAtMs: Number(operation.reportAcknowledgedAtMs || 0),
        reward: claimResult.reward || operation.reward || null,
        discovery: claimResult.discovery || null,
        isNewDiscovery: typeof claimResult.isNewDiscovery === "boolean" ? claimResult.isNewDiscovery : null,
        bonuses: operation.bonuses || {},
        storyContextAtLaunch: operation.storyContextAtLaunch || null,
        storyProgressAtClaim: claimResult.storyProgressAtClaim || null,
        legacy: Number(operation.reportFlowVersion || 1) < GALAXY_ROVER_REPORT_FLOW_VERSION,
      };
    });
    const hasMore = historySnap.docs.length > pageSize;
    return serializeValue({
      success: true,
      entries: rows,
      nextCursorOperationId: hasMore ? rows.at(-1)?.operationId || "" : "",
      hasMore,
    });
  });

  const runGalaxyMission = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    await requireActiveGalaxyPlay(uid, data, { minRemainingSeconds: 60 });
    const route = ["nebula", "comet", "ruins"].includes(data?.route) ? data.route : "nebula";
    const partnerUid = cleanId(data?.partnerUid);
    const { userRef, user } = await requireMember(uid);
    if (partnerUid && partnerUid !== uid && !(await getSharedCrew(uid, partnerUid, user))) {
      throw new functions.https.HttpsError("permission-denied", "같은 크루 친구만 릴레이 파트너로 선택할 수 있습니다.");
    }
    const planet = await ensurePlanet(uid, user);
    const requestedOperationId = cleanId(data?.operationId, 120);
    if (requestedOperationId && !/^[A-Za-z0-9_-]{8,120}$/.test(requestedOperationId)) {
      throw new functions.https.HttpsError("invalid-argument", "탐사 요청 식별자가 올바르지 않습니다.");
    }
    const operationId = requestedOperationId || userRef.collection("galaxyOperations").doc().id;
    const missionRef = userRef.collection("galaxyOperations").doc(operationId);
    const result = await db.runTransaction(async (transaction) => {
      const [operationSnap, snap] = await Promise.all([
        transaction.get(missionRef),
        transaction.get(planet.ref),
      ]);
      if (operationSnap.exists) {
        const previous = operationSnap.data() || {};
        if (previous.type !== "galaxy_mission" || previous.route !== route) {
          throw new functions.https.HttpsError("already-exists", "이미 다른 탐사에 사용된 요청입니다.");
        }
        return {
          reward: previous.reward,
          bonus: Math.max(0, Number(previous.bonus || 0)),
          nextMissionAtMs: Math.max(0, Number(previous.nextMissionAtMs || 0)),
          frontierStory: previous.frontierStory || null,
          deduplicated: true,
        };
      }
      const current = snap.data() || {};
      const nowMs = Date.now();
      const lastMissionAtMs = Math.max(0, Number(current.lastMissionAtMs || 0));
      const cooldownMs = 2 * 60 * 60 * 1000;
      if (lastMissionAtMs && nowMs - lastMissionAtMs < cooldownMs) {
        throw new functions.https.HttpsError("resource-exhausted", "탐사선 정비가 끝난 뒤 다시 출항할 수 있습니다.");
      }
      const abilities = current.abilitySnapshot?.values || {};
      const routeAbility = route === "nebula" ? abilities.detection : route === "comet" ? abilities.piloting : abilities.precision;
      const bonus = Number(routeAbility || 1) >= 4 ? 1 : 0;
      const rewardMap = {
        nebula: { material: "biofiber", amount: 2 + bonus, title: "성운 생태 표본" },
        comet: { material: "alloy", amount: 1 + bonus, title: "혜성 합금 조각" },
        ruins: { material: "crystalGlass", amount: 1 + bonus, title: "고대 수정 유리" },
      };
      const reward = rewardMap[route];
      const materials = { ...(current.materials || {}) };
      materials[reward.material] = Math.max(0, Number(materials[reward.material] || 0)) + reward.amount;
      const storyProgress = advanceFrontierStory(current.frontierStory, { type: "mission_completed" }, nowMs);
      transaction.set(planet.ref, {
        materials,
        lastMissionAtMs: nowMs,
        lastMission: { route, title: reward.title, partnerUid: partnerUid || "", completedAtMs: nowMs },
        frontierStory: storyProgress.story,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.set(missionRef, {
        uid,
        type: "galaxy_mission",
        route,
        reward,
        bonus,
        partnerUid: partnerUid || "",
        nextMissionAtMs: nowMs + cooldownMs,
        frontierStory: storyProgress.story,
        createdAt: FieldValue.serverTimestamp(),
      });
      return { reward, bonus, nextMissionAtMs: nowMs + cooldownMs, frontierStory: storyProgress.story, deduplicated: false };
    });
    if (partnerUid && partnerUid !== uid && !result.deduplicated) {
      const partnerEventRef = db.collection("galaxyPlanets").doc(partnerUid).collection("visitEvents").doc(operationId);
      await partnerEventRef.set({
        ownerId: partnerUid,
        actorId: uid,
        actorName: getPublicName(user),
        actionId: "relay",
        actionLabel: "함께 비동기 탐사 릴레이를 완주했어요",
        actionIcon: "△",
        actionIconId: "rocket",
        message: "우리의 항로가 기억 기록소에 남았습니다.",
        seen: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    return serializeValue({ success: true, ...result });
  });

  const performGalaxyWorldAction = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    await requireActiveGalaxyPlay(uid, data);
    const actionId = cleanId(data?.actionId, 40);
    const nodeId = cleanId(data?.nodeId, 80);
    const worldX = clamp(data?.x, -16, 16);
    const worldZ = clamp(data?.z, -16, 16);
    const action = GALAXY_WORLD_ACTIONS[actionId];
    if (!action || GALAXY_WORLD_NODE_ACTIONS[nodeId] !== actionId) {
      throw new functions.https.HttpsError("invalid-argument", "월드 상호작용 정보가 올바르지 않습니다.");
    }
    const { user } = await requireMember(uid);
    const planet = await ensurePlanet(uid, user);
    const operationRef = db.collection("galaxyOperations").doc(`world_${uid}_${nodeId}`);
    const result = await db.runTransaction(async (transaction) => {
      const [operationSnap, planetSnap] = await Promise.all([
        transaction.get(operationRef),
        transaction.get(planet.ref),
      ]);
      const nowMs = Date.now();
      const current = planetSnap.data() || {};
      const availableAtMs = Math.max(0, Number(operationSnap.data()?.availableAtMs || 0));
      const recoveringBeaconStory = availableAtMs > nowMs
        && isPendingFrontierBeaconRepair(current.frontierStory, nodeId);
      if (availableAtMs > nowMs && !recoveringBeaconStory) {
        throw new functions.https.HttpsError("resource-exhausted", "이 자원은 아직 다시 생성되지 않았습니다.");
      }
      const materials = { ...(current.materials || {}) };
      const layout = Array.isArray(current.layout) ? current.layout : [];
      const stats = { ...(current.stats || {}) };
      if (!recoveringBeaconStory && action.amount > 0) {
        materials[action.material] = Math.max(0, Number(materials[action.material] || 0)) + action.amount;
      }
      if (!recoveringBeaconStory && action.stat) stats[action.stat] = clamp(Number(stats[action.stat] || 0) + 6, 0, 100);

      const storyProgress = advanceFrontierStory(current.frontierStory, {
        type: "world_action",
        nodeId,
      }, nowMs);
      const updates = {
        materials,
        stats,
        frontierStory: storyProgress.story,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (action.plants) {
        if (layout.length >= 36) throw new functions.https.HttpsError("failed-precondition", "행성에 더 이상 새싹을 심을 공간이 없습니다.");
        const x = clamp(50 + worldX * 3, 8, 92);
        const y = clamp(50 + worldZ * 3, 12, 88);
        updates.layout = [...layout, {
          instanceId: `sprout_${nowMs}_${nodeId.slice(0, 18)}`,
          itemId: "wild_sprout",
          icon: "♧",
          iconId: "sprout",
          name: "직접 심은 루멘 새싹",
          description: getGalaxyItemDefaultDescription("wild_sprout"),
          imagePath: "",
          imageUrl: "",
          x,
          y,
          rotation: 0,
          locked: false,
        }];
      }

      transaction.set(planet.ref, updates, { merge: true });
      if (!recoveringBeaconStory) {
        transaction.set(operationRef, {
          uid,
          type: "galaxy_world_action",
          actionId,
          nodeId,
          availableAtMs: nowMs + (action.plants ? 60 * 60 * 1000 : 5 * 60 * 1000),
          lastCompletedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      return {
        material: action.material,
        amount: recoveringBeaconStory ? 0 : action.amount,
        label: recoveringBeaconStory ? "비콘 수리 상태를 복구했습니다." : action.label,
        materials,
        stats,
        frontierStory: storyProgress.story,
      };
    });
    return { success: true, ...result };
  });

  const performGalaxyStructureAction = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    await requireActiveGalaxyPlay(uid, data);
    const rawInstanceId = data?.instanceId;
    const instanceId = cleanId(rawInstanceId, 120);
    if (
      typeof rawInstanceId !== "string"
      || rawInstanceId.trim() !== rawInstanceId
      || rawInstanceId.length > 120
      || !/^[A-Za-z0-9_-]{1,120}$/.test(instanceId)
    ) throw new functions.https.HttpsError("invalid-argument", "시설 식별자가 올바르지 않습니다.");

    const { user } = await requireMember(uid);
    const planet = await ensurePlanet(uid, user);
    const operationRef = db.collection("galaxyOperations").doc(`structure_${uid}_${instanceId}`);
    const result = await db.runTransaction(async (transaction) => {
      const [operationSnap, planetSnap] = await Promise.all([
        transaction.get(operationRef),
        transaction.get(planet.ref),
      ]);
      const planetData = planetSnap.data() || {};
      const layout = Array.isArray(planetData.layout) ? planetData.layout : [];
      const structure = layout.find((entry) => entry?.instanceId === instanceId) || null;
      if (!structure) throw new functions.https.HttpsError("not-found", "행성에서 해당 시설을 찾을 수 없습니다.");
      const actionId = getGalaxyStructureVisitAction(structure.itemId);
      const reward = GALAXY_STRUCTURE_ACTION_REWARDS[actionId];
      if (!reward) throw new functions.https.HttpsError("failed-precondition", "이 시설에서는 아직 수행할 활동이 없습니다.");

      const nowMs = Date.now();
      const availableAtMs = Math.max(0, Number(operationSnap.data()?.availableAtMs || 0));
      if (availableAtMs > nowMs) {
        throw new functions.https.HttpsError("resource-exhausted", "이 시설은 아직 다음 활동을 준비하고 있습니다.", { availableAtMs });
      }

      const materials = { ...(planetData.materials || {}) };
      materials[reward.material] = Math.max(0, Number(materials[reward.material] || 0)) + reward.amount;
      const storyProgress = advanceFrontierStory(planetData.frontierStory, {
        type: "structure_cared",
        itemId: structure.itemId || "",
      }, nowMs);
      transaction.set(planet.ref, {
        materials,
        frontierStory: storyProgress.story,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.set(operationRef, {
        uid,
        type: "galaxy_structure_action",
        instanceId,
        itemId: structure.itemId || "",
        actionId,
        availableAtMs: nowMs + 5 * 60 * 1000,
        lastCompletedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return {
        materials,
        label: reward.label,
        material: reward.material,
        amount: reward.amount,
        availableAtMs: nowMs + 5 * 60 * 1000,
        frontierStory: storyProgress.story,
      };
    });
    return serializeValue({ success: true, ...result });
  });

  const recordGalaxyStoryTelemetry = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    const { user } = await requireMember(uid);
    const eventType = cleanId(data?.eventType, 40);
    if (!["chapter_view", "exit", "finale_view"].includes(eventType)) {
      throw new functions.https.HttpsError("invalid-argument", "기록할 스토리 지표 유형이 올바르지 않습니다.");
    }
    const rawEventId = data?.eventId;
    const eventId = cleanId(rawEventId, 120);
    if (typeof rawEventId !== "string" || !/^[A-Za-z0-9_-]{8,120}$/.test(eventId)) {
      throw new functions.https.HttpsError("invalid-argument", "스토리 지표 식별자가 올바르지 않습니다.");
    }
    const stepId = cleanId(data?.stepId, 80);
    const chapterId = cleanId(data?.chapterId, 60);
    const elapsedMs = clamp(Math.floor(Number(data?.elapsedMs || 0)), 0, 24 * 60 * 60 * 1000);
    const restorationPercent = clamp(Math.round(Number(data?.restorationPercent || 0)), 0, 100);
    const planet = await ensurePlanet(uid, user);
    const eventRef = planet.ref.collection("storyTelemetry").doc(eventId);
    const nowMs = Date.now();
    const result = await db.runTransaction(async (transaction) => {
      const [eventSnap, planetSnap] = await Promise.all([
        transaction.get(eventRef),
        transaction.get(planet.ref),
      ]);
      if (eventSnap.exists) return { deduplicated: true };
      const planetData = planetSnap.data() || {};
      const story = normalizeFrontierStory(planetData.frontierStory, nowMs);
      const current = planetData.frontierAnalytics && typeof planetData.frontierAnalytics === "object"
        ? planetData.frontierAnalytics
        : {};
      const frontierAnalytics = {
        ...current,
        lastTelemetryAtMs: nowMs,
        ...(eventType === "chapter_view" ? {
          lastViewedChapterId: chapterId || story.chapterId,
          lastViewedStepId: stepId || story.stepId,
        } : {}),
        ...(eventType === "exit" ? {
          lastExitAtMs: nowMs,
          lastExitChapterId: chapterId || story.chapterId,
          lastExitStepId: stepId || story.stepId,
          lastExitElapsedMs: elapsedMs,
          lastExitRestorationPercent: restorationPercent,
        } : {}),
        ...(eventType === "finale_view" && !current.finaleViewedAtMs ? { finaleViewedAtMs: nowMs } : {}),
      };
      transaction.create(eventRef, {
        uid,
        eventType,
        chapterId: chapterId || story.chapterId,
        stepId: stepId || story.stepId,
        elapsedMs,
        restorationPercent,
        storyVersion: story.version,
        createdAtMs: nowMs,
        createdAt: FieldValue.serverTimestamp(),
      });
      transaction.set(planet.ref, { frontierAnalytics, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return { deduplicated: false };
    });
    return { success: true, ...result };
  });

  const markGalaxyEventsSeen = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    await requireActiveGalaxyPlay(uid, data);
    await requireMember(uid);
    const eventIds = uniqueIds(Array.isArray(data?.eventIds) ? data.eventIds.map((id) => cleanId(id, 180)) : []).slice(0, 30);
    if (!eventIds.length) return { success: true, updated: 0 };
    const batch = db.batch();
    eventIds.forEach((eventId) => batch.set(db.collection("galaxyPlanets").doc(uid).collection("visitEvents").doc(eventId), {
      seen: true,
      seenAt: FieldValue.serverTimestamp(),
    }, { merge: true }));
    await batch.commit();
    return { success: true, updated: eventIds.length };
  });

  const setGalaxyUserBlocked = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    await requireActiveGalaxyPlay(uid, data);
    const { user } = await requireMember(uid);
    const targetUid = cleanId(data?.targetUid, 180);
    const blocked = data?.blocked === true;
    if (!isSafeRealtimePathSegment(targetUid) || targetUid === uid) {
      throw new functions.https.HttpsError("invalid-argument", "차단할 탐사원을 확인해 주세요.");
    }
    const sharedCrew = await getApprovedSharedCrew(uid, targetUid, user);
    if (!sharedCrew) {
      throw new functions.https.HttpsError("permission-denied", "같은 승인 크루의 탐사원만 차단 설정을 변경할 수 있습니다.");
    }

    const blockRef = getGalaxyBlockRef(uid, targetUid);
    if (blocked) {
      await blockRef.set({
        ownerUid: uid,
        targetUid,
        crewId: sharedCrew.id,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    } else {
      await blockRef.delete().catch((error) => {
        if (error?.code !== 5) throw error;
      });
    }

    if (blocked) {
      const realtimeUpdates = {
        [`galaxyWorldAccess/${uid}/${targetUid}`]: null,
        [`galaxyWorldAccess/${targetUid}/${uid}`]: null,
        [`galaxyWorldRooms/${uid}/players/${targetUid}`]: null,
        [`galaxyWorldRooms/${targetUid}/players/${uid}`]: null,
        [`galaxyWorldSpeechRateLimits/${uid}/${targetUid}`]: null,
        [`galaxyWorldSpeechRateLimits/${targetUid}/${uid}`]: null,
      };
      await admin.database().ref().update(realtimeUpdates).catch((error) => {
        console.warn("[galaxySafety] live access revoke failed", {
          uid,
          targetUid,
          message: cleanText(error?.message || error, 200),
        });
      });
    }

    return { success: true, targetUid, blocked };
  });

  const reportGalaxyUser = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    await requireActiveGalaxyPlay(uid, data);
    const { user } = await requireMember(uid);
    const targetUid = cleanId(data?.targetUid, 180);
    const category = cleanId(data?.category, 40);
    const reportId = cleanId(data?.reportId, 180);
    if (!isSafeRealtimePathSegment(targetUid) || targetUid === uid) {
      throw new functions.https.HttpsError("invalid-argument", "신고할 탐사원을 확인해 주세요.");
    }
    if (!GALAXY_REPORT_CATEGORIES.has(category)) {
      throw new functions.https.HttpsError("invalid-argument", "신고 사유를 확인해 주세요.");
    }
    if (!isSafeRealtimePathSegment(reportId)) {
      throw new functions.https.HttpsError("invalid-argument", "신고 요청 식별자가 올바르지 않습니다.");
    }
    const sharedCrew = await getApprovedSharedCrew(uid, targetUid, user);
    if (!sharedCrew) {
      throw new functions.https.HttpsError("permission-denied", "같은 승인 크루에서 발생한 문제만 신고할 수 있습니다.");
    }

    // 신고 증거는 선택적이며, 신고자가 직접 쓴 글이 아니라 갈럭시 공개 텍스트
    // 한 조각만 최소 문맥으로 보존한다. 길이·제어문자·HTML 태그를 서버에서 정리한다.
    const rawEvidence = typeof data?.evidence === "string" ? data.evidence : "";
    const sanitizedEvidence = [...rawEvidence]
      .map((character) => {
        const code = character.charCodeAt(0);
        return code <= 31 || code === 127 ? " " : character;
      })
      .join("")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200);
    const evidence = sanitizedEvidence && sanitizedEvidence.length <= 200 ? sanitizedEvidence : "";

    const reportRef = db.collection("galaxyReports").doc(`${uid}_${reportId}`);
    const reportPayload = {
      reporterUid: uid,
      targetUid,
      crewId: sharedCrew.id,
      category,
      status: "pending",
      source: "astra_frontier",
      createdAt: FieldValue.serverTimestamp(),
      expireAt: admin.firestore.Timestamp.fromMillis(Date.now() + 90 * 24 * 60 * 60 * 1000),
    };
    if (evidence) reportPayload.evidence = evidence;
    await db.runTransaction(async (transaction) => {
      const reportSnap = await transaction.get(reportRef);
      if (reportSnap.exists) return;
      transaction.create(reportRef, reportPayload);
    });
    return { success: true, reportId: reportRef.id, evidencePreserved: Boolean(evidence) };
  });

  return {
    rollupGalaxyLearningOre,
    adminGetGalaxyLearningBackfillStatus,
    adminStartGalaxyLearningBackfill,
    adminRunGalaxyLearningBackfillStep,
    adminCancelGalaxyLearningBackfill,
    openGalaxyHome,
    openGalaxyBuildPlot,
    saveGalaxyBuildState,
    renewGalaxyWorldSession,
    sendGalaxyWorldSpeech,
    completeGalaxyDailyEvent,
    saveGalaxyPassport,
    buildGalaxyItem,
    upgradeGalaxyItem,
    updateGalaxyItem,
    moveGalaxyItem,
    deleteGalaxyItem,
    performGalaxyVisitAction,
    startGalaxyRoverExpedition,
    claimGalaxyRoverExpedition,
    acknowledgeGalaxyRoverReport,
    listGalaxyRoverExpeditions,
    runGalaxyMission,
    performGalaxyWorldAction,
    performGalaxyStructureAction,
    recordGalaxyStoryTelemetry,
    markGalaxyEventsSeen,
    setGalaxyUserBlocked,
    reportGalaxyUser,
  };
};

module.exports.__test = {
  GALAXY_ITEM_CATALOG,
  FRONTIER_ASTRA_MEMORY_STEPS,
  FRONTIER_CORE_FACILITY_IDS,
  FRONTIER_FRIEND_SIGNAL_STEPS,
  FRONTIER_FIRST_SIGNAL_STEPS,
  FRONTIER_LOST_ROUTE_STEPS,
  FRONTIER_PROLOGUE_STEPS,
  FRONTIER_REBORN_STAR_STEPS,
  FRONTIER_STORY_CHAPTERS,
  FRONTIER_STORY_STEPS,
  advanceFrontierStory,
  calculateLifetimeLearningOre,
  createInitialFrontierStory,
  deriveFrontierStoryFromPlanet,
  buildGalaxyDailyEvent,
  buildGalaxyRoverDeparture,
  buildGalaxyRoverPublicCatalog,
  buildGalaxyRoverStatsAfterAcknowledgement,
  buildGalaxyRoverEventPayload,
  GALAXY_ROVER_CATALOG_VERSION,
  GALAXY_ROVER_REPORT_FLOW_VERSION,
  GALAXY_ROVER_ROUTES,
  GALAXY_DAILY_EVENT_CATALOG,
  getGalaxyDailyEventView,
  getActiveGalaxyLiveConnection,
  getGalaxyItemDefaultDescription,
  getGalaxyLayoutWorldPosition,
  getKstDayKey,
  getKstDayWindow,
  updateFrontierAnalyticsFirstBuild,
  updateFrontierAnalyticsOnOpen,
  updateFrontierAnalyticsPrologue,
  getGalaxyRoverExpeditionView,
  getFrontierBuildPricing,
  isPendingFrontierBeaconRepair,
  getGalaxyLearningLedgerStatus,
  getGalaxyStructureVisitAction,
  isEligibleLearningOreTransaction,
  isGalaxyLiveSpeechRateLimited,
  isGalaxyObjectImagePath,
  planGalaxyItemPlacement,
  planGalaxyStructureVisit,
  planGalaxyDailyEventCompletion,
  syncFrontierStoryWithCompletedDailyEvent,
  planGalaxyLiveSpeech,
  planGalaxyRoverClaim,
  planGalaxyRoverReportAcknowledgement,
  planGalaxyRoverStart,
  stableGalaxyHash,
  validateGalaxyObjectImage,
  validateGalaxyLiveSpeechText,
  containsUnsafePublicText,
  getAstraBuilderGridByteLength,
  getAstraBuilderStoredGridBuffer,
  normalizeAstraBuilderBase64,
  normalizeFrontierStory,
  validateAstraBuilderStatePayload,
};
