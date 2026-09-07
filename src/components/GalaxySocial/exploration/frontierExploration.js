import {
  OCEAN_SURFACE_Y, RIVER_SURFACE_Y, isRiverWater, terrainHeight,
  getOceanFloorY,
} from '../GalaxyTerrainModel.js'
import { OCEAN_DRAW_RADIUS } from '../../../utils/galaxyWorldBounds.js'
export { getOceanFloorY } from '../GalaxyTerrainModel.js'

export const EXPLORATION_KIT_COST = 1000
export const HOVERPACK_FLAME_LAYERS = Object.freeze([
  { id: 'outer', radius: .17, height: .76, color: '#ff3d0d', opacity: .58 },
  { id: 'middle', radius: .115, height: .56, color: '#ff9b24', opacity: .82 },
  { id: 'core', radius: .058, height: .36, color: '#fff0a3', opacity: .96 },
])
export const EXPLORATION_KITS = Object.freeze([
  { id: 'none', label: '산책', shortcut: '1', description: '가볍게 걷고 수면에서 수영해요', cost: 0 },
  { id: 'hoverpack', label: '호버팩', shortcut: '2', description: '이륙 후 공중에서 멈추고 자유롭게 이동해요', cost: EXPLORATION_KIT_COST, storeItemId: 'frontier_hoverpack' },
  { id: 'diving', label: '잠수복', shortcut: '3', description: '오리발과 함께 바닷속을 탐험해요', cost: EXPLORATION_KIT_COST, storeItemId: 'frontier_diving_suit' },
])
const EXPLORATION_KIT_SHORTCUTS = Object.freeze({
  Digit1: 'none', Numpad1: 'none',
  Digit2: 'hoverpack', Numpad2: 'hoverpack',
  Digit3: 'diving', Numpad3: 'diving',
})
export const resolveExplorationKitShortcut = (code) => EXPLORATION_KIT_SHORTCUTS[code] || null
export const normalizeExplorationKit = (value) => EXPLORATION_KITS.some((kit) => kit.id === value) ? value : 'none'
export const normalizeOwnedExplorationKits = (value) => {
  const owned = Array.isArray(value) ? value : []
  return Array.from(new Set(['none', ...owned.filter((id) => id === 'hoverpack' || id === 'diving')]))
}
export const normalizeMovementMode = (value) => ['grounded', 'flying', 'landing', 'swimming', 'diving'].includes(value) ? value : 'grounded'
export const getExplorationRadius = (worldRadius) => Math.min(92, worldRadius + 60)
export const OCEAN_FLOOR_Y = -36
export const FLIGHT_CEILING = 18
export const HOVERPACK_FLIGHT_STAGES = Object.freeze([
  Object.freeze({ id: 'launch', minY: 0, label: '기지 상공', eyebrow: 'LIFT-OFF', color: '#ffb45f', note: '추진기가 안정화됐어요. 섬의 윤곽을 내려다보며 상승해 보세요.' }),
  Object.freeze({ id: 'cloud', minY: 5, label: '구름 항로', eyebrow: 'CLOUD DECK', color: '#8feaff', note: '구름층에 진입했어요. 첫 번째 항로 고리가 가까워집니다.' }),
  Object.freeze({ id: 'stratosphere', minY: 9.5, label: '구름 위 항로', eyebrow: 'ABOVE CLOUDS', color: '#9ea9ff', note: '구름 위로 올라왔어요. 섬의 윤곽과 멀리 떠 있는 천체를 둘러보세요.' }),
  Object.freeze({ id: 'orbit', minY: 13.5, label: '하늘 전망대', eyebrow: 'SKY VISTA', color: '#d9b8ff', note: '가장 높은 항로에 도달했어요. 아래로 펼쳐진 프론티어를 감상해 보세요.' }),
])

export function getHoverpackFlightStage(y = 0) {
  const height = Number.isFinite(Number(y)) ? Number(y) : 0
  return HOVERPACK_FLIGHT_STAGES.reduce((current, stage) => height >= stage.minY ? stage : current, HOVERPACK_FLIGHT_STAGES[0])
}

export const getHoverpackAltitudeProgress = (y = 0) => Math.round(Math.max(0, Math.min(1, (Number.isFinite(Number(y)) ? Number(y) : 0) / FLIGHT_CEILING)) * 100)

export function isSkyLandmarkReached(position, landmark, radius = 1.9) {
  if (!position || !landmark) return false
  return Math.hypot(
    Number(position.x || 0) - landmark.x,
    Number(position.y || 0) - landmark.y,
    Number(position.z || 0) - landmark.z,
  ) <= radius
}

export function sampleExplorationWater(x, z, worldRadius, distantOcean = false) {
  const radius = Math.hypot(x, z)
  if (radius > worldRadius && radius < (distantOcean ? OCEAN_DRAW_RADIUS : getExplorationRadius(worldRadius))) {
    return { kind: 'ocean', surfaceY: OCEAN_SURFACE_Y, floorY: getOceanFloorY(x, z, worldRadius) }
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
export const MARINE_HABITAT_COUNT = 48
export function getMarineHabitat(index, worldRadius) {
  const angle = -.6 + index * 2.3999632297
  const radius = worldRadius + 6 + (index % 4) * 10 + Math.sin(index * 4.1) * 2
  const x = Math.cos(angle) * radius
  const z = Math.sin(angle) * radius
  return { x, z, y: Math.min(OCEAN_SURFACE_Y - .35, getOceanFloorY(x, z, worldRadius) + 1.7 + (index % 3) * .5) }
}
export function getSkyLandmarks(worldRadius) {
  const r = worldRadius * .5
  return [
    { id: 'cloud-garden', order: 1, name: '구름 정원', callSign: 'CLOUD-01', x: -r, y: 7, z: 1, color: '#9dffe1', note: '첫 항로 통과 · 구름 사이에서 섬 전체가 하나의 작은 개척지처럼 보여요.' },
    { id: 'wind-arch', order: 2, name: '바람의 문', callSign: 'WIND-02', x: r * .7, y: 11, z: -r * .7, color: '#ffd878', note: '두 번째 항로 통과 · 다음은 고도 15의 별빛 쉼터예요.' },
    { id: 'aurora-nest', order: 3, name: '별빛 쉼터', callSign: 'SKY-03', x: r * .5, y: 15, z: r * .7, color: '#c9a9ff', note: '최종 항로 통과 · 세 지점을 모두 방문했어요. 이제 섬과 바다 위를 자유롭게 비행해 보세요.' },
  ]
}
