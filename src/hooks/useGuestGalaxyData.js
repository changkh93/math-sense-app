import { useState, useCallback, useMemo } from 'react';
import {
  GALAXY_ITEM_CATALOG,
  GUEST_STARTER_OBJECTS,
  getGuestBuildCost,
  getGuestItemName,
} from '../utils/galaxyGame';

const STORAGE_KEY = 'metasense_guest_astra_data';
const DAILY_GUEST_CRYSTALS = 500;

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
  planet: {
    theme: 'forest',
    layout: [createStarterDome()],
  },
};

function readFromStorage() {
  if (typeof window === 'undefined') return DEFAULT_GUEST_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_GUEST_DATA;
    const parsed = JSON.parse(raw);

    // 1) layout 을 항상 정규 스키마로 맞춘다. (옛날 형식 호환)
    const rawLayout = Array.isArray(parsed?.planet?.layout) ? parsed.planet.layout : []
    const normalizedLayout = rawLayout.map(normalizeLayoutItem).filter(Boolean)
    if (normalizedLayout.length === 0) normalizedLayout.push(createStarterDome())

    // 2) 일일 기본 광석 리셋 체크
    const today = getTodayDateStringKey();
    const lastGrantedAt = parsed?.lastGrantedAt || today;
    const crystals = lastGrantedAt !== today
      ? DAILY_GUEST_CRYSTALS
      : Number(parsed?.crystals ?? DAILY_GUEST_CRYSTALS);

    const nextData = {
      crystals,
      lastGrantedAt: today,
      planet: {
        theme: parsed?.planet?.theme || 'forest',
        layout: normalizedLayout,
      },
    };
    return nextData;
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
    const cost = getGuestBuildCost(itemId);
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
    const nextData = {
      ...guestData,
      crystals: Math.max(0, guestData.crystals - cost),
      planet: {
        ...guestData.planet,
        layout: [...(guestData.planet?.layout || []), newItem],
      },
    };
    persist(nextData);
    return newItem;
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
    return {
      // 서버 카탈로그가 없는 게스트는 프론트엔드 카탈로그 사본으로 채운다.
      catalog: { ...GALAXY_ITEM_CATALOG, ...GUEST_STARTER_OBJECTS },
      ownPlanet: {
        ownerName: '게스트 탐사원',
        theme: guestData.planet?.theme || 'forest',
        layout,
        materials: {
          stardust: 10,
          biofiber: 10,
          crystalGlass: 10,
          alloy: 10,
        },
        gardenVitality: 100,
        facilityHealth: 100,
        creatureHappiness: 100,
        admirationCount: 0,
      },
      targetPlanet: {
        ownerName: '게스트 탐사원',
        theme: guestData.planet?.theme || 'forest',
        layout,
        gardenVitality: 100,
        facilityHealth: 100,
        creatureHappiness: 100,
        admirationCount: 0,
      },
      userCrystals: guestData.crystals,
      wallet: guestData.crystals,
      materials: {
        stardust: 10,
        biofiber: 10,
        crystalGlass: 10,
        alloy: 10,
      },
      serverNowMs: Date.now(),
    };
  }, [guestData.crystals, guestData.planet?.layout, guestData.planet?.theme]);

  return {
    guestData,
    mockHomeData,
    buildItem,
    removeBuildItem,
    saveGuestData: persist,
  };
}
