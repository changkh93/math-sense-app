import { useState, useCallback, useMemo } from 'react';
import {
  GALAXY_ITEM_CATALOG,
  GALAXY_MISSION_ROUTES,
  GALAXY_ROVER_ROUTES,
  GUEST_STARTER_OBJECTS,
  getGuestBuildCost,
  getGuestItemName,
} from '../utils/galaxyGame.js';
import {
  advanceFrontierStory,
  createInitialFrontierStory,
  getFrontierStoryObjective,
  isFirstLightStoryGrant,
  normalizeFrontierStory,
} from '../utils/frontierStory.js';

const STORAGE_KEY = 'metasense_guest_astra_data';
const DAILY_GUEST_CRYSTALS = 500;
const GUEST_ROVER_HISTORY_LIMIT = 60;

function stableGuestHash(value) {
  let hash = 2166136261
  const text = String(value || '')
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function normalizeGuestRoverStats(raw = {}) {
  const routeLaunchCounts = raw?.routeLaunchCounts && typeof raw.routeLaunchCounts === 'object' ? raw.routeLaunchCounts : {}
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
    lastOperationId: String(raw?.lastOperationId || ''),
    lastClaimedOperationId: String(raw?.lastClaimedOperationId || ''),
    lastAcknowledgedOperationId: String(raw?.lastAcknowledgedOperationId || ''),
  }
}

function getGuestRoverDiscovery(route, operationId, roverDiscoveries = []) {
  const routeInfo = GALAXY_ROVER_ROUTES[route] || GALAXY_ROVER_ROUTES.nebula
  const knownIds = new Set((Array.isArray(roverDiscoveries) ? roverDiscoveries : []).map((entry) => entry?.id).filter(Boolean))
  const firstUnrestored = routeInfo.discoveries.find((entry) => !knownIds.has(entry.id))
  const discovery = firstUnrestored || routeInfo.discoveries[stableGuestHash(`${route}:${operationId}`) % routeInfo.discoveries.length]
  return discovery ? { route, ...discovery } : null
}

function getGuestRoverStatus(expedition, nowMs = Date.now()) {
  if (!expedition?.operationId) return 'idle'
  if (expedition.status === 'claimed' || expedition.claimedAtMs) return 'claimed'
  return Number(expedition.readyAtMs || expedition.returnsAtMs || 0) <= nowMs ? 'ready' : 'exploring'
}

function getGuestRoverStoryContext(rawStory) {
  const objective = getFrontierStoryObjective(rawStory) || {
    chapterId: 'astra_memory',
    chapterTitle: '아스트라 기억망',
    id: 'restored',
    eyebrow: '아스트라 프론티어 · 기록 보존',
    title: '루미가 항로의 기억을 지킵니다',
    detail: '귀환 기록과 발견물을 다음 탐사원에게 남깁니다.',
  }
  return {
    chapterId: objective.chapterId,
    chapterTitle: objective.chapterTitle,
    stepId: objective.stepId || objective.id,
    eyebrow: objective.eyebrow,
    title: objective.title,
    detail: objective.detail,
  }
}

function getTodayDateStringKey() {
  const now = new Date();
  const kstOffset = 9 * 60;
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const kstDate = new Date(utc + (kstOffset * 60000));
  return kstDate.toISOString().slice(0, 10);
}

