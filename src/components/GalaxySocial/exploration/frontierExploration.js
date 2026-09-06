import {
  OCEAN_SURFACE_Y, RIVER_SURFACE_Y, isRiverWater, terrainHeight,
} from '../GalaxyTerrainModel.js'

// Starter equipment is available to everyone; these IDs never grant currency.
export const EXPLORATION_KITS = Object.freeze([
  { id: 'none', label: '산책', description: '가볍게 걷고 수면에서 수영해요' },
  { id: 'hoverpack', label: '호버팩', description: '이륙 후 공중에서 멈추고 자유롭게 이동해요' },
  { id: 'diving', label: '잠수복', description: '오리발과 함께 바닷속을 탐험해요' },
])
export const normalizeExplorationKit = (value) => EXPLORATION_KITS.some((kit) => kit.id === value) ? value : 'none'
export const normalizeMovementMode = (value) => ['grounded', 'flying', 'landing', 'swimming', 'diving'].includes(value) ? value : 'grounded'
export const getExplorationRadius = (worldRadius) => Math.min(31, worldRadius + 6)
export const OCEAN_FLOOR_Y = -3.6
export const FLIGHT_CEILING = 18

export function sampleExplorationWater(x, z, worldRadius, distantOcean = false) {
  const radius = Math.hypot(x, z)
  if (radius > worldRadius && radius < (distantOcean ? 62 : getExplorationRadius(worldRadius))) {
    return { kind: 'ocean', surfaceY: OCEAN_SURFACE_Y, floorY: OCEAN_FLOOR_Y }
  }
  const floorY = terrainHeight(x, z)
  if (isRiverWater(x, z) && floorY < RIVER_SURFACE_Y - .08) {
    return { kind: 'river', surfaceY: RIVER_SURFACE_Y, floorY }
  }
  return null
}

export function getExplorationMode({ kit, flight, y, water, scale = .25, previous = 'grounded' }) {
  if (kit === 'hoverpack' && flight) return 'flying'
  if (!water || water.surfaceY - water.floorY < Math.min(.22, scale)) return 'grounded'
  const wasWet = previous === 'swimming' || previous === 'diving'
  if (y > water.surfaceY + (wasWet ? .16 : .04)) return 'grounded'
  return kit === 'diving' ? 'diving' : 'swimming'
}

// Continuous vertical sweep prevents tunnelling through a thin floor/ceiling.
export function advanceExplorationHeight({ y, mode, axis = 0, dt, water, floorY, scale = .25, blocked = () => false }) {
  const delta = Math.max(0, Math.min(Number(dt) || 0, .05))
  if (delta === 0) return y
  const input = Math.max(-1, Math.min(1, Number(axis) || 0))
  const surfaceFootY = water ? Math.max(water.floorY + .025, water.surfaceY - scale * 1.35) : floorY
  let target = y
  if (mode === 'flying') target = Math.max(floorY + .025, Math.min(FLIGHT_CEILING, y + input * 3.2 * delta))
  if (mode === 'landing') target = Math.max(water ? surfaceFootY : floorY + .025, y - 2 * delta)
  if (mode === 'diving' && water) target = Math.max(water.floorY + .025, Math.min(surfaceFootY, y + input * 1.7 * delta))
  if (mode === 'swimming' && water) target = y + (surfaceFootY - y) * (1 - Math.exp(-delta * 10))
  const count = Math.max(1, Math.ceil(Math.abs(target - y) / .04))
  const step = (target - y) / count
  let result = y
  for (let i = 0; i < count; i += 1) {
    if (blocked(result + step)) break
    result += step
  }
  return result
}

export const MARINE_SPECIES = Object.freeze([
  { id: 'sunfin', name: '햇살 나비고기', color: '#ffd875', note: '얕은 산호 주변을 느긋하게 맴돌아요.' },
  { id: 'bluefin', name: '파랑 리본고기', color: '#66d5ff', note: '푸른 지느러미로 무리와 방향을 맞춰요.' },
  { id: 'peachfin', name: '복숭아 흰동가리', color: '#ff9a78', note: '산호 사이를 오가며 쉬는 곳을 찾아요.' },
  { id: 'mintfin', name: '민트 유리고기', color: '#91f4cc', note: '해초 위로 반짝이는 작은 무리를 이뤄요.' },
  { id: 'violetfin', name: '보랏빛 별고기', color: '#cfabff', note: '고요한 바닥 가까이에서 헤엄쳐요.' },
  { id: 'moonfin', name: '달빛 은어', color: '#e2efff', note: '물빛을 따라 은은하게 색이 변해요.' },
])

// Habitats encircle the whole island, with repeated species and no network simulation.
export const MARINE_HABITAT_COUNT = 24
export function getMarineHabitat(index, worldRadius) {
  const angle = -.6 + index * Math.PI * 2 / MARINE_HABITAT_COUNT
  const radius = worldRadius + (getExplorationRadius(worldRadius) - worldRadius) * .53
  return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, y: -1.25 - (index % 3) * .62 }
}

export function findMarineObservation(position, worldRadius) {
  if (!position || !['diving', 'swimming'].includes(position.movementMode)) return null
  let nearest = null
  let distance = 3
  Array.from({ length: MARINE_HABITAT_COUNT }, (_, index) => index).forEach((index) => {
    const species = MARINE_SPECIES[index % MARINE_SPECIES.length]
    const habitat = getMarineHabitat(index, worldRadius)
    const next = Math.hypot(position.x - habitat.x, position.y - habitat.y, position.z - habitat.z)
    if (next < distance) { nearest = species; distance = next }
  })
  return nearest
}


export function getNearestHabitat(position, worldRadius) {
  if (!position) return null
  let result = null
  for (let index = 0; index < MARINE_HABITAT_COUNT; index++) {
    const habitat = getMarineHabitat(index, worldRadius)
    const distance = Math.hypot(position.x - habitat.x, position.z - habitat.z)
    if (!result || distance < result.distance) result = { ...habitat, distance }
  }
  return result
}

export function getSkyLandmarks(worldRadius) {
  const r = worldRadius * .5
  return [
    { id: 'cloud-garden', name: '구름 정원', x: -r, y: 7, z: 1, color: '#b6ffe4', note: '구름 사이에 꽃처럼 떠 있는 작은 빛을 만났어요.' },
    { id: 'wind-arch', name: '바람의 문', x: r * .7, y: 11, z: -r * .7, color: '#ffe4a1', note: '금빛 고리를 통과하며 섬의 새로운 풍경을 발견했어요.' },
    { id: 'aurora-nest', name: '별빛 쉼터', x: r * .5, y: 15, z: r * .7, color: '#d6b8ff', note: '하늘 가오리와 함께 가장 높은 풍경을 바라봐요.' },
  ]
}