function generateInstanceId(itemId) {
  return `${itemId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// 과거 버전(id/x/z/yaw)으로 저장된 게스트 데이터를 정규 스키마(instanceId/y/rotation)로 변환한다.
// 브라우저에 옛날 형태가 남아 있어도 회원가입 승계/렌더링이 깨지지 않도록 한다.
function normalizeLayoutItem(raw = {}) {
  if (!raw || typeof raw !== 'object') return null
  const instanceId = raw.instanceId || raw.id || generateInstanceId(raw.itemId || 'object')
  return {
    instanceId,
    itemId: raw.itemId || 'starter_dome',
    name: raw.name || getGuestItemName(raw.itemId || 'starter_dome'),
    icon: raw.icon,
    iconId: raw.iconId,
    level: Number(raw.level || 1),
    x: Number(raw.x || 48),
    // 옛날 형식은 z 를 썼다. 백엔드/3D 스키마는 y 이다.
    y: Number(raw.y ?? raw.z ?? 50),
    rotation: Number(raw.rotation ?? raw.yaw ?? 0),
    createdAtMs: Number(raw.createdAtMs || raw.createdAt || Date.now()),
  }
}

function createStarterDome() {
  return normalizeLayoutItem({
    instanceId: 'starter_dome_1',
    itemId: 'starter_dome',
    name: getGuestItemName('starter_dome'),
    level: 1,
    x: 48,
    y: 48,
    rotation: 0,
    createdAtMs: Date.now(),
  })
}

const DEFAULT_GUEST_DATA = {
  crystals: DAILY_GUEST_CRYSTALS,
  lastGrantedAt: getTodayDateStringKey(),
  guestRouteXp: 0,
  planet: {
    theme: 'forest',
    layout: [createStarterDome()],
    materials: { stardust: 8, biofiber: 4, crystalGlass: 2, alloy: 1 },
    stats: { gardenVitality: 60, facilityHealth: 70, creatureHappiness: 55, admirationCount: 0, visits: 0 },
    frontierStory: createInitialFrontierStory(),
    lastMissionAtMs: 0,
    roverExpedition: null,
    roverDiscoveries: [],
    roverHistory: [],
    roverStats: normalizeGuestRoverStats(),
    lastDailyEventDayKey: '',
  },
};

export function normalizeGuestGalaxyData(parsed = {}, today = getTodayDateStringKey()) {
  try {
    // 1) layout 을 항상 정규 스키마로 맞춘다. (옛날 형식 호환)
    const rawLayout = Array.isArray(parsed?.planet?.layout) ? parsed.planet.layout : []
    const normalizedLayout = rawLayout.map(normalizeLayoutItem).filter(Boolean)
    if (normalizedLayout.length === 0) normalizedLayout.push(createStarterDome())

    // 2) 일일 기본 광석 리셋 체크
    const lastGrantedAt = parsed?.lastGrantedAt || today;
    const crystals = lastGrantedAt !== today
      ? DAILY_GUEST_CRYSTALS
      : Number(parsed?.crystals ?? DAILY_GUEST_CRYSTALS);

    const nextData = {
      crystals,
      lastGrantedAt: today,
      guestRouteXp: Math.max(0, Number(parsed?.guestRouteXp || 0)),
      planet: {
        theme: parsed?.planet?.theme || 'forest',
        layout: normalizedLayout,
        materials: { ...DEFAULT_GUEST_DATA.planet.materials, ...(parsed?.planet?.materials || {}) },
        stats: { ...DEFAULT_GUEST_DATA.planet.stats, ...(parsed?.planet?.stats || {}) },
        frontierStory: normalizeFrontierStory(parsed?.planet?.frontierStory),
        lastMissionAtMs: Math.max(0, Number(parsed?.planet?.lastMissionAtMs || 0)),
        roverExpedition: parsed?.planet?.roverExpedition || null,
        roverDiscoveries: Array.isArray(parsed?.planet?.roverDiscoveries) ? parsed.planet.roverDiscoveries : [],
        roverHistory: Array.isArray(parsed?.planet?.roverHistory) ? parsed.planet.roverHistory.slice(0, GUEST_ROVER_HISTORY_LIMIT) : [],
        roverStats: normalizeGuestRoverStats(parsed?.planet?.roverStats),
        lastDailyEventDayKey: String(parsed?.planet?.lastDailyEventDayKey || ''),
      },
    };
    return nextData;
  } catch {
    return DEFAULT_GUEST_DATA;
  }
}

function readFromStorage() {
  if (typeof window === 'undefined') return DEFAULT_GUEST_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeGuestGalaxyData(JSON.parse(raw)) : DEFAULT_GUEST_DATA;
  } catch {
    return DEFAULT_GUEST_DATA;
  }
}

export function useGuestGalaxyData() {
  const [guestData, setGuestData] = useState(readFromStorage);

  const persist = useCallback((nextData) => {
    setGuestData(nextData);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
      } catch (err) {
        console.warn('Guest localStorage save failed:', err);
      }
    }
  }, []);

  const buildItem = useCallback((itemId, x = 48, y = 48) => {
    const level = 1;
    const storyGrantApplied = isFirstLightStoryGrant(guestData.planet?.frontierStory, itemId, level);
    const cost = storyGrantApplied ? 0 : getGuestBuildCost(itemId);
    if (guestData.crystals < cost) {
      throw new Error('광석이 부족합니다.');
    }
    const catalogEntry = GALAXY_ITEM_CATALOG[itemId] || {}
    const newItem = normalizeLayoutItem({
      instanceId: generateInstanceId(itemId),
      itemId,
      name: getGuestItemName(itemId),
      icon: catalogEntry.icon,
      iconId: catalogEntry.iconId,
      level: 1,
      x,
      y,
      rotation: 0,
      createdAtMs: Date.now(),
    });
    const nextLayout = [...(guestData.planet?.layout || []), newItem];
    let frontierStory = advanceFrontierStory(guestData.planet?.frontierStory, {
      type: 'item_built',
      itemId,
      level,
      builtItemIds: nextLayout.map((entry) => entry?.itemId).filter(Boolean),
      discoveryCount: Array.isArray(guestData.planet?.roverDiscoveries) ? guestData.planet.roverDiscoveries.length : 0,
    });
    if (
      frontierStory.stepId === 'stabilize_daily_event'
      && guestData.planet?.lastDailyEventDayKey === guestData.lastGrantedAt
    ) {
      frontierStory = advanceFrontierStory(frontierStory, {
        type: 'daily_event_completed',
        nodeId: 'broken_beacon',
      });
    }
    const nextData = {
      ...guestData,
      crystals: Math.max(0, guestData.crystals - cost),
      planet: {
        ...guestData.planet,
        layout: nextLayout,
        frontierStory,
      },
    };
    persist(nextData);
    return { item: newItem, planet: nextData.planet, wallet: nextData.crystals, storyGrantApplied };
  }, [guestData, persist]);

  const performWorldAction = useCallback((node) => {
    const rewards = {
      crystal: { material: 'crystalGlass', amount: 1, label: '수정 파편을 채집했습니다.' },
      fiber: { material: 'biofiber', amount: 1, label: '루멘 섬유를 채집했습니다.' },
      salvage: { material: 'alloy', amount: 1, label: '고대 합금을 회수했습니다.' },
      beacon: { material: 'stardust', amount: 1, label: '신호기를 수리하고 별가루를 찾았습니다.' },
      plant: { material: 'stardust', amount: 0, label: '황무지에 루멘 새싹을 심었습니다.' },
    };
    const reward = rewards[node?.actionId];
    if (!reward) throw new Error('월드 상호작용 정보가 올바르지 않습니다.');
    const materials = { ...(guestData.planet?.materials || {}) };
    materials[reward.material] = Math.max(0, Number(materials[reward.material] || 0)) + reward.amount;
    const stats = { ...(guestData.planet?.stats || {}) };
    if (node.actionId === 'beacon') stats.facilityHealth = Math.min(100, Number(stats.facilityHealth || 0) + 6);
    const frontierStory = advanceFrontierStory(guestData.planet?.frontierStory, { type: 'world_action', nodeId: node.id });
    const planet = { ...guestData.planet, materials, stats, frontierStory };
    const nextData = { ...guestData, planet };
    persist(nextData);
    return { ...reward, materials, stats, frontierStory, planet };
  }, [guestData, persist]);

  const completeMission = useCallback((route) => {
    const routeInfo = GALAXY_MISSION_ROUTES[route] || GALAXY_MISSION_ROUTES.nebula;
    const nowMs = Date.now();
    const materials = { ...(guestData.planet?.materials || {}) };
    const amount = Number(routeInfo.baseReward || 1);
    materials[routeInfo.rewardMaterial] = Math.max(0, Number(materials[routeInfo.rewardMaterial] || 0)) + amount;
    const frontierStory = advanceFrontierStory(guestData.planet?.frontierStory, { type: 'mission_completed' }, nowMs);
    const planet = { ...guestData.planet, materials, frontierStory, lastMissionAtMs: nowMs };
    persist({ ...guestData, planet });
    return {
      reward: { material: routeInfo.rewardMaterial, amount, title: routeInfo.reward },
      nextMissionAtMs: nowMs + (2 * 60 * 60 * 1000),
      frontierStory,
      planet,
    };
  }, [guestData, persist]);

  const dispatchRover = useCallback((route, operationId) => {
    const routeId = GALAXY_ROVER_ROUTES[route] ? route : 'nebula'
    const routeInfo = GALAXY_ROVER_ROUTES[routeId]
    const nowMs = Date.now()
    const currentExpedition = guestData.planet?.roverExpedition
    if (getGuestRoverStatus(currentExpedition, nowMs) !== 'idle') {
      throw new Error('현재 원정을 마무리하고 귀환 보고서를 보관한 뒤 다음 원정을 시작할 수 있습니다.')
    }
    const safeOperationId = String(operationId || `guest_rover_${nowMs}_${Math.random().toString(36).slice(2, 8)}`)
    const layout = Array.isArray(guestData.planet?.layout) ? guestData.planet.layout : []
    const hasRoverBay = layout.some((item) => item?.itemId === 'rover_bay')
    const hasExpeditionBeacon = layout.some((item) => item?.itemId === 'expedition_beacon')
    const abilityLevel = Math.max(1, Number(guestData.planet?.abilitySnapshot?.values?.[routeInfo.ability] || 1))
    const abilityBonus = abilityLevel >= 4 ? 1 : 0
    const beaconBonus = hasExpeditionBeacon ? 1 : 0
    const durationMs = hasRoverBay ? routeInfo.roverBayDurationMs : routeInfo.durationMs
    const readyAtMs = nowMs + durationMs
    const roverStats = normalizeGuestRoverStats(guestData.planet?.roverStats)
    const discovery = getGuestRoverDiscovery(routeId, safeOperationId, guestData.planet?.roverDiscoveries)
    const expedition = {
      operationId: safeOperationId,
      expeditionNo: roverStats.nextExpeditionNo,
      route: routeId,
      routeTitle: routeInfo.label,
      reportFlowVersion: 2,
      status: 'exploring',
      startedAtMs: nowMs,
      readyAtMs,
      returnsAtMs: readyAtMs,
      durationMs,
      reward: {
        material: routeInfo.rewardMaterial,
        amount: Number(routeInfo.baseReward || 1) + beaconBonus + abilityBonus,
        baseAmount: Number(routeInfo.baseReward || 1),
        beaconBonus,
        abilityBonus,
        title: routeInfo.reward,
      },
      discovery,
      bonuses: {
        roverBay: hasRoverBay,
        expeditionBeacon: hasExpeditionBeacon,
        abilityId: routeInfo.ability,
        abilityLevel,
        ability: abilityBonus > 0,
      },
      storyContextAtLaunch: getGuestRoverStoryContext(guestData.planet?.frontierStory),
    }
    let frontierStory = advanceFrontierStory(guestData.planet?.frontierStory, { type: 'rover_dispatched' }, nowMs);
    if (guestData.planet?.lastDailyEventDayKey === guestData.lastGrantedAt) {
      frontierStory = advanceFrontierStory(frontierStory, {
        type: 'daily_event_completed',
        nodeId: 'broken_beacon',
      }, nowMs);
    }
    const nextRouteLaunchCounts = { ...roverStats.routeLaunchCounts, [routeId]: roverStats.routeLaunchCounts[routeId] + 1 }
    const planet = {
      ...guestData.planet,
      roverExpedition: expedition,
      roverStats: {
        ...roverStats,
        totalLaunched: roverStats.totalLaunched + 1,
        nextExpeditionNo: roverStats.nextExpeditionNo + 1,
        routeLaunchCounts: nextRouteLaunchCounts,
        lastOperationId: safeOperationId,
      },
      frontierStory,
    }
    persist({ ...guestData, planet });
    return { expedition, frontierStory, planet, serverNowMs: nowMs };
  }, [guestData, persist]);

  const completeDailyEvent = useCallback(() => {
    const dayKey = guestData.lastGrantedAt || getTodayDateStringKey();
    const materials = { ...(guestData.planet?.materials || {}) };
    const stats = { ...(guestData.planet?.stats || {}) };
    const alreadyCompleted = guestData.planet?.lastDailyEventDayKey === dayKey;
    if (!alreadyCompleted) {
      materials.stardust = Math.max(0, Number(materials.stardust || 0)) + 1;
      stats.facilityHealth = Math.min(100, Number(stats.facilityHealth || 0) + 6);
    }
    const frontierStory = advanceFrontierStory(guestData.planet?.frontierStory, {
      type: 'daily_event_completed',
      nodeId: 'broken_beacon',
    });
    const planet = { ...guestData.planet, materials, stats, frontierStory, lastDailyEventDayKey: dayKey };
    persist({ ...guestData, planet });
    return {
      dailyEvent: {
        eventId: `guest_signal_${dayKey}`,
        dayKey,
        type: 'signal_blackout',
        nodeId: 'broken_beacon',
        title: '귀환 신호 재점화',
        status: 'completed',
        reward: { material: 'stardust', amount: 1, title: '별가루' },
      },
      reward: { material: 'stardust', amount: alreadyCompleted ? 0 : 1, title: '별가루' },
      materials,
      stats,
      frontierStory,
      planet,
    };
  }, [guestData, persist]);

  const syncCompletedDailyEventStory = useCallback(() => {
    const dayKey = guestData.lastGrantedAt || getTodayDateStringKey();
    if (guestData.planet?.lastDailyEventDayKey !== dayKey) return null;
    const frontierStory = advanceFrontierStory(guestData.planet?.frontierStory, {
      type: 'daily_event_completed',
      nodeId: 'broken_beacon',
    });
    if (frontierStory.stepId === normalizeFrontierStory(guestData.planet?.frontierStory).stepId) return null;
    const planet = { ...guestData.planet, frontierStory };
    persist({ ...guestData, planet });
    return { frontierStory, planet };
  }, [guestData, persist]);

  const careForStructure = useCallback((item) => {
    const materials = { ...(guestData.planet?.materials || {}) };
    const material = ['lumen_tree', 'crystal_pond', 'starflower_garden'].includes(item?.itemId) ? 'biofiber' : 'alloy';
    materials[material] = Math.max(0, Number(materials[material] || 0)) + 1;
    const frontierStory = advanceFrontierStory(guestData.planet?.frontierStory, {
      type: 'structure_cared',
      itemId: item?.itemId || '',
    });
    const planet = { ...guestData.planet, materials, frontierStory };
    persist({ ...guestData, planet });
    return { materials, frontierStory, planet, material, amount: 1, label: `${item?.name || '행성 시설'} 돌보기를 마쳤습니다.` };
  }, [guestData, persist]);

  const claimRover = useCallback(() => {
    const expedition = guestData.planet?.roverExpedition;
    const nowMs = Date.now();
    if (!expedition?.operationId) throw new Error('수령할 로버 원정 기록이 없습니다.');
    if (expedition.status === 'claimed' || expedition.claimedAtMs) {
      const claimResult = expedition.result || {
        operationId: expedition.operationId,
        reward: expedition.reward,
        discovery: expedition.discovery,
        claimedAtMs: expedition.claimedAtMs,
      }
      return { expedition, claimResult, frontierStory: guestData.planet?.frontierStory, planet: guestData.planet, serverNowMs: nowMs, deduplicated: true }
    }
    if (Number(expedition.readyAtMs || expedition.returnsAtMs || 0) > nowMs) throw new Error('탐사 로버가 아직 귀환하지 않았습니다.');
    const routeInfo = GALAXY_ROVER_ROUTES[expedition.route] || GALAXY_ROVER_ROUTES.nebula;
    const reward = expedition.reward || { material: routeInfo.rewardMaterial, amount: routeInfo.baseReward, title: routeInfo.reward };
    const discovery = expedition.discovery || getGuestRoverDiscovery(expedition.route, expedition.operationId, guestData.planet?.roverDiscoveries)
    if (!discovery?.id) throw new Error('원정 발견 기록을 복원하지 못했습니다.')
    const materials = { ...(guestData.planet?.materials || {}) };
    const balanceBefore = Math.max(0, Number(materials[reward.material] || 0))
    const rewardAmount = Math.max(0, Number(reward.amount || 0))
    const balanceAfter = balanceBefore + rewardAmount
    materials[reward.material] = balanceAfter
    const roverDiscoveries = Array.isArray(guestData.planet?.roverDiscoveries) ? [...guestData.planet.roverDiscoveries] : [];
    const previousDiscovery = roverDiscoveries.find((entry) => entry?.id === discovery.id)
    const isNewDiscovery = !previousDiscovery
    const discoveryRecord = isNewDiscovery
      ? { ...discovery, firstOperationId: expedition.operationId, discoveredAtMs: nowMs, lastObservedAtMs: nowMs, lastOperationId: expedition.operationId, observationCount: 1 }
      : { ...previousDiscovery, lastObservedAtMs: nowMs, lastOperationId: expedition.operationId, observationCount: Math.max(1, Number(previousDiscovery.observationCount || 1)) + 1 }
    if (isNewDiscovery) roverDiscoveries.push(discoveryRecord)
    else roverDiscoveries.splice(roverDiscoveries.findIndex((entry) => entry?.id === discovery.id), 1, discoveryRecord)
    const frontierStory = advanceFrontierStory(guestData.planet?.frontierStory, {
      type: 'rover_claimed',
      isNewDiscovery,
      discoveryCount: roverDiscoveries.length,
      discoveryRoutes: [...new Set(roverDiscoveries.map((entry) => entry?.route).filter(Boolean))],
      builtItemIds: (guestData.planet?.layout || []).map((entry) => entry?.itemId).filter(Boolean),
    }, nowMs);
    const beforeStory = normalizeFrontierStory(guestData.planet?.frontierStory)
    const claimResult = {
      operationId: expedition.operationId,
      route: expedition.route,
      reward: { ...reward, amount: rewardAmount, balanceBefore, balanceAfter },
      discovery,
      isNewDiscovery,
      claimedAtMs: nowMs,
      materials,
      routeDiscoveryCount: roverDiscoveries.filter((entry) => entry?.route === expedition.route).length,
      totalDiscoveryCount: roverDiscoveries.length,
      storyProgressAtClaim: {
        beforeChapterId: beforeStory.chapterId,
        beforeStepId: beforeStory.stepId,
        afterChapterId: frontierStory.chapterId,
        afterStepId: frontierStory.stepId,
        restorationBefore: beforeStory.restorationPercent,
        restorationAfter: frontierStory.restorationPercent,
      },
    }
    const claimedExpedition = { ...expedition, status: 'claimed', claimedAtMs: nowMs, result: claimResult }
    const roverStats = normalizeGuestRoverStats(guestData.planet?.roverStats)
    const planet = {
      ...guestData.planet,
      materials,
      roverDiscoveries,
      roverExpedition: claimedExpedition,
      roverStats: {
        ...roverStats,
        totalClaimed: roverStats.totalClaimed + 1,
        uniqueDiscoveryCount: Math.max(roverStats.uniqueDiscoveryCount, roverDiscoveries.length),
        lastClaimedOperationId: expedition.operationId,
      },
      frontierStory,
    }
    persist({ ...guestData, planet });
    return {
      expedition: claimedExpedition,
      claimResult,
      frontierStory,
      planet,
      serverNowMs: nowMs,
    };
  }, [guestData, persist]);

  const acknowledgeRoverReport = useCallback((operationId) => {
    const expedition = guestData.planet?.roverExpedition
    if (!expedition?.operationId || expedition.operationId !== operationId) throw new Error('현재 관제 중인 원정 보고서가 아닙니다.')
    if (getGuestRoverStatus(expedition) !== 'claimed') throw new Error('귀환 결과를 확인한 뒤 보고서를 보관할 수 있습니다.')
    const entry = {
      operationId: expedition.operationId,
      expeditionNo: expedition.expeditionNo || null,
      route: expedition.route,
      routeTitle: expedition.routeTitle,
      startedAtMs: expedition.startedAtMs,
      readyAtMs: expedition.readyAtMs,
      claimedAtMs: expedition.claimedAtMs,
      reportAcknowledgedAtMs: Date.now(),
      reward: expedition.result?.reward || expedition.reward,
      discovery: expedition.result?.discovery || expedition.discovery,
      isNewDiscovery: expedition.result?.isNewDiscovery,
      bonuses: expedition.bonuses || {},
      storyContextAtLaunch: expedition.storyContextAtLaunch || null,
      storyProgressAtClaim: expedition.result?.storyProgressAtClaim || null,
      localOnly: true,
    }
    const history = [entry, ...(guestData.planet?.roverHistory || []).filter((item) => item?.operationId !== operationId)].slice(0, GUEST_ROVER_HISTORY_LIMIT)
    const roverStats = normalizeGuestRoverStats(guestData.planet?.roverStats)
    const planet = {
      ...guestData.planet,
      roverExpedition: null,
      roverHistory: history,
      roverStats: { ...roverStats, lastAcknowledgedOperationId: operationId },
    }
    persist({ ...guestData, planet })
    return { success: true, operationId, planet, serverNowMs: entry.reportAcknowledgedAtMs }
  }, [guestData, persist])

  const listRoverHistory = useCallback(({ cursorOperationId = '', limit = 10 } = {}) => {
    const entries = Array.isArray(guestData.planet?.roverHistory) ? guestData.planet.roverHistory : []
    const pageSize = Math.min(20, Math.max(1, Number(limit) || 10))
    const cursorIndex = cursorOperationId ? entries.findIndex((entry) => entry?.operationId === cursorOperationId) + 1 : 0
    const page = entries.slice(Math.max(0, cursorIndex), Math.max(0, cursorIndex) + pageSize)
    const hasMore = cursorIndex + page.length < entries.length
    return { success: true, entries: page, hasMore, nextCursorOperationId: hasMore ? page.at(-1)?.operationId || '' : '' }
  }, [guestData])

  const visitTrainingNeighbor = useCallback(() => {
    const frontierStory = advanceFrontierStory(guestData.planet?.frontierStory, { type: 'friend_visited' });
    const planet = { ...guestData.planet, frontierStory };
    persist({ ...guestData, planet });
    return { frontierStory, planet };
  }, [guestData, persist]);

  const helpTrainingNeighbor = useCallback(() => {
    const guestRouteXp = Math.max(0, Number(guestData.guestRouteXp || 0)) + 10;
    const routeLevel = guestRouteXp >= 20 ? 2 : 1;
    const frontierStory = advanceFrontierStory(guestData.planet?.frontierStory, {
      type: 'social_help_completed',
      routeLevel,
      discoveryCount: Array.isArray(guestData.planet?.roverDiscoveries) ? guestData.planet.roverDiscoveries.length : 0,
      builtItemIds: (guestData.planet?.layout || []).map((entry) => entry?.itemId).filter(Boolean),
    });
    const planet = { ...guestData.planet, frontierStory };
    persist({ ...guestData, guestRouteXp, planet });
    return { frontierStory, planet, guestRouteXp, routeLevel };
  }, [guestData, persist]);

  const removeBuildItem = useCallback((instanceId) => {
    const nextData = {
      ...guestData,
      planet: {
        ...guestData.planet,
        layout: (guestData.planet?.layout || []).filter((item) => item.instanceId !== instanceId),
      },
    };
    persist(nextData);
  }, [guestData, persist]);

  const mockHomeData = useMemo(() => {
    const layout = guestData.planet?.layout || [];
    const planet = {
      ownerName: '게스트 탐사원',
      theme: guestData.planet?.theme || 'forest',
      layout,
      materials: guestData.planet?.materials || DEFAULT_GUEST_DATA.planet.materials,
      stats: guestData.planet?.stats || DEFAULT_GUEST_DATA.planet.stats,
      frontierStory: normalizeFrontierStory(guestData.planet?.frontierStory),
      lastMissionAtMs: guestData.planet?.lastMissionAtMs || 0,
      roverExpedition: guestData.planet?.roverExpedition || null,
      roverDiscoveries: guestData.planet?.roverDiscoveries || [],
      roverHistory: guestData.planet?.roverHistory || [],
      roverStats: normalizeGuestRoverStats(guestData.planet?.roverStats),
      visitMode: 'private',
    };
    const dayKey = guestData.lastGrantedAt;
    const dailyEvent = {
      eventId: `guest_signal_${dayKey}`,
      dayKey,
      type: 'signal_blackout',
      nodeId: 'broken_beacon',
      title: '귀환 신호 재점화',
      detail: '폭풍 뒤에 흔들리는 귀환 신호를 다시 안정화하세요.',
      status: guestData.planet?.lastDailyEventDayKey === dayKey ? 'completed' : 'pending',
      reward: { material: 'stardust', amount: 1, title: '별가루' },
    };
    return {
      // 서버 카탈로그가 없는 게스트는 프론트엔드 카탈로그 사본으로 채운다.
      catalog: { ...GALAXY_ITEM_CATALOG, ...GUEST_STARTER_OBJECTS },
      ownPlanet: planet,
      planet,
      userCrystals: guestData.crystals,
      wallet: guestData.crystals,
      materials: planet.materials,
      neighbors: [{
        uid: 'guest-training-neighbor',
        displayName: '루미 안내원',
        planetName: '훈련용 메아리 행성',
        theme: 'crystal',
        visitMode: 'crew',
        shipHullTier: 1,
        tagline: '친구 방문과 도움 항로를 안전하게 연습하는 게스트 시뮬레이션입니다.',
        blocked: false,
        routeLevel: Math.max(1, Number(guestData.guestRouteXp || 0) >= 20 ? 2 : 1),
        connectionXp: Math.max(0, Number(guestData.guestRouteXp || 0)),
        nextLevelXp: Math.max(0, 20 - Number(guestData.guestRouteXp || 0)),
        interactionCount: Math.floor(Math.max(0, Number(guestData.guestRouteXp || 0)) / 10),
      }],
      events: [],
      dailyEvent,
      learningState: { shipHullTier: 1, lifetimeLearningOre: 0, abilitySnapshot: { values: {} } },
    };
  }, [guestData]);

  return {
    guestData,
    mockHomeData,
    buildItem,
    careForStructure,
    acknowledgeRoverReport,
    claimRover,
    completeDailyEvent,
    completeMission,
    dispatchRover,
    listRoverHistory,
    performWorldAction,
    helpTrainingNeighbor,
    removeBuildItem,
    saveGuestData: persist,
    syncCompletedDailyEventStory,
    visitTrainingNeighbor,
  };
}
